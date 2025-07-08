const client = require("../configs/redis.config");
const { recharge_balance } = require("../models/user.model");

const handleWebhook = async (req, res) => {
    try {
        const body = req.body;
        console.log("Đã nhận thành công")
        if (body.success && body.data?.orderCode && body.data?.amount) {
            console.log("✅ Thanh toán thành công");

            const orderCode = body.data.orderCode;
            const amount = body.data.amount;

            const uid = await client.get(`UID-:${orderCode}`);
            console.log(uid)
            if (!uid) {
                console.warn(`⚠️ Không tìm thấy userId cho orderCode ${orderCode}`);
                return res.sendStatus(404);
            }

            await recharge_balance(uid, amount);
            console.log(`💰 Cộng ${amount} xu cho user ${uid}`);
        }

        res.sendStatus(200);
    } catch (error) {
        console.error("❌ Lỗi xử lý webhook:", error);
        res.sendStatus(500);
    }
};

module.exports = { handleWebhook };
