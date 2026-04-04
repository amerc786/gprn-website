var express = require('express');
var router = express.Router();
var bcrypt = require('bcryptjs');
var db = require('../db');
var auth = require('../middleware/auth');
var generateToken = auth.generateToken;
var authMiddleware = auth.authMiddleware;
var emailService = require('../services/email');

var SALT_ROUNDS = 10;

// POST /api/auth/login
router.post('/login', function(req, res) {
    try {
        var email = req.body.email;
        var password = req.body.password;
        var role = req.body.role;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        var user = db.findOne('users', function(u) { return u.email === email; });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (!bcrypt.compareSync(password, user.password_hash)) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (role && user.role !== role) {
            return res.status(401).json({ error: 'wrong_role', actualRole: user.role, message: 'This account is registered as a ' + user.role });
        }

        var profile = user.profile || {};
        var token = generateToken(user);

        var session = {
            id: user.id,
            role: user.role,
            email: user.email,
            name: user.role === 'locum'
                ? (profile.title + ' ' + profile.firstName + ' ' + profile.lastName)
                : profile.practiceName,
            firstName: user.role === 'locum' ? profile.firstName : (profile.contactName || '').split(' ')[0],
            token: token
        };

        res.json({ success: true, session: session, token: token });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ error: 'Login failed' });
    }
});

// POST /api/auth/register/locum
router.post('/register/locum', function(req, res) {
    try {
        var email = req.body.email;
        var password = req.body.password;
        var title = req.body.title || 'Dr';
        var firstName = req.body.firstName;
        var lastName = req.body.lastName;
        var phone = req.body.phone || '';
        var gmcNumber = req.body.gmcNumber || '';

        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({ error: 'Required fields missing' });
        }

        var existing = db.findOne('users', function(u) { return u.email === email; });
        if (existing) {
            return res.status(409).json({ error: 'An account with this email already exists' });
        }

        var id = 'loc-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
        var hash = bcrypt.hashSync(password, SALT_ROUNDS);

        var profile = {
            title: title,
            firstName: firstName,
            lastName: lastName,
            phone: phone,
            gmcNumber: gmcNumber,
            medicalSchool: req.body.medicalSchool || '',
            yearQualified: req.body.yearQualified || null,
            performerList: req.body.performerList || false,
            nhsPension: req.body.nhsPension || false,
            computerSystems: req.body.computerSystems || [],
            signingScripts: req.body.signingScripts || '',
            healthBoards: req.body.healthBoards || [],
            preferredShiftTypes: req.body.preferredShiftTypes || [],
            travelDistance: req.body.travelDistance || 30,
            bio: req.body.bio || '',
            bookingReliability: 100,
            responseTime: '< 1 day',
            totalShifts: 0,
            rates: req.body.rates || { am: 400, pm: 400, fullDay: 780, onCall: 40, housecall: 0 },
            practiceRates: {},
            documents: req.body.documents || {}
        };

        db.insert('users', {
            id: id,
            email: email,
            password_hash: hash,
            role: 'locum',
            profile: profile,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });

        var token = generateToken({ id: id, email: email, role: 'locum' });

        emailService.sendEmail(email, 'Welcome to GPRN',
            'Welcome to GPRN, ' + title + ' ' + firstName + '! Your account has been created.',
            'welcome', id).catch(function() {});

        var session = {
            id: id,
            role: 'locum',
            email: email,
            name: title + ' ' + firstName + ' ' + lastName,
            firstName: firstName,
            token: token
        };

        res.status(201).json({ success: true, session: session, token: token });
    } catch (err) {
        console.error('Registration error:', err.message);
        res.status(500).json({ error: 'Registration failed: ' + err.message });
    }
});

// POST /api/auth/register/practice
router.post('/register/practice', function(req, res) {
    try {
        var email = req.body.email;
        var password = req.body.password;
        var practiceName = req.body.practiceName;
        var healthBoard = req.body.healthBoard || '';
        var contactName = req.body.contactName || '';

        if (!email || !password || !practiceName) {
            return res.status(400).json({ error: 'Required fields missing' });
        }

        var existing = db.findOne('users', function(u) { return u.email === email; });
        if (existing) {
            return res.status(409).json({ error: 'An account with this email already exists' });
        }

        var id = 'prac-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
        var hash = bcrypt.hashSync(password, SALT_ROUNDS);

        var profile = {
            practiceName: practiceName,
            healthBoard: healthBoard,
            address: req.body.address || '',
            city: req.body.city || '',
            postcode: req.body.postcode || '',
            phone: req.body.phone || '',
            website: req.body.website || '',
            computerSystem: req.body.computerSystem || '',
            partners: req.body.partners || 1,
            patientListSize: req.body.patientListSize || 0,
            odsCode: req.body.odsCode || '',
            contactName: contactName,
            contactRole: req.body.contactRole || '',
            contactEmail: email,
            contactPhone: req.body.contactPhone || ''
        };

        db.insert('users', {
            id: id,
            email: email,
            password_hash: hash,
            role: 'practice',
            profile: profile,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });

        var token = generateToken({ id: id, email: email, role: 'practice' });

        emailService.sendEmail(email, 'Welcome to GPRN',
            'Welcome to GPRN! Your practice "' + practiceName + '" has been registered.',
            'welcome', id).catch(function() {});

        var session = {
            id: id,
            role: 'practice',
            email: email,
            name: practiceName,
            firstName: contactName.split(' ')[0],
            token: token
        };

        res.status(201).json({ success: true, session: session, token: token });
    } catch (err) {
        console.error('Registration error:', err.message);
        res.status(500).json({ error: 'Registration failed: ' + err.message });
    }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', function(req, res) {
    try {
        var email = req.body.email;
        if (!email) return res.status(400).json({ error: 'Email required' });

        var user = db.findOne('users', function(u) { return u.email === email; });
        if (!user) {
            return res.json({ success: true, message: 'If an account exists with this email, a reset link has been sent.' });
        }

        var token = 'reset-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 8);
        db.insert('reset_tokens', {
            email: email,
            token: token,
            used: false,
            created_at: new Date().toISOString()
        });

        emailService.sendEmail(email, 'Password Reset - GPRN',
            'A password reset was requested for your GPRN account. Your reset token is: ' + token + '. This token expires in 1 hour.',
            'password_reset', user.id).catch(function() {});

        res.json({ success: true, message: 'If an account exists with this email, a reset link has been sent.', token: token });
    } catch (err) {
        console.error('Forgot password error:', err.message);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

// POST /api/auth/reset-password
router.post('/reset-password', function(req, res) {
    try {
        var token = req.body.token;
        var newPassword = req.body.newPassword;
        if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password required' });
        if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

        var resetEntry = db.findOne('reset_tokens', function(r) { return r.token === token && !r.used; });
        if (!resetEntry) return res.status(400).json({ error: 'Invalid or expired reset token' });

        var created = new Date(resetEntry.created_at);
        if (Date.now() - created.getTime() > 3600000) {
            return res.status(400).json({ error: 'Reset token has expired. Please request a new one.' });
        }

        var hash = bcrypt.hashSync(newPassword, SALT_ROUNDS);
        db.update('users', function(u) { return u.email === resetEntry.email; }, { password_hash: hash, updated_at: new Date().toISOString() });
        db.update('reset_tokens', function(r) { return r.token === token; }, { used: true });

        res.json({ success: true, message: 'Password has been reset successfully' });
    } catch (err) {
        console.error('Reset password error:', err.message);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// GET /api/auth/me
router.get('/me', authMiddleware, function(req, res) {
    try {
        var user = db.findOne('users', function(u) { return u.id === req.user.id; });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ id: user.id, email: user.email, role: user.role, profile: user.profile || {} });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get user info' });
    }
});

// PUT /api/auth/profile
router.put('/profile', authMiddleware, function(req, res) {
    try {
        var profile = req.body.profile;
        if (!profile) return res.status(400).json({ error: 'Profile data required' });
        db.update('users', function(u) { return u.id === req.user.id; }, { profile: profile, updated_at: new Date().toISOString() });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// PUT /api/auth/password
router.put('/password', authMiddleware, function(req, res) {
    try {
        var currentPassword = req.body.currentPassword;
        var newPassword = req.body.newPassword;
        if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password required' });

        var user = db.findOne('users', function(u) { return u.id === req.user.id; });
        if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        var hash = bcrypt.hashSync(newPassword, SALT_ROUNDS);
        db.update('users', function(u) { return u.id === req.user.id; }, { password_hash: hash, updated_at: new Date().toISOString() });
        res.json({ success: true, message: 'Password changed successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to change password' });
    }
});

module.exports = router;
