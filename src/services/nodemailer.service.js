const { transporter } = require("../configs/nodomailer.config");

async function sendOTP(email, otp) {
  try {
    const info = await transporter.sendMail({
      from: '"XCode" <2003vanvu2018@gmail.com>',
      to: email,
      subject: "Xác thưc tài khoản XCode",
      text: `Bạn vừa đăng kí tài khoản trên Xcode. Đây là OTP của bạn, vui lòng đừng gửi mã này cho ai. OTP của bạn là ${otp}`,
      html: `<p>Bạn vừa đăng kí tài khoản trên <strong>Xcode</strong>.</p>
             <p>Mã OTP của bạn sẽ hết hạn trong 5p</p>
             <p>Mã OTP của bạn là: <strong>${otp}</strong></p>
             <p><em>Vui lòng không chia sẻ mã này với bất kỳ ai.</em></p>`,
    });

    console.log("✅ Email OTP đã gửi:", info.messageId);
    return info;
  } catch (error) {
    console.error("Lỗi gửi OTP:", error);
    throw error;
  }
}

module.exports = { sendOTP };
