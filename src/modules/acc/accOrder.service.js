const { db } = require("../../configs/drizzle");
const { accOrders, acc, users, games, balanceHistory } = require("../../db/schema");
const { eq, sql, desc, and } = require("drizzle-orm");

// Helper for complex select
const buildAccOrderQuery = () => {
    return {
        selection: {
            id: accOrders.id,
            acc_id: accOrders.acc_id,
            user_id: accOrders.user_id,
            price: accOrders.price,
            status: accOrders.status,
            contact_info: accOrders.contact_info,
            created_at: accOrders.created_at,
            updated_at: accOrders.updated_at,
            acc_image: acc.image,
            acc_username: sql`COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(${accOrders.contact_info}, "$.acc_username")), 'null'), ${acc.username})`,
            acc_password: sql`COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(${accOrders.contact_info}, "$.acc_password")), 'null'), ${acc.password})`,
            acc_info: sql`COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(${accOrders.contact_info}, "$.acc_info")), 'null'), ${acc.info})`,
            user_name: users.name,
            user_email: users.email,
            game_thumbnail: games.thumbnail
        },
        from: accOrders,
        joins: (qb) => {
            return qb
                .innerJoin(acc, eq(accOrders.acc_id, acc.id))
                .innerJoin(users, eq(accOrders.user_id, users.id))
                .innerJoin(games, eq(acc.game_id, games.id));
        }
    };
};

const UserService = require("../user/user.service");

// ... (keep existing imports)

const AccOrderService = {
    createOrder: async (userId, { acc_id, contact_info }) => {
        return await db.transaction(async (tx) => {
            // 1. Check account status & price
            const [account] = await tx.select().from(acc).where(eq(acc.id, acc_id));

            if (!account) {
                throw { status: 404, message: "Tài khoản game không tồn tại" };
            }

            if (account.status !== 'selling') {
                throw { status: 400, message: "Tài khoản này đã được bán hoặc không có sẵn" };
            }

            // Fetch User first to get level
            const [user] = await tx.select().from(users).where(eq(users.id, userId));
            if (!user) throw { status: 404, message: "User not found" };

            // Calculate Price based on Level
            const level = user.level || 1;
            let finalPrice = Number(account.price);

            if (level === 2 && account.price_pro) finalPrice = Number(account.price_pro);
            if (level === 3 && account.price_plus) finalPrice = Number(account.price_plus);
            // Basic override
            if (level === 1 && account.price_basic) finalPrice = Number(account.price_basic);

            const price = finalPrice;

            // 2. Deduct User Balance (Checks sufficiency internally)
            if (user.balance < price) {
                const missing = price - user.balance;
                throw {
                    status: 400,
                    message: `Số dư không đủ! Hiện có: ${user.balance.toLocaleString('vi-VN')}đ. Cần: ${price.toLocaleString('vi-VN')}đ. Thiếu: ${missing.toLocaleString('vi-VN')}đ. Vui lòng nạp thêm!`
                };
            }

            // 3. Deduct balance & Log history
            const balanceBefore = user.balance;
            const balanceAfter = user.balance - price;

            await tx.update(users)
                .set({ balance: balanceAfter })
                .where(eq(users.id, userId));

            await tx.insert(balanceHistory).values({
                user_id: userId,
                amount: -price,
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                type: "debit",
                description: `Mua account #${acc_id}`
            });

            // 4. Create Order & Update Acc Status
            const newOrder = {
                acc_id,
                user_id: userId,
                price: price,
                status: "pending",
                contact_info: contact_info || {}
            };

            const [result] = await tx.insert(accOrders).values(newOrder);

            // Mark acc as sold
            await tx.update(acc).set({ status: 'sold' }).where(eq(acc.id, acc_id));

            return { success: true, message: "Mua tài khoản thành công! orderId: " + result.insertId };
        });
    },

    cancelOrder: async (orderId) => {
        return await db.transaction(async (tx) => {
            const [order] = await tx.select().from(accOrders).where(eq(accOrders.id, orderId));
            if (!order) throw new Error("Order không tồn tại");

            if (order.status === 'cancel') {
                throw new Error("Đơn hàng đã bị hủy trước đó");
            }

            // Refund logic
            const refundAmount = Number(order.price);
            const userId = order.user_id;

            // Get current user balance to log correctly
            const [user] = await tx.select().from(users).where(eq(users.id, userId));
            if (user) {
                const balanceBefore = Number(user.balance);
                const balanceAfter = balanceBefore + refundAmount;

                await tx.update(users)
                    .set({ balance: balanceAfter })
                    .where(eq(users.id, userId));

                await tx.insert(balanceHistory).values({
                    user_id: userId,
                    amount: refundAmount,
                    balance_before: balanceBefore,
                    balance_after: balanceAfter,
                    type: "credit",
                    description: `Hoàn tiền hủy đơn hàng #${orderId}`
                });

                // Real-time Balance Update
                const { emitToUser } = require("../../sockets/websocket");
                emitToUser(userId, "balance_update", balanceAfter);
            }

            await tx.update(accOrders)
                .set({ status: 'cancel', updated_at: new Date() })
                .where(eq(accOrders.id, orderId));

            // Real-time Order Update
            const { emitToUser } = require("../../sockets/websocket");
            emitToUser(userId, "order_update", { orderId, status: 'cancel' });

            await tx.update(acc)
                .set({ status: 'selling' })
                .where(eq(acc.id, order.acc_id));

            const [updated] = await tx.select().from(accOrders).where(eq(accOrders.id, orderId));
            return updated;
        });
    },

    updateStatus: async (id, status) => {
        await db.update(accOrders)
            .set({ status: status, updated_at: new Date() })
            .where(eq(accOrders.id, id));
        const [updated] = await db.select().from(accOrders).where(eq(accOrders.id, id));
        return updated;
    },

    updateContactInfo: async (id, partialContactInfo) => {
        const NodemailerService = require("../../services/nodemailer.service");

        await db.update(accOrders)
            .set({
                contact_info: sql`JSON_MERGE_PATCH(${accOrders.contact_info}, ${JSON.stringify(partialContactInfo)})`,
                status: 'success',
                updated_at: new Date()
            })
            .where(eq(accOrders.id, id));

        const updated = await AccOrderService.getById(id);

        // Send email and notify user via socket if status is success
        if (updated && updated.status === 'success') {
            const { emitToUser } = require("../../sockets/websocket");
            emitToUser(updated.user_id, "order_update", updated);

            try {
                // Determine recipient email: PRIORITIZE email from contact_info (the form they filled)
                const recipientEmail = updated.contact_info?.email || updated.user_email;
                if (recipientEmail) {
                    const emailSource = updated.contact_info?.email ? "form contact info" : "user profile";
                    console.log(`📧 Sending account email to: ${recipientEmail} (Source: ${emailSource}) for order #${id}`);
                    const info = await NodemailerService.sendAcc(recipientEmail, {
                        acc_username: updated.acc_username,
                        acc_password: updated.acc_password,
                        acc_info: updated.acc_info
                    }, updated);
                    console.log(`✅ Email sent successfully for order #${id}:`, info.messageId);
                } else {
                    console.warn(`⚠️ No recipient email found for order #${id}`);
                }
            } catch (emailError) {
                console.error(`❌ Failed to send account email for order #${id}:`, emailError);
            }
        }

        return updated;
    },

    getByUserId: async (userId) => {
        const base = buildAccOrderQuery();
        const data = await base.joins(
            db.select(base.selection).from(base.from)
        )
            .where(eq(accOrders.user_id, userId))
            .orderBy(desc(accOrders.created_at));
        return data;
    },

    // Alias for getAllByUserId
    getAllByUserId: async (userId) => {
        return AccOrderService.getByUserId(userId);
    },

    getById: async (id) => {
        const base = buildAccOrderQuery();
        const [data] = await base.joins(
            db.select(base.selection).from(base.from)
        ).where(eq(accOrders.id, id));
        return data;
    },

    getByAccId: async (accId) => {
        const base = buildAccOrderQuery();
        const data = await base.joins(
            db.select(base.selection).from(base.from)
        )
            .where(eq(accOrders.acc_id, accId))
            .orderBy(desc(accOrders.created_at));
        return data;
    },

    getAll: async () => {
        const base = buildAccOrderQuery();
        const data = await base.joins(
            db.select(base.selection).from(base.from)
        )
            .orderBy(desc(accOrders.created_at));
        return data;
    },

    updateStatusTo: async (id, newStatus) => {
        return AccOrderService.updateStatus(id, newStatus);
    },

    findByContact: async ({ phone, email }) => {
        const base = buildAccOrderQuery();
        const conditions = [];

        // MySQL JSON extraction ->> equivalent is ->> or JSON_UNQUOTE(JSON_EXTRACT(...))
        // Drizzle: sql operator

        if (phone) {
            conditions.push(sql`JSON_UNQUOTE(JSON_EXTRACT(${accOrders.contact_info}, '$.phone')) = ${phone}`);
        }
        if (email) {
            conditions.push(sql`LOWER(JSON_UNQUOTE(JSON_EXTRACT(${accOrders.contact_info}, '$.email'))) = LOWER(${email})`);
        }

        if (conditions.length === 0) return [];

        const data = await base.joins(
            db.select(base.selection).from(base.from)
        )
            .where(and(...conditions))
            .orderBy(desc(accOrders.created_at));

        return data;
    }
};

module.exports = AccOrderService;
