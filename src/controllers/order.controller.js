const OrderModel = require("../models/orders.model");
const { getPackageProfitById, getPackageAmountById } = require("../models/toupPackage.model");
const { recharge_balance } = require("../models/user.model");
const { sendStatus } = require("../services/nodemailer.service");

// ===================== Tạo đơn hàng mới =====================
exports.createOrder = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { account_info, package_id, status = "pending" } = req.body;

    const [profit, amount] = await Promise.all([
      getPackageProfitById(package_id),
      getPackageAmountById(package_id),
    ]);

    if (profit === null || amount === null) {
      return res.status(400).json({ message: "Gói nạp không tồn tại hoặc thiếu thông tin." });
    }

    const newOrder = await OrderModel.createOrder({
      user_id,
      status,
      account_info,
      amount,
      package_id,
      profit,
    });

    res.status(201).json({
      message: "Tạo đơn hàng thành công",
      data: {
        status: newOrder.status,
        account_info: newOrder.account_info,
        created_at: newOrder.create_at,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Tạo đơn hàng thất bại", error: err.message });
  }
};

// ===================== Nhận đơn hàng =====================
exports.acceptOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userIdFromToken = req.user.id;

    const order = await OrderModel.getOrderById(orderId);
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    if (order.status !== "pending") {
      return res.status(400).json({ message: "Chỉ nhận đơn đang chờ (pending)" });
    }

    const updatedOrder = await OrderModel.receiveOrder(orderId, userIdFromToken);

    res.json({
      message: "Đã nhận đơn thành công",
      order: updatedOrder,
    });
  } catch (err) {
    console.error("Lỗi khi nhận đơn hàng:", err);
    res.status(500).json({ message: "Nhận đơn thất bại", error: err.message });
  }
};

// ===================== Xoá đơn hàng =====================
exports.deleteOrder = async (req, res) => {
  try {
    const deleted = await OrderModel.deleteOrder(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    res.json({ message: "Xoá thành công", order: deleted });
  } catch (err) {
    res.status(500).json({ message: "Xoá thất bại", error: err.message });
  }
};

// ===================== Cập nhật đơn hàng =====================
exports.updateOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await OrderModel.getOrderById(orderId);
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    if (order.status !== "processing") {
      return res.status(400).json({ message: "Chỉ cập nhật đơn đang xử lý (processing)" });
    }

    const updatedOrder = await OrderModel.updateOrder(orderId, req.body);
    res.json(updatedOrder);
  } catch (err) {
    res.status(500).json({ message: "Cập nhật thất bại", error: err.message });
  }
};

// ===================== Lấy danh sách / chi tiết =====================
exports.getAllOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const result = await OrderModel.getAllOrders(page);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Lấy danh sách thất bại", error: err.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await OrderModel.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: "Lấy đơn hàng thất bại", error: err.message });
  }
};

// ===================== Thống kê =====================
exports.getCostStats = async (req, res) => {
  try {
    const result = await OrderModel.getCostStatsLast30Days();
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi thống kê chi phí", error: err.message });
  }
};

exports.getCostSummary = async (req, res) => {
  try {
    const result = await OrderModel.getCostSummary();
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi lấy thống kê chi phí", error: err.message });
  }
};

exports.getOrdersByStatus = async (req, res) => {
  try {
    const status = req.query.status;
    const page = parseInt(req.query.page) || 1;
    const result = await OrderModel.getOrdersByStatus(status, page);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi lấy đơn theo trạng thái", error: err.message });
  }
};

exports.searchOrders = async (req, res) => {
  try {
    const { keyword } = req.query;
    if (!keyword || keyword.trim() === "") {
      return res.status(400).json({ message: "Từ khóa tìm kiếm không được để trống." });
    }

    const orders = await OrderModel.searchOrders(keyword);
    res.json({ orders, total: orders.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server khi tìm kiếm đơn hàng" });
  }
};

// ===================== Đơn theo user =====================
exports.getOrdersByUserId = async (req, res) => {
  try {
    const user_id = req.user.id;
    const page = parseInt(req.query.page) || 1;

    const result = await OrderModel.getAllOrdersByUserId(user_id, page);

    const sanitizedOrders = result.orders.map(({ profit, ...rest }) => rest);

    res.status(200).json({
      ...result,
      orders: sanitizedOrders
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ===================== Hủy đơn =====================
exports.cancelOrderIfPending = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userIdFromToken = req.user.id;

    const order = await OrderModel.getOrderById(orderId);
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    if (order.user_id !== userIdFromToken) return res.status(403).json({ message: "Bạn không có quyền hủy đơn này" });
    if (order.status !== "pending") return res.status(400).json({ message: "Chỉ hủy đơn đang chờ (pending)" });

    const updated = await OrderModel.updateOrderStatus(orderId, "cancel");
    res.json({ message: "Đã hủy đơn thành công", order: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Hủy đơn thất bại", error: err.message });
  }
};

// ===================== Đổi trạng thái (Admin) =====================
exports.changeOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;
    const allowedStatuses = ["pending", "processing", "success", "cancel"];
    if (!allowedStatuses.includes(status)) return res.status(400).json({ message: "Trạng thái không hợp lệ" });

    const order = await OrderModel.getOrderById(orderId);
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    const updatedOrder = await OrderModel.updateOrderStatus(orderId, status);

    if (order.user_email) await sendStatus(order.user_email, updatedOrder);

    res.json({ message: "Cập nhật trạng thái thành công", order: updatedOrder });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Đổi trạng thái thất bại", error: err.message });
  }
};

// ===================== Hoàn thành / hủy + hoàn tiền =====================
exports.completeOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await OrderModel.getOrderById(orderId);
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    if (order.status !== "processing") return res.status(400).json({ message: "Chỉ hoàn thành đơn đang xử lý" });

    const updatedOrder = await OrderModel.updateOrderStatus(orderId, "success");
    if (order.user_email) await sendStatus(order.user_email, updatedOrder);

    res.json({ message: "Đã hoàn thành đơn hàng", order: updatedOrder });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Hoàn thành đơn thất bại", error: err.message });
  }
};

exports.cancelOrderAndRefund = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await OrderModel.getOrderById(orderId);
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    if (order.status !== "processing") return res.status(400).json({ message: "Chỉ hủy đơn đang xử lý" });

    const updatedOrder = await OrderModel.updateOrderStatus(orderId, "cancel");

    await recharge_balance(order.user_id, order.amount, "credit");
    if (order.user_email) await sendStatus(order.user_email, updatedOrder);

    res.json({ message: "Đã hủy đơn và hoàn tiền thành công", order: updatedOrder });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Hủy đơn thất bại", error: err.message });
  }
};

// ===================== Thống kê nạp / lịch sử giao dịch =====================
exports.getMyNapOrdersStats = async (req, res) => {
  try {
    const userIdNap = req.user.id;
    const { status } = req.query;
    const page = parseInt(req.query.page) || 1;

    let ordersResult;
    let stats;

    if (status === "pending") {
      ordersResult = await OrderModel.getOrdersByStatus(status, page);
      stats = await OrderModel.getOrderStatsByUserNap();
    } else {
      ordersResult = await OrderModel.getOrdersByStatusWithNap(status, page, userIdNap);
      stats = await OrderModel.getOrderStatsByUserNap(userIdNap);
    }

    res.json({ stats, ...ordersResult });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server khi lấy thống kê nạp", error: err.message });
  }
};

exports.getOrderSummary3 = async (req, res) => {
  try {
    const userIdNap = req.user.id;
    const pending_total = await OrderModel.getPendingTotal();
    const stats = await OrderModel.getOrderStatsByUserNap(userIdNap);

    res.json({ status: true, pending_total, stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, message: "Lỗi khi lấy summary" });
  }
};

exports.getTransactionHistory = async (req, res) => {
  try {
    const user_id = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await OrderModel.getCombinedTransactionHistory(user_id, page, limit);

    res.json({ status: true, ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, message: "Lỗi server khi lấy lịch sử giao dịch" });
  }
};

exports.getUserFinancialSummary = async (req, res) => {
  try {
    const user_id = req.user.id;
    const summary = await OrderModel.getUserFinancialSummary(user_id);
    res.json({ status: true, data: summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, message: "Lỗi server khi lấy thống kê tài chính" });
  }
};
