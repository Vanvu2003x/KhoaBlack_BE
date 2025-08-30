const express = require("express");
const {
  getWalletLogController,
  getTongSoTienDaNapController,
  getWalletLogStatusDoneController,
  manualChargeBalance,
  getTongTienTrongKhoangController,
  getLogsByUserController,
} = require("../../controllers/ToUpWalletLog.controller");

const { checkRoleMDW, checkToken } = require("../../middleware/auJWT.middleware");

const router = express.Router();

router.get("/", checkRoleMDW, getWalletLogController);
router.get("/getTongTien", checkRoleMDW, getTongSoTienDaNapController);
router.get("/pending", checkRoleMDW, getWalletLogStatusDoneController);
router.patch("/update", checkRoleMDW, manualChargeBalance);
router.get("/getTongtienTrongKhoang", checkRoleMDW, getTongTienTrongKhoangController);
router.get("/user", checkToken, getLogsByUserController);

module.exports = router;
