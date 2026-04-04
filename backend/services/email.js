var nodemailer = require('nodemailer');
var db = require('../db');

var transporter = null;
var testAccount = null;

async function initEmail() {
    try {
        testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });
        console.log('Email service initialized (Ethereal test account)');
        console.log('View sent emails at: https://ethereal.email/login');
        console.log('Email: ' + testAccount.user);
        console.log('Password: ' + testAccount.pass);
        return true;
    } catch (err) {
        console.log('Email service unavailable (will log emails only):', err.message);
        return false;
    }
}

async function sendEmail(toEmail, subject, body, type, userId) {
    var emailId = 'email-' + Date.now() + Math.random().toString(36).substr(2, 5);

    // Log to database regardless
    try {
        db.insert('email_log', {
            id: emailId,
            to_user_id: userId || null,
            to_email: toEmail,
            subject: subject,
            body: body,
            type: type || 'general',
            status: 'sent',
            created_at: new Date().toISOString()
        });
    } catch (e) {
        console.error('Failed to log email:', e.message);
    }

    // Try to actually send if transporter is available
    if (transporter) {
        try {
            var info = await transporter.sendMail({
                from: '"GPRN Platform" <noreply@gprn.wales>',
                to: toEmail,
                subject: subject,
                text: body,
                html: '<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px;">' +
                    '<div style="text-align:center;margin-bottom:24px;">' +
                    '<span style="font-size:24px;font-weight:700;"><span style="color:#4F46E5;">GP</span>RN</span>' +
                    '</div>' +
                    '<div style="background:#f9f9f9;border-radius:8px;padding:24px;">' +
                    '<h2 style="color:#1a1a2e;margin-top:0;">' + subject + '</h2>' +
                    '<p style="color:#555;line-height:1.6;">' + body + '</p>' +
                    '</div>' +
                    '<p style="text-align:center;color:#999;font-size:12px;margin-top:24px;">' +
                    'This email was sent by GPRN. Do not reply to this email.' +
                    '</p>' +
                    '</div>'
            });
            var previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) {
                console.log('Email preview:', previewUrl);
            }
            return { success: true, previewUrl: previewUrl, emailId: emailId };
        } catch (err) {
            console.error('Email send failed:', err.message);
            return { success: false, error: err.message, emailId: emailId };
        }
    }

    return { success: true, emailId: emailId, note: 'Email logged (no SMTP configured)' };
}

module.exports = { initEmail: initEmail, sendEmail: sendEmail };
