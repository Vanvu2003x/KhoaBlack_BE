const express = require("express");
const router = express.Router();
const orderController = require("../../controllers/order.controller");
const { checkToken, checkRoleMDW } = require("../../middleware/auJWT.middleware");
const CheckBalance = require("../../middleware/checkBalance.middleware");

// Tạo đơn hàng mới (cần đăng nhập)
router.post("/", checkToken,CheckBalance, orderController.createOrder);

// Lấy thống kê chi phí 30 ngày gần nhất (bắt buộc đặt TRƯỚC ":id" để tránh nhầm id = "stats")
router.get("/stats/cost", orderController.getCostSummary);

// Danh sách tất cả đơn hàng
router.get("/",checkRoleMDW ,orderController.getAllOrders);

// Danh sách đơn hàng theo trạng thái
router.get("/by-status",checkRoleMDW, orderController.getOrdersByStatus);

// TÌM kiếm
router.get("/search", checkRoleMDW,orderController.searchOrders);

// Lấy danh sách đơn hàng của người dùng đã đăng nhập
router.get("/user", checkToken, orderController.getOrdersByUserId);

router.patch("/:id/accept", checkToken, orderController.acceptOrder);
router.patch("/:id/status", checkRoleMDW, orderController.changeOrderStatus);
// Lấy thống kê & danh sách đơn mà user này đã nhận (user_id_nap)
router.get("/mynap", checkToken, orderController.getMyNapOrdersStats);
// Hoàn thành đơn (chỉ admin hoặc user có quyền)
router.patch("/:id/complete", orderController.completeOrder);

// Hủy đơn và hoàn tiền (chỉ user tạo đơn hoặc admin)
router.patch("/:id/cancel", orderController.cancelOrderAndRefund);
router.get("/summary", checkToken, orderController.getOrderSummary3);
// Lịch sử giao dịch (orders + wallet_logs)
router.get("/history", checkToken, orderController.getTransactionHistory);
// Thống kê tài chính user (tổng tiền đã tiêu + tổng tiền nạp trong tháng)
router.get("/financial-summary", checkToken, orderController.getUserFinancialSummary);

module.exports = router;
