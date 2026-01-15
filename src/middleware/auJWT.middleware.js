const UserService = require("../modules/user/user.service");
const { verifyToken } = require("../services/jwt.service");

// Middleware 1: Chỉ kiểm tra token (dùng cho các route cần xác thực nhưng không cần phân quyền)
const checkToken = (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    return res
      .status(401)
      .json({ message: "Token không hợp lệ hoặc không tồn tại" });
  }

  // const token = authHeader.split(" ")[1]; // Removed as we handle it above
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
  let token;
  const authHeader = req.headers.authorization;

  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    return res
      .status(401)
      .json({ message: "Token không hợp lệ hoặc không tồn tại" });
  }

  // const token = authHeader.split(" ")[1];

  try {
    const tokenResult = verifyToken(token);
    if (!tokenResult.valid || !tokenResult.decoded) {
      return res.status(403).json({ message: "Token không hợp lệ" });
    }

    const userDecoded = tokenResult.decoded;
    let isAdmin = false;
    try {
      const user = await UserService.getUserById(userDecoded.id);
      if (user && user.role === 'admin') {
        isAdmin = true;
      }
    } catch (err) {
      console.error("Lỗi khi kiểm tra quyền:", err);
      // Fallthrough to forbidden
    }

    if (!isAdmin) {
      return res.status(403).json({ message: "Không đủ quyền hạn" });
    }

    req.user = userDecoded; // Or fetch full user? Original decoded is just JWT payload.
    next();
  } catch (error) {
    console.error("Lỗi middleware checkRoleMDW:", error);
    return res
      .status(403)
      .json({ message: "Token không hợp lệ hoặc đã hết hạn" });
  }
};

const checkIsAdmin = async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  req.isAdmin = false;

  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    return next();
  }

  // const token = authHeader.split(" ")[1];

  try {
    const tokenResult = verifyToken(token);

    if (!tokenResult.valid || !tokenResult.decoded) {
      return next(); // Token không hợp lệ -> tiếp tục (isAdmin = false)
    }

    const userId = tokenResult.decoded.id;

    // Gán user vào req nếu cần
    req.user = tokenResult.decoded;

    const user = await UserService.getUserById(userId);
    if (user && user.role === 'admin') {
      req.isAdmin = true;
    }
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
