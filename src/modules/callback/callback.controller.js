const OrderService = require("../order/order.service");
const { db } = require("../../configs/drizzle");
const { orders } = require("../../db/schema");
const { eq } = require("drizzle-orm");

const CallbackController = {
    // Morishop Callback
    // Method: POST
    // Params: idtrx (our ID), status (Success/Error), sn (serial/note), price (actual price)
    morishopCallback: async (req, res) => {
        try {
            console.log("[Callback] Morishop received:", req.body);
            const { idtrx, status, sn, price, note } = req.body;

            // idtrx format expected: "KB_123" -> order.id = 123
            if (!idtrx || !idtrx.toString().startsWith('KB_')) {
                console.log("[Callback] Morishop: Invalid idtrx format", idtrx);
                return res.json({ status: false, msg: "Invalid ID format" });
            }

            const orderId = idtrx.split('_')[1];

            // Map status
            // Morishop status: 'Success', 'Error', 'Pending'
            let newStatus = 'processing';
            let description = sn || note || '';

            if (status === 'Success') {
                newStatus = 'success';
            } else if (status === 'Error' || status === 'Gagal') { // 'Gagal' is failed in Indo
                newStatus = 'failed'; // or 'cancelled'
            }

            if (newStatus === 'processing') {
                return res.json({ status: true }); // No change
            }

            // Update Order
            if (newStatus === 'success') {
                await OrderService.completeOrder(orderId);
            } else if (newStatus === 'failed') {
                // Auto refund if failed? 
                // Usually yes for automated systems.
                await OrderService.cancelOrderAndRefund(orderId);
            }

            res.json({ status: true });
        } catch (error) {
            console.error("[Callback] Morishop Error:", error);
            res.status(500).json({ status: false, msg: error.message });
        }
    },

    // NapGame247 Callback (If available/configured)
    napgameCallback: async (req, res) => {
        try {
            console.log("[Callback] NapGame247 received:", req.query);
            // Logic depends on NapGame callback docs. 
            // Usually they send GET request with params.
            // Placeholder for now.
            res.send("OK");
        } catch (error) {
            console.error("[Callback] NapGame247 Error:", error);
            res.status(500).send("Error");
        }
    }
};

module.exports = CallbackController;
