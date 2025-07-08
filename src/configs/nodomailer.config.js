const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, 
  auth: {
    user: "2003vanvu2018@gmail.com",     
    pass: "zmqs pszu xzkr zexc",        
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("Lỗi xác thực transporter:", error);
  } else {
    console.log("✅ Sẵn sàng gửi email!");
  }
});

module.exports = { transporter };
