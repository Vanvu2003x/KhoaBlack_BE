const express = require('express');
const { 
  register, 
  login, 
  checkmail, 
  getRole, 
  forgotPasswordSendOTP, 
  resetPassword 
} = require('../../controllers/auth.controller');
const { checkToken } = require('../../middleware/auJWT.middleware');
const { getInfo } = require('../../controllers/users.controller');

const router = express.Router();

// ================== AUTH ==================
router.post("/register", register);
router.post("/login", login);
router.post('/checkmail', checkmail);
router.post('/checkRole', checkToken, getRole);

// ================== USER INFO ==================
router.get('/', checkToken, getInfo);

// ================== FORGOT PASSWORD ==================
router.post('/forgot-password', forgotPasswordSendOTP); // gửi OTP
router.post('/reset-password', resetPassword);         // nhập OTP + mật khẩu mới

module.exports = router;
