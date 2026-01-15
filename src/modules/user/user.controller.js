const UserService = require("./user.service");
const asyncHandler = require("../../utils/asyncHandler");

const UserController = {
    getInfo: asyncHandler(async (req, res) => {
        const result = await UserService.getInfo(req.user?.id);
        return res.status(200).json(result);
    }),

    getAllUser: asyncHandler(async (req, res) => {
        const result = await UserService.getAllUser(req.query.role);
        res.json(result);
    }),

    updateUserRole: asyncHandler(async (req, res) => {
        const result = await UserService.updateUserRole(req.params.id, req.body.role);
        return res.status(200).json(result);
    }),

    getUser: asyncHandler(async (req, res) => {
        const result = await UserService.getUserById(req.query.user_id);
        res.json(result);
    }),

    updateBalance: asyncHandler(async (req, res) => {
        const { userId, amount, type } = req.body;
        const result = await UserService.updateBalance(userId, amount, type);
        return res.status(200).json(result);
    }),

    searchUser: asyncHandler(async (req, res) => {
        const { role, keyword } = req.query;
        const result = await UserService.searchUser(role, keyword);
        return res.json(result);
    })
};

module.exports = UserController;
