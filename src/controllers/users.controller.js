const { getInfoUser, getUser, updateUserRole, recharge_balance, searchUser } = require("../models/user.model");

exports.getInfo = async function (req, res) {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ message: "Chưa xác thực người dùng" });
    }

    const userInfo = await getInfoUser(user_id);
    if (!userInfo) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    return res.status(200).json({ user: userInfo });
  } catch (error) {
    console.error("Lỗi khi lấy thông tin người dùng:", error);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

exports.getAllUser = async (req, res) => {
  const role = req.query.role;
  try {
    const result = role ? await getUser(role) : await getUser();

    res.json({
      status: true,
      data: result,
      totalUser :result.length
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách user:", error);
    res.status(500).json({ status: false, message: "Lỗi máy chủ" });
  }
};

exports.updateUserRoleController = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const newRole = req.body.role;
   
    const targetUser = await getInfoUser(targetUserId);
    if (!targetUser) return res.status(404).json({ message: "Không tìm thấy người dùng cần cập nhật" });
    if (targetUser.role === "admin") return res.status(403).json({ message: "Không thể thay đổi role của admin" });

    const updateResult = await updateUserRole(targetUserId, newRole);
    if (!updateResult.success) return res.status(400).json({ message: updateResult.message || "Cập nhật role thất bại" });

    return res.status(200).json({ message: "Cập nhật role thành công", user: updateResult.user });
  } catch (error) {
    console.error("Lỗi khi cập nhật role người dùng:", error);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

exports.getUser = async (req, res) => {
  try {
    const user_id = req.query.user_id;
    if (!user_id) {
      return res.status(400).json({ message: "Thiếu tham số user_id" });
    }

    const userInfo = await getInfoUser(user_id);
    if (!userInfo) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    res.json(userInfo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.updateBalance = async (req, res) => {
  try {
    const { userId, amount, type } = req.body;

    if (!userId || !amount || !type) {
      return res.status(400).json({ message: "Thiếu tham số bắt buộc" });
    }

    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ message: "Amount phải là số dương" });
    }

    if (!["credit", "debit"].includes(type)) {
      return res.status(400).json({ message: "Type phải là 'credit' hoặc 'debit'" });
    }

    const success = await recharge_balance(userId, amount, type);
    if (!success) {
      return res.status(404).json({ message: "Không tìm thấy user hoặc cập nhật thất bại" });
    }

    return res.status(200).json({ message: "Cập nhật số dư thành công" });
  } catch (error) {
    console.error("Lỗi khi cập nhật số dư:", error);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
};
exports.searchUser = async (req, res) => {
  try {
    const { role, keyword } = req.query;
    const users = await searchUser(role, keyword);
    return res.json({ success: true, users });
  } catch (err) {
    console.error("Lỗi tìm kiếm user:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

