var express = require('express');
var cors = require('cors');
var path = require('path');
var db = require('./db');
var seed = require('./seed');
var emailService = require('./services/email');

var app = express();
var PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/api'));

// Serve static frontend files from parent directory
app.use(express.static(path.join(__dirname, '..')));

// SPA fallback
app.get('*', function(req, res) {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    var filePath = path.join(__dirname, '..', req.path);
    res.sendFile(filePath, function(err) {
        if (err) {
            res.sendFile(path.join(__dirname, '..', 'index.html'));
        }
    });
});

// Global error handler
app.use(function(err, req, res, next) {
    console.error('Server error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

// Initialize
async function start() {
    // Seed database if empty
    seed();

    // Initialize email service
    await emailService.initEmail();

    app.listen(PORT, function() {
        console.log('');
        console.log('=================================');
        console.log('  GPRN Backend Server Running');
        console.log('  http://localhost:' + PORT);
        console.log('=================================');
        console.log('');
        console.log('Demo credentials:');
        console.log('  Locum: sarah.williams@gprn.wales / Locum2026!');
        console.log('  Practice: manager@ringland.wales / Practice2026!');
        console.log('');
    });
}

start().catch(console.error);
