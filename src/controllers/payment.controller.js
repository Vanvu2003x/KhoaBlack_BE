const client = require("../configs/redis.config");
const { createPayMentLinkService } = require("../services/payos.service");

async function CreateLinkPayment(req, res) {
    try {
        const data = req.body;
        const orderCode = Math.floor(100000000 + Math.random() * 900000000);
        if (!data.amount || !data.description || !data.items || !data.cancelUrl || !data.returnUrl) {
            return res.status(400).json({ message: "Thiếu thông tin cần thiết" });
        }
        
        await client.set(`UID-:${orderCode}`, req.user.id, {
            EX: 300, 
        });
        
        const requestData = {
            orderCode: orderCode,
            amount: data.amount, 
            description: data.description,
            items: data.items,
            cancelUrl: data.cancelUrl,
            returnUrl: data.returnUrl,
        };

        const urlLink = await createPayMentLinkService(requestData);
        res.json(urlLink);
    } catch (error) {
        console.error("Lỗi tạo link thanh toán:", error);
        res.status(500).json({ message: "Lỗi tạo link thanh toán", error: error.message });
    }
}

module.exports = { CreateLinkPayment };
