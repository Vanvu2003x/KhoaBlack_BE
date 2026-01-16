const { db } = require("../../configs/drizzle");
const { walletLogs, users } = require("../../db/schema");
const { eq, gte, lte, and, sql, desc, like } = require("drizzle-orm");
const crypto = require("crypto");
const UserService = require("../user/user.service");

const WalletLogService = {
    getTongTienTrongKhoang: async (userId, from, to) => {
        let conditions = [eq(walletLogs.status, 'Thành Công')];

        if (userId) conditions.push(eq(walletLogs.user_id, userId));
        if (from) conditions.push(gte(walletLogs.created_at, new Date(from)));
        if (to) conditions.push(lte(walletLogs.created_at, new Date(to)));

        const [result] = await db.select({
            total: sql`COALESCE(SUM(${walletLogs.amount}), 0)`
        })
            .from(walletLogs)
            .where(and(...conditions));

        return {
            total_amount: Number(result.total)
        };
    },

    getWalletLog: async (page = 1, search = "") => {
        const limit = 10;
        const offset = (page - 1) * limit;

        let whereClause = undefined;
        if (search) {
            whereClause = like(users.email, `%${search}%`);
        }

        const data = await db.select({
            id: walletLogs.id,
            user_id: walletLogs.user_id,
            amount: walletLogs.amount,
            status: walletLogs.status,
            created_at: walletLogs.created_at,
            update_at: walletLogs.updated_at,
            email: users.email,
            name_user: users.name
        })
            .from(walletLogs)
            .leftJoin(users, eq(walletLogs.user_id, users.id))
            .where(whereClause)
            .orderBy(desc(walletLogs.created_at))
            .limit(limit)
            .offset(offset);

        // Count total for pagination if needed, but not in original request
        const [total] = await db.select({ count: sql`COUNT(*)` })
            .from(walletLogs)
            .leftJoin(users, eq(walletLogs.user_id, users.id))
            .where(whereClause);

        return {
            status: true,
            data: data,
            totalItem: total.count
        };
    },

    getWalletLogStatusDone: async (page = 1) => {
        const limit = 10;
        const offset = (page - 1) * limit;

        const data = await db.select({
            id: walletLogs.id,
            user_id: walletLogs.user_id,
            amount: walletLogs.amount,
            status: walletLogs.status,
            created_at: walletLogs.created_at,
            update_at: walletLogs.updated_at,
            name_user: users.name,
            email: users.email
        })
            .from(walletLogs)
            .leftJoin(users, eq(walletLogs.user_id, users.id))
            .where(eq(walletLogs.status, 'Thành Công'))
            .orderBy(desc(walletLogs.created_at))
            .limit(limit)
            .offset(offset);

        const [total] = await db.select({ count: sql`COUNT(*)` })
            .from(walletLogs)
            .where(eq(walletLogs.status, 'Thành Công'));

        return {
            status: true,
            data: data,
            totalLog: total.count
        };
    },

    getPendingLogs: async (page = 1) => {
        const limit = 10;
        const offset = (page - 1) * limit;

        // Assuming 'pending' status is handled as 'Đang Chờ' or 'Chờ thanh toán'
        // Based on WalletManagerPage, status option is "Đang Chờ".
        // Let's filter by that.
        const statusValues = ['Đang Chờ', 'pending', 'wait']; // Common variations just in case, but let's stick to 'Đang Chờ' + 'pending'

        const data = await db.select({
            id: walletLogs.id,
            user_id: walletLogs.user_id,
            amount: walletLogs.amount,
            status: walletLogs.status,
            created_at: walletLogs.created_at,
            update_at: walletLogs.updated_at,
            name_user: users.name,
            email: users.email
        })
            .from(walletLogs)
            .leftJoin(users, eq(walletLogs.user_id, users.id))
            .where(sql`${walletLogs.status} IN ('Đang Chờ', 'pending', 'wait')`) // Safer to include variants if unsure of DB consistency
            .orderBy(desc(walletLogs.created_at))
            .limit(limit)
            .offset(offset);

        const [total] = await db.select({ count: sql`COUNT(*)` })
            .from(walletLogs)
            .where(sql`${walletLogs.status} IN ('Đang Chờ', 'pending', 'wait')`);

        return {
            status: true,
            data: data,
            totalItem: total.count
        };
    },

    getTongSoTienDaNap: async (userId) => {
        let conditions = [eq(walletLogs.status, 'Thành Công')];
        if (userId) conditions.push(eq(walletLogs.user_id, userId));

        const [result] = await db.select({
            total: sql`COALESCE(SUM(${walletLogs.amount}), 0)`
        })
            .from(walletLogs)
            .where(and(...conditions));

        return {
            total_amount: Number(result.total)
        };
    },

    manualChargeBalance: async (id, newStatus) => {
        const [log] = await db.select().from(walletLogs).where(eq(walletLogs.id, id));
        if (!log) throw { status: 404, message: "Không tìm thấy giao dịch" };

        if (log.status === 'Thành Công' || log.status === 'Thất Bại' || log.status === 'Đã Hủy') {
            throw { status: 400, message: "Giao dịch đã kết thúc, không thể thay đổi trạng thái" };
        }

        await db.update(walletLogs)
            .set({
                status: newStatus,
                updated_at: new Date() // Explicitly set updated_at
            })
            .where(eq(walletLogs.id, id));

        if (newStatus === "Thành Công") {
            await UserService.updateBalance(log.user_id, log.amount, "credit");
        }

        return { message: "Cập nhật trạng thái thành công" };
    },

    cancelWalletLog: async (id, userId) => {
        const [log] = await db.select().from(walletLogs).where(eq(walletLogs.id, id));
        if (!log) throw { status: 404, message: "Không tìm thấy giao dịch" };

        if (log.user_id !== userId) throw { status: 403, message: "Không có quyền hủy giao dịch này" };

        if (log.status !== 'pending' && log.status !== 'Chờ thanh toán') { // Assuming pending status text
            throw { status: 400, message: "Chỉ có thể hủy giao dịch đang chờ" };
        }

        await db.update(walletLogs)
            .set({ status: 'Đã Hủy' })
            .where(eq(walletLogs.id, id));

        return { message: "Hủy giao dịch thành công" };
    },

    getLogsByUser: async (userId, page = 1) => {
        const limit = 10;
        const offset = (page - 1) * limit;

        const data = await db.select()
            .from(walletLogs)
            .where(eq(walletLogs.user_id, userId))
            .orderBy(desc(walletLogs.created_at))
            .limit(limit)
            .offset(offset);

        // Count
        const [total] = await db.select({ count: sql`COUNT(*)` })
            .from(walletLogs)
            .where(eq(walletLogs.user_id, userId));

        return {
            status: true,
            data: data,
            totalLog: total.count,
            totalPages: Math.ceil(total.count / limit)
        };
    },

    autoCheckExpiredTransactions: async () => {
        try {
            const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);

            // Log for debugging
            // console.log("Checking for expired logs before:", twentyMinutesAgo);

            // Find and update pending logs older than 20 mins
            // Note: drizzle update doesn't support joins or complex where directly efficiently for this in one go depending on driver, 
            // but we can do a simple update where status IN (...) AND created_at < ...

            const result = await db.update(walletLogs)
                .set({
                    status: 'Thất Bại',
                    updated_at: new Date()
                })
                .where(
                    and(
                        sql`${walletLogs.status} IN ('Đang Chờ', 'pending', 'wait')`,
                        lte(walletLogs.created_at, twentyMinutesAgo)
                    )
                );

            // Check how many rows affected if driver supports it, strictly for logging if needed
            // console.log("Expired transactions updated:", result);

            return result;
        } catch (error) {
            console.error("Error auto-expiring transactions:", error);
        }
    }
};

module.exports = WalletLogService;
