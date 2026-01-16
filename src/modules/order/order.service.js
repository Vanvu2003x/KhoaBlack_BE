const { db } = require("../../configs/drizzle");
const { orders, users, topupPackages, games, walletLogs, balanceHistory } = require("../../db/schema");
const { eq, ilike, or, and, sql, desc, aliasedTable } = require("drizzle-orm");
const UserService = require("../user/user.service");

// Helper to construct the base query with joins
const buildOrderQuery = () => {
    // We need to alias users table for 'user_nap'
    const usersNap = aliasedTable(users, "user_nap");

    return {
        selection: {
            id: orders.id,
            user_id: orders.user_id,
            user_email: users.email,
            user_name: users.name,
            user_nap_email: usersNap.email,
            user_nap_name: usersNap.name,
            status: orders.status,
            account_info: orders.account_info,
            amount: orders.amount,
            update_at: orders.updated_at,
            create_at: orders.created_at,
            package_name: topupPackages.package_name,
            thumbnail: topupPackages.thumbnail,
            package_type: topupPackages.package_type,
            game_name: games.name,
            profit: orders.profit
        },
        from: orders,
        joins: (queryBuilder) => {
            return queryBuilder
                .innerJoin(users, eq(orders.user_id, users.id))
                .leftJoin(usersNap, eq(orders.user_id_nap, usersNap.id))
                .innerJoin(topupPackages, eq(orders.package_id, topupPackages.id))
                .innerJoin(games, eq(topupPackages.game_id, games.id));
        }
    };
};

const OrderService = {
    createOrder: async (data) => {
        // data should include: { user_id, package_id, account_info, amount, profit }

        // Check user balance first
        const [user] = await db.select({ balance: users.balance }).from(users).where(eq(users.id, data.user_id));
        if (!user) {
            throw { status: 404, message: 'Người dùng không tồn tại' };
        }

        if (user.balance < data.amount) {
            throw { status: 400, message: 'Số dư không đủ để thanh toán' };
        }

        // Fetch package and game info for detailed description
        const [packageInfo] = await db
            .select({
                package_name: topupPackages.package_name,
                game_name: games.name
            })
            .from(topupPackages)
            .innerJoin(games, eq(topupPackages.game_id, games.id))
            .where(eq(topupPackages.id, data.package_id));

        const newOrder = {
            user_id: data.user_id,
            package_id: data.package_id,
            account_info: data.account_info,
            amount: data.amount,
            profit: data.profit || 0,
            status: 'pending'
        };

        await db.insert(orders).values(newOrder);

        // Deduct balance from user with detailed description
        const description = packageInfo
            ? `Thanh toán gói ${packageInfo.package_name} - ${packageInfo.game_name}`
            : `Thanh toán đơn hàng`;

        await UserService.updateBalance(data.user_id, data.amount, 'debit', description);

        // Fetch the created order to return
        const [created] = await db.select().from(orders).orderBy(desc(orders.id)).limit(1);
        return created;
    },

    getAllOrders: async (page = 1) => {
        const limit = 10;
        const offset = (page - 1) * limit;

        const base = buildOrderQuery();

        const data = await base.joins(
            db.select(base.selection).from(base.from)
        )
            .orderBy(desc(orders.updated_at))
            .limit(limit)
            .offset(offset);

        const [total] = await db.select({ count: sql`COUNT(*)` }).from(orders);

        // Stats
        const statsResult = await db.select({
            status: orders.status,
            count: sql`COUNT(*)`
        }).from(orders).groupBy(orders.status);

        const stats = { pending: 0, processing: 0, success: 0, cancelled: 0, failed: 0 };
        statsResult.forEach(row => { stats[row.status] = Number(row.count); });

        return { orders: data, stats, total: Number(total.count) };
    },

    getOrdersByStatus: async (status, page = 1) => {
        const limit = 10;
        const offset = (page - 1) * limit;
        const base = buildOrderQuery();

        const data = await base.joins(
            db.select(base.selection).from(base.from)
        )
            .where(eq(orders.status, status))
            .orderBy(desc(orders.updated_at))
            .limit(limit)
            .offset(offset);

        const [total] = await db.select({ count: sql`COUNT(*)` })
            .from(orders)
            .where(eq(orders.status, status));

        return { orders: data, total: Number(total.count) };
    },

    getOrdersByUserId: async (userId, page = 1) => {
        const limit = 10;
        const offset = (page - 1) * limit;
        const base = buildOrderQuery();

        const data = await base.joins(
            db.select(base.selection).from(base.from)
        )
            .where(eq(orders.user_id, userId))
            .orderBy(desc(orders.updated_at))
            .limit(limit)
            .offset(offset);

        const [total] = await db.select({ count: sql`COUNT(*)` })
            .from(orders)
            .where(eq(orders.user_id, userId));

        return { orders: data, total: Number(total.count) };
    },

    searchOrders: async (keyword, page = 1) => {
        const limit = 10;
        const offset = (page - 1) * limit;
        const base = buildOrderQuery();
        const usersNap = aliasedTable(users, "user_nap");

        const searchTerm = `%${keyword}%`;
        const searchCondition = or(
            sql`CAST(${orders.id} AS CHAR) ILIKE ${searchTerm}`,
            ilike(users.email, searchTerm),
            ilike(usersNap.email, searchTerm), // Note: Need aliased join for this to work perfectly, handled in buildOrderQuery logic
            ilike(topupPackages.package_name, searchTerm),
            ilike(games.name, searchTerm)
        );

        // Re-construct joins explicitly to access aliases if needed, but buildOrderQuery usage:
        const query = db.select(base.selection)
            .from(orders)
            .innerJoin(users, eq(orders.user_id, users.id))
            .leftJoin(usersNap, eq(orders.user_id_nap, usersNap.id))
            .innerJoin(topupPackages, eq(orders.package_id, topupPackages.id))
            .innerJoin(games, eq(topupPackages.game_id, games.id))
            .where(searchCondition)
            .orderBy(desc(orders.updated_at))
            .limit(limit)
            .offset(offset);

        const data = await query;

        const [total] = await db.select({ count: sql`COUNT(*)` })
            .from(orders)
            .innerJoin(users, eq(orders.user_id, users.id))
            .leftJoin(usersNap, eq(orders.user_id_nap, usersNap.id))
            .innerJoin(topupPackages, eq(orders.package_id, topupPackages.id))
            .innerJoin(games, eq(topupPackages.game_id, games.id))
            .where(searchCondition);

        return { orders: data, total: Number(total.count) };
    },

    getOrderById: async (id) => {
        const base = buildOrderQuery();
        const [order] = await base.joins(
            db.select(base.selection).from(base.from)
        ).where(eq(orders.id, id));
        return order;
    },

    // Transaction History from balance_history table
    getTransactionHistory: async (userId, page = 1, limit = 10) => {
        const offset = (page - 1) * limit;

        // Query balance_history table which has all the transaction details
        const transactions = await db
            .select()
            .from(balanceHistory)
            .where(eq(balanceHistory.user_id, userId))
            .orderBy(desc(balanceHistory.created_at))
            .limit(limit)
            .offset(offset);

        // Count total transactions
        const [countResult] = await db
            .select({ count: sql`COUNT(*)` })
            .from(balanceHistory)
            .where(eq(balanceHistory.user_id, userId));

        const total = Number(countResult.count);

        return {
            transactions,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };
    },

    updateOrderStatus: async (id, status) => {
        await db.update(orders)
            .set({ status: status, updated_at: new Date() })
            .where(eq(orders.id, id));

        // Return updated
        const base = buildOrderQuery();
        const [updated] = await base.joins(db.select(base.selection).from(base.from)).where(eq(orders.id, id));
        return updated;
    },

    cancelOrderIfPending: async (id, userId) => {
        const [order] = await db.select().from(orders).where(eq(orders.id, id));
        if (!order) throw { status: 404, message: 'Not found' };
        if (order.user_id !== userId) throw { status: 403, message: 'Unauthorized' };
        if (order.status !== 'pending') throw { status: 400, message: 'Cannot cancel non-pending order' };

        await db.update(orders).set({ status: 'cancelled', updated_at: new Date() }).where(eq(orders.id, id));

        // Refund
        await UserService.updateBalance(userId, order.amount, 'credit', `Hoàn tiền đơn hàng #${id}`);
        return { message: "Cancelled and refunded" };
    },

    completeOrder: async (id) => {
        return OrderService.updateOrderStatus(id, "success");
    },

    cancelOrderAndRefund: async (id) => {
        const order = await OrderService.getOrderById(id);
        if (!order) throw new Error("Not found");

        await db.update(orders).set({ status: 'cancelled', updated_at: new Date() }).where(eq(orders.id, id));

        const refundAmount = order.amount - (order.profit || 0);
        await UserService.updateBalance(order.user_id, refundAmount, 'credit', `Hoàn tiền đơn hàng #${id}`);

        return { message: "Cancelled and refunded" };
    },

    getUserFinancialSummary: async (userId) => {
        // Aggregations using SQL
        const [result] = await db.execute(sql`
           SELECT
             (SELECT COALESCE(SUM(amount), 0) FROM orders WHERE user_id = ${userId} AND status = 'success') AS tong_tieu,
             (SELECT COALESCE(SUM(amount), 0) FROM orders WHERE user_id = ${userId} AND status = 'success' AND DATE_FORMAT(updated_at, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')) AS tong_tieu_thang,
             (SELECT COALESCE(SUM(amount), 0) FROM topup_wallet_logs WHERE user_id = ${userId} AND status = 'Thành Công') AS tong_nap,
             (SELECT COALESCE(SUM(amount), 0) FROM topup_wallet_logs WHERE user_id = ${userId} AND status = 'Thành Công' AND DATE_FORMAT(updated_at, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')) AS tong_nap_thang
        `);
        return result[0];
    },

    getCostSummary: async () => {
        const [result] = await db.execute(sql`
             SELECT 
              (SELECT COALESCE(SUM(amount - profit), 0) FROM orders WHERE status = 'success') AS total_cost,
              (SELECT COALESCE(SUM(amount - profit), 0) FROM orders WHERE status = 'success' AND DATE_FORMAT(updated_at, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')) AS total_cost_this_month,
              (SELECT COALESCE(SUM(amount - profit), 0) FROM orders WHERE status = 'success' AND DATE(updated_at) = CURRENT_DATE) AS total_cost_today
         `);

        // Get last 30 days breakdown
        const last30Days = await db.execute(sql`
            SELECT 
                DATE(updated_at) as date,
                COALESCE(SUM(amount - profit), 0) as total_cost
            FROM orders
            WHERE status = 'success'
                AND updated_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY DATE(updated_at)
            ORDER BY date ASC
        `);

        return {
            status: true,
            total_cost: Number(result[0].total_cost),
            total_cost_this_month: Number(result[0].total_cost_this_month),
            total_cost_today: Number(result[0].total_cost_today),
            last_30_days: last30Days[0].map(row => ({
                date: row.date,
                total_cost: Number(row.total_cost)
            }))
        };
    },


    getMyNapOrdersStats: async (userIdNap) => {
        const result = await db.select({
            status: orders.status,
            total: sql`COUNT(*)`
        }).from(orders).where(eq(orders.user_id_nap, userIdNap)).groupBy(orders.status);
        return result;
    }
};

// Alias getCostStats to getCostSummary for backward compatibility
OrderService.getCostStats = OrderService.getCostSummary;

module.exports = OrderService;
