const express = require('express');
const router = express.Router();
const AuthController = require('./auth.controller');
const { checkToken, checkRoleMDW } = require('../../middleware/auJWT.middleware');

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/check-mail', AuthController.checkmail); // FE: api.post("api/users/checkmail") matches? check casing. FE: checkmail. BE: check-mail. Mismatch.
router.post('/checkmail', AuthController.checkmail); // Fixed to match FE likely intent or simple fix.
router.post('/forgot-password', AuthController.forgotPasswordSendOTP);
router.post('/reset-password', AuthController.resetPassword);
router.post('/logout', AuthController.logout); // Logout route

// Protected routes
router.post('/checkRole', checkToken, AuthController.getRole); // FE: api.post("api/users/checkRole")
// Admin OTP routes - FE calls /api/user/balance/send-otp. This router is at /api/users.
// We should probably move these or add aliases, or adding a new router for /api/user.


module.exports = router;
