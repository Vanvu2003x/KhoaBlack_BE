const rateLimit = require('express-rate-limit');

// General API limiter - 100 requests per 15 minutes
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3000,
    message: {
        status: false,
        message: "Quá nhiều request, vui lòng thử lại sau 15 phút"
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Auth limiter - 5 login attempts per 15 minutes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: {
        status: false,
        message: "Quá nhiều lần đăng nhập thất bại, vui lòng thử lại sau 15 phút"
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins
});

// OTP limiter - 3 OTP requests per 5 minutes (prevent spam)
const otpLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 3,
    message: {
        status: false,
        message: "Quá nhiều yêu cầu gửi OTP, vui lòng thử lại sau 5 phút"
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Order creation limiter - 10 orders per minute
const orderLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: {
        status: false,
        message: "Quá nhiều đơn hàng, vui lòng chờ 1 phút"
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    generalLimiter,
    authLimiter,
    otpLimiter,
    orderLimiter
};
