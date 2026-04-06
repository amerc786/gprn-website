// ============================================================
// GPRN Supabase Tables — Direct table CRUD (replaces blob access)
// Loaded AFTER supabase-client.js. Provides entity-specific functions
// that read/write individual Supabase tables with RLS protection.
//
// STRATEGY: Blob (app_state) is the source of truth for all data.
// When authenticated, reads try Supabase tables first, then fall back
// to blob. Writes ALWAYS go to blob, and also attempt table writes.
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
    // BLOB HELPERS — always-available fallback reads from app_state
    // ============================================================
    function _blobData() { return getMockData(); }

    // ============================================================
    // TABLE-SPECIFIC CRUD FUNCTIONS
    // Pattern: reads try table first, fall back to blob.
    //          writes ALWAYS write to blob, then attempt table write.
    // ============================================================

    // ---- MESSAGES ----
    var Messages = {
        getAll: function(userId) {
            var blobResult = (_blobData().messages || []).filter(function(m) {
                return (m.fromId === userId || m.toId === userId) && !(m._deletedFor || []).includes(userId);
            });
            if (!_hasAuth()) return blobResult;
            var res = _req('GET', '/rest/v1/messages?or=(from_id.eq.' + userId + ',to_id.eq.' + userId + ')&order=timestamp.asc');
            if (res.status === 200 && Array.isArray(res.body) && res.body.length) return _toCamelArray(res.body);
            return blobResult;
        },

        getByThread: function(threadId, userId) {
            var blobResult = (_blobData().messages || []).filter(function(m) {
                return m.threadId === threadId && !(m._deletedFor || []).includes(userId);
            });
            if (!_hasAuth()) return blobResult;
            var res = _req('GET', '/rest/v1/messages?thread_id=eq.' + encodeURIComponent(threadId) + '&order=timestamp.asc');
            if (res.status === 200 && Array.isArray(res.body) && res.body.length) return _toCamelArray(res.body);
            return blobResult;
        },

        insert: function(msg) {
            var data = _blobData();
            if (!data.messages) data.messages = [];
            data.messages.push(msg);
            saveMockData(data);
            if (_hasAuth()) {
                _req('POST', '/rest/v1/messages', _toSnake(msg), { 'Prefer': 'return=minimal' });
            }
        },

        markRead: function(threadId, userId) {
            var data = _blobData();
            (data.messages || []).forEach(function(m) {
                if (m.threadId === threadId && m.toId === userId) m.read = true;
            });
            saveMockData(data);
            if (_hasAuth()) {
                _req('PATCH', '/rest/v1/messages?thread_id=eq.' + encodeURIComponent(threadId) + '&to_id=eq.' + userId + '&read=eq.false',
                    { read: true });
            }
        },

        softDelete: function(threadId, userId) {
            var data = _blobData();
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
            if (_hasAuth()) {
                var msgs = this.getByThread(threadId, userId);
                msgs.forEach(function(m) {
                    var del = m._deletedFor || [];
                    if (!del.includes(userId)) {
                        del.push(userId);
                        _req('PATCH', '/rest/v1/messages?id=eq.' + encodeURIComponent(m.id), { deleted_for: del });
                    }
                });
            }
        },

        getUnreadCount: function(userId) {
            var blobCount = (_blobData().messages || []).filter(function(m) {
                return m.toId === userId && !m.read && !(m._deletedFor || []).includes(userId);
            }).length;
            if (!_hasAuth()) return blobCount;
            var res = _req('GET', '/rest/v1/messages?to_id=eq.' + userId + '&read=eq.false&select=id', { 'Prefer': 'count=exact' });
            if (res.status === 200 && Array.isArray(res.body) && res.body.length) return res.body.length;
            return blobCount;
        }
    };

    // ---- NOTIFICATIONS ----
    var Notifications = {
        getForUser: function(userId) {
            var blobResult = (_blobData().notifications || []).filter(function(n) { return n.userId === userId; });
            if (!_hasAuth()) return blobResult;
            var res = _req('GET', '/rest/v1/notifications?user_id=eq.' + userId + '&order=date.desc&limit=50');
            if (res.status === 200 && Array.isArray(res.body) && res.body.length) return _toCamelArray(res.body);
            return blobResult;
        },

        insert: function(notif) {
            var data = _blobData();
            if (!data.notifications) data.notifications = [];
            data.notifications.push(notif);
            saveMockData(data);
            if (_hasAuth()) {
                _reqAsync('POST', '/rest/v1/notifications', _toSnake(notif), { 'Prefer': 'return=minimal' });
            }
        },

        markRead: function(notifId) {
            var data = _blobData();
            var n = (data.notifications || []).find(function(n) { return n.id === notifId; });
            if (n) n.read = true;
            saveMockData(data);
            if (_hasAuth()) {
                _reqAsync('PATCH', '/rest/v1/notifications?id=eq.' + encodeURIComponent(notifId), { read: true });
            }
        },

        acknowledge: function(notifId) {
            var data = _blobData();
            var n = (data.notifications || []).find(function(n) { return n.id === notifId; });
            if (n) n.acknowledged = true;
            saveMockData(data);
            if (_hasAuth()) {
                _reqAsync('PATCH', '/rest/v1/notifications?id=eq.' + encodeURIComponent(notifId), { acknowledged: true });
            }
        }
    };

    // ---- OFFERS ----
    var Offers = {
        getForLocum: function(locumId) {
            var blobResult = (_blobData().offers || []).filter(function(o) { return o.locumId === locumId; });
            if (!_hasAuth()) return blobResult;
            var res = _req('GET', '/rest/v1/offers?locum_id=eq.' + locumId + '&order=created_at.desc');
            if (res.status === 200 && Array.isArray(res.body) && res.body.length) return _toCamelArray(res.body);
            return blobResult;
        },

        getForPractice: function(practiceId) {
            var blobResult = (_blobData().offers || []).filter(function(o) { return o.practiceId === practiceId; });
            if (!_hasAuth()) return blobResult;
            var res = _req('GET', '/rest/v1/offers?practice_id=eq.' + practiceId + '&order=created_at.desc');
            if (res.status === 200 && Array.isArray(res.body) && res.body.length) return _toCamelArray(res.body);
            return blobResult;
        },

        getForSessionNeed: function(needId) {
            var blobResult = (_blobData().offers || []).filter(function(o) { return o.sessionNeedId === needId; });
            if (!_hasAuth()) return blobResult;
            var res = _req('GET', '/rest/v1/offers?session_need_id=eq.' + encodeURIComponent(needId));
            if (res.status === 200 && Array.isArray(res.body) && res.body.length) return _toCamelArray(res.body);
            return blobResult;
        },

        getById: function(offerId) {
            var blobResult = (_blobData().offers || []).find(function(o) { return o.id === offerId; }) || null;
            if (!_hasAuth()) return blobResult;
            var res = _req('GET', '/rest/v1/offers?id=eq.' + encodeURIComponent(offerId));
            if (res.status === 200 && Array.isArray(res.body) && res.body.length) return _toCamel(res.body[0]);
            return blobResult;
        },

        insert: function(offer) {
            var data = _blobData();
            if (!data.offers) data.offers = [];
            data.offers.push(offer);
            saveMockData(data);
            if (_hasAuth()) {
                _req('POST', '/rest/v1/offers', _toSnake(offer), { 'Prefer': 'return=minimal' });
            }
        },

        update: function(offerId, fields) {
            var data = _blobData();
            var o = (data.offers || []).find(function(o) { return o.id === offerId; });
            if (o) Object.assign(o, fields);
            saveMockData(data);
            if (_hasAuth()) {
                _req('PATCH', '/rest/v1/offers?id=eq.' + encodeURIComponent(offerId), _toSnake(fields));
            }
        },

        getAll: function() {
            var blobResult = _blobData().offers || [];
            if (!_hasAuth()) return blobResult;
            var res = _req('GET', '/rest/v1/offers?order=created_at.desc&limit=500');
            if (res.status === 200 && Array.isArray(res.body) && res.body.length) return _toCamelArray(res.body);
            return blobResult;
        }
    };

    // ---- SESSION NEEDS ----
    var SessionNeeds = {
        getForPractice: function(practiceId) {
            var blobResult = (_blobData().sessionNeeds || _blobData().shifts || []).filter(function(s) { return s.practiceId === practiceId; });
            if (!_hasAuth()) return blobResult;
            var res = _req('GET', '/rest/v1/session_needs?practice_id=eq.' + practiceId + '&order=date.desc');
            if (res.status === 200 && Array.isArray(res.body) && res.body.length) return _toCamelArray(res.body);
            return blobResult;
        },

        getById: function(needId) {
            var blobResult = (_blobData().sessionNeeds || _blobData().shifts || []).find(function(s) { return s.id === needId; }) || null;
            if (!_hasAuth()) return blobResult;
            var res = _req('GET', '/rest/v1/session_needs?id=eq.' + encodeURIComponent(needId));
            if (res.status === 200 && Array.isArray(res.body) && res.body.length) return _toCamel(res.body[0]);
            return blobResult;
        },

        insert: function(need) {
            var data = _blobData();
            if (!data.sessionNeeds) data.sessionNeeds = [];
            data.sessionNeeds.push(need);
            saveMockData(data);
            if (_hasAuth()) {
                _req('POST', '/rest/v1/session_needs', _toSnake(need), { 'Prefer': 'return=minimal' });
            }
        },

        update: function(needId, fields) {
            var data = _blobData();
            var s = (data.sessionNeeds || data.shifts || []).find(function(s) { return s.id === needId; });
            if (s) Object.assign(s, fields);
            saveMockData(data);
            if (_hasAuth()) {
                _req('PATCH', '/rest/v1/session_needs?id=eq.' + encodeURIComponent(needId), _toSnake(fields));
            }
        },

        remove: function(needId) {
            var data = _blobData();
            data.sessionNeeds = (data.sessionNeeds || data.shifts || []).filter(function(s) { return s.id !== needId; });
            saveMockData(data);
            if (_hasAuth()) {
                _req('DELETE', '/rest/v1/session_needs?id=eq.' + encodeURIComponent(needId));
            }
        }
    };

    // ---- INVOICES ----
    var Invoices = {
        getForPractice: function(practiceId) {
            var blobResult = (_blobData().invoices || []).filter(function(i) { return i.practiceId === practiceId; });
            if (!_hasAuth()) return blobResult;
            var res = _req('GET', '/rest/v1/invoices?practice_id=eq.' + practiceId + '&order=created_at.desc');
            if (res.status === 200 && Array.isArray(res.body) && res.body.length) return _toCamelArray(res.body);
            return blobResult;
        },

        getForLocum: function(locumId) {
            var blobResult = (_blobData().invoices || []).filter(function(i) { return i.locumId === locumId; });
            if (!_hasAuth()) return blobResult;
            var res = _req('GET', '/rest/v1/invoices?locum_id=eq.' + locumId + '&order=created_at.desc');
            if (res.status === 200 && Array.isArray(res.body) && res.body.length) return _toCamelArray(res.body);
            return blobResult;
        },

        getById: function(invoiceId) {
            var blobResult = (_blobData().invoices || []).find(function(i) { return i.id === invoiceId; }) || null;
            if (!_hasAuth()) return blobResult;
            var res = _req('GET', '/rest/v1/invoices?id=eq.' + encodeURIComponent(invoiceId));
            if (res.status === 200 && Array.isArray(res.body) && res.body.length) return _toCamel(res.body[0]);
            return blobResult;
        },

        insert: function(invoice) {
            var data = _blobData();
            if (!data.invoices) data.invoices = [];
            data.invoices.push(invoice);
            saveMockData(data);
            if (_hasAuth()) {
                _req('POST', '/rest/v1/invoices', _toSnake(invoice), { 'Prefer': 'return=minimal' });
            }
        },

        update: function(invoiceId, fields) {
            var data = _blobData();
            var inv = (data.invoices || []).find(function(i) { return i.id === invoiceId; });
            if (inv) Object.assign(inv, fields);
            saveMockData(data);
            if (_hasAuth()) {
                _req('PATCH', '/rest/v1/invoices?id=eq.' + encodeURIComponent(invoiceId), _toSnake(fields));
            }
        }
    };

    // ---- FEEDBACK ----
    var Feedback = {
        getForUser: function(userId) {
            var blobResult = (_blobData().feedback || []).filter(function(f) { return f.toId === userId; });
            if (!_hasAuth()) return blobResult;
            var res = _req('GET', '/rest/v1/feedback?to_id=eq.' + userId + '&order=timestamp.desc');
            if (res.status === 200 && Array.isArray(res.body) && res.body.length) return _toCamelArray(res.body);
            return blobResult;
        },

        getFromUser: function(userId) {
            var blobResult = (_blobData().feedback || []).filter(function(f) { return f.fromId === userId; });
            if (!_hasAuth()) return blobResult;
            var res = _req('GET', '/rest/v1/feedback?from_id=eq.' + userId + '&order=timestamp.desc');
            if (res.status === 200 && Array.isArray(res.body) && res.body.length) return _toCamelArray(res.body);
            return blobResult;
        },

        getAll: function() {
            var blobResult = _blobData().feedback || [];
            if (!_hasAuth()) return blobResult;
            var res = _req('GET', '/rest/v1/feedback?order=timestamp.desc&limit=500');
            if (res.status === 200 && Array.isArray(res.body) && res.body.length) return _toCamelArray(res.body);
            return blobResult;
        },

        insert: function(fb) {
            var data = _blobData();
            if (!data.feedback) data.feedback = [];
            data.feedback.push(fb);
            saveMockData(data);
            if (_hasAuth()) {
                _req('POST', '/rest/v1/feedback', _toSnake(fb), { 'Prefer': 'return=minimal' });
            }
        }
    };

    // ---- AVAILABILITY ----
    var AvailabilityTable = {
        getForLocum: function(locumId) {
            var blobResult = (_blobData().availability || {})[locumId] || {};
            if (!_hasAuth()) return blobResult;
            var res = _req('GET', '/rest/v1/availability?locum_id=eq.' + locumId);
            if (res.status === 200 && Array.isArray(res.body) && res.body.length) {
                var obj = {};
                res.body.forEach(function(row) {
                    obj[row.date] = { am: row.am, pm: row.pm };
                });
                return obj;
            }
            return blobResult;
        },

        set: function(locumId, date, session, status) {
            // Always write to blob
            var data = _blobData();
            if (!data.availability) data.availability = {};
            if (!data.availability[locumId]) data.availability[locumId] = {};
            if (!data.availability[locumId][date]) data.availability[locumId][date] = { am: 'none', pm: 'none' };
            data.availability[locumId][date][session] = status;
            saveMockData(data);
            if (_hasAuth()) {
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
            }
        },

        get: function(locumId, date, session) {
            var blobAvail = (_blobData().availability || {})[locumId];
            var blobResult = blobAvail && blobAvail[date] ? (blobAvail[date][session] || 'none') : 'none';
            if (!_hasAuth()) return blobResult;
            var res = _req('GET', '/rest/v1/availability?locum_id=eq.' + locumId + '&date=eq.' + date);
            if (res.status === 200 && Array.isArray(res.body) && res.body.length) {
                return res.body[0][session] || 'none';
            }
            return blobResult;
        }
    };

    // ---- BARRED / PREFERRED LISTS ----
    var BarredTable = {
        isBarred: function(practiceId, locumId) {
            var blobResult = (((_blobData().barredLists || {})[practiceId]) || []).some(function(b) { return b.locumId === locumId; });
            if (!_hasAuth()) return blobResult;
            var res = _req('GET', '/rest/v1/barred_locums?practice_id=eq.' + practiceId + '&locum_id=eq.' + locumId);
            if (res.status === 200 && Array.isArray(res.body) && res.body.length > 0) return true;
            return blobResult;
        },

        bar: function(practiceId, locumId, reason) {
            var data = _blobData();
            if (!data.barredLists) data.barredLists = {};
            if (!data.barredLists[practiceId]) data.barredLists[practiceId] = [];
            data.barredLists[practiceId].push({ locumId: locumId, reason: reason, date: new Date().toISOString().split('T')[0] });
            saveMockData(data);
            if (_hasAuth()) {
                _req('POST', '/rest/v1/barred_locums', {
                    practice_id: practiceId, locum_id: locumId, reason: reason,
                    date: new Date().toISOString().split('T')[0]
                }, { 'Prefer': 'return=minimal' });
            }
        },

        unbar: function(practiceId, locumId) {
            var data = _blobData();
            if (data.barredLists && data.barredLists[practiceId]) {
                data.barredLists[practiceId] = data.barredLists[practiceId].filter(function(b) { return b.locumId !== locumId; });
            }
            saveMockData(data);
            if (_hasAuth()) {
                _req('DELETE', '/rest/v1/barred_locums?practice_id=eq.' + practiceId + '&locum_id=eq.' + locumId);
            }
        },

        getList: function(practiceId) {
            var blobResult = (_blobData().barredLists || {})[practiceId] || [];
            if (!_hasAuth()) return blobResult;
            var res = _req('GET', '/rest/v1/barred_locums?practice_id=eq.' + practiceId);
            if (res.status === 200 && Array.isArray(res.body) && res.body.length) {
                return res.body.map(function(r) { return { locumId: r.locum_id, reason: r.reason, date: r.date }; });
            }
            return blobResult;
        },

        isPreferred: function(practiceId, locumId) {
            var blobResult = ((_blobData().preferredLists || {})[practiceId] || []).includes(locumId);
            if (!_hasAuth()) return blobResult;
            var res = _req('GET', '/rest/v1/preferred_locums?practice_id=eq.' + practiceId + '&locum_id=eq.' + locumId);
            if (res.status === 200 && Array.isArray(res.body) && res.body.length > 0) return true;
            return blobResult;
        },

        addPreferred: function(practiceId, locumId) {
            var data = _blobData();
            if (!data.preferredLists) data.preferredLists = {};
            if (!data.preferredLists[practiceId]) data.preferredLists[practiceId] = [];
            if (!data.preferredLists[practiceId].includes(locumId)) data.preferredLists[practiceId].push(locumId);
            saveMockData(data);
            if (_hasAuth()) {
                _req('POST', '/rest/v1/preferred_locums', { practice_id: practiceId, locum_id: locumId }, { 'Prefer': 'return=minimal' });
            }
        },

        removePreferred: function(practiceId, locumId) {
            var data = _blobData();
            if (data.preferredLists && data.preferredLists[practiceId]) {
                data.preferredLists[practiceId] = data.preferredLists[practiceId].filter(function(id) { return id !== locumId; });
            }
            saveMockData(data);
            if (_hasAuth()) {
                _req('DELETE', '/rest/v1/preferred_locums?practice_id=eq.' + practiceId + '&locum_id=eq.' + locumId);
            }
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

    console.log('[SupaTables] Data access layer loaded. Auth:', _hasAuth() ? 'YES (table + blob)' : 'NO (blob only)');
})();
