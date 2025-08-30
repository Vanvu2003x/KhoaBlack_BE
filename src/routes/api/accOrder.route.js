const express = require("express");
const router = express.Router();
const AccOrdersController = require("../../controllers/accOrder.controller");
const { checkToken, checkRoleMDW } = require('../../middleware/auJWT.middleware');
const CheckBalance = require("../../middleware/checkBalance.middleware");

// Thêm order mới
router.post("/", checkToken, CheckBalance, AccOrdersController.createOrder);

// Lấy tất cả order của user hiện tại
router.get("/my-orders", checkToken, AccOrdersController.getMyOrders);

// Lấy orders theo user_id (admin)
router.get("/user/:user_id", AccOrdersController.getOrdersByUserId);

// Lấy orders theo acc_id
router.get("/acc/:acc_id", AccOrdersController.getOrdersByAccId);

// Gửi tài khoản cho user
router.put("/:id/send", checkToken, AccOrdersController.sendAccController);

// Hủy order
router.put("/:id/cancel", checkToken, AccOrdersController.cancelOrder);

// Lấy order theo id
router.get("/:id", AccOrdersController.getOrderById);

// Lấy tất cả order (admin)
router.get("/", AccOrdersController.getAllOrders);

module.exports = router;
