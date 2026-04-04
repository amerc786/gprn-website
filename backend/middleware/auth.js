const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'gprn-secret-key-change-in-production-2026';
const JWT_EXPIRY = '7d';

function generateToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
    );
}

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            req.user = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            // Token invalid, continue without auth
        }
    }
    next();
}

module.exports = { generateToken, authMiddleware, optionalAuth, JWT_SECRET };
