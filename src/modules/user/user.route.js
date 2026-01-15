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
router.get('/get-user', UserController.getUser);
router.post('/update-balance', UserController.updateBalance); // FE: api.put("/api/user/balance") - Mismatch verb and path.
router.get('/search', UserController.searchUser);

module.exports = router;
