require('dotenv').config();
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET_KEY;

function generateToken(user) {
    const payload = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        balance : user.balance
    };

    const token = jwt.sign(payload, SECRET_KEY);
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
