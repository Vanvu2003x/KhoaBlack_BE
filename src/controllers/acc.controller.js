const accModel = require("../models/acc.model");

// Tạo account mới
exports.CreateAcc = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Thiếu ảnh" });
    }

    const { info, price, game_id } = req.body;
    const image = req.file.filename;

    if (!info || !price || !game_id) {
      return res.status(400).json({ message: "Thiếu thông tin acc hoặc game_id" });
    }

    const result = await accModel.addAcc({ info, image, price, game_id });

    return res.status(201).json({
      message: "Tạo account thành công",
      data: result,
    });
  } catch (error) {
    console.error("Error in CreateAcc:", error);
    res.status(500).json({ message: "Lỗi server khi tạo account" });
  }
};

// Lấy danh sách account (lọc keyword + giá + game)
const getAccByGame = async (req, res) => {
  try {
    const { game_id } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 3;
    const offset = (page - 1) * limit;

    const result = await accModel.getAccByGame({
      game_id,
      limit,
      offset,
    });

    res.json({
      data: result.data,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    });
  } catch (err) {
    console.error("Error fetching accounts:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
// Cập nhật account
exports.updateAcc = async (req, res) => {
  try {
    const { id } = req.params;
    const { info, price, status, game_id } = req.body;
    let image = undefined;

    if (req.file) {
      image = req.file.filename;
    }

    const updatedAcc = await accModel.updateAcc(id, { info, image, price, status, game_id });

    return res.json({
      message: "Cập nhật account thành công",
      data: updatedAcc,
    });
  } catch (error) {
    console.error("Error in updateAcc:", error);
    res.status(500).json({ message: "Lỗi server khi cập nhật account" });
  }
};

// Xóa account
exports.deleteAcc = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedAcc = await accModel.deleteAcc(id);

    return res.json({
      message: "Xóa account thành công",
      data: deletedAcc,
    });
  } catch (error) {
    console.error("Error in deleteAcc:", error);
    res.status(500).json({ message: "Lỗi server khi xóa account" });
  }
};

// Lấy thống kê account
exports.getAccStats = async (req, res) => {
  try {
    const stats = await accModel.getAccStats();
    return res.json(stats);
  } catch (error) {
    console.error("Error in getAccStats:", error);
    res.status(500).json({ message: "Lỗi server khi lấy thống kê" });
  }
};
exports.getAccByGame = async (req, res) => {
  try {
    const { game_id, keyword, min, max } = req.query;

    if (!game_id) {
      return res.status(400).json({ message: "Thiếu game_id" });
    }

    const accounts = await accModel.getAccByGame({
      game_id,
      keyword: keyword || undefined,
      min: min ? Number(min) : undefined,
      max: max ? Number(max) : undefined,
    });

    return res.json({
      total: accounts.length,
      data: accounts,
    });
  } catch (error) {
    console.error("Error in getAccByGame:", error);
    res.status(500).json({ message: "Lỗi server khi lấy account theo game" });
  }
};