const { checkRole } = require("../models/user.model");
const { verifyToken } = require("../services/jwt.service");

// Middleware 1: Chỉ kiểm tra token (dùng cho các route cần xác thực nhưng không cần phân quyền)
const checkToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Token không hợp lệ hoặc không tồn tại" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const tokenResult = verifyToken(token);

    if (!tokenResult.valid) {
      return res.status(403).json({ message: "Token không hợp lệ" });
    }

    req.user = tokenResult.decoded;
    next();
  } catch (error) {
    return res
      .status(403)
      .json({ message: "Token không hợp lệ hoặc đã hết hạn" });
  }
};

// Middleware 2: Kiểm tra quyền admin (nếu không phải admin => chặn)
const checkRoleMDW = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Token không hợp lệ hoặc không tồn tại" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const tokenResult = verifyToken(token);
    if (!tokenResult.valid || !tokenResult.decoded) {
      return res.status(403).json({ message: "Token không hợp lệ" });
    }

    const user = tokenResult.decoded;
    let isAdmin = false;
    try {
      isAdmin = await checkRole(user.id);
    } catch (err) {
      console.error("Lỗi khi kiểm tra quyền:", err);
      return res
        .status(500)
        .json({ message: "Lỗi máy chủ khi kiểm tra quyền" });
    }

    if (!isAdmin) {
      return res.status(403).json({ message: "Không đủ quyền hạn" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Lỗi middleware checkRoleMDW:", error);
    return res
      .status(403)
      .json({ message: "Token không hợp lệ hoặc đã hết hạn" });
  }
};

const checkIsAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  req.isAdmin = false;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(); 
  }

  const token = authHeader.split(" ")[1];

  try {
    const tokenResult = verifyToken(token);

    if (!tokenResult.valid || !tokenResult.decoded) {
      return next(); // Token không hợp lệ -> tiếp tục (isAdmin = false)
    }

    const userId = tokenResult.decoded.id;

    // Gán user vào req nếu cần
    req.user = tokenResult.decoded;

    const isAdmin = await checkRole(userId);
    req.isAdmin = !!isAdmin;
  } catch (err) {
    console.error("❌ Lỗi khi kiểm tra quyền admin:", err);
  }

  next();
};

module.exports = {
  checkToken,
  checkRoleMDW,
  checkIsAdmin,
};
