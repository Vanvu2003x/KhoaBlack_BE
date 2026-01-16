const WalletLogService = require("./walletLog.service");
const asyncHandler = require("../../utils/asyncHandler");

const WalletLogController = {
    // New endpoint for FE: /api/toup-wallet-log/getTongtien
    getTongtien: asyncHandler(async (req, res) => {
        const userId = req.query.user_id || null;

        // Get total amount, this month, today
        let conditions = [{ status: 'Thành Công' }];
        if (userId) conditions.push({ user_id: userId });

        const { db } = require("../../configs/drizzle");
        const { walletLogs } = require("../../db/schema");
        const { sql, and, eq } = require("drizzle-orm");

        // Get stats
        const [stats] = await db.execute(sql`
            SELECT 
                COALESCE(SUM(amount), 0) AS tong_tien_da_nap,
                COALESCE(SUM(CASE 
                    WHEN DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m') 
                    THEN amount ELSE 0 
                END), 0) AS tong_tien_thang_nay,
                COALESCE(SUM(CASE 
                    WHEN DATE(created_at) = CURDATE() 
                    THEN amount ELSE 0 
                END), 0) AS tong_tien_hom_nay
            FROM topup_wallet_logs
            WHERE status = 'Thành Công'
            ${userId ? sql`AND user_id = ${userId}` : sql``}
        `);

        // Get last 30 days
        const last30Days = await db.execute(sql`
            SELECT 
                DATE(created_at) as date,
                COALESCE(SUM(amount), 0) as total_amount
            FROM topup_wallet_logs
            WHERE status = 'Thành Công'
                AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                ${userId ? sql`AND user_id = ${userId}` : sql``}
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `);

        res.json({
            status: true,
            tong_tien_da_nap: Number(stats[0].tong_tien_da_nap),
            tong_tien_thang_nay: Number(stats[0].tong_tien_thang_nay),
            tong_tien_hom_nay: Number(stats[0].tong_tien_hom_nay),
            thong_ke_30_ngay: last30Days[0].map(row => ({
                date: row.date,
                total_amount: Number(row.total_amount)
            }))
        });
    }),

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
