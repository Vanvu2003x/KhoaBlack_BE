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
            balance: users.balance,
            status: users.status,
            created_at: users.created_at,
            updated_at: users.updated_at,
            so_don_order: sql`COALESCE((SELECT COUNT(*) FROM orders WHERE orders.user_id = ${users.id}), 0)`,
            so_don_da_nap: sql`COALESCE((SELECT COUNT(*) FROM orders WHERE orders.user_id_nap = ${users.id} AND orders.status = 'success'), 0)`,
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
            id: users.id, name: users.name, email: users.email, role: users.role, balance: users.balance, created_at: users.created_at
        }).from(users).where(eq(users.id, targetUserId));

        return { message: "Cập nhật role thành công", user: updatedUser };
    },

    getUserById: async (userId) => {
        if (!userId) {
            throw { status: 400, message: "Thiếu tham số user_id" };
        }

        const [userInfo] = await db.select({
            id: users.id, name: users.name, email: users.email, balance: users.balance, role: users.role, created_at: users.created_at
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
                throw { status: 400, message: "Số dư không đủ" };
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

        // Socket logic preserved from original
        let socketEntry = null;
        for (const entry of userSocketMap.entries()) {
            const socketId = entry[0];
            const user = entry[1];
            if (user.id === userId) {
                socketEntry = [socketId, user];
                break;
            }
        }

        if (socketEntry) {
            const [socketId] = socketEntry;
            const io = require("../../sockets/websocket").getIO();
            const socket = io.sockets.sockets.get(socketId);
            if (socket) {
                socket.emit("balance_update", newBalance);
                socket.emit("payment_success", {
                    redirect: true,
                    url: "/",
                    message: "Thanh toán thành công!",
                    balance: newBalance,
                });
            }
        }

        return { message: "Cập nhật số dư thành công" };
    },

    searchUser: async (role, keyword) => {
        let query = db.select({
            id: users.id,
            name: users.name,
            email: users.email,
            hash_password: users.hash_password,
            role: users.role,
            balance: users.balance,
            status: users.status,
            created_at: users.created_at,
            updated_at: users.updated_at,
            so_don_order: sql`COALESCE((SELECT COUNT(*) FROM orders WHERE orders.user_id = ${users.id}), 0)`,
            so_don_da_nap: sql`COALESCE((SELECT COUNT(*) FROM orders WHERE orders.user_id_nap = ${users.id} AND orders.status = 'success'), 0)`,
            tong_amount: sql`COALESCE((SELECT SUM(amount) FROM topup_wallet_logs WHERE topup_wallet_logs.user_id = ${users.id} AND topup_wallet_logs.status = ${'Thành Công'}), 0)`
        }).from(users).where(sql`1=1`);


        if (role) {
            query.where(eq(users.role, role));
        }

        if (keyword) {
            const searchTerm = `%${keyword}%`;
            query.where(or(ilike(users.name, searchTerm), ilike(users.email, searchTerm)));
        }

        const result = await query;
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
    }
};

module.exports = UserService;
