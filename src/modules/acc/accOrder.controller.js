const AccOrderService = require("./accOrder.service");
const asyncHandler = require("../../utils/asyncHandler");

const AccOrderController = {
    createOrder: asyncHandler(async (req, res) => {
        const result = await AccOrderService.createOrder(req.user.id, req.body);
        res.json(result);
    }),

    getOrdersByUserId: asyncHandler(async (req, res) => {
        const result = await AccOrderService.getByUserId(req.params.user_id);
        res.json(result);
    }),

    getOrderById: asyncHandler(async (req, res) => {
        const result = await AccOrderService.getById(req.params.id);
        res.json(result);
    }),

    getOrdersByAccId: asyncHandler(async (req, res) => {
        const result = await AccOrderService.getByAccId(req.params.acc_id);
        res.json(result);
    }),

    updateStatus: asyncHandler(async (req, res) => {
        const result = await AccOrderService.updateStatus(req.params.id, req.body.status);
        res.json(result);
    }),

    getAllOrders: asyncHandler(async (req, res) => {
        const result = await AccOrderService.getAll();
        res.json(result);
    }),

    cancelOrder: asyncHandler(async (req, res) => {
        const result = await AccOrderService.cancelOrder(req.params.id);
        res.json(result);
    }),

    sendAcc: asyncHandler(async (req, res) => {
        // Correct mapping: sendAcc calls updateContactInfo
        const result = await AccOrderService.updateContactInfo(req.params.id, req.body.ttacc);
        res.json(result);
    }),

    getMyOrders: asyncHandler(async (req, res) => {
        const result = await AccOrderService.getByUserId(req.user.id);
        res.json(result);
    })
};

module.exports = AccOrderController;
