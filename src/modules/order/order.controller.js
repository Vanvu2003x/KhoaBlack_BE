const OrderService = require("./order.service");
const asyncHandler = require("../../utils/asyncHandler");

const OrderController = {
    createOrder: asyncHandler(async (req, res) => {
        // Add user_id from authenticated user to the order data
        const orderData = {
            ...req.body,
            user_id: req.user.id
        };
        const result = await OrderService.createOrder(orderData);
        res.status(201).json(result);
    }),

    acceptOrder: asyncHandler(async (req, res) => {
        const result = await OrderService.acceptOrder(req.params.id, req.user.id);
        res.json(result);
    }),

    deleteOrder: asyncHandler(async (req, res) => {
        const result = await OrderService.deleteOrder(req.params.id);
        res.json(result);
    }),

    updateOrder: asyncHandler(async (req, res) => {
        const result = await OrderService.updateOrder(req.params.id, req.body);
        res.json(result);
    }),

    getAllOrders: asyncHandler(async (req, res) => {
        const result = await OrderService.getAllOrders(req.query.page);
        res.json(result);
    }),

    getOrderById: asyncHandler(async (req, res) => {
        const result = await OrderService.getOrderById(req.params.id);
        res.json(result);
    }),

    getCostStats: asyncHandler(async (req, res) => {
        const result = await OrderService.getCostStats();
        res.json(result);
    }),

    getCostSummary: asyncHandler(async (req, res) => {
        const result = await OrderService.getCostSummary();
        res.json(result);
    }),

    getOrdersByStatus: asyncHandler(async (req, res) => {
        const result = await OrderService.getOrdersByStatus(req.query.status, req.query.page);
        res.json(result);
    }),

    searchOrders: asyncHandler(async (req, res) => {
        const result = await OrderService.searchOrders(req.query.keyword);
        res.json(result);
    }),

    getOrdersByUserId: asyncHandler(async (req, res) => {
        const result = await OrderService.getOrdersByUserId(req.user.id, req.query.page);
        res.status(200).json(result);
    }),

    cancelOrderIfPending: asyncHandler(async (req, res) => {
        const result = await OrderService.cancelOrderIfPending(req.params.id, req.user.id);
        res.json(result);
    }),

    changeOrderStatus: asyncHandler(async (req, res) => {
        const result = await OrderService.changeOrderStatus(req.params.id, req.body.status);
        res.json(result);
    }),

    completeOrder: asyncHandler(async (req, res) => {
        const result = await OrderService.completeOrder(req.params.id);
        res.json(result);
    }),

    cancelOrderAndRefund: asyncHandler(async (req, res) => {
        const result = await OrderService.cancelOrderAndRefund(req.params.id);
        res.json(result);
    }),

    getMyNapOrdersStats: asyncHandler(async (req, res) => {
        const result = await OrderService.getMyNapOrdersStats(req.user.id, req.query.status, req.query.page);
        res.json(result);
    }),

    getOrderSummary3: asyncHandler(async (req, res) => {
        const result = await OrderService.getOrderSummary3(req.user.id);
        res.json(result);
    }),

    getTransactionHistory: asyncHandler(async (req, res) => {
        const result = await OrderService.getTransactionHistory(req.user.id, req.query.page, req.query.limit);
        res.json(result);
    }),

    getUserFinancialSummary: asyncHandler(async (req, res) => {
        const result = await OrderService.getUserFinancialSummary(req.user.id);
        res.json(result);
    })
};

module.exports = OrderController;
