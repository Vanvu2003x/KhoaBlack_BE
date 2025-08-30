const express = require("express");
const router = express.Router();
const topupController = require("../../controllers/toupPackage.controller");
const uploadImageMiddleware = require("../../middleware/uploadImage.middleware");
const { checkRoleMDW, checkIsAdmin } = require("../../middleware/auJWT.middleware");

// 1. Lấy toàn bộ gói
router.get("/", topupController.getAllTopupPackages);

// 2. Lấy theo game slug
router.get("/game/:game_code",checkIsAdmin,topupController.getTopupPackagesByGameSlug);

// 3. Tạo mới (có gửi ảnh)
router.post("/", uploadImageMiddleware,checkRoleMDW,topupController.createTopupPackage);

// 4. Sửa trạng thái
router.patch("/status", checkRoleMDW,topupController.updateStatus);

// 5.Câp nhẩ gói nạp
router.patch("/",uploadImageMiddleware,checkRoleMDW,topupController.updateTopupPackage)

// 6. Lấy gói có kiểu log
router.get("/type/log", topupController.getLogTopupPackages);

// 7. Xóa gói 
router.delete("/:id", checkRoleMDW,topupController.deleteTopupPackage);

// 9. Tifm kieém
router.get("/search", topupController.searchTopupPackages);

module.exports = router;
