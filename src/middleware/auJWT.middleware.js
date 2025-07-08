const { verifyToken } = require("../services/jwt.service");

const checkToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Token không hợp lệ hoặc không tồn tại" });
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
        return res.status(403).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
    }
};

module.exports = checkToken;
