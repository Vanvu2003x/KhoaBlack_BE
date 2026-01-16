const express = require('express');
const router = express.Router();
const AccOrderController = require('./accOrder.controller');
const { checkToken } = require('../../middleware/auJWT.middleware');

router.post('/', checkToken, AccOrderController.createOrder); // FE: api.post("/api/accOrder/")
router.get('/my-orders', checkToken, AccOrderController.getMyOrders);
router.get('/user/:user_id', AccOrderController.getOrdersByUserId);
router.get('/detail/:id', AccOrderController.getOrderById);
router.get('/acc/:acc_id', AccOrderController.getOrdersByAccId);
router.put('/:id/status', AccOrderController.updateStatus);
router.get('/', AccOrderController.getAllOrders); // FE: api.get("/api/accOrder")
router.put('/:id/cancel', AccOrderController.cancelOrder); // FE: api.put(`/api/accOrder/${orderId}/cancel`)
router.put('/:id/send', AccOrderController.sendAcc); // FE: api.put(`/api/accOrder/${orderId}/send`)

module.exports = router;
