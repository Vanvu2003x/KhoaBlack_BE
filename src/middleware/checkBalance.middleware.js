const AccService = require("../modules/acc/acc.service");
const PackageService = require("../modules/package/package.service");
const UserService = require("../modules/user/user.service");
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

    let description = "Thanh toán dịch vụ";

    if (req.body.package_id) {
      const packageObj = await PackageService.getPackagePriceById(req.body.package_id);
      if (packageObj) {
        price = packageObj.price;
        description = `Mua gói: ${packageObj.package_name}`;
      }
    } else if (req.body.acc_id) {
      const accObj = await AccService.getPriceById(req.body.acc_id);
      if (accObj) {
        price = accObj.price;
        description = `Mua tài khoản: ${accObj.info || req.body.acc_id}`;
      }
    } else {
      return res.status(400).json({ message: "Thiếu package_id hoặc acc_id" });
    }
    if (price == null) {
      return res.status(404).json({ message: "Không tìm thấy giá của gói hoặc account" });
    }

    // console.log(price);

    const user = await UserService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy user" });
    }
    const balance = user.balance; // assuming balance is field

    if (Number(balance) < Number(price)) {
      return res.status(400).json({ message: "Số dư không đủ" });
    }

    // Trừ tiền trước khi cho đi tiếp, using "debit" type
    await UserService.updateBalance(userId, price, "debit", description);

    // gán user_id vào body cho tiện dùng ở controller
    req.body.user_id = userId;

    next();
  } catch (error) {
    console.error("Lỗi kiểm tra số dư:", error);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
}

module.exports = CheckBalance;
