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

// Middleware 4: Optional Auth - Lấy user info nếu có token, không bắt buộc login
// Simplified: Nếu có lỗi gì -> mặc định level 1, không block request
const optionalAuth = async (req, res, next) => {
  req.userLevel = 1; // Default level 1 (basic)
  req.isAdmin = false;

  try {
    let token = null;

    // Lấy token từ cookie hoặc header
    if (req.cookies?.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) return next(); // Không có token -> level 1

    const tokenResult = verifyToken(token);
    if (!tokenResult.valid || !tokenResult.decoded) return next();

    req.user = tokenResult.decoded;

    // Lấy user level từ DB
    const user = await UserService.getUserById(tokenResult.decoded.id);
    if (user) {
      req.userLevel = user.level || 1;
      req.isAdmin = user.role === 'admin';
    }
  } catch (err) {
    // Lỗi gì cũng bỏ qua, dùng default level 1
    // console.error("optionalAuth error (ignored):", err.message);
  }

  next();
};

module.exports = {
  checkToken,
  checkRoleMDW,
  checkIsAdmin,
  optionalAuth,
};
