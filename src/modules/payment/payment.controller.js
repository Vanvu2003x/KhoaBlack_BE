const PaymentService = require("./payment.service");
const asyncHandler = require("../../utils/asyncHandler");

const PaymentController = {
    createQR: asyncHandler(async (req, res) => {
        const result = await PaymentService.createQR(req.user, req.body.amount);
        res.json(result);
    }),

    Web2mHook: async (req, res) => {
        try {
            const authHeader = req.headers['authorization'];
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ message: 'Thiếu token hoặc định dạng sai' });
            }
            const token = authHeader.split(' ')[1];

            await PaymentService.handleWeb2mHook(req.body, token);
            res.sendStatus(200);
        } catch (err) {
            if (err.status) {
                return res.status(err.status).json({ message: err.message });
            }
            console.error("Webhook error:", err);
            // As per Web2M requirement or logic, might still return 200 or 500.
            res.sendStatus(500);
        }
    }
};

module.exports = PaymentController;
