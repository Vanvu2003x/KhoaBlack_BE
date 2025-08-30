const accModel = require("../models/acc.model");
const AccOrdersModel = require("../models/accOrder.model");
const { recharge_balance } = require("../models/user.model");
const { sendAcc } = require("../services/nodemailer.service");

// Thêm order mới
exports.createOrder = async (req, res) => {
  try {
    const { acc_id, contact_info } = req.body;
    const user_id = req.user.id;

    if (!acc_id || !user_id) {
      return res.status(400).json({ message: "Thiếu dữ liệu bắt buộc" });
    }

    // Kiểm tra acc đã có order đang bán (status = 'selling' hoặc 'pending')
    const existingOrders = await AccOrdersModel.getByAccId(acc_id);
    const isSelling = existingOrders.some(o => o.status === "pending" || o.status === "selling");
    if (isSelling) {
      return res.status(400).json({ message: "Acc này đang có đơn đang bán, không thể đặt tiếp" });
    }

    // Lấy price từ bảng acc
    const price = await accModel.getPriceById(acc_id);
    if (price === null) {
      return res.status(404).json({ message: "Không tìm thấy acc" });
    }

    // Parse contact_info nếu FE gửi string
    let parsedContact = {};
    if (contact_info) {
      parsedContact =
        typeof contact_info === "string"
          ? JSON.parse(contact_info)
          : contact_info;
    }

    // Tạo order mới
    const order = await AccOrdersModel.createOrder({
      acc_id,
      user_id,
      price: price,
      status: "pending", 
      contact_info: parsedContact,
    });

    res.json({ success: true, data: order });
  } catch (err) {
    console.error("createOrder error:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};
;

// Lấy order theo user_id
exports.getOrdersByUserId = async (req, res) => {
  try {
    const { user_id } = req.params;
    const orders = await AccOrdersModel.getByUserId(user_id);
    res.json({ success: true, data: orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Lấy order theo id
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await AccOrdersModel.getById(id);
    if (!order)
      return res.status(404).json({ message: "Không tìm thấy order" });
    res.json({ success: true, data: order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Lấy order theo acc_id
exports.getOrdersByAccId = async (req, res) => {
  try {
    const { acc_id } = req.params;
    const orders = await AccOrdersModel.getByAccId(acc_id);
    res.json({ success: true, data: orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Cập nhật status
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Thiếu status" });
    }

    const updated = await AccOrdersModel.updateStatus(id, status);
    if (!updated)
      return res.status(404).json({ message: "Không tìm thấy order" });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("updateStatus error:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Lấy tất cả order
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await AccOrdersModel.getAll();
    res.json({ success: true, data: orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const order = await AccOrdersModel.getById(req.params.id); 
    if (!order) {
      return res.status(404).json({ message: "Order không tồn tại" });
    }

    // Cập nhật trạng thái thành 'cancel'
    await AccOrdersModel.cancelOrder(order.id);

    // Hoàn tiền cho user
    await recharge_balance(order.user_id, order.price, "credit");

    return res.json({ message: "Đã hủy đơn và hoàn tiền cho user ✅" });
  } catch (error) {
    console.error("Cancel order error:", error);
    return res.status(500).json({ message: "Hủy đơn thất bại ❌" });
  }
};
exports.sendAccController = async (req, res) => {
  try {
    const tt = req.body.ttacc; 
    const orderId = req.params.id;

    // Lấy order từ DB
    const order = await AccOrdersModel.getById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order không tồn tại" });
    }

    // Lấy email từ contact_info
    const email = order.contact_info?.email;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ message: "Email người dùng không hợp lệ" });
    }

    // Cập nhật trạng thái order thành success
    await AccOrdersModel.updateStatus(order.id, "success");

    // Chuẩn bị dữ liệu gửi email
    const emailData = {
      account: tt.account,
      password: tt.password,
      note: tt.note || "Không có",
      order_code: order.id,
      price: order.price,
      status: "success",
      created_at: order.created_at
    };

    // Gửi email
await sendAcc(email, emailData, order); // truyền order vào

    return res.json({ message: "Đã gửi thông tin tài khoản cho user ✅" });
  } catch (error) {
    console.error("Send account error:", error);
    return res.status(500).json({ message: "Gửi thông tin tài khoản thất bại ❌" });
  }
};

// Lấy tất cả order của user hiện tại
exports.getMyOrders = async (req, res) => {
  try {
    const user_id = req.user.id; 
    if (!user_id) {
      return res.status(400).json({ message: "Không xác định được user" });
    }

    const orders = await AccOrdersModel.getAllByUserId(user_id);
    res.json({ success: true, data: orders });
  } catch (err) {
    console.error("getMyOrders error:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};
