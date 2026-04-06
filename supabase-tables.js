// ============================================================
// GPRN Supabase Tables — Direct table CRUD (replaces blob access)
// Loaded AFTER supabase-client.js. Provides entity-specific functions
// that read/write individual Supabase tables with RLS protection.
//
// When authenticated (access_token present), all functions query
// the dedicated tables. When not authenticated (local dev/demo),
// falls back to the blob via getMockData()/saveMockData().
// ============================================================

(function() {
    'use strict';

    // ---- Config (same as supabase-client.js) ----
    var SUPABASE_URL = 'https://fysilmypgpewbzyxkymx.supabase.co';
    var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5c2lsbXlwZ3Bld2J6eXhreW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzODQwNjYsImV4cCI6MjA5MDk2MDA2Nn0.BEgSiUO_RWvk0ixZSORuKFqwMG6nYNGsCqWCftukBnE';

    // ---- Detect if we have a real Supabase session ----
    function _hasAuth() {
        try {
            var s = JSON.parse(localStorage.getItem('gprn_session') || '{}');
            return !!(s && s.access_token);
        } catch(e) { return false; }
    }

    function _getToken() {
        try {
            var s = JSON.parse(localStorage.getItem('gprn_session') || '{}');
            return s.access_token || null;
        } catch(e) { return null; }
    }

    function _headers(extra) {
        var token = _getToken() || SUPABASE_ANON_KEY;
        var h = {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        };
        if (extra) Object.keys(extra).forEach(function(k) { h[k] = extra[k]; });
        return h;
    }

    // Synchronous REST helper (matches existing pattern in supabase-client.js)
    function _req(method, path, payload, extraHeaders) {
        var xhr = new XMLHttpRequest();
        xhr.open(method, SUPABASE_URL + path, false);
        var hdrs = _headers(extraHeaders);
        Object.keys(hdrs).forEach(function(k) { xhr.setRequestHeader(k, hdrs[k]); });
        try {
            xhr.send(payload != null ? JSON.stringify(payload) : null);
        } catch(e) {
            return { status: 0, body: null, error: e };
        }
        var body = null;
        try { body = xhr.responseText ? JSON.parse(xhr.responseText) : null; } catch(e) { body = xhr.responseText; }
        return { status: xhr.status, body: body };
    }

    // Async REST helper for writes (non-blocking)
    function _reqAsync(method, path, payload, extraHeaders) {
        var hdrs = _headers(extraHeaders);
        fetch(SUPABASE_URL + path, {
            method: method,
            headers: hdrs,
            body: payload != null ? JSON.stringify(payload) : undefined
        }).catch(function(e) {
            console.warn('[SupaTables] async ' + method + ' ' + path + ' failed:', e);
        });
    }

    // ---- camelCase ↔ snake_case converters ----
    function _toSnake(obj) {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
        var out = {};
        Object.keys(obj).forEach(function(k) {
            var sk = k.replace(/([A-Z])/g, '_$1').toLowerCase()
                      .replace('session_need_id', 'session_need_id')
                      .replace('_deleted_for', 'deleted_for')
                      .replace('_system', 'is_system')
                      .replace('_invoice_id', 'invoice_id');
            // Special mappings
            if (k === 'threadId') sk = 'thread_id';
            if (k === 'fromId') sk = 'from_id';
            if (k === 'toId') sk = 'to_id';
            if (k === 'shiftId') sk = 'shift_id';
            if (k === '_system') sk = 'is_system';
            if (k === '_deletedFor') sk = 'deleted_for';
            if (k === 'sessionNeedId') sk = 'session_need_id';
            if (k === 'locumId') sk = 'locum_id';
            if (k === 'practiceId') sk = 'practice_id';
            if (k === 'practiceName') sk = 'practice_name';
            if (k === 'healthBoard') sk = 'health_board';
            if (k === 'sessionDate') sk = 'session_date';
            if (k === 'shiftDate') sk = 'shift_date';
            if (k === 'startTime') sk = 'start_time';
            if (k === 'endTime') sk = 'end_time';
            if (k === 'sessionType') sk = 'session_type';
            if (k === 'proposedRate') sk = 'proposed_rate';
            if (k === 'locumPublishedRate') sk = 'locum_published_rate';
            if (k === 'agreedRate') sk = 'agreed_rate';
            if (k === 'housecallRate') sk = 'housecall_rate';
            if (k === 'initiatedBy') sk = 'initiated_by';
            if (k === 'sentDate') sk = 'sent_date';
            if (k === 'viewedDate') sk = 'viewed_date';
            if (k === 'expiresAt') sk = 'expires_at';
            if (k === 'acceptedDate') sk = 'accepted_date';
            if (k === 'confirmedDate') sk = 'confirmed_date';
            if (k === 'completedDate') sk = 'completed_date';
            if (k === 'completedBy') sk = 'completed_by';
            if (k === 'declinedDate') sk = 'declined_date';
            if (k === 'withdrawnDate') sk = 'withdrawn_date';
            if (k === 'autoWithdrawn') sk = 'auto_withdrawn';
            if (k === 'expiredDate') sk = 'expired_date';
            if (k === 'cancelledDate') sk = 'cancelled_date';
            if (k === 'cancelledBy') sk = 'cancelled_by';
            if (k === 'lateCancellation') sk = 'late_cancellation';
            if (k === 'noShowDate') sk = 'no_show_date';
            if (k === 'practiceMessage') sk = 'practice_message';
            if (k === 'offersCount') sk = 'offers_count';
            if (k === 'budgetRate') sk = 'budget_rate';
            if (k === 'createdDate') sk = 'created_date';
            if (k === 'userId') sk = 'user_id';
            if (k === 'invoiceNumber') sk = 'invoice_number';
            if (k === 'offerId') sk = 'offer_id';
            if (k === 'locumName') sk = 'locum_name';
            if (k === 'sessionRate') sk = 'session_rate';
            if (k === 'housecallFee') sk = 'housecall_fee';
            if (k === 'generatedDate') sk = 'generated_date';
            if (k === 'dueDate') sk = 'due_date';
            if (k === 'paidDate') sk = 'paid_date';
            if (k === 'disputeReason') sk = 'dispute_reason';
            if (k === 'fromRole') sk = 'from_role';
            if (k === 'fromId') sk = 'from_id';
            if (k === 'toId') sk = 'to_id';
            out[sk] = obj[k];
        });
        return out;
    }

    function _toCamel(obj) {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
        var out = {};
        Object.keys(obj).forEach(function(k) {
            var ck = k.replace(/_([a-z])/g, function(m, c) { return c.toUpperCase(); });
            // Special reverse mappings
            if (k === 'is_system') ck = '_system';
            if (k === 'deleted_for') ck = '_deletedFor';
            if (k === 'created_at') return; // skip internal field
            out[ck] = obj[k];
        });
        return out;
    }

    function _toCamelArray(arr) {
        if (!Array.isArray(arr)) return [];
        return arr.map(_toCamel);
    }

    // ============================================================
    // TABLE-SPECIFIC CRUD FUNCTIONS
    // Each function checks _hasAuth() — if no auth, falls back to blob.
    // ============================================================

    // ---- MESSAGES ----
    var Messages = {
        getAll: function(userId) {
            if (!_hasAuth()) return (getMockData().messages || []).filter(function(m) {
                return (m.fromId === userId || m.toId === userId) && !(m._deletedFor || []).includes(userId);
            });
            var res = _req('GET', '/rest/v1/messages?or=(from_id.eq.' + userId + ',to_id.eq.' + userId + ')&order=timestamp.asc');
            if (res.status === 200 && Array.isArray(res.body)) return _toCamelArray(res.body);
            return [];
        },

        getByThread: function(threadId, userId) {
            if (!_hasAuth()) return (getMockData().messages || []).filter(function(m) {
                return m.threadId === threadId && !(m._deletedFor || []).includes(userId);
            });
            var res = _req('GET', '/rest/v1/messages?thread_id=eq.' + encodeURIComponent(threadId) + '&order=timestamp.asc');
            if (res.status === 200 && Array.isArray(res.body)) return _toCamelArray(res.body);
            return [];
        },

        insert: function(msg) {
            if (!_hasAuth()) {
                var data = getMockData();
                if (!data.messages) data.messages = [];
                data.messages.push(msg);
                saveMockData(data);
                return;
            }
            var row = _toSnake(msg);
            _req('POST', '/rest/v1/messages', row, { 'Prefer': 'return=minimal' });
        },

        markRead: function(threadId, userId) {
            if (!_hasAuth()) {
                var data = getMockData();
                (data.messages || []).forEach(function(m) {
                    if (m.threadId === threadId && m.toId === userId) m.read = true;
                });
                saveMockData(data);
                return;
            }
            _req('PATCH', '/rest/v1/messages?thread_id=eq.' + encodeURIComponent(threadId) + '&to_id=eq.' + userId + '&read=eq.false',
                { read: true });
        },

        softDelete: function(threadId, userId) {
            if (!_hasAuth()) {
                var data = getMockData();
                (data.messages || []).forEach(function(m) {
                    if (m.threadId === threadId) {
                        if (!m._deletedFor) m._deletedFor = [];
                        if (!m._deletedFor.includes(userId)) m._deletedFor.push(userId);
                    }
                });
                data.messages = data.messages.filter(function(m) {
                    return !(m._deletedFor && m._deletedFor.includes(m.fromId) && m._deletedFor.includes(m.toId));
                });
                saveMockData(data);
                return;
            }
            // For Supabase, append userId to deleted_for array
            var msgs = this.getByThread(threadId, userId);
            msgs.forEach(function(m) {
                var del = m._deletedFor || [];
                if (!del.includes(userId)) {
                    del.push(userId);
                    _req('PATCH', '/rest/v1/messages?id=eq.' + encodeURIComponent(m.id), { deleted_for: del });
                }
            });
        },

        getUnreadCount: function(userId) {
            if (!_hasAuth()) {
                return (getMockData().messages || []).filter(function(m) {
                    return m.toId === userId && !m.read && !(m._deletedFor || []).includes(userId);
                }).length;
            }
            var res = _req('GET', '/rest/v1/messages?to_id=eq.' + userId + '&read=eq.false&select=id', { 'Prefer': 'count=exact' });
            if (res.status === 200 && Array.isArray(res.body)) return res.body.length;
            return 0;
        }
    };

    // ---- NOTIFICATIONS ----
    var Notifications = {
        getForUser: function(userId) {
            if (!_hasAuth()) return (getMockData().notifications || []).filter(function(n) { return n.userId === userId; });
            var res = _req('GET', '/rest/v1/notifications?user_id=eq.' + userId + '&order=date.desc&limit=50');
            if (res.status === 200 && Array.isArray(res.body)) return _toCamelArray(res.body);
            return [];
        },

        insert: function(notif) {
            if (!_hasAuth()) {
                var data = getMockData();
                if (!data.notifications) data.notifications = [];
                data.notifications.push(notif);
                saveMockData(data);
                return;
            }
            _reqAsync('POST', '/rest/v1/notifications', _toSnake(notif), { 'Prefer': 'return=minimal' });
        },

        markRead: function(notifId) {
            if (!_hasAuth()) {
                var data = getMockData();
                var n = (data.notifications || []).find(function(n) { return n.id === notifId; });
                if (n) n.read = true;
                saveMockData(data);
                return;
            }
            _reqAsync('PATCH', '/rest/v1/notifications?id=eq.' + encodeURIComponent(notifId), { read: true });
        },

        acknowledge: function(notifId) {
            if (!_hasAuth()) {
                var data = getMockData();
                var n = (data.notifications || []).find(function(n) { return n.id === notifId; });
                if (n) n.acknowledged = true;
                saveMockData(data);
                return;
            }
            _reqAsync('PATCH', '/rest/v1/notifications?id=eq.' + encodeURIComponent(notifId), { acknowledged: true });
        }
    };

    // ---- OFFERS ----
    var Offers = {
        getForLocum: function(locumId) {
            if (!_hasAuth()) return (getMockData().offers || []).filter(function(o) { return o.locumId === locumId; });
            var res = _req('GET', '/rest/v1/offers?locum_id=eq.' + locumId + '&order=created_at.desc');
            if (res.status === 200 && Array.isArray(res.body)) return _toCamelArray(res.body);
            return [];
        },

        getForPractice: function(practiceId) {
            if (!_hasAuth()) return (getMockData().offers || []).filter(function(o) { return o.practiceId === practiceId; });
            var res = _req('GET', '/rest/v1/offers?practice_id=eq.' + practiceId + '&order=created_at.desc');
            if (res.status === 200 && Array.isArray(res.body)) return _toCamelArray(res.body);
            return [];
        },

        getForSessionNeed: function(needId) {
            if (!_hasAuth()) return (getMockData().offers || []).filter(function(o) { return o.sessionNeedId === needId; });
            var res = _req('GET', '/rest/v1/offers?session_need_id=eq.' + encodeURIComponent(needId));
            if (res.status === 200 && Array.isArray(res.body)) return _toCamelArray(res.body);
            return [];
        },

        getById: function(offerId) {
            if (!_hasAuth()) return (getMockData().offers || []).find(function(o) { return o.id === offerId; }) || null;
            var res = _req('GET', '/rest/v1/offers?id=eq.' + encodeURIComponent(offerId));
            if (res.status === 200 && Array.isArray(res.body) && res.body.length) return _toCamel(res.body[0]);
            return null;
        },

        insert: function(offer) {
            if (!_hasAuth()) {
                var data = getMockData();
                if (!data.offers) data.offers = [];
                data.offers.push(offer);
                saveMockData(data);
                return;
            }
            _req('POST', '/rest/v1/offers', _toSnake(offer), { 'Prefer': 'return=minimal' });
        },

        update: function(offerId, fields) {
            if (!_hasAuth()) {
                var data = getMockData();
                var o = (data.offers || []).find(function(o) { return o.id === offerId; });
                if (o) Object.assign(o, fields);
                saveMockData(data);
                return;
            }
            _req('PATCH', '/rest/v1/offers?id=eq.' + encodeURIComponent(offerId), _toSnake(fields));
        },

        getAll: function() {
            if (!_hasAuth()) return getMockData().offers || [];
            // This will be filtered by RLS — user only sees their own
            var res = _req('GET', '/rest/v1/offers?order=created_at.desc&limit=500');
            if (res.status === 200 && Array.isArray(res.body)) return _toCamelArray(res.body);
            return [];
        }
    };

    // ---- SESSION NEEDS ----
    var SessionNeeds = {
        getForPractice: function(practiceId) {
            if (!_hasAuth()) return (getMockData().sessionNeeds || getMockData().shifts || []).filter(function(s) { return s.practiceId === practiceId; });
            var res = _req('GET', '/rest/v1/session_needs?practice_id=eq.' + practiceId + '&order=date.desc');
            if (res.status === 200 && Array.isArray(res.body)) return _toCamelArray(res.body);
            return [];
        },

        getById: function(needId) {
            if (!_hasAuth()) return (getMockData().sessionNeeds || getMockData().shifts || []).find(function(s) { return s.id === needId; }) || null;
            var res = _req('GET', '/rest/v1/session_needs?id=eq.' + encodeURIComponent(needId));
            if (res.status === 200 && Array.isArray(res.body) && res.body.length) return _toCamel(res.body[0]);
            return null;
        },

        insert: function(need) {
            if (!_hasAuth()) {
                var data = getMockData();
                if (!data.sessionNeeds) data.sessionNeeds = [];
                data.sessionNeeds.push(need);
                saveMockData(data);
                return;
            }
            _req('POST', '/rest/v1/session_needs', _toSnake(need), { 'Prefer': 'return=minimal' });
        },

        update: function(needId, fields) {
            if (!_hasAuth()) {
                var data = getMockData();
                var s = (data.sessionNeeds || data.shifts || []).find(function(s) { return s.id === needId; });
                if (s) Object.assign(s, fields);
                saveMockData(data);
                return;
            }
            _req('PATCH', '/rest/v1/session_needs?id=eq.' + encodeURIComponent(needId), _toSnake(fields));
        },

        remove: function(needId) {
            if (!_hasAuth()) {
                var data = getMockData();
                data.sessionNeeds = (data.sessionNeeds || data.shifts || []).filter(function(s) { return s.id !== needId; });
                saveMockData(data);
                return;
            }
            _req('DELETE', '/rest/v1/session_needs?id=eq.' + encodeURIComponent(needId));
        }
    };

    // ---- INVOICES ----
    var Invoices = {
        getForPractice: function(practiceId) {
            if (!_hasAuth()) return (getMockData().invoices || []).filter(function(i) { return i.practiceId === practiceId; });
            var res = _req('GET', '/rest/v1/invoices?practice_id=eq.' + practiceId + '&order=created_at.desc');
            if (res.status === 200 && Array.isArray(res.body)) return _toCamelArray(res.body);
            return [];
        },

        getForLocum: function(locumId) {
            if (!_hasAuth()) return (getMockData().invoices || []).filter(function(i) { return i.locumId === locumId; });
            var res = _req('GET', '/rest/v1/invoices?locum_id=eq.' + locumId + '&order=created_at.desc');
            if (res.status === 200 && Array.isArray(res.body)) return _toCamelArray(res.body);
            return [];
        },

        getById: function(invoiceId) {
            if (!_hasAuth()) return (getMockData().invoices || []).find(function(i) { return i.id === invoiceId; }) || null;
            var res = _req('GET', '/rest/v1/invoices?id=eq.' + encodeURIComponent(invoiceId));
            if (res.status === 200 && Array.isArray(res.body) && res.body.length) return _toCamel(res.body[0]);
            return null;
        },

        insert: function(invoice) {
            if (!_hasAuth()) {
                var data = getMockData();
                if (!data.invoices) data.invoices = [];
                data.invoices.push(invoice);
                saveMockData(data);
                return;
            }
            _req('POST', '/rest/v1/invoices', _toSnake(invoice), { 'Prefer': 'return=minimal' });
        },

        update: function(invoiceId, fields) {
            if (!_hasAuth()) {
                var data = getMockData();
                var inv = (data.invoices || []).find(function(i) { return i.id === invoiceId; });
                if (inv) Object.assign(inv, fields);
                saveMockData(data);
                return;
            }
            _req('PATCH', '/rest/v1/invoices?id=eq.' + encodeURIComponent(invoiceId), _toSnake(fields));
        }
    };

    // ---- FEEDBACK ----
    var Feedback = {
        getForUser: function(userId) {
            if (!_hasAuth()) return (getMockData().feedback || []).filter(function(f) { return f.toId === userId; });
            var res = _req('GET', '/rest/v1/feedback?to_id=eq.' + userId + '&order=timestamp.desc');
            if (res.status === 200 && Array.isArray(res.body)) return _toCamelArray(res.body);
            return [];
        },

        getFromUser: function(userId) {
            if (!_hasAuth()) return (getMockData().feedback || []).filter(function(f) { return f.fromId === userId; });
            var res = _req('GET', '/rest/v1/feedback?from_id=eq.' + userId + '&order=timestamp.desc');
            if (res.status === 200 && Array.isArray(res.body)) return _toCamelArray(res.body);
            return [];
        },

        getAll: function() {
            if (!_hasAuth()) return getMockData().feedback || [];
            var res = _req('GET', '/rest/v1/feedback?order=timestamp.desc&limit=500');
            if (res.status === 200 && Array.isArray(res.body)) return _toCamelArray(res.body);
            return [];
        },

        insert: function(fb) {
            if (!_hasAuth()) {
                var data = getMockData();
                if (!data.feedback) data.feedback = [];
                data.feedback.push(fb);
                saveMockData(data);
                return;
            }
            _req('POST', '/rest/v1/feedback', _toSnake(fb), { 'Prefer': 'return=minimal' });
        }
    };

    // ---- AVAILABILITY ----
    var AvailabilityTable = {
        getForLocum: function(locumId) {
            if (!_hasAuth()) return (getMockData().availability || {})[locumId] || {};
            var res = _req('GET', '/rest/v1/availability?locum_id=eq.' + locumId);
            if (res.status !== 200 || !Array.isArray(res.body)) return {};
            var obj = {};
            res.body.forEach(function(row) {
                obj[row.date] = { am: row.am, pm: row.pm };
            });
            return obj;
        },

        set: function(locumId, date, session, status) {
            if (!_hasAuth()) {
                var data = getMockData();
                if (!data.availability) data.availability = {};
                if (!data.availability[locumId]) data.availability[locumId] = {};
                if (!data.availability[locumId][date]) data.availability[locumId][date] = { am: 'none', pm: 'none' };
                data.availability[locumId][date][session] = status;
                saveMockData(data);
                return;
            }
            // Upsert: try to get existing row first
            var existing = _req('GET', '/rest/v1/availability?locum_id=eq.' + locumId + '&date=eq.' + date);
            if (existing.status === 200 && Array.isArray(existing.body) && existing.body.length) {
                var update = {};
                update[session] = status;
                _req('PATCH', '/rest/v1/availability?locum_id=eq.' + locumId + '&date=eq.' + date, update);
            } else {
                var row = { locum_id: locumId, date: date, am: 'none', pm: 'none' };
                row[session] = status;
                _req('POST', '/rest/v1/availability', row, { 'Prefer': 'return=minimal' });
            }
        },

        get: function(locumId, date, session) {
            if (!_hasAuth()) {
                var avail = (getMockData().availability || {})[locumId];
                return avail && avail[date] ? (avail[date][session] || 'none') : 'none';
            }
            var res = _req('GET', '/rest/v1/availability?locum_id=eq.' + locumId + '&date=eq.' + date);
            if (res.status === 200 && Array.isArray(res.body) && res.body.length) {
                return res.body[0][session] || 'none';
            }
            return 'none';
        }
    };

    // ---- BARRED / PREFERRED LISTS ----
    var BarredTable = {
        isBarred: function(practiceId, locumId) {
            if (!_hasAuth()) {
                var bl = (getMockData().barredLists || {})[practiceId] || [];
                return bl.some(function(b) { return b.locumId === locumId; });
            }
            var res = _req('GET', '/rest/v1/barred_locums?practice_id=eq.' + practiceId + '&locum_id=eq.' + locumId);
            return res.status === 200 && Array.isArray(res.body) && res.body.length > 0;
        },

        bar: function(practiceId, locumId, reason) {
            if (!_hasAuth()) {
                var data = getMockData();
                if (!data.barredLists) data.barredLists = {};
                if (!data.barredLists[practiceId]) data.barredLists[practiceId] = [];
                data.barredLists[practiceId].push({ locumId: locumId, reason: reason, date: new Date().toISOString().split('T')[0] });
                saveMockData(data);
                return;
            }
            _req('POST', '/rest/v1/barred_locums', {
                practice_id: practiceId, locum_id: locumId, reason: reason,
                date: new Date().toISOString().split('T')[0]
            }, { 'Prefer': 'return=minimal' });
        },

        unbar: function(practiceId, locumId) {
            if (!_hasAuth()) {
                var data = getMockData();
                if (data.barredLists && data.barredLists[practiceId]) {
                    data.barredLists[practiceId] = data.barredLists[practiceId].filter(function(b) { return b.locumId !== locumId; });
                }
                saveMockData(data);
                return;
            }
            _req('DELETE', '/rest/v1/barred_locums?practice_id=eq.' + practiceId + '&locum_id=eq.' + locumId);
        },

        getList: function(practiceId) {
            if (!_hasAuth()) return (getMockData().barredLists || {})[practiceId] || [];
            var res = _req('GET', '/rest/v1/barred_locums?practice_id=eq.' + practiceId);
            if (res.status === 200 && Array.isArray(res.body)) {
                return res.body.map(function(r) { return { locumId: r.locum_id, reason: r.reason, date: r.date }; });
            }
            return [];
        },

        isPreferred: function(practiceId, locumId) {
            if (!_hasAuth()) {
                return ((getMockData().preferredLists || {})[practiceId] || []).includes(locumId);
            }
            var res = _req('GET', '/rest/v1/preferred_locums?practice_id=eq.' + practiceId + '&locum_id=eq.' + locumId);
            return res.status === 200 && Array.isArray(res.body) && res.body.length > 0;
        },

        addPreferred: function(practiceId, locumId) {
            if (!_hasAuth()) {
                var data = getMockData();
                if (!data.preferredLists) data.preferredLists = {};
                if (!data.preferredLists[practiceId]) data.preferredLists[practiceId] = [];
                if (!data.preferredLists[practiceId].includes(locumId)) data.preferredLists[practiceId].push(locumId);
                saveMockData(data);
                return;
            }
            _req('POST', '/rest/v1/preferred_locums', { practice_id: practiceId, locum_id: locumId }, { 'Prefer': 'return=minimal' });
        },

        removePreferred: function(practiceId, locumId) {
            if (!_hasAuth()) {
                var data = getMockData();
                if (data.preferredLists && data.preferredLists[practiceId]) {
                    data.preferredLists[practiceId] = data.preferredLists[practiceId].filter(function(id) { return id !== locumId; });
                }
                saveMockData(data);
                return;
            }
            _req('DELETE', '/rest/v1/preferred_locums?practice_id=eq.' + practiceId + '&locum_id=eq.' + locumId);
        }
    };

    // ============================================================
    // Expose globally
    // ============================================================
    window.DB = {
        Messages: Messages,
        Notifications: Notifications,
        Offers: Offers,
        SessionNeeds: SessionNeeds,
        Invoices: Invoices,
        Feedback: Feedback,
        Availability: AvailabilityTable,
        Barred: BarredTable,
        hasAuth: _hasAuth
    };

    console.log('[SupaTables] Data access layer loaded. Auth:', _hasAuth() ? 'YES (table queries)' : 'NO (blob fallback)');
})();
