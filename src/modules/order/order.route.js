const express = require('express');
const router = express.Router();
const OrderController = require('./order.controller');
const { checkToken } = require('../../middleware/auJWT.middleware');

// Public/User routes
// Public/User routes
router.post('/', checkToken, OrderController.createOrder); // FE: api.post("/api/order")
router.get('/my-orders', checkToken, OrderController.getOrdersByUserId); // Might duplicate /user?
router.get('/user', checkToken, OrderController.getOrdersByUserId); // FE: /api/order/user
router.put('/:id/cancel', checkToken, OrderController.cancelOrderIfPending); // FE: /api/order/${id}/cancel
router.get('/transaction-history', checkToken, OrderController.getTransactionHistory);
router.get('/financial-summary', checkToken, OrderController.getUserFinancialSummary);
router.get('/summary', checkToken, OrderController.getUserFinancialSummary); // FE: /api/order/summary

// Agent/Admin routes
router.get('/receive/summary', checkToken, OrderController.getOrderSummary3);
router.get('/mynap', checkToken, OrderController.getMyNapOrdersStats); // FE: /api/order/mynap (stats?) or list?
router.get('/receive/stats', checkToken, OrderController.getMyNapOrdersStats);
router.post('/:id/accept', checkToken, OrderController.acceptOrder); // FE: /api/order/${id}/accept
router.post('/:id/complete', OrderController.completeOrder); // FE: /api/order/${id}/complete

// Admin/Agent Management routes
router.get('/', OrderController.getAllOrders); // FE: api.get("/api/order")
router.get('/detail/:id', OrderController.getOrderById);
router.delete('/delete/:id', OrderController.deleteOrder);
router.put('/update/:id', OrderController.updateOrder);
router.get('/stats/cost', OrderController.getCostStats); // FE: /api/order/stats/cost
router.get('/cost-summary', OrderController.getCostSummary);
router.get('/by-status', OrderController.getOrdersByStatus); // FE: /api/order/by-status
router.get('/search', OrderController.searchOrders);

router.post('/change-status/:id', OrderController.changeOrderStatus);
router.post('/cancel-refund/:id', OrderController.cancelOrderAndRefund);

module.exports = router;
