const { db } = require("../../configs/drizzle");
const { users, orders, walletLogs, balanceHistory } = require("../../db/schema");
const { eq, ilike, or, sql, desc } = require("drizzle-orm");
const { userSocketMap } = require("../../sockets/websocket");

const UserService = {
    // ... getInfo ... 
    getInfo: async (userId) => {
        if (!userId) {
            throw { status: 401, message: "Chưa xác thực người dùng" };
        }
        const [userInfo] = await db.select({
            id: users.id,
            name: users.name,
            email: users.email,
            balance: users.balance,
            role: users.role,
            level: users.level,
            created_at: users.created_at
        }).from(users).where(eq(users.id, userId));

        if (!userInfo) {
            throw { status: 404, message: "Không tìm thấy người dùng" };
        }
        return { user: userInfo };
    },

    getAllUser: async (role) => {
        let query = db.select({
            id: users.id,
            name: users.name,
            email: users.email,
            hash_password: users.hash_password,
            role: users.role,
            level: users.level,
            balance: users.balance,
            status: users.status,
            created_at: users.created_at,
            updated_at: users.updated_at,
            so_don_order: sql`COALESCE((SELECT COUNT(*) FROM orders WHERE orders.user_id = ${users.id} AND orders.status = 'success'), 0)`,
            so_don_da_nap: sql`COALESCE((SELECT COUNT(*) FROM topup_wallet_logs WHERE topup_wallet_logs.user_id = ${users.id} AND topup_wallet_logs.status = 'Thành Công'), 0)`,
            tong_amount: sql`COALESCE((SELECT SUM(amount) FROM topup_wallet_logs WHERE topup_wallet_logs.user_id = ${users.id} AND topup_wallet_logs.status = 'Thành Công'), 0)`
        })
            .from(users);

        if (role) {
            query.where(eq(users.role, role));
        }

        const result = await query;

        return {
            status: true,
            data: result,
            totalUser: result.length
        };
    },

    updateUserRole: async (targetUserId, newRole) => {
        const [targetUser] = await db.select().from(users).where(eq(users.id, targetUserId));

        if (!targetUser) throw { status: 404, message: "Không tìm thấy người dùng cần cập nhật" };
        if (targetUser.role === "admin") throw { status: 403, message: "Không thể thay đổi role của admin" };

        await db.update(users)
            .set({ role: newRole })
            .where(eq(users.id, targetUserId));

        const [updatedUser] = await db.select({
            id: users.id, name: users.name, email: users.email, role: users.role, level: users.level, balance: users.balance, created_at: users.created_at
        }).from(users).where(eq(users.id, targetUserId));

        return { message: "Cập nhật role thành công", user: updatedUser };
    },

    getUserById: async (userId) => {
        if (!userId) {
            throw { status: 400, message: "Thiếu tham số user_id" };
        }

        const [userInfo] = await db.select({
            id: users.id, name: users.name, email: users.email, balance: users.balance, role: users.role, level: users.level, created_at: users.created_at
        }).from(users).where(eq(users.id, userId));

        if (!userInfo) {
            throw { status: 404, message: "Không tìm thấy người dùng" };
        }
        return userInfo;
    },

    updateBalance: async (userId, amount, type, description = "") => {
        if (!userId || !amount || !type) {
            throw { status: 400, message: "Thiếu tham số bắt buộc" };
        }

        if (typeof amount !== "number" || amount <= 0) {
            throw { status: 400, message: "Amount phải là số dương" };
        }

        if (!["credit", "debit"].includes(type)) {
            throw { status: 400, message: "Type phải là 'credit' hoặc 'debit'" };
        }

        const adjustedAmount = type === "credit" ? amount : -amount;

        // Transaction for safety
        const success = await db.transaction(async (tx) => {
            const [user] = await tx.select().from(users).where(eq(users.id, userId));
            if (!user) return false;

            const balanceBefore = user.balance || 0;
            const balanceAfter = balanceBefore + adjustedAmount;

            // Prevent negative balance on debit
            if (type === "debit" && balanceAfter < 0) {
                const missing = amount - balanceBefore;
                throw {
                    status: 400,
                    message: `Số dư không đủ! Hiện có: ${balanceBefore.toLocaleString('vi-VN')}đ. Cần: ${amount.toLocaleString('vi-VN')}đ. Thiếu: ${missing.toLocaleString('vi-VN')}đ. Vui lòng nạp thêm!`
                };
            }

            // Update User Balance
            await tx.update(users)
                .set({ balance: balanceAfter })
                .where(eq(users.id, userId));

            // Log Transaction (Balance History)
            await tx.insert(balanceHistory).values({
                user_id: userId,
                amount: adjustedAmount,
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                type: type,
                description: description || (type === "credit" ? "Nạp ví" : "Trừ tiền")
            });

            return true;
        });

        if (!success) {
            throw { status: 404, message: "Không tìm thấy user hoặc cập nhật thất bại" };
        }

        // Fetch new balance for socket
        const [updatedUser] = await db.select({ balance: users.balance }).from(users).where(eq(users.id, userId));
        const newBalance = updatedUser.balance;

        // Emit balance update via socket using emitToUser
        const { emitToUser } = require("../../sockets/websocket");
        emitToUser(userId, "balance_update", newBalance);
        emitToUser(userId, "payment_success", {
            redirect: true,
            url: "/",
            message: "Thanh toán thành công!",
            balance: newBalance,
        });

        return { message: "Cập nhật số dư thành công" };
    },

    searchUser: async (role, keyword) => {
        // Use raw SQL for complex subqueries to avoid Drizzle context issues
        let conditions = [];
        let params = [];

        if (role) {
            conditions.push("u.role = ?");
            params.push(role);
        }

        if (keyword) {
            conditions.push("(u.name LIKE ? OR u.email LIKE ?)");
            params.push(`%${keyword}%`, `%${keyword}%`);
        }

        const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

        const rawQuery = sql.raw(`
            SELECT 
                u.id, u.name, u.email, u.hash_password, u.role, u.level, u.balance, u.status, u.created_at, u.updated_at,
                COALESCE((SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id AND o.status = 'success'), 0) as so_don_order,
                COALESCE((SELECT COUNT(*) FROM topup_wallet_logs tw WHERE tw.user_id = u.id AND tw.status = 'Thành Công'), 0) as so_don_da_nap,
                COALESCE((SELECT SUM(amount) FROM topup_wallet_logs tw WHERE tw.user_id = u.id AND tw.status = 'Thành Công'), 0) as tong_amount
            FROM users u
            ${whereClause}
        `);

        // Drizzle executes raw sql with parameters differently depending on driver, 
        // but sql.raw usually takes the string. 
        // Better approach with Drizzle: db.execute(sql`...`) using template literal for params.

        let querySql;
        if (role && keyword) {
            querySql = sql`
                SELECT 
                    u.id, u.name, u.email, u.hash_password, u.role, u.level, u.balance, u.status, u.created_at, u.updated_at,
                    COALESCE((SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id AND o.status = 'success'), 0) as so_don_order,
                    COALESCE((SELECT COUNT(*) FROM topup_wallet_logs tw WHERE tw.user_id = u.id AND tw.status = 'Thành Công'), 0) as so_don_da_nap,
                    COALESCE((SELECT SUM(amount) FROM topup_wallet_logs tw WHERE tw.user_id = u.id AND tw.status = 'Thành Công'), 0) as tong_amount
                FROM users u
                WHERE u.role = ${role} AND (u.name LIKE ${`%${keyword}%`} OR u.email LIKE ${`%${keyword}%`})
            `;
        } else if (role) {
            querySql = sql`
                SELECT 
                    u.id, u.name, u.email, u.hash_password, u.role, u.level, u.balance, u.status, u.created_at, u.updated_at,
                    COALESCE((SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id AND o.status = 'success'), 0) as so_don_order,
                    COALESCE((SELECT COUNT(*) FROM topup_wallet_logs tw WHERE tw.user_id = u.id AND tw.status = 'Thành Công'), 0) as so_don_da_nap,
                    COALESCE((SELECT SUM(amount) FROM topup_wallet_logs tw WHERE tw.user_id = u.id AND tw.status = 'Thành Công'), 0) as tong_amount
                FROM users u
                WHERE u.role = ${role}
            `;
        } else if (keyword) {
            querySql = sql`
                SELECT 
                    u.id, u.name, u.email, u.hash_password, u.role, u.level, u.balance, u.status, u.created_at, u.updated_at,
                    COALESCE((SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id AND o.status = 'success'), 0) as so_don_order,
                    COALESCE((SELECT COUNT(*) FROM topup_wallet_logs tw WHERE tw.user_id = u.id AND tw.status = 'Thành Công'), 0) as so_don_da_nap,
                    COALESCE((SELECT SUM(amount) FROM topup_wallet_logs tw WHERE tw.user_id = u.id AND tw.status = 'Thành Công'), 0) as tong_amount
                FROM users u
                WHERE (u.name LIKE ${`%${keyword}%`} OR u.email LIKE ${`%${keyword}%`})
            `;
        } else {
            querySql = sql`
                SELECT 
                    u.id, u.name, u.email, u.hash_password, u.role, u.level, u.balance, u.status, u.created_at, u.updated_at,
                    COALESCE((SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id AND o.status = 'success'), 0) as so_don_order,
                    COALESCE((SELECT COUNT(*) FROM topup_wallet_logs tw WHERE tw.user_id = u.id AND tw.status = 'Thành Công'), 0) as so_don_da_nap,
                    COALESCE((SELECT SUM(amount) FROM topup_wallet_logs tw WHERE tw.user_id = u.id AND tw.status = 'Thành Công'), 0) as tong_amount
                FROM users u
            `;
        }

        const [result] = await db.execute(querySql);

        if (result.length > 0) {
            // console.log("[SearchUser] Sample User Stats:", result[0]);
        }
        return { success: true, users: result };
    },

    toggleUserLock: async (userId) => {
        if (!userId) {
            throw { status: 400, message: "Thiếu user ID" };
        }

        const [user] = await db.select().from(users).where(eq(users.id, userId));

        if (!user) {
            throw { status: 404, message: "Không tìm thấy người dùng" };
        }

        // Cannot lock admin accounts
        if (user.role === 'admin') {
            throw { status: 403, message: "Không thể khóa tài khoản admin" };
        }

        // Use status field: 'banned' = locked, 'active' = unlocked
        const newStatus = user.status === 'banned' ? 'active' : 'banned';
        const isLocked = newStatus === 'banned';

        await db.update(users)
            .set({ status: newStatus })
            .where(eq(users.id, userId));

        return {
            success: true,
            locked: isLocked,
            message: isLocked ? "Đã khóa tài khoản" : "Đã mở khóa tài khoản"
        };
    },

    // Level labels: 1=Basic, 2=Pro, 3=Plus
    updateUserLevel: async (targetUserId, newLevel) => {
        if (!targetUserId || !newLevel) {
            throw { status: 400, message: "Thiếu tham số bắt buộc" };
        }

        const level = parseInt(newLevel);
        if (![1, 2, 3].includes(level)) {
            throw { status: 400, message: "Level phải là 1 (Basic), 2 (Pro), hoặc 3 (Plus)" };
        }

        const [targetUser] = await db.select().from(users).where(eq(users.id, targetUserId));

        if (!targetUser) {
            throw { status: 404, message: "Không tìm thấy người dùng" };
        }

        await db.update(users)
            .set({ level: level })
            .where(eq(users.id, targetUserId));

        const levelLabels = { 1: "Basic", 2: "Pro", 3: "Plus" };

        const [updatedUser] = await db.select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            level: users.level,
            balance: users.balance
        }).from(users).where(eq(users.id, targetUserId));

        return {
            success: true,
            message: `Đã cập nhật level thành ${levelLabels[level]}`,
            user: updatedUser
        };
    }
};

module.exports = UserService;
