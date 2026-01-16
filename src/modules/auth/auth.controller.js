const AuthService = require("./auth.service");
const asyncHandler = require("../../utils/asyncHandler");

const AuthController = {
    register: asyncHandler(async (req, res) => {
        const result = await AuthService.register(req.body);

        // Auto-login after registration
        const { email, password } = req.body;
        const loginResult = await AuthService.login(email, password);

        // Set cookie just like login does
        res.cookie('token', loginResult.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax', // Changed from 'strict' to allow cross-origin
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        return res.status(201).json({
            ...result,
            ...loginResult
        });
    }),

    logout: (req, res) => {
        res.clearCookie('token');
        return res.status(200).json({ message: "Đăng xuất thành công" });
    },

    login: asyncHandler(async (req, res) => {
        const { email, password } = req.body;
        const result = await AuthService.login(email, password);

        // Set cookie
        res.cookie('token', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // true if https
            sameSite: 'lax', // Changed from 'strict'
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        return res.status(200).json(result);
    }),

    checkmail: asyncHandler(async (req, res) => {
        const result = await AuthService.checkEmail(req.body.email);
        return res.json(result);
    }),

    forgotPasswordSendOTP: asyncHandler(async (req, res) => {
        const result = await AuthService.forgotPasswordSendOTP(req.body.email);
        return res.json(result);
    }),

    resetPassword: asyncHandler(async (req, res) => {
        const { email, otp, newPassword } = req.body;
        const result = await AuthService.resetPassword(email, otp, newPassword);
        return res.json(result);
    }),

    sendAdminOTP: asyncHandler(async (req, res) => {
        const result = await AuthService.sendAdminOTP(req.user.id);
        return res.json(result);
    }),

    verifyAdminOTP: asyncHandler(async (req, res) => {
        const result = await AuthService.verifyAdminOTP(req.user.id, req.body.otp);
        return res.json(result);
    }),

    getRole: asyncHandler(async (req, res) => {
        const result = await AuthService.getRole(req.user.id);
        return res.json(result);
    })
};

module.exports = AuthController;
