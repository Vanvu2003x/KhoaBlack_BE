require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // 587 thì để false, nếu dùng 465 thì true
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Lỗi xác thực transporter:", error);
  } else {
    console.log("✅ Sẵn sàng gửi email!");
  }
});

module.exports = { transporter };
