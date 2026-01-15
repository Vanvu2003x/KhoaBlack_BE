const WalletLogService = require("./walletLog.service");
const asyncHandler = require("../../utils/asyncHandler");

const WalletLogController = {
    getTongTienTrongKhoang: asyncHandler(async (req, res) => {
        const result = await WalletLogService.getTongTienTrongKhoang(req.query.user_id || null, req.query.from, req.query.to);
        res.status(200).json(result);
    }),

    getWalletLog: asyncHandler(async (req, res) => {
        const result = await WalletLogService.getWalletLog(req.query.page, req.query.search);
        res.status(200).json(result);
    }),

    getWalletLogStatusDone: asyncHandler(async (req, res) => {
        const result = await WalletLogService.getWalletLogStatusDone(req.query.page);
        res.status(200).json(result);
    }),

    getPendingLogs: asyncHandler(async (req, res) => {
        const result = await WalletLogService.getPendingLogs(req.query.page);
        res.status(200).json(result);
    }),

    getTongSoTienDaNap: asyncHandler(async (req, res) => {
        const result = await WalletLogService.getTongSoTienDaNap(req.query.user_id || null);
        res.status(200).json(result);
    }),

    manualChargeBalance: asyncHandler(async (req, res) => {
        const result = await WalletLogService.manualChargeBalance(req.query.id, req.body.newStatus);
        res.json(result);
    }),

    cancelWalletLog: asyncHandler(async (req, res) => {
        const result = await WalletLogService.cancelWalletLog(req.query.id, req.user.id);
        return res.status(200).json(result);
    }),

    getLogsByUser: asyncHandler(async (req, res) => {
        const result = await WalletLogService.getLogsByUser(req.user.id, req.query.page);
        res.status(200).json(result);
    })
};

module.exports = WalletLogController;
