const express = require('express');
const router = express.Router();
const AuthController = require('./auth.controller');
const { checkToken, checkRoleMDW } = require('../../middleware/auJWT.middleware');
const { authLimiter, otpLimiter } = require('../../middleware/rateLimit.middleware');

// Public routes - with rate limiting
router.post('/register', AuthController.register);
router.post('/login', authLimiter, AuthController.login); // 5 attempts per 15 min
router.post('/check-mail', AuthController.checkmail); // Removed OTP limiter
router.post('/checkmail', AuthController.checkmail); // Removed OTP limiter
router.post('/forgot-password', AuthController.forgotPasswordSendOTP); // Removed OTP limiter
router.post('/reset-password', AuthController.resetPassword);
router.post('/logout', AuthController.logout);

// Protected routes
router.post('/checkRole', checkToken, AuthController.getRole);

module.exports = router;
