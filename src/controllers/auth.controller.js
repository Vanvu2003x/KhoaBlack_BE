const bcrypt = require("bcrypt");
const {
  addUser,
  getUserByUsername,
  checkEmail,
  getInfoUser,
  changeHashPassword, 
} = require("../models/user.model");
const { generateToken } = require("../services/jwt.service");
const { sendOTP, sendOTPRePass } = require("../services/nodemailer.service");
const client = require("../configs/redis.config");

// ================== ADMIN SEND OTP FOR BALANCE CHANGE ==================
async function sendAdminOTP(req, res) {
  try {
    // Lấy thông tin user từ token (middleware auJWT đã decode sẵn req.user)
    const user_id = req.user.id;
    const user = await getInfoUser(user_id);

    if (!user) {
      return res.status(404).json({ message: "User không tồn tại" });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ message: "Bạn không có quyền thực hiện thao tác này" });
    }

    const email = user.email;

    // Tạo OTP
    const otp = Math.floor(100000 + Math.random() * 900000);

    // Lưu OTP vào Redis, hết hạn sau 5 phút
    await client.set(`otp:admin:${email}`, otp, { EX: 300 });

    // Gửi OTP qua email user đang đăng nhập
    await sendOTP(email, otp);

    console.log("Admin OTP:", otp);

    return res.json({ status: "ok", message: "Đã gửi OTP xác thực đến email admin" });
  } catch (error) {
    console.error("sendAdminOTP Error:", error);
    return res.status(500).json({ status: "error", message: "Lỗi server" });
  }
}

// ================== VERIFY ADMIN OTP BEFORE BALANCE CHANGE ==================
async function verifyAdminOTP(req, res) {
  const { otp } = req.body;

  if (!otp) {
    return res.status(400).json({ message: "OTP là bắt buộc" });
  }

  try {
    const user_id = req.user.id;
    const user = await getInfoUser(user_id);

    if (!user) {
      return res.status(404).json({ message: "User không tồn tại" });
    }

    const savedOTP = await client.get(`otp:admin:${user.email}`);

    if (!savedOTP || savedOTP !== otp) {
      return res.status(400).json({ message: "OTP không đúng hoặc đã hết hạn" });
    }

    // Xóa OTP để tránh dùng lại
    await client.del(`otp:admin:${user.email}`);

    return res.json({ status: "ok", message: "Xác thực OTP thành công, có thể cộng/trừ tiền" });
  } catch (error) {
    console.error("verifyAdminOTP Error:", error);
    return res.status(500).json({ status: "error", message: "Lỗi server" });
  }
}


// ================== REGISTER ==================
async function register(req, res) {
  try {
    const data = req.body;

    if (!data.name || !data.password || !data.email) {
      return res.status(400).json({ message: "Tên, Email và mật khẩu là bắt buộc." });
    }

    if (!data.otp) {
      return res.status(400).json({ message: "OTP là bắt buộc." });
    }

    const otp = await client.get(`otp:${data.email}`);
    if (data.otp != otp) {
      return res.status(400).json({ message: "Mã OTP không đúng" });
    }

    const hash_password = await bcrypt.hash(data.password, 10);
    await client.del(`otp:${data.email}`);

    const userData = {
      name: data.name,
      email: data.email,
      hash_password: hash_password,
    };

    await addUser(userData);

    return res.status(201).json({ message: "Đăng ký thành công." });
  } catch (error) {
    console.error("Register Error:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi server." });
  }
}

// ================== LOGIN ==================
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email và mật khẩu là bắt buộc." });
    }

    const users = await getUserByUsername(email);
    if (users.length === 0) {
      return res.status(401).json({ message: "Email không tồn tại." });
    }

    const user = users[0];

    if (user.status !== "active") {
      return res.status(403).json({ message: "Tài khoản của bạn đã bị khóa." });
    }

    const isMatch = await bcrypt.compare(password, user.hash_password);
    if (!isMatch) {
      return res.status(401).json({ message: "Mật khẩu không đúng." });
    }

    const token = generateToken(user);

    return res.status(200).json({
      message: "Đăng nhập thành công.",
      token: token,
      name_user: user.name,
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi server." });
  }
}

// ================== CHECK EMAIL ==================
async function checkmail(req, res) {
  const { email } = req.body;

  try {
    const exists = await checkEmail(email);
    const otp = Math.floor(100000 + Math.random() * 900000);
    await client.set(`otp:${email}`, otp, { EX: 300 });
    await sendOTP(email, otp);
    if (!exists) {
      return res.json({ status: "ok", message: "Email chưa tồn tại" });
    } else {
      return res.json({ status: "fail", message: "Email đã tồn tại" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "error", message: "Lỗi server" });
  }
}

// ================== GET ROLE ==================
async function getRole(req, res) {
  const user_id = req.user.id;
  try {
    const user = await getInfoUser(user_id);
    res.json({ role: user.role });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "error", message: "Lỗi server" });
  }
}

// ================== FORGOT PASSWORD SEND OTP ==================
async function forgotPasswordSendOTP(req, res) {
  const  email  = req.body.email;

  try {
    const users = await getUserByUsername(email);
    if (users.length === 0) {
      return res.status(404).json({ message: "Email không tồn tại" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    await client.set(`otp:forgot:${email}`, otp, { EX: 300 });
    await sendOTPRePass(email, otp);
    console.log("OTP đầu: "+otp)
    res.json({ status: "ok", message: "Đã gửi OTP về email" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "error", message: "Lỗi server" });
  }
}

// ================== RESET PASSWORD ==================
async function resetPassword(req, res) {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: "Email, OTP và mật khẩu mới là bắt buộc" });
  }

  try {
    const savedOTP = await client.get(`otp:forgot:${email}`);

    if (!savedOTP || savedOTP !== otp) {
      return res.status(400).json({ message: "OTP không đúng hoặc đã hết hạn" });
    }

    const users = await getUserByUsername(email);
    if (users.length === 0) {
      return res.status(404).json({ message: "Email không tồn tại" });
    }

    const user = users[0];
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await changeHashPassword(user.id, hashedPassword);
    await client.del(`otp:forgot:${email}`);

    res.json({ status: "ok", message: "Đổi mật khẩu thành công" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "error", message: "Lỗi server" });
  }
}

module.exports = {
  register,
  login,
  checkmail,
  getRole,
  forgotPasswordSendOTP,
  resetPassword,
  sendAdminOTP,
  verifyAdminOTP,
};
