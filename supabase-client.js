// ===== GPRN Supabase Client — Phase 2: Manual Account Approval =====
// Loaded AFTER mock-data.js and app.js. Overrides:
//   - window.getMockData / window.saveMockData (shared app_state blob)
//   - Auth.login / Auth.logout (approval-aware)
// Exposes:
//   - window.SupaRegister(email, password, role, profileData)
//   - window.AdminApproval.{listProfiles, approveProfile, rejectProfile, isCurrentUserAdmin}
//   - window.SupabaseClient.{refresh, forceWrite, getCurrentProfile}

(function() {
    var SUPABASE_URL = 'https://fysilmypgpewbzyxkymx.supabase.co';
    var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5c2lsbXlwZ3Bld2J6eXhreW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzODQwNjYsImV4cCI6MjA5MDk2MDA2Nn0.BEgSiUO_RWvk0ixZSORuKFqwMG6nYNGsCqWCftukBnE';

    // ---- Internal state ----
    var _cache = null;
    var _lastFetchAt = 0;
    var FETCH_MAX_AGE_MS = 2000;
    var _profileCache = null;

    // ---- Low-level helpers ----
    function _getAccessToken() {
        try {
            var raw = localStorage.getItem('gprn_session');
            if (!raw) return null;
            var s = JSON.parse(raw);
            return s && s.access_token ? s.access_token : null;
        } catch (e) { return null; }
    }

    function _getUserId() {
        try {
            var raw = localStorage.getItem('gprn_session');
            if (!raw) return null;
            var s = JSON.parse(raw);
            return s && s.supabase_user_id ? s.supabase_user_id : null;
        } catch (e) { return null; }
    }

    function _authHeaders(extra) {
        var token = _getAccessToken() || SUPABASE_ANON_KEY;
        var h = {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        };
        if (extra) {
            Object.keys(extra).forEach(function(k) { h[k] = extra[k]; });
        }
        return h;
    }

    function _applyHeaders(xhr, headers) {
        Object.keys(headers).forEach(function(k) { xhr.setRequestHeader(k, headers[k]); });
    }

    function _syncRequest(method, path, payload, headers) {
        var xhr = new XMLHttpRequest();
        xhr.open(method, SUPABASE_URL + path, false);
        _applyHeaders(xhr, headers || _authHeaders());
        try {
            if (payload === undefined || payload === null) {
                xhr.send();
            } else {
                xhr.send(JSON.stringify(payload));
            }
        } catch (e) {
            return { status: 0, body: null, error: e };
        }
        var body = null;
        try { body = xhr.responseText ? JSON.parse(xhr.responseText) : null; } catch (e) { body = xhr.responseText; }
        return { status: xhr.status, body: body };
    }

    // ---- app_state blob (shared data) ----
    function _fetchBlobSync() {
        var res = _syncRequest('GET', '/rest/v1/app_state?id=eq.1&select=data');
        if (res.status === 200 && Array.isArray(res.body) && res.body.length) return res.body[0].data;
        if (res.status !== 200 && res.status !== 0) {
            console.warn('[Supabase] fetch blob status', res.status, res.body);
        }
        return null;
    }

    function _writeBlobSync(data) {
        return _syncRequest('PATCH', '/rest/v1/app_state?id=eq.1', { data: data });
    }

    function _writeBlobAsync(data, cb) {
        fetch(SUPABASE_URL + '/rest/v1/app_state?id=eq.1', {
            method: 'PATCH',
            headers: _authHeaders(),
            body: JSON.stringify({ data: data })
        }).then(function(resp) {
            if (!resp.ok) return resp.text().then(function(t) { console.warn('[Supabase] write failed', resp.status, t); });
        }).catch(function(e) { console.warn('[Supabase] write error', e); })
          .finally(function() { if (cb) cb(); });
    }

    // ---- profiles (approval status) ----
    // Returns:
    //   { profile: {...} }           — row found
    //   { missing: true }            — query succeeded, no row for this user
    //   { unavailable: true, ... }   — table doesn't exist / network error / schema not migrated
    function _fetchCurrentProfileDetailed() {
        var uid = _getUserId();
        if (!uid) return { missing: true };
        var res = _syncRequest('GET', '/rest/v1/profiles?id=eq.' + uid + '&select=id,email,role,approval_status,is_admin,profile_data,rejection_reason');
        if (res.status === 200 && Array.isArray(res.body)) {
            if (res.body.length) {
                _profileCache = res.body[0];
                return { profile: _profileCache };
            }
            return { missing: true };
        }
        // 404 / 42P01 / etc. — assume schema not yet applied
        console.warn('[Supabase] profile fetch unavailable', res.status, res.body);
        return { unavailable: true, status: res.status, body: res.body };
    }

    function _fetchCurrentProfile() {
        var r = _fetchCurrentProfileDetailed();
        return r && r.profile ? r.profile : null;
    }

    function _supabaseSignOut() {
        var token = _getAccessToken();
        if (token) {
            try {
                var xhr = new XMLHttpRequest();
                xhr.open('POST', SUPABASE_URL + '/auth/v1/logout', false);
                xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
                xhr.setRequestHeader('Authorization', 'Bearer ' + token);
                xhr.send();
            } catch(e) {}
        }
        localStorage.removeItem('gprn_session');
        localStorage.removeItem('gprn_data');
        _cache = null;
        _lastFetchAt = 0;
        _profileCache = null;
    }

    // ============================================================
    // getMockData / saveMockData overrides
    // ============================================================
    var _origGetMockData = (typeof window.getMockData === 'function') ? window.getMockData : null;

    window.getMockData = function() {
        var now = Date.now();
        if (_cache && (now - _lastFetchAt) < FETCH_MAX_AGE_MS) return _cache;

        if (_getAccessToken()) {
            var fresh = _fetchBlobSync();
            if (fresh) {
                _cache = fresh;
                _lastFetchAt = now;
                try { localStorage.setItem('gprn_data', JSON.stringify(fresh)); } catch(e) {}
                return _cache;
            }
        }

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
        if (_getAccessToken()) _writeBlobSync(data);
    };

    // ============================================================
    // SupaRegister: create auth user + pending profile + sign out
    // ============================================================
    window.SupaRegister = function(email, password, role, profileData) {
        // 1. Create the auth user
        var signupRes = _syncRequest('POST', '/auth/v1/signup', { email: email, password: password }, {
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
        });

        if (signupRes.status !== 200 && signupRes.status !== 201) {
            return { error: signupRes.body || { message: 'Signup failed (HTTP ' + signupRes.status + ')' } };
        }

        var authBody = signupRes.body || {};
        if (!authBody.access_token) {
            return { error: { message: 'Email confirmation must be disabled in Supabase for signup to complete.' } };
        }

        var userId = authBody.user.id;

        // Temporarily hold the session so we can insert the profile row
        var tempSession = {
            access_token: authBody.access_token,
            refresh_token: authBody.refresh_token,
            supabase_user_id: userId,
            email: email
        };
        localStorage.setItem('gprn_session', JSON.stringify(tempSession));

        // 2. Insert the pending profile row (RLS enforces id=auth.uid + pending + non-admin)
        var insertRes = _syncRequest('POST', '/rest/v1/profiles', {
            id: userId,
            email: email,
            role: role,
            approval_status: 'pending',
            is_admin: false,
            profile_data: profileData
        }, _authHeaders({ 'Prefer': 'return=minimal' }));

        if (insertRes.status !== 201 && insertRes.status !== 200 && insertRes.status !== 204) {
            // Auth user exists but profile creation failed. Sign out the temp session.
            _supabaseSignOut();
            var errMsg = 'Failed to create profile (HTTP ' + insertRes.status + ').';
            if (insertRes.body && insertRes.body.message) errMsg = insertRes.body.message;
            return { error: { message: errMsg } };
        }

        // 3. Sign out — pending users must not hold an active session
        _supabaseSignOut();

        return { success: true, email: email };
    };

    // ============================================================
    // Auth overrides — login returns { error: '...' } or a session object
    // ============================================================
    if (typeof Auth !== 'undefined') {

        Auth.login = function(email, password, expectedRole) {
            // Exchange credentials for a JWT
            var tokenRes = _syncRequest('POST', '/auth/v1/token?grant_type=password',
                { email: email, password: password },
                { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' });

            if (tokenRes.status !== 200) {
                return { error: 'invalid_credentials' };
            }

            var authResp = tokenRes.body;
            // Stash the session so subsequent authenticated fetches work
            var tempSession = {
                access_token: authResp.access_token,
                refresh_token: authResp.refresh_token,
                supabase_user_id: authResp.user.id,
                email: authResp.user.email
            };
            localStorage.setItem('gprn_session', JSON.stringify(tempSession));

            // Gate on approval status
            var profile = _fetchCurrentProfile();
            if (!profile) {
                _supabaseSignOut();
                return { error: 'no_profile' };
            }

            if (profile.approval_status === 'pending') {
                _supabaseSignOut();
                return { error: 'pending_approval' };
            }

            if (profile.approval_status === 'rejected') {
                var reason = profile.rejection_reason || null;
                _supabaseSignOut();
                return { error: 'rejected', reason: reason };
            }

            if (expectedRole && profile.role !== expectedRole) {
                _supabaseSignOut();
                return { error: 'wrong_role', actualRole: profile.role };
            }

            // Approved → fetch blob and locate the rich profile row
            _cache = null; _lastFetchAt = 0;
            var data = window.getMockData();
            if (!data) {
                _supabaseSignOut();
                return { error: 'data_unavailable' };
            }

            var richProfile = null;
            if (profile.role === 'locum') {
                richProfile = (data.locums || []).find(function(l) { return l.email === email; });
            } else {
                richProfile = (data.practices || []).find(function(p) { return p.email === email; });
            }

            // Fallback: push profile_data into the blob if missing
            // (happens for bootstrap_admin users who never went through admin approval)
            if (!richProfile && profile.profile_data && Object.keys(profile.profile_data).length) {
                var pd = JSON.parse(JSON.stringify(profile.profile_data));
                data.locums = data.locums || [];
                data.practices = data.practices || [];
                if (profile.role === 'locum') {
                    pd.id = pd.id || ('loc-' + String(data.locums.length + 1).padStart(3, '0'));
                    pd.role = 'locum';
                    data.locums.push(pd);
                    richProfile = pd;
                } else {
                    pd.id = pd.id || ('prac-' + String(data.practices.length + 1).padStart(3, '0'));
                    pd.role = 'practice';
                    data.practices.push(pd);
                    richProfile = pd;
                }
                window.saveMockData(data);
            }

            if (!richProfile) {
                _supabaseSignOut();
                return { error: 'no_profile' };
            }

            var session = {
                access_token: authResp.access_token,
                refresh_token: authResp.refresh_token,
                supabase_user_id: authResp.user.id,
                email: authResp.user.email,
                id: richProfile.id,
                role: profile.role,
                is_admin: profile.is_admin === true,
                approval_status: 'approved'
            };
            if (profile.role === 'locum') {
                session.name = (richProfile.title ? richProfile.title + ' ' : '') + richProfile.firstName + ' ' + richProfile.lastName;
                session.firstName = richProfile.firstName;
            } else {
                session.name = richProfile.practiceName;
                session.firstName = (richProfile.contactName || '').split(' ')[0] || richProfile.practiceName;
            }
            localStorage.setItem('gprn_session', JSON.stringify(session));
            return session;
        };

        Auth.logout = function() {
            _supabaseSignOut();
            window.location.href = 'login.html';
        };
    }

    // ============================================================
    // AdminApproval — admin review / approve / reject
    // ============================================================
    window.AdminApproval = {
        isCurrentUserAdmin: function() {
            var p = _fetchCurrentProfile();
            return !!(p && p.is_admin);
        },

        listProfiles: function(statusFilter) {
            var q = '/rest/v1/profiles?select=id,email,role,approval_status,is_admin,profile_data,created_at,approved_at,rejected_at,rejection_reason&order=created_at.desc';
            if (statusFilter && statusFilter !== 'all') {
                q += '&approval_status=eq.' + encodeURIComponent(statusFilter);
            }
            var res = _syncRequest('GET', q);
            if (res.status === 200) return res.body || [];
            console.warn('[AdminApproval] list failed', res.status, res.body);
            return [];
        },

        approveProfile: function(profileId) {
            // 1. Load the profile row
            var res = _syncRequest('GET', '/rest/v1/profiles?id=eq.' + encodeURIComponent(profileId) + '&select=*');
            if (res.status !== 200 || !Array.isArray(res.body) || !res.body.length) {
                return { error: 'Profile not found' };
            }
            var p = res.body[0];
            if (p.approval_status !== 'pending') {
                return { error: 'Profile is not pending (current: ' + p.approval_status + ')' };
            }

            // 2. Push profile_data into the app_state blob
            var data = _fetchBlobSync();
            if (!data) {
                data = { locums: [], practices: [], shifts: [], offers: [], availability: {}, messages: [], invoices: [], notifications: [], cpdEvents: [], feedback: [] };
            }
            data.locums = data.locums || [];
            data.practices = data.practices || [];

            var pd = JSON.parse(JSON.stringify(p.profile_data || {}));
            if (p.role === 'locum') {
                if (!data.locums.some(function(l) { return l.email === p.email; })) {
                    pd.id = pd.id || ('loc-' + String(data.locums.length + 1).padStart(3, '0'));
                    pd.role = 'locum';
                    data.locums.push(pd);
                }
            } else {
                if (!data.practices.some(function(pr) { return pr.email === p.email; })) {
                    pd.id = pd.id || ('prac-' + String(data.practices.length + 1).padStart(3, '0'));
                    pd.role = 'practice';
                    data.practices.push(pd);
                }
            }

            var blobRes = _writeBlobSync(data);
            if (blobRes.status >= 400) {
                return { error: 'Failed to update app_state (HTTP ' + blobRes.status + ')' };
            }

            // 3. Mark the profile approved
            var patchRes = _syncRequest('PATCH', '/rest/v1/profiles?id=eq.' + encodeURIComponent(profileId), {
                approval_status: 'approved',
                approved_at: new Date().toISOString(),
                approved_by: _getUserId()
            });
            if (patchRes.status >= 400) {
                return { error: 'Failed to approve profile (HTTP ' + patchRes.status + ')' };
            }

            _cache = data;
            _lastFetchAt = Date.now();
            try { localStorage.setItem('gprn_data', JSON.stringify(data)); } catch(e) {}
            return { success: true };
        },

        rejectProfile: function(profileId, reason) {
            var patchRes = _syncRequest('PATCH', '/rest/v1/profiles?id=eq.' + encodeURIComponent(profileId), {
                approval_status: 'rejected',
                rejected_at: new Date().toISOString(),
                rejected_by: _getUserId(),
                rejection_reason: reason || null
            });
            if (patchRes.status >= 400) {
                return { error: 'Failed to reject profile (HTTP ' + patchRes.status + ')' };
            }
            return { success: true };
        },

        // Suspend an already-approved user (flips approval_status to rejected)
        suspendProfile: function(profileId, reason) {
            var patchRes = _syncRequest('PATCH', '/rest/v1/profiles?id=eq.' + encodeURIComponent(profileId), {
                approval_status: 'rejected',
                rejected_at: new Date().toISOString(),
                rejected_by: _getUserId(),
                rejection_reason: reason || 'Account suspended by admin'
            });
            if (patchRes.status >= 400) {
                return { error: 'Failed to suspend profile (HTTP ' + patchRes.status + ')' };
            }
            return { success: true };
        },

        // Re-approve a previously rejected/suspended user
        unsuspendProfile: function(profileId) {
            // Load profile so we can push profile_data into the blob if missing
            var res = _syncRequest('GET', '/rest/v1/profiles?id=eq.' + encodeURIComponent(profileId) + '&select=*');
            if (res.status !== 200 || !Array.isArray(res.body) || !res.body.length) {
                return { error: 'Profile not found' };
            }
            var p = res.body[0];

            // Ensure the user exists in the app_state blob
            var data = _fetchBlobSync();
            if (!data) {
                data = { locums: [], practices: [], shifts: [], offers: [], availability: {}, messages: [], invoices: [], notifications: [], cpdEvents: [], feedback: [] };
            }
            data.locums = data.locums || [];
            data.practices = data.practices || [];
            var pd = JSON.parse(JSON.stringify(p.profile_data || {}));
            if (p.role === 'locum') {
                if (!data.locums.some(function(l) { return l.email === p.email; })) {
                    pd.id = pd.id || ('loc-' + String(data.locums.length + 1).padStart(3, '0'));
                    pd.role = 'locum';
                    data.locums.push(pd);
                }
            } else {
                if (!data.practices.some(function(pr) { return pr.email === p.email; })) {
                    pd.id = pd.id || ('prac-' + String(data.practices.length + 1).padStart(3, '0'));
                    pd.role = 'practice';
                    data.practices.push(pd);
                }
            }
            var blobRes = _writeBlobSync(data);
            if (blobRes.status >= 400) {
                return { error: 'Failed to update app_state (HTTP ' + blobRes.status + ')' };
            }

            var patchRes = _syncRequest('PATCH', '/rest/v1/profiles?id=eq.' + encodeURIComponent(profileId), {
                approval_status: 'approved',
                approved_at: new Date().toISOString(),
                approved_by: _getUserId(),
                rejected_at: null,
                rejected_by: null,
                rejection_reason: null
            });
            if (patchRes.status >= 400) {
                return { error: 'Failed to unsuspend profile (HTTP ' + patchRes.status + ')' };
            }
            _cache = data;
            _lastFetchAt = Date.now();
            try { localStorage.setItem('gprn_data', JSON.stringify(data)); } catch(e) {}
            return { success: true };
        },

        // Update the profile_data JSONB column (name, phone, GMC etc.)
        // Also mirror the changes into app_state.locums/practices.
        updateProfileData: function(profileId, newProfileData) {
            var getRes = _syncRequest('GET', '/rest/v1/profiles?id=eq.' + encodeURIComponent(profileId) + '&select=*');
            if (getRes.status !== 200 || !Array.isArray(getRes.body) || !getRes.body.length) {
                return { error: 'Profile not found' };
            }
            var p = getRes.body[0];

            var merged = Object.assign({}, p.profile_data || {}, newProfileData || {});
            var patchRes = _syncRequest('PATCH', '/rest/v1/profiles?id=eq.' + encodeURIComponent(profileId), {
                profile_data: merged
            });
            if (patchRes.status >= 400) {
                return { error: 'Failed to update profile (HTTP ' + patchRes.status + ')' };
            }

            // Mirror into blob if the user is already approved and present
            if (p.approval_status === 'approved') {
                var data = _fetchBlobSync();
                if (data) {
                    var arr = p.role === 'locum' ? (data.locums || []) : (data.practices || []);
                    var idx = arr.findIndex(function(u) { return u.email === p.email; });
                    if (idx !== -1) {
                        Object.keys(newProfileData || {}).forEach(function(k) {
                            arr[idx][k] = newProfileData[k];
                        });
                        _writeBlobSync(data);
                        _cache = data;
                        _lastFetchAt = Date.now();
                        try { localStorage.setItem('gprn_data', JSON.stringify(data)); } catch(e) {}
                    }
                }
            }
            return { success: true };
        },

        // Promote / demote admin (trigger allows this only when caller is already admin)
        setAdminFlag: function(profileId, isAdmin) {
            var patchRes = _syncRequest('PATCH', '/rest/v1/profiles?id=eq.' + encodeURIComponent(profileId), {
                is_admin: !!isAdmin
            });
            if (patchRes.status >= 400) {
                return { error: 'Failed to change admin flag (HTTP ' + patchRes.status + ')' };
            }
            return { success: true };
        },

        // Invoke the admin-actions Edge Function (service-role operations)
        //   action: 'reset_password' | 'delete_user' | 'resend_approval_email'
        callAdminAction: function(action, profileId) {
            var token = _getAccessToken();
            if (!token) return { error: 'Not signed in' };
            var xhr = new XMLHttpRequest();
            xhr.open('POST', SUPABASE_URL + '/functions/v1/admin-actions', false);
            xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
            xhr.setRequestHeader('Authorization', 'Bearer ' + token);
            xhr.setRequestHeader('Content-Type', 'application/json');
            try {
                xhr.send(JSON.stringify({ action: action, profile_id: profileId }));
            } catch (e) {
                return { error: 'Network error: ' + (e && e.message || e) };
            }
            var body = null;
            try { body = xhr.responseText ? JSON.parse(xhr.responseText) : null; } catch(e) { body = xhr.responseText; }
            if (xhr.status >= 400 || (body && body.error)) {
                return { error: (body && body.error) || ('Admin action failed (HTTP ' + xhr.status + ')') };
            }
            return body || { success: true };
        }
    };

    // ============================================================
    // On-load session revalidation
    //   If a user is logged in but their approval_status is no longer
    //   'approved' (e.g. admin revoked access from another device), kill
    //   the local session and bounce them to the pending page.
    // ============================================================
    (function revalidateSession() {
        if (!_getAccessToken()) return;

        var detailed = _fetchCurrentProfileDetailed();

        // Schema not applied yet — leave legacy sessions alone (Phase 1 compatibility)
        if (detailed.unavailable) return;

        // No profile row for this user → force logout
        if (detailed.missing) {
            _supabaseSignOut();
            return;
        }

        var profile = detailed.profile;
        if (profile.approval_status !== 'approved') {
            _supabaseSignOut();
            var path = window.location.pathname;
            var publicPages = ['login.html', 'pending-approval.html', 'register-locum.html', 'register-practice.html', 'index.html', 'forgot-password.html'];
            var isPublic = publicPages.some(function(pp) { return path.indexOf(pp) !== -1; });
            if (path === '/' || path === '') isPublic = true;
            if (!isPublic) {
                window.location.href = 'pending-approval.html';
            }
            return;
        }
        // Keep cached is_admin in sync with the server
        try {
            var raw = localStorage.getItem('gprn_session');
            if (raw) {
                var s = JSON.parse(raw);
                if (s.is_admin !== !!profile.is_admin) {
                    s.is_admin = !!profile.is_admin;
                    localStorage.setItem('gprn_session', JSON.stringify(s));
                }
            }
        } catch(e) {}
    })();

    // ============================================================
    // Debug handle
    // ============================================================
    // ============================================================
    // Fetch approved locum profiles from the profiles table
    // Returns array of locum objects (profile_data enriched with id/email)
    // Falls back to blob locums if profiles table is unavailable
    // ============================================================
    function _fetchApprovedLocums() {
        // If not authenticated, return empty — never show mock/fake locums
        if (!_getAccessToken()) return [];
        var res = _syncRequest('GET',
            '/rest/v1/profiles?role=eq.locum&approval_status=eq.approved&is_admin=eq.false&select=id,email,profile_data');
        if (res.status === 200 && Array.isArray(res.body)) {
            return res.body.map(function(row) {
                var pd = row.profile_data || {};
                pd.supabase_id = row.id;
                if (!pd.email) pd.email = row.email;
                return pd;
            });
        }
        console.warn('[Supabase] fetch approved locums failed', res.status, res.body);
        return [];
    }

    window.SupabaseClient = {
        url: SUPABASE_URL,
        refresh: function() { _cache = null; _lastFetchAt = 0; return window.getMockData(); },
        forceWrite: function(data) { _writeBlobAsync(data); },
        getCurrentProfile: function() { _profileCache = null; return _fetchCurrentProfile(); },
        getApprovedLocums: _fetchApprovedLocums
    };

    // ============================================================
    // Background refresh — pick up remote writes every 15s
    // ============================================================
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
                window.dispatchEvent(new CustomEvent('gprn:data-refreshed'));
            }
        }
    }, 15000);

    // ============================================================
    // Periodic approval revalidation (every 60s on active tab)
    //   Kills session if admin revoked access while user is logged in.
    // ============================================================
    setInterval(function() {
        if (!_getAccessToken()) return;
        if (document.hidden) return;
        _profileCache = null;
        var detailed = _fetchCurrentProfileDetailed();
        if (detailed.unavailable) return;   // schema not migrated; skip
        if (detailed.missing || detailed.profile.approval_status !== 'approved') {
            _supabaseSignOut();
            window.location.href = 'pending-approval.html';
        }
    }, 60000);
})();
