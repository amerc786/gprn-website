// ===== GPRN Supabase Phase 1 Client =====
// Provides cross-device sync by replacing the localStorage storage layer
// with a shared jsonb blob in Supabase. Must be loaded AFTER mock-data.js
// and app.js so it can override getMockData/saveMockData and Auth methods.

(function() {
    var SUPABASE_URL = 'https://fysilmypgpewbzyxkymx.supabase.co';
    var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5c2lsbXlwZ3Bld2J6eXhreW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzODQwNjYsImV4cCI6MjA5MDk2MDA2Nn0.BEgSiUO_RWvk0ixZSORuKFqwMG6nYNGsCqWCftukBnE';

    // In-memory cache of the app state blob for synchronous access.
    var _cache = null;
    var _lastFetchAt = 0;
    var FETCH_MAX_AGE_MS = 2000; // reuse cache within 2s to avoid hammering network

    function _getAccessToken() {
        try {
            var raw = localStorage.getItem('gprn_session');
            if (!raw) return null;
            var s = JSON.parse(raw);
            return s && s.access_token ? s.access_token : null;
        } catch (e) { return null; }
    }

    function _authHeaders() {
        var token = _getAccessToken() || SUPABASE_ANON_KEY;
        return {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        };
    }

    function _applyHeaders(xhr, headers) {
        Object.keys(headers).forEach(function(k) { xhr.setRequestHeader(k, headers[k]); });
    }

    // ---- Synchronous fetch of the shared app state blob ----
    function _fetchBlobSync() {
        try {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', SUPABASE_URL + '/rest/v1/app_state?id=eq.1&select=data', false);
            _applyHeaders(xhr, _authHeaders());
            xhr.send();
            if (xhr.status === 200) {
                var rows = JSON.parse(xhr.responseText);
                if (rows && rows.length) return rows[0].data;
            } else {
                console.warn('[Supabase] fetch blob status', xhr.status, xhr.responseText);
            }
        } catch (e) {
            console.warn('[Supabase] fetch blob threw', e);
        }
        return null;
    }

    // ---- Async write of the blob (fire-and-forget with callback) ----
    function _writeBlobAsync(data, cb) {
        fetch(SUPABASE_URL + '/rest/v1/app_state?id=eq.1', {
            method: 'PATCH',
            headers: _authHeaders(),
            body: JSON.stringify({ data: data })
        }).then(function(resp) {
            if (!resp.ok) {
                return resp.text().then(function(t) { console.warn('[Supabase] write failed', resp.status, t); });
            }
        }).catch(function(e) {
            console.warn('[Supabase] write error', e);
        }).finally(function() { if (cb) cb(); });
    }

    // ---- Override getMockData / saveMockData ----
    // The existing frontend calls these synchronously. We keep that contract:
    // first call does a sync network fetch and caches; subsequent calls hit cache.
    var _origGetMockData = (typeof window.getMockData === 'function') ? window.getMockData : null;
    var _origSaveMockData = (typeof window.saveMockData === 'function') ? window.saveMockData : null;

    window.getMockData = function() {
        // Use cache if fresh
        var now = Date.now();
        if (_cache && (now - _lastFetchAt) < FETCH_MAX_AGE_MS) return _cache;

        // Only attempt Supabase fetch if we have a session (otherwise fall back to local)
        if (_getAccessToken()) {
            var fresh = _fetchBlobSync();
            if (fresh) {
                _cache = fresh;
                _lastFetchAt = now;
                try { localStorage.setItem('gprn_data', JSON.stringify(fresh)); } catch(e) {}
                return _cache;
            }
        }

        // Fallback: localStorage cache, then local seed (login page etc.)
        try {
            var cached = localStorage.getItem('gprn_data');
            if (cached) {
                _cache = JSON.parse(cached);
                return _cache;
            }
        } catch(e) {}

        if (_origGetMockData) return _origGetMockData();
        return { locums: [], practices: [], shifts: [], offers: [], availability: {}, messages: [], invoices: [], notifications: [], cpdEvents: [], feedback: [] };
    };

    window.saveMockData = function(data) {
        _cache = data;
        _lastFetchAt = Date.now();
        try { localStorage.setItem('gprn_data', JSON.stringify(data)); } catch(e) {}
        if (_getAccessToken()) {
            _writeBlobAsync(data);
        }
    };

    // ---- Override Auth (defined in app.js) ----
    // app.js declares `const Auth = { ... }`. We can't reassign the binding,
    // but we can mutate its methods in place.
    if (typeof Auth !== 'undefined') {

        Auth.login = function(email, password, expectedRole) {
            var xhr = new XMLHttpRequest();
            xhr.open('POST', SUPABASE_URL + '/auth/v1/token?grant_type=password', false);
            xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
            xhr.setRequestHeader('Content-Type', 'application/json');
            try {
                xhr.send(JSON.stringify({ email: email, password: password }));
            } catch (e) {
                console.warn('[Supabase] login request threw', e);
                return null;
            }

            if (xhr.status !== 200) {
                try {
                    var err = JSON.parse(xhr.responseText);
                    console.warn('[Supabase] login failed', xhr.status, err);
                } catch(e) {}
                return null;
            }

            var authResp;
            try { authResp = JSON.parse(xhr.responseText); } catch(e) { return null; }

            // Build session object — reuse existing gprn_session key for compatibility
            var session = {
                access_token: authResp.access_token,
                refresh_token: authResp.refresh_token,
                supabase_user_id: authResp.user.id,
                email: authResp.user.email
            };
            localStorage.setItem('gprn_session', JSON.stringify(session));

            // Fetch the blob so we can find this user's profile
            _cache = null; _lastFetchAt = 0;
            var data = window.getMockData();
            if (data) {
                var locum = (data.locums || []).find(function(l) { return l.email === email; });
                var practice = (data.practices || []).find(function(p) { return p.email === email; });
                var profile = locum || practice;
                if (profile) {
                    if (expectedRole && profile.role !== expectedRole) {
                        // Wrong-role — don't persist this session
                        localStorage.removeItem('gprn_session');
                        return { error: 'wrong_role', actualRole: profile.role };
                    }
                    session.id = profile.id;
                    session.role = profile.role;
                    if (profile.role === 'locum') {
                        session.name = (profile.title ? profile.title + ' ' : '') + profile.firstName + ' ' + profile.lastName;
                        session.firstName = profile.firstName;
                    } else {
                        session.name = profile.practiceName;
                        session.firstName = (profile.contactName || '').split(' ')[0] || profile.practiceName;
                    }
                    localStorage.setItem('gprn_session', JSON.stringify(session));
                    return session;
                }
            }

            // Signed in with Supabase Auth but no matching profile row in the blob.
            // That shouldn't happen via the register flow, but surface a clear error.
            localStorage.removeItem('gprn_session');
            console.warn('[Supabase] login succeeded but no profile found for', email);
            return null;
        };

        Auth.logout = function() {
            var token = _getAccessToken();
            if (token) {
                fetch(SUPABASE_URL + '/auth/v1/logout', {
                    method: 'POST',
                    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token }
                }).catch(function() {});
            }
            localStorage.removeItem('gprn_session');
            localStorage.removeItem('gprn_data');
            _cache = null;
            _lastFetchAt = 0;
            window.location.href = 'login.html';
        };
    }

    // ---- Signup helper exposed for register pages ----
    // Performs Supabase Auth signup synchronously then returns the session.
    window.SupaSignup = function(email, password) {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', SUPABASE_URL + '/auth/v1/signup', false);
        xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
        xhr.setRequestHeader('Content-Type', 'application/json');
        try {
            xhr.send(JSON.stringify({ email: email, password: password }));
        } catch (e) {
            return { error: { message: 'Network error: ' + e.message } };
        }
        if (xhr.status === 200 || xhr.status === 201) {
            try {
                var body = JSON.parse(xhr.responseText);
                // When email confirmation is disabled, body includes access_token directly
                if (body.access_token) {
                    var session = {
                        access_token: body.access_token,
                        refresh_token: body.refresh_token,
                        supabase_user_id: body.user.id,
                        email: body.user.email
                    };
                    localStorage.setItem('gprn_session', JSON.stringify(session));
                    return { session: session };
                }
                // Email confirmation enabled — no session until user confirms
                return { user: body.user, needsConfirmation: true };
            } catch (e) { return { error: { message: 'Bad response from Supabase' } }; }
        }
        try {
            var err = JSON.parse(xhr.responseText);
            return { error: err };
        } catch(e) {
            return { error: { message: 'Signup failed (HTTP ' + xhr.status + ')' } };
        }
    };

    // Expose for debugging
    window.SupabaseClient = {
        url: SUPABASE_URL,
        refresh: function() { _cache = null; _lastFetchAt = 0; return window.getMockData(); },
        forceWrite: function(data) { _writeBlobAsync(data); }
    };

    // ---- Background refresh ----
    // Every 15s, refetch the blob to pick up writes from other devices.
    // Only runs when we have an active session and the tab is visible.
    setInterval(function() {
        if (!_getAccessToken()) return;
        if (document.hidden) return;
        var fresh = _fetchBlobSync();
        if (fresh) {
            var serialized = JSON.stringify(fresh);
            var cachedSerialized = _cache ? JSON.stringify(_cache) : '';
            if (serialized !== cachedSerialized) {
                _cache = fresh;
                _lastFetchAt = Date.now();
                try { localStorage.setItem('gprn_data', serialized); } catch(e) {}
                // Notify listeners that data was updated by another device
                window.dispatchEvent(new CustomEvent('gprn:data-refreshed'));
            }
        }
    }, 15000);
})();
