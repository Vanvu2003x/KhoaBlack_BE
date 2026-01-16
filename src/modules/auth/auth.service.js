const bcrypt = require("bcrypt");
const { db } = require("../../configs/drizzle");
const { users } = require("../../db/schema");
const { eq } = require("drizzle-orm");
const { generateToken } = require("../../services/jwt.service");
const { sendOTP, sendOTPRePass } = require("../../services/nodemailer.service");
const client = require("../../configs/redis.config");
const crypto = require("crypto");

const AuthService = {
    // ================== REGISTER ==================
    register: async (data) => {
        if (!data.name || !data.password || !data.email) {
            throw { status: 400, message: "Tên, Email và mật khẩu là bắt buộc." };
        }

        if (!data.otp) {
            throw { status: 400, message: "OTP là bắt buộc." };
        }

        const otp = await client.get(`otp:${data.email}`);
        if (data.otp != otp) {
            throw { status: 400, message: "Mã OTP không đúng" };
        }

        const hash_password = await bcrypt.hash(data.password, 10);
        await client.del(`otp:${data.email}`);

        const newUser = {
            id: crypto.randomUUID(),
            name: data.name,
            email: data.email,
            hash_password: hash_password,
            // role, balance, status have defaults in schema
        };

        await db.insert(users).values(newUser);

        return { message: "Đăng ký thành công." };
    },

    // ================== LOGIN ==================
    login: async (email, password) => {
        if (!email || !password) {
            throw { status: 400, message: "Email và mật khẩu là bắt buộc." };
        }

        const [user] = await db.select().from(users).where(eq(users.email, email));

        if (!user) {
            throw { status: 401, message: "Email không tồn tại." };
        }

        if (user.status !== "active") {
            throw { status: 403, message: "Tài khoản của bạn đã bị khóa." };
        }

        const isMatch = await bcrypt.compare(password, user.hash_password);
        if (!isMatch) {
            throw { status: 401, message: "Mật khẩu không đúng." };
        }

        const token = generateToken(user);
        return {
            message: "Đăng nhập thành công.",
            token: token,
            name_user: user.name,
        };
    },

    // ================== CHECK EMAIL ==================
    checkEmail: async (email) => {
        const [existingUser] = await db.select().from(users).where(eq(users.email, email));

        const otp = Math.floor(100000 + Math.random() * 900000);
        await client.set(`otp:${email}`, otp, { EX: 300 });
        await sendOTP(email, otp);

        if (!existingUser) {
            return { status: "ok", message: "Email chưa tồn tại" };
        } else {
            return { status: "fail", message: "Email đã tồn tại" };
        }
    },

    // ================== FORGOT PASSWORD SEND OTP ==================
    forgotPasswordSendOTP: async (email) => {
        const [user] = await db.select().from(users).where(eq(users.email, email));

        if (!user) {
            throw { status: 404, message: "Email không tồn tại" };
        }

        const otp = Math.floor(100000 + Math.random() * 900000);
        await client.set(`otp:forgot:${email}`, otp, { EX: 300 });
        await sendOTPRePass(email, otp);
        console.log("OTP Forgot Password: " + otp);

        return { status: "ok", message: "Đã gửi OTP về email" };
    },

    // ================== RESET PASSWORD ==================
    resetPassword: async (email, otp, newPassword) => {
        if (!email || !otp || !newPassword) {
            throw { status: 400, message: "Email, OTP và mật khẩu mới là bắt buộc" };
        }

        const savedOTP = await client.get(`otp:forgot:${email}`);

        if (!savedOTP || savedOTP !== otp) {
            throw { status: 400, message: "OTP không đúng hoặc đã hết hạn" };
        }

        const [user] = await db.select().from(users).where(eq(users.email, email));
        if (!user) {
            throw { status: 404, message: "Email không tồn tại" };
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await db.update(users)
            .set({ hash_password: hashedPassword })
            .where(eq(users.id, user.id));

        await client.del(`otp:forgot:${email}`);

        return { status: "ok", message: "Đổi mật khẩu thành công" };
    },

    // ================== ADMIN SEND OTP ==================
    sendAdminOTP: async (userId) => {
        const [user] = await db.select().from(users).where(eq(users.id, userId));

        if (!user) {
            throw { status: 404, message: "User không tồn tại" };
        }

        if (user.role !== "admin") {
            throw { status: 403, message: "Bạn không có quyền thực hiện thao tác này" };
        }

        const email = user.email;
        const otp = Math.floor(100000 + Math.random() * 900000);

        await client.set(`otp:admin:${email}`, otp, { EX: 300 });
        await sendOTP(email, otp);

        console.log("Admin OTP:", otp);
        return { status: "ok", message: "Đã gửi OTP xác thực đến email admin" };
    },

    // ================== VERIFY ADMIN OTP ==================
    verifyAdminOTP: async (userId, otp) => {
        if (!otp) {
            throw { status: 400, message: "OTP là bắt buộc" };
        }

        const [user] = await db.select().from(users).where(eq(users.id, userId));
        if (!user) {
            throw { status: 404, message: "User không tồn tại" };
        }

        const savedOTP = await client.get(`otp:admin:${user.email}`);

        if (!savedOTP || savedOTP !== otp) {
            throw { status: 400, message: "OTP không đúng hoặc đã hết hạn" };
        }

        await client.del(`otp:admin:${user.email}`);

        return { status: "ok", message: "Xác thực OTP thành công, có thể cộng/trừ tiền" };
    },

    // ================== GET ROLE ==================
    getRole: async (userId) => {
        const [user] = await db.select().from(users).where(eq(users.id, userId));
        if (!user) throw { status: 404, message: "User not found" };
        return { role: user.role };
    }
};

module.exports = AuthService;
