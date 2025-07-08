const bcrypt = require("bcrypt");
const {
  addUser,
  getUserByUsername,
  checkEmail,
} = require("../models/user.model");
const { generateToken } = require("../services/jwt.service");
const { sendOTP } = require("../services/nodemailer.service");
const client = require("../configs/redis.config");

async function register(req, res) {
  try {
    const data = req.body;

    if (!data.password || !data.email) {
      return res
        .status(400)
        .json({ message: "Email và mật khẩu là bắt buộc." });
    }

    if (!data.otp) {
      return res.status(400).json({ message: "OTP là bắt buộc." });
    }

    const otp = await client.get(`otp:${data.email}`);
    if (data.otp != otp) {
      return res.status(400).json({ message: "Mã OTP không đúng" });
    } else {
      const hash_password = await bcrypt.hash(data.password, 10);
      await client.del(`otp:${data.email}`);

      const userData = {
        username: data.username,
        email: data.email,
        hash_password: hash_password,
      };

      await addUser(userData); // bạn có thể log ra nếu cần

      return res.status(201).json({ message: "Đăng ký thành công." });
    }
  } catch (error) {
    console.error("Register Error:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi server." });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email và mật khẩu là bắt buộc." });
    }

    const users = await getUserByUsername(email);
    if (users.length === 0) {
      return res.status(401).json({ message: "Email không tồn tại." });
    }

    const user = users[0];

    const isMatch = await bcrypt.compare(password, user.hash_password);
    if (!isMatch) {
      return res.status(401).json({ message: "Mật khẩu không đúng." });
    }

    const token = generateToken(user);

    return res.status(200).json({
      message: "Đăng nhập thành công.",
      token: token,
      name_user: user.name,
      balance: user.balance,
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi server." });
  }
}

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

module.exports = { register, login, checkmail };
