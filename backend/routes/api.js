var express = require('express');
var router = express.Router();
var multer = require('multer');
var path = require('path');
var fs = require('fs');
var db = require('../db');
var auth = require('../middleware/auth');
var authMiddleware = auth.authMiddleware;
var emailService = require('../services/email');

// Ensure uploads directory exists
var uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// File upload config
var storage = multer.diskStorage({
    destination: uploadsDir,
    filename: function(req, file, cb) {
        var ext = path.extname(file.originalname);
        cb(null, req.user.id + '-' + Date.now() + ext);
    }
});
var upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: function(req, file, cb) {
        var allowed = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
        var ext = path.extname(file.originalname).toLowerCase();
        cb(null, allowed.indexOf(ext) !== -1);
    }
});

// ============================================================
// DATA SYNC ENDPOINT
// ============================================================

// GET /api/data — Returns full data blob for authenticated user
router.get('/data', authMiddleware, function(req, res) {
    try {
        var data = buildFullDataBlob(req.user.id, req.user.role);
        res.json(data);
    } catch (err) {
        console.error('Data fetch error:', err.message);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// POST /api/data — Saves full data blob (sync from frontend)
router.post('/data', authMiddleware, function(req, res) {
    try {
        var incoming = req.body;
        if (!incoming) return res.status(400).json({ error: 'No data provided' });

        // Sync individual collections
        if (incoming.offers) syncOffers(incoming.offers);
        if (incoming.notifications) syncNotifications(incoming.notifications, req.user.id);
        if (incoming.invoices) syncInvoices(incoming.invoices);
        if (incoming.availability) syncAvailability(req.user.id, incoming.availability);
        if (incoming.barredLists) syncBarredLists(incoming.barredLists);
        if (incoming.preferredLists) syncPreferredLists(incoming.preferredLists);
        if (incoming.userSettings && incoming.userSettings[req.user.id]) {
            db.upsert('user_settings', 'user_id', {
                user_id: req.user.id,
                settings: incoming.userSettings[req.user.id]
            });
        }
        if (incoming.cpdInterests) syncCpdInterests(req.user.id, incoming.cpdInterests);
        if (incoming.feedback) syncFeedback(incoming.feedback);

        res.json({ success: true });
    } catch (err) {
        console.error('Data sync error:', err.message);
        res.status(500).json({ error: 'Failed to sync data' });
    }
});

// Helper: Build the full data blob matching frontend getMockData() structure
function buildFullDataBlob(userId, role) {
    var locumRows = db.findAll('users', function(u) { return u.role === 'locum'; });
    var practiceRows = db.findAll('users', function(u) { return u.role === 'practice'; });

    var locums = locumRows.map(function(u) {
        var p = u.profile || {};
        return Object.assign({ id: u.id, email: u.email, password: '********', role: 'locum' }, p);
    });

    var practices = practiceRows.map(function(u) {
        var p = u.profile || {};
        return Object.assign({ id: u.id, email: u.email, password: '********', role: 'practice' }, p);
    });

    var shiftRows = db.findAll('shifts').sort(function(a, b) { return (a.date || '').localeCompare(b.date || ''); });
    var shifts = shiftRows.map(function(s) {
        var d = s.data || {};
        return Object.assign({ id: s.id, practiceId: s.practice_id, practiceName: s.practice_name, healthBoard: s.health_board, city: s.city, date: s.date, startTime: s.start_time, endTime: s.end_time, sessionType: s.session_type, status: s.status }, d);
    });

    var offerRows = db.findAll('offers').sort(function(a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); });
    var offers = offerRows.map(function(o) {
        var d = o.data || {};
        return Object.assign({ id: o.id, shiftId: o.shift_id, locumId: o.locum_id, practiceId: o.practice_id, practiceName: o.practice_name, healthBoard: o.health_board, shiftDate: o.shift_date, sessionType: o.session_type, status: o.status }, d);
    });

    var notifRows = db.findAll('notifications').sort(function(a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); });
    var notifications = notifRows.map(function(n) {
        var d = n.data || {};
        return Object.assign({ id: n.id, userId: n.user_id, type: n.type, title: n.title, message: n.message, read: !!n.read, date: n.created_at }, d);
    });

    var invoiceRows = db.findAll('invoices').sort(function(a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); });
    var invoices = invoiceRows.map(function(i) {
        var d = i.data || {};
        return Object.assign({ id: i.id, invoiceNumber: i.invoice_number, offerId: i.offer_id, locumId: i.locum_id, practiceId: i.practice_id, amount: i.amount, status: i.status, date: i.date }, d);
    });

    var msgRows = db.findAll('messages').sort(function(a, b) { return (a.created_at || '').localeCompare(b.created_at || ''); });
    var messages = msgRows.map(function(m) {
        var d = m.data || {};
        return Object.assign({ id: m.id, threadId: m.thread_id, fromId: m.from_id, toId: m.to_id, subject: m.subject, body: m.body, date: m.created_at }, d);
    });

    var emailRows = db.findAll('email_log').sort(function(a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); }).slice(0, 100);
    var emailLog = emailRows.map(function(e) {
        return { id: e.id, toUserId: e.to_user_id, toEmail: e.to_email, subject: e.subject, body: e.body, type: e.type, status: e.status, date: e.created_at };
    });

    var feedbackRows = db.findAll('feedback').sort(function(a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); });
    var feedback = feedbackRows.map(function(f) {
        return { id: f.id, fromId: f.from_id, toId: f.to_id, offerId: f.offer_id, ratings: f.ratings || {}, comment: f.comment, date: f.created_at };
    });

    // Barred lists
    var barredRows = db.findAll('barred_lists');
    var barredLists = {};
    barredRows.forEach(function(b) {
        if (!barredLists[b.practice_id]) barredLists[b.practice_id] = [];
        barredLists[b.practice_id].push({ locumId: b.locum_id, reason: b.reason, date: b.created_at });
    });

    // Preferred lists
    var prefRows = db.findAll('preferred_lists');
    var preferredLists = {};
    prefRows.forEach(function(p) {
        if (!preferredLists[p.practice_id]) preferredLists[p.practice_id] = [];
        preferredLists[p.practice_id].push({ locumId: p.locum_id, date: p.created_at });
    });

    // Availability
    var availRows = db.findAll('availability', function(a) { return a.user_id === userId; });
    var availability = {};
    availability[userId] = {};
    availRows.forEach(function(a) { availability[userId][a.date] = a.status; });

    // User settings
    var settingsRow = db.findOne('user_settings', function(s) { return s.user_id === userId; });
    var userSettings = {};
    userSettings[userId] = settingsRow ? settingsRow.settings || {} : {};

    // CPD interests
    var cpdRows = db.findAll('cpd_interests', function(c) { return c.user_id === userId; });
    var cpdInterests = cpdRows.map(function(c) { return c.event_id; });

    // Job applications
    var jobAppRows = db.findAll('job_applications', function(j) { return j.user_id === userId; });
    var jobApplications = jobAppRows.map(function(j) { return { jobId: j.job_id, message: j.message }; });

    // Shift templates
    var templateRows = db.findAll('shift_templates', function(t) { return t.practice_id === userId; });
    var shiftTemplates = {};
    shiftTemplates[userId] = templateRows.map(function(t) {
        return Object.assign({ id: t.id, name: t.name }, t.data || {});
    });

    // Static data
    var cpdEvents = [
        { id: 'cpd-001', title: 'Revalidation Support Unit (RSU)', provider: 'Health Education and Improvement Wales (HEIW)', type: 'web', description: 'For eLearning resources, webinars and events please register on Y Ty Dysgu.', url: 'https://heiw.nhs.wales', healthBoard: null },
        { id: 'cpd-002', title: 'Emergency Skills Workshop', provider: 'Aneurin Bevan UHB', type: 'event', date: '2026-04-25', time: '09:00 - 17:00', location: 'Royal Gwent Hospital, Newport', description: 'Hands-on workshop covering emergency procedures for primary care GPs.', healthBoard: 'Aneurin Bevan' },
        { id: 'cpd-003', title: 'Dermatology Masterclass', provider: 'Cardiff and Vale UHB', type: 'event', date: '2026-05-10', time: '13:00 - 17:00', location: 'University Hospital of Wales, Cardiff', description: 'Advanced dermatology session covering common and rare presentations.', healthBoard: 'Cardiff and Vale' },
        { id: 'cpd-004', title: 'Mental Health in Primary Care', provider: 'Swansea Bay UHB', type: 'event', date: '2026-05-22', time: '09:30 - 16:30', location: 'Singleton Hospital, Swansea', description: 'Full day course on managing mental health conditions in GP settings.', healthBoard: 'Swansea Bay' },
        { id: 'cpd-005', title: 'Safeguarding Level 3 Update', provider: 'Betsi Cadwaladr UHB', type: 'event', date: '2026-06-05', time: '09:00 - 13:00', location: 'Wrexham Maelor Hospital', description: 'Mandatory safeguarding training update for all GPs.', healthBoard: 'Betsi Cadwaladr' }
    ];

    var jobs = [
        { id: 'job-001', practiceName: 'Trosnant Lodge', healthBoard: 'Aneurin Bevan', title: 'Salaried GP - Maternity Cover', type: 'Maternity Cover', sessions: '4-6 sessions per week', duration: 'From July 2026 for minimum 6 months', salary: 'Competitive, dependent on experience', closingDate: '2026-05-01', description: 'We are looking for a reliable salaried GP to cover maternity leave.', contactEmail: 'admin@trosnant.wales' },
        { id: 'job-002', practiceName: 'Wrexham Town Surgery', healthBoard: 'Betsi Cadwaladr', title: 'GP Partner', type: 'Partnership', sessions: '8 sessions per week', duration: 'Permanent', salary: 'Full PMS contract share', closingDate: '2026-05-15', description: 'Exciting opportunity to join a forward-thinking practice as a full partner.', contactEmail: 'admin@wrexhamtown.wales' },
        { id: 'job-003', practiceName: 'Radyr Medical Centre', healthBoard: 'Cardiff and Vale', title: 'Salaried GP', type: 'Permanent', sessions: '6 sessions per week', duration: 'Permanent', salary: '\u00a370,000 - \u00a380,000 pro rata', closingDate: '2026-04-30', description: 'Friendly semi-rural practice seeking a salaried GP.', contactEmail: 'admin@radyrmedical.wales' },
        { id: 'job-004', practiceName: 'Aberystwyth Medical Centre', healthBoard: 'Hywel Dda', title: 'Locum GP - Long Term', type: 'Long-Term Locum', sessions: '5 sessions per week', duration: '12 months initially', salary: '\u00a3450 per session', closingDate: '2026-04-20', description: 'We need a reliable long-term locum. Beautiful coastal location.', contactEmail: 'admin@aberystwyth.wales' }
    ];

    var healthBoards = [
        { name: 'Aneurin Bevan', locumCount: 414 }, { name: 'Betsi Cadwaladr', locumCount: 266 },
        { name: 'Cardiff and Vale', locumCount: 437 }, { name: 'Cwm Taf Morgannwg', locumCount: 425 },
        { name: 'Hywel Dda', locumCount: 309 }, { name: 'Powys', locumCount: 276 }, { name: 'Swansea Bay', locumCount: 354 }
    ];

    return {
        locums: locums, practices: practices, shifts: shifts, offers: offers,
        notifications: notifications, messages: messages, emailLog: emailLog, invoices: invoices,
        feedback: feedback, barredLists: barredLists, preferredLists: preferredLists,
        availability: availability, shiftTemplates: shiftTemplates,
        cpdEvents: cpdEvents, cpdInterests: cpdInterests, jobs: jobs,
        jobApplications: jobApplications, healthBoards: healthBoards,
        userSettings: userSettings, reportedShifts: []
    };
}

// Sync helpers
function syncOffers(items) {
    if (!Array.isArray(items)) return;
    for (var i = 0; i < items.length; i++) {
        var o = items[i];
        if (!o.id) continue;
        var record = {
            id: o.id,
            shift_id: o.shiftId || null,
            locum_id: o.locumId || null,
            practice_id: o.practiceId || null,
            practice_name: o.practiceName || null,
            health_board: o.healthBoard || null,
            shift_date: o.shiftDate || null,
            session_type: o.sessionType || null,
            status: o.status || 'pending',
            updated_at: new Date().toISOString()
        };
        // Extract extra fields into data
        var known = ['id', 'shiftId', 'locumId', 'practiceId', 'practiceName', 'healthBoard', 'shiftDate', 'sessionType', 'status'];
        var data = {};
        for (var key in o) {
            if (known.indexOf(key) === -1) data[key] = o[key];
        }
        record.data = data;
        db.upsert('offers', 'id', record);
    }
}

function syncNotifications(items, userId) {
    if (!Array.isArray(items)) return;
    for (var i = 0; i < items.length; i++) {
        var n = items[i];
        if (!n.id) continue;
        var known = ['id', 'userId', 'type', 'title', 'message', 'read', 'date'];
        var data = {};
        for (var key in n) {
            if (known.indexOf(key) === -1) data[key] = n[key];
        }
        db.upsert('notifications', 'id', {
            id: n.id,
            user_id: n.userId || userId,
            type: n.type || '',
            title: n.title || '',
            message: n.message || '',
            read: !!n.read,
            data: data,
            created_at: n.date || new Date().toISOString()
        });
    }
}

function syncInvoices(items) {
    if (!Array.isArray(items)) return;
    for (var i = 0; i < items.length; i++) {
        var inv = items[i];
        if (!inv.id) continue;
        var known = ['id', 'invoiceNumber', 'offerId', 'locumId', 'practiceId', 'amount', 'status', 'date'];
        var data = {};
        for (var key in inv) {
            if (known.indexOf(key) === -1) data[key] = inv[key];
        }
        db.upsert('invoices', 'id', {
            id: inv.id,
            invoice_number: inv.invoiceNumber || null,
            offer_id: inv.offerId || null,
            locum_id: inv.locumId || null,
            practice_id: inv.practiceId || null,
            amount: inv.amount || 0,
            status: inv.status || 'pending',
            date: inv.date || null,
            data: data,
            created_at: inv.date || new Date().toISOString()
        });
    }
}

function syncAvailability(userId, availability) {
    if (!availability || !availability[userId]) return;
    var entries = availability[userId];
    for (var date in entries) {
        if (entries[date]) {
            db.insertIgnore('availability',
                function(a) { return a.user_id === userId && a.date === date; },
                { user_id: userId, date: date, status: entries[date] }
            );
            // Also update if it exists
            db.update('availability',
                function(a) { return a.user_id === userId && a.date === date; },
                { status: entries[date] }
            );
        }
    }
}

function syncBarredLists(barredLists) {
    if (!barredLists) return;
    for (var practiceId in barredLists) {
        var list = barredLists[practiceId];
        if (!Array.isArray(list)) continue;
        for (var i = 0; i < list.length; i++) {
            var entry = list[i];
            db.insertIgnore('barred_lists',
                function(b) { return b.practice_id === practiceId && b.locum_id === entry.locumId; },
                { practice_id: practiceId, locum_id: entry.locumId, reason: entry.reason || null, created_at: new Date().toISOString() }
            );
        }
    }
}

function syncPreferredLists(preferredLists) {
    if (!preferredLists) return;
    for (var practiceId in preferredLists) {
        var list = preferredLists[practiceId];
        if (!Array.isArray(list)) continue;
        for (var i = 0; i < list.length; i++) {
            var entry = list[i];
            db.insertIgnore('preferred_lists',
                function(p) { return p.practice_id === practiceId && p.locum_id === entry.locumId; },
                { practice_id: practiceId, locum_id: entry.locumId, created_at: new Date().toISOString() }
            );
        }
    }
}

function syncCpdInterests(userId, interests) {
    if (!Array.isArray(interests)) return;
    for (var i = 0; i < interests.length; i++) {
        var eventId = interests[i];
        db.insertIgnore('cpd_interests',
            function(c) { return c.user_id === userId && c.event_id === eventId; },
            { user_id: userId, event_id: eventId, created_at: new Date().toISOString() }
        );
    }
}

function syncFeedback(feedback) {
    if (!Array.isArray(feedback)) return;
    for (var i = 0; i < feedback.length; i++) {
        var f = feedback[i];
        if (!f.id) continue;
        db.upsert('feedback', 'id', {
            id: f.id,
            from_id: f.fromId || '',
            to_id: f.toId || '',
            offer_id: f.offerId || null,
            ratings: f.ratings || {},
            comment: f.comment || '',
            created_at: f.date || new Date().toISOString()
        });
    }
}

// ============================================================
// INDIVIDUAL REST ENDPOINTS
// ============================================================

// --- Shifts ---
router.post('/shifts', authMiddleware, function(req, res) {
    try {
        var shiftId = req.body.id || 'shift-' + Date.now();
        var known = ['id', 'practiceId', 'practiceName', 'healthBoard', 'city', 'date', 'startTime', 'endTime', 'sessionType'];
        var data = {};
        for (var key in req.body) {
            if (known.indexOf(key) === -1) data[key] = req.body[key];
        }

        db.insert('shifts', {
            id: shiftId,
            practice_id: req.body.practiceId || req.user.id,
            practice_name: req.body.practiceName || '',
            health_board: req.body.healthBoard || '',
            city: req.body.city || '',
            date: req.body.date,
            start_time: req.body.startTime || '',
            end_time: req.body.endTime || '',
            session_type: req.body.sessionType || '',
            status: 'open',
            data: data,
            created_at: new Date().toISOString()
        });
        res.status(201).json({ success: true, id: shiftId });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create shift: ' + err.message });
    }
});

router.delete('/shifts/:id', authMiddleware, function(req, res) {
    try {
        var shift = db.findOne('shifts', function(s) { return s.id === req.params.id && s.practice_id === req.user.id; });
        if (!shift) return res.status(404).json({ error: 'Shift not found' });

        var acceptedCount = db.count('offers', function(o) {
            return o.shift_id === req.params.id && ['accepted', 'acknowledged', 'confirmed'].indexOf(o.status) !== -1;
        });
        if (acceptedCount > 0) {
            return res.status(400).json({ error: 'has_accepted_offers', message: 'Cannot delete shift with accepted offers' });
        }

        // Withdraw pending offers
        db.update('offers',
            function(o) { return o.shift_id === req.params.id && o.status === 'pending'; },
            { status: 'withdrawn' }
        );

        // Mark shift as cancelled
        db.update('shifts', function(s) { return s.id === req.params.id; }, { status: 'cancelled' });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete shift' });
    }
});

// --- File Upload ---
router.post('/upload', authMiddleware, upload.single('document'), function(req, res) {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        var docId = 'doc-' + Date.now() + Math.random().toString(36).substr(2, 5);
        var docType = req.body.type || 'general';

        db.insert('documents', {
            id: docId,
            user_id: req.user.id,
            doc_type: docType,
            original_name: req.file.originalname,
            stored_path: req.file.filename,
            expiry: req.body.expiry || null,
            created_at: new Date().toISOString()
        });

        res.json({
            success: true,
            document: {
                id: docId,
                type: docType,
                name: req.file.originalname,
                path: '/uploads/' + req.file.filename,
                size: req.file.size
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Upload failed: ' + err.message });
    }
});

// --- Email sending ---
router.post('/email/send', authMiddleware, function(req, res) {
    var toEmail = req.body.toEmail;
    var subject = req.body.subject;
    var body = req.body.body;
    var type = req.body.type;
    var toUserId = req.body.toUserId;

    if (!toEmail || !subject) return res.status(400).json({ error: 'Email and subject required' });

    emailService.sendEmail(toEmail, subject, body || '', type || 'general', toUserId || null)
        .then(function(result) { res.json(result); })
        .catch(function(err) { res.status(500).json({ error: 'Email failed: ' + err.message }); });
});

// --- Messages ---
router.post('/messages', authMiddleware, function(req, res) {
    try {
        var toId = req.body.toId;
        var subject = req.body.subject;
        var body = req.body.body;
        var shiftId = req.body.shiftId;

        if (!toId || !body) return res.status(400).json({ error: 'Recipient and message body required' });

        var msgId = 'msg-' + Date.now() + Math.random().toString(36).substr(2, 5);
        var threadId = req.body.threadId || 'thread-' + Date.now();

        db.insert('messages', {
            id: msgId,
            thread_id: threadId,
            from_id: req.user.id,
            to_id: toId,
            subject: subject || '',
            body: body,
            data: { shiftId: shiftId || null },
            created_at: new Date().toISOString()
        });

        db.insert('notifications', {
            id: 'notif-' + Date.now() + Math.random().toString(36).substr(2, 5),
            user_id: toId,
            type: 'message',
            title: 'New Message',
            message: 'You have a new message' + (subject ? ': ' + subject : ''),
            read: false,
            data: {},
            created_at: new Date().toISOString()
        });

        res.json({ success: true, id: msgId, threadId: threadId });
    } catch (err) {
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// --- Job applications ---
router.post('/jobs/:id/interest', authMiddleware, function(req, res) {
    try {
        var message = req.body.message || '';
        db.insertIgnore('job_applications',
            function(j) { return j.user_id === req.user.id && j.job_id === req.params.id; },
            { user_id: req.user.id, job_id: req.params.id, message: message, created_at: new Date().toISOString() }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to register interest' });
    }
});

// --- CPD registration ---
router.post('/cpd/:id/register', authMiddleware, function(req, res) {
    try {
        db.insertIgnore('cpd_interests',
            function(c) { return c.user_id === req.user.id && c.event_id === req.params.id; },
            { user_id: req.user.id, event_id: req.params.id, created_at: new Date().toISOString() }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to register interest' });
    }
});

// --- Notifications ---
router.put('/notifications/read-all', authMiddleware, function(req, res) {
    try {
        db.update('notifications', function(n) { return n.user_id === req.user.id; }, { read: true });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to mark notifications read' });
    }
});

// --- Settings ---
router.get('/settings', authMiddleware, function(req, res) {
    try {
        var row = db.findOne('user_settings', function(s) { return s.user_id === req.user.id; });
        res.json(row ? row.settings || {} : {});
    } catch (err) {
        res.status(500).json({ error: 'Failed to get settings' });
    }
});

router.put('/settings', authMiddleware, function(req, res) {
    try {
        db.upsert('user_settings', 'user_id', {
            user_id: req.user.id,
            settings: req.body
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

// --- Audit log ---
router.post('/audit', authMiddleware, function(req, res) {
    try {
        db.insert('audit_log', {
            entity_type: req.body.entityType || '',
            entity_id: req.body.entityId || '',
            action: req.body.action || '',
            actor_id: req.user.id,
            data: req.body.data || {},
            created_at: new Date().toISOString()
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to log audit' });
    }
});

module.exports = router;
