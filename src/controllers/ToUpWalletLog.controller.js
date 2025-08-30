const {
  getLogs,
  getTotal,
  getTongSoTienDaNap,
  getLogsPendding,
  getLogById,
  updateLog,
  getTongSoTienThangNay,
  getThongKe30NgayGanNhat,
  getTongSoTienHomNay
} = require("../models/toup_wallet_log.model");

const { recharge_balance } = require("../models/user.model");
exports.getTongTienTrongKhoangController = async (req, res) => {
  try {
    const user_id = req.query.user_id || null;
    const from = req.query.from; 
    const to = req.query.to;    

    if (!from || !to) {
      return res.status(400).json({ status: false, message: "Thiếu ngày bắt đầu hoặc kết thúc" });
    }

    const total = await getTongSoTienDaNap(user_id, from, to);

    res.status(200).json({
      status: true,
      from,
      to,
      total_amount: total
    });
  } catch (error) {
    console.error("Lỗi khi truy vấn tổng tiền trong khoảng:", error);
    res.status(500).json({ status: false, message: "Lỗi server" });
  }
};


//  Lấy danh sách log phân trang
exports.getWalletLogController = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;

    if (page < 1) {
      return res.status(400).json({ status: false, message: "Page không hợp lệ" });
    }

    const data = await getLogs(null, page);
    const total = await getTotal();

    res.status(200).json({
      status: true,
      totalItemPage: data.length,
      totalItem: total,
      data
    });
  } catch (error) {
    console.error("Lỗi khi lấy log giao dịch:", error);
    res.status(500).json({ status: false, message: "Lỗi server" });
  }
};

//  Lấy danh sách log ở trạng thái 'Đang Chờ'
exports.getWalletLogStatusDoneController = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;

    if (page < 1) {
      return res.status(400).json({ status: false, message: "Page không hợp lệ" });
    }

    const data = await getLogsPendding(null, page);
    const total = await getTotal("Đang Chờ", null);

    res.status(200).json({
      status: true,
      totalItemPage: data.length,
      totalItem: total,
      data
    });
  } catch (error) {
    console.error("Lỗi khi lấy log Đang Chờ:", error);
    res.status(500).json({ status: false, message: "Lỗi server" });
  }
};

//  Trả về tổng số tiền đã nạp thành công, tháng này, và mảng 30 ngày gần nhất
exports.getTongSoTienDaNapController = async (req, res) => {
  try {
    const user_id = req.query.user_id || null;

    const [
      tongToanBo,
      tongThangNay,
      tonghomnay,
      thongKe30Ngay
    ] = await Promise.all([
      getTongSoTienDaNap(user_id),
      getTongSoTienThangNay(user_id),
      getTongSoTienHomNay(user_id),
      getThongKe30NgayGanNhat(user_id)

    ]);

    res.status(200).json({
      status: true,
      tong_tien_da_nap: tongToanBo,
      tong_tien_thang_nay: tongThangNay,
      tong_tien_hom_nay: tonghomnay,
      thong_ke_30_ngay: thongKe30Ngay
    });
  } catch (error) {
    console.error("Lỗi khi thống kê tổng tiền:", error);
    res.status(500).json({ status: false, message: "Lỗi server" });
  }
};

//  Nạp tiền thủ công: xử lý log và cộng tiền nếu Thành Công
exports.manualChargeBalance = async (req, res) => {

  console.log("đÃ TỚI ĐÂY")
  try {
    const id = req.query.id;
    const { newStatus } = req.body;

    if (!id || !newStatus) {
      return res.status(400).json({ message: "Thiếu ID hoặc trạng thái mới" });
    }

    const log = await getLogById(id);

    if (!log) {
      return res.status(404).json({ message: "Không tìm thấy log" });
    }

    if (log.status !== "Đang Chờ") {
      return res.status(400).json({ message: "Chỉ xử lý được giao dịch ở trạng thái 'Đang Chờ'" });
    }

    if (newStatus === "Thành Công") {
      await recharge_balance(log.user_id, log.amount, 'credit');
      await updateLog(log.id, "Thành Công");
      return res.json({ success: true, message: "Đã nạp tiền và cập nhật trạng thái thành công." });
    }

    // Nếu chọn Thất Bại
    await updateLog(log.id, "Thất Bại");
    return res.json({ success: true, message: "Cập nhật trạng thái 'Thất Bại' thành công." });

  } catch (error) {
    console.error("Lỗi nạp thủ công:", error);
    res.status(500).json({ success: false, message: "Đã xảy ra lỗi." });
  }
};
// Hủy đơn nạp (chuyển trạng thái thành Thất Bại)
exports.cancelWalletLogController = async (req, res) => {
  try {
    const id = req.query.id;
    const user_id = req.user.id;
    if (!id) {
      return res.status(400).json({ status: false, message: "Thiếu ID log cần hủy" });
    }

    const log = await getLogById(id);

    
    if (!log) {
      return res.status(404).json({ status: false, message: "Không tìm thấy log" });
    }

    if (log.user_id !== user_id) {
      return res.status(404).json({ status: false, message: "Không hủy đơn của nguofi khác đc" });
    }
    if (log.status !== "Đang Chờ") {
      return res.status(400).json({ status: false, message: "Chỉ có thể hủy đơn ở trạng thái 'Đang Chờ'" });
    }

    await updateLog(id, "Thất Bại");

    return res.status(200).json({
      status: true,
      message: "Đã hủy đơn nạp thành công (đã cập nhật trạng thái Thất Bại)"
    });
  } catch (error) {
    console.error("Lỗi khi hủy đơn nạp:", error);
    res.status(500).json({ status: false, message: "Lỗi server khi hủy đơn" });
  }
};
exports.getLogsByUserController = async (req, res) => {
  try {
    const user_id = req.user.id; // Lấy user_id từ token đã giải mã trong middleware
    const page = parseInt(req.query.page) || 1;

    if (!user_id) {
      return res.status(401).json({ status: false, message: "Không xác thực được user" });
    }
    if (page < 1) {
      return res.status(400).json({ status: false, message: "Page không hợp lệ" });
    }

    const data = await getLogs(user_id, page);
    const total = await getTotal(null, user_id);

    res.status(200).json({
      status: true,
      totalItemPage: data.length,
      totalItem: total,
      data
    });
  } catch (error) {
    console.error("Lỗi khi lấy log của user:", error);
    res.status(500).json({ status: false, message: "Lỗi server" });
  }
};