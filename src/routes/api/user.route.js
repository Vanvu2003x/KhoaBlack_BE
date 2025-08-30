const express = require('express');
const { checkRoleMDW } = require('../../middleware/auJWT.middleware');
const { 
  getAllUser, 
  updateUserRoleController, 
  getUser, 
  updateBalance, 
  searchUser,
} = require('../../controllers/users.controller');
const { sendAdminOTP, verifyAdminOTP } = require('../../controllers/auth.controller');
const router = express.Router();

// Cập nhật role user
router.put('/:id/role', checkRoleMDW, updateUserRoleController);

// Lấy danh sách user, lọc theo role query param
router.get('/', checkRoleMDW, getAllUser);

// Lấy user theo user_id query param
router.get('/id', checkRoleMDW, getUser);

// Gửi OTP xác thực admin trước khi cộng/trừ tiền
router.post('/balance/send-otp', checkRoleMDW,sendAdminOTP);

// Xác thực OTP admin
router.post('/balance/verify-otp', checkRoleMDW,verifyAdminOTP);

// Cập nhật số dư (cộng/trừ tiền)
router.put('/balance', checkRoleMDW, updateBalance);

router.get('/search', checkRoleMDW, searchUser);

module.exports = router;
