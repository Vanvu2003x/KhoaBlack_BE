const express = require('express');
const { sendOTP } = require('../services/nodemailer.service');

const router = express.Router();

router.get('/', async (req, res) => {
  const { email, otp } = req.query;

  if (!email || !otp) {
    return res.status(400).json({ error: "Thiếu email hoặc OTP" });
  }

  try {
    await sendOTP(email, otp); 
    res.json({ success: true, message: "Đã gửi email OTP" });
  } catch (err) {
    console.error("Lỗi gửi mail:", err);
    res.status(500).json({ error: "Gửi mail thất bại" });
  }
});

module.exports = router;
