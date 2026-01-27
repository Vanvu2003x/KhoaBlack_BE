require('dotenv').config();
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET_KEY;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d'; // Default 7 days

function generateToken(user) {
    const payload = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
        // NOTE: Balance removed - always fetch from DB for accuracy
    };

    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: JWT_EXPIRY });
    return token;
}

function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        return { valid: true, decoded };
    } catch (err) {
        return { valid: false, error: err.message };
    }
}

module.exports = {
    generateToken,
    verifyToken
};
