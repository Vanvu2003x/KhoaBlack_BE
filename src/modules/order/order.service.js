const { db } = require("../../configs/drizzle");
const { orders, users, topupPackages, games, walletLogs, balanceHistory } = require("../../db/schema");
const { eq, ilike, or, and, sql, desc, aliasedTable } = require("drizzle-orm");
const UserService = require("../user/user.service");
const { sendOrderSuccessEmail, sendOrderFailureEmail } = require("../../services/nodemailer.service");


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
        return await db.transaction(async (tx) => {
            // 1. Fetch User (Balance & Level)
            const [user] = await tx.select({
                id: users.id,
                balance: users.balance,
                level: users.level
            }).from(users).where(eq(users.id, data.user_id));

            if (!user) {
                throw { status: 404, message: 'Người dùng không tồn tại' };
            }

            // 2. Fetch Package Details (Prices)
            const [packageInfo] = await tx
                .select({
                    id: topupPackages.id,
                    package_name: topupPackages.package_name,
                    price: topupPackages.price,
                    origin_price: topupPackages.origin_price,
                    price_basic: topupPackages.price_basic,
                    price_pro: topupPackages.price_pro,
                    price_plus: topupPackages.price_plus,
                    game_name: games.name,
                    game_code: games.gamecode
                })
                .from(topupPackages)
                .innerJoin(games, eq(topupPackages.game_id, games.id))
                .where(eq(topupPackages.id, data.package_id));

            if (!packageInfo) {
                throw { status: 404, message: 'Gói nạp không tồn tại' };
            }

            // 3. Calculate Valid Price
            let finalPrice = packageInfo.price; // Default
            const level = user.level || 1;

            if (level === 2 && packageInfo.price_pro) finalPrice = packageInfo.price_pro;
            if (level === 3 && packageInfo.price_plus) finalPrice = packageInfo.price_plus;

            // Allow Basic override if set (unlikely but safe)
            if (level === 1 && packageInfo.price_basic) finalPrice = packageInfo.price_basic;


            // 4. Validate Balance
            if (Number(user.balance) < finalPrice) {
                const missing = finalPrice - Number(user.balance);
                throw {
                    status: 400,
                    message: `Số dư không đủ! Hiện có: ${Number(user.balance).toLocaleString('vi-VN')}đ. Cần: ${finalPrice.toLocaleString('vi-VN')}đ. Thiếu: ${missing.toLocaleString('vi-VN')}đ. Vui lòng nạp thêm!`
                };
            }

            // 5. Calculate Profit
            // Profit = Selling Price - Origin Price
            const originPrice = packageInfo.origin_price || 0;
            const finalProfit = finalPrice - originPrice;

            const description = `Thanh toán gói ${packageInfo.package_name} - ${packageInfo.game_name}`;

            // 6. Deduct Balance
            const balanceBefore = Number(user.balance);
            const balanceAfter = balanceBefore - finalPrice;

            await tx.update(users)
                .set({ balance: balanceAfter })
                .where(eq(users.id, data.user_id));

            await tx.insert(balanceHistory).values({
                user_id: data.user_id,
                amount: -finalPrice, // Negative for debit
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                type: "debit",
                description: description
            });

            // Emit balance_update for real-time header update
            try {
                const { emitToUser } = require("../../sockets/websocket");
                emitToUser(data.user_id, "balance_update", balanceAfter);
            } catch (socketError) {
                console.error("❌ Failed to emit balance_update:", socketError);
            }

            // 7. Create Order
            const newOrder = {
                user_id: data.user_id,
                package_id: data.package_id,
                account_info: data.account_info,
                amount: finalPrice, // Secure Price
                profit: finalProfit, // Secure Profit
                status: 'pending'
            };

            const [result] = await tx.insert(orders).values(newOrder);

            // Fetch created order (Assuming result might not provide full row in all drivers, reusing safe fetch)
            const [created] = await tx.select().from(orders).orderBy(desc(orders.id)).limit(1);
            return created;
        });
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
        const updatedOrder = await OrderService.updateOrderStatus(id, "success");

        // Send socket notification (real-time)
        try {
            const { emitToUser } = require("../../sockets/websocket");
            emitToUser(updatedOrder.user_id, "order_status_update", {
                orderId: id,
                status: "success",
                packageName: updatedOrder.package_name,
                amount: updatedOrder.amount,
                message: "🎉 Đơn hàng đã hoàn thành!"
            });
        } catch (socketError) {
            console.error('❌ Failed to emit socket:', socketError);
        }

        // Send email notification (non-blocking)
        if (updatedOrder && updatedOrder.user_email) {
            try {
                await sendOrderSuccessEmail(updatedOrder.user_email, updatedOrder);
            } catch (emailError) {
                console.error('❌ Failed to send order success email:', emailError);
            }
        }

        return updatedOrder;
    },

    cancelOrderAndRefund: async (id) => {
        const order = await OrderService.getOrderById(id);
        if (!order) throw new Error("Not found");

        await db.update(orders).set({ status: 'cancelled', updated_at: new Date() }).where(eq(orders.id, id));

        const refundAmount = order.amount - (order.profit || 0);
        await UserService.updateBalance(order.user_id, refundAmount, 'credit', `Hoàn tiền đơn hàng #${id}`);

        // Send socket notification (real-time)
        try {
            const { emitToUser } = require("../../sockets/websocket");
            emitToUser(order.user_id, "order_status_update", {
                orderId: id,
                status: "cancelled",
                packageName: order.package_name,
                refundAmount: refundAmount,
                message: "⚠️ Đơn hàng đã bị hủy và hoàn tiền!"
            });
        } catch (socketError) {
            console.error('❌ Failed to emit socket:', socketError);
        }

        // Send email notification (non-blocking)
        if (order && order.user_email) {
            try {
                await sendOrderFailureEmail(order.user_email, order, "Đơn hàng đã bị hủy và hoàn tiền");
            } catch (emailError) {
                console.error('❌ Failed to send order failure email:', emailError);
            }
        }

        return { message: "Cancelled and refunded", refundAmount };
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
