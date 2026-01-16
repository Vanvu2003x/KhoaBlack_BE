const express = require('express');
const router = express.Router();
const UserController = require('./user.controller');
const { checkToken, checkRoleMDW } = require('../../middleware/auJWT.middleware');

// Public or Protected routes depending on logic. Assuming protected for user details.
// Based on old users.controller.js usage:
// getInfo requires verifyToken (req.user)
// getAllUser (admin?)
// updateUserRole (admin?)
// updateBalance (admin?)

router.get('/', checkToken, UserController.getInfo); // FE: api.get("/api/users")
router.get('/all', UserController.getAllUser);
router.put('/update-role/:id', checkToken, UserController.updateUserRole);
router.put('/:id/role', checkToken, UserController.updateUserRole); // FE calls this
router.get('/get-user', UserController.getUser);
router.post('/update-balance', UserController.updateBalance); // FE: api.put("/api/user/balance") - Mismatch verb and path.
router.get('/search', UserController.searchUser);
router.patch('/:id/toggle-lock', UserController.toggleUserLock); // FE: api.patch("/api/user/:id/toggle-lock")

// Balance adjustment OTP routes
const AuthController = require('../auth/auth.controller');
router.post('/balance/send-otp', checkToken, AuthController.sendAdminOTP);
router.post('/balance/verify-otp', checkToken, AuthController.verifyAdminOTP);
router.put('/balance', checkToken, UserController.updateBalance); // Frontend calls PUT /api/user/balance

module.exports = router;

