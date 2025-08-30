const { getPriceById } = require("../models/acc.model");
const { getPackagePriceById } = require("../models/toupPackage.model");
const { getBalance, recharge_balance } = require("../models/user.model");
const { verifyToken } = require("../services/jwt.service");

async function CheckBalance(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid token" });
  }

  const token = authHeader.split(" ")[1];
  const tokenResult = verifyToken(token);

  try {
    if (!tokenResult.valid) {
      return res.status(403).json({ message: "Token không hợp lệ" });
    }

    const userId = tokenResult.decoded.id;
    let price = null;

    if (req.body.package_id) {
      price = (await getPackagePriceById(req.body.package_id)).price;
    } else if (req.body.acc_id) {
      price = await getPriceById(req.body.acc_id);
    } else {
      return res.status(400).json({ message: "Thiếu package_id hoặc acc_id" });
    }
    if (price == null) {
      return res.status(404).json({ message: "Không tìm thấy giá của gói hoặc account" });
    }

    console.log(price);
    
    const balance = await getBalance(userId);
    if (balance == null) {
      return res.status(404).json({ message: "Không tìm thấy số dư" });
    }

    if (Number(balance) < Number(price)) {
      return res.status(400).json({ message: "Số dư không đủ" });
    }

    // Trừ tiền trước khi cho đi tiếp
    await recharge_balance(userId, price, "debit");

    // gán user_id vào body cho tiện dùng ở controller
    req.body.user_id = userId;

    next();
  } catch (error) {
    console.error("Lỗi kiểm tra số dư:", error);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
}

module.exports = CheckBalance;
