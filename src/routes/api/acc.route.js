const express = require("express");
const uploadImageMiddleware = require("../../middleware/uploadImage.middleware");
const { checkRoleMDW } = require("../../middleware/auJWT.middleware");
const { CreateAcc, getAccByGame, deleteAcc } = require("../../controllers/acc.controller");
const router = express.Router();

// Tạo account mới (có upload ảnh)
router.post("/", uploadImageMiddleware, checkRoleMDW, CreateAcc);

// Lấy danh sách account (lọc keyword + khoảng giá)

// Lấy danh sách account theo game_id (có filter keyword + min/max)
router.get("/game", getAccByGame);

// Cập nhật account
// router.put("/:id", accController.updateAcc);

 router.delete("/:id", deleteAcc);

module.exports = router;
