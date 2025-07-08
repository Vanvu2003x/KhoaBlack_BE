require('dotenv').config();
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET_KEY;

// Hàm tạo token
function generateToken(user) {
    const payload = {
        id: user.id,
        email: user.email,
    };

    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });
    return token;
}

// Hàm giải mã và xác thực token
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
