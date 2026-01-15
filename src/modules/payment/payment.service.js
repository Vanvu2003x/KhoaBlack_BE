const { db } = require("../../configs/drizzle");
const { walletLogs } = require("../../db/schema");
const { eq } = require("drizzle-orm");
// const { nanoid } = require("nanoid"); // Removed due to ESM issue
const crypto = require("crypto");
const UserService = require("../user/user.service");
require('dotenv').config();

// Helper to add log directly here as PaymentService needs it
async function addLogDirect(data) {
    const { user_id, amount } = data;

    // Generate alphanumeric ID (length 16)
    const generatedId = crypto.randomBytes(8).toString('hex').toUpperCase(); // 16 chars hex

    // Note: nanoid import might be ESM in newer versions. If problematic, use customAlphabet or randomUUID
    // Original code used customAlphabet. Let's stick to what works in CommonJS or use uuid if schema supports it.
    // Schema walletLogs.id is varchar(20). 
    // Let's use custom helper if nanoid causes issues, but widely compatible:
    // const { customAlphabet } = require('nanoid'); const nanoid = customAlphabet(..., 16);
    // Safe bet:
    // const customNanoid = require("nanoid").customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 16);
    // const generatedId = customNanoid();

    const newLog = {
        id: generatedId,
        user_id,
        amount,
        status: 'pending' // Default
    };

    await db.insert(walletLogs).values(newLog);
    const [log] = await db.select().from(walletLogs).where(eq(walletLogs.id, generatedId));
    return log;
}

const PaymentService = {
    createQR: async (user, amount) => {
        if (!amount) throw { status: 400, message: "Thiếu amount" };

        const nganhang = "MBB";
        const stk = "0963575203";
        const chusohuu = "VU%20DINHH%20VAN";

        const Log = await addLogDirect({ user_id: user.id, amount });

        // Remove non-alphanumeric chars from ID
        const rawId = Log.id.toString().replace(/[^a-zA-Z0-9]/g, '');
        const memo = `.${rawId}.`;
        const url = `https://apiqr.web2m.com/api/generate/${nganhang}/${stk}/${chusohuu}?amount=${amount}&memo=${memo}&is_mask=0&bg=12`;

        return {
            id: Log.id,
            urlPayment: url,
            amount: amount,
            name: user.name,
            email: user.email,
            bank_name: nganhang,
            accountNumber: stk,
            accountHolder: chusohuu,
            memo: memo
        };
    },

    handleWeb2mHook: async (data, token) => {
        const web2mToken = process.env.TOKEN_WEB2M;

        if (token !== web2mToken) {
            console.log("Token sai payment hook");
            throw { status: 401, message: 'Token sai' };
        }

        if (data.status === true && Array.isArray(data.data)) {
            for (const value of data.data) {
                try {
                    const match = value.description.match(/\.(.*?)\.(-|$)/); // Fixed regex slightly to match end or dash? Original: /\.(.*?)\.-/
                    // Actually let's trust original regex logic if valid: /\.(.*?)\.-/ 
                    // But if description is ".XYZ." it might not match ".-"
                    // Let's assume description format matches generated memo: `.${rawId}.`

                    const logId = match ? match[1] : null;
                    if (logId) {
                        const [log] = await db.select().from(walletLogs).where(eq(walletLogs.id, logId));

                        if (log && (log.status === 'pending' || log.status === 'Đang Chờ')) {
                            // Update Wallet
                            await UserService.updateBalance(log.user_id, value.amount, 'credit', 'Nạp tiền qua ngân hàng (Auto)');

                            // Update Log
                            await db.update(walletLogs)
                                .set({ status: "Thành Công", updated_at: new Date() })
                                .where(eq(walletLogs.id, log.id));
                        }
                    }
                } catch (err) {
                    console.error("Error processing transaction:", err);
                }
            }
        } else {
            console.log('Invalid webhook data or transaction failed.');
        }

        return true; // Success
    }
};

module.exports = PaymentService;
