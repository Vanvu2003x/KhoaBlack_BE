const express = require('express');
const router = express.Router();
const WalletLogController = require('./walletLog.controller');
const { checkToken } = require('../../middleware/auJWT.middleware');

router.get('/total-amount', WalletLogController.getTongTienTrongKhoang);
router.get('/', WalletLogController.getWalletLog); // Moved from /logs to / to match FE
router.get('/pending', WalletLogController.getPendingLogs); // New route
router.get('/logs', WalletLogController.getWalletLog); // Keep alias if needed
router.get('/logs-pending', WalletLogController.getWalletLogStatusDone);
router.get('/stats', WalletLogController.getTongSoTienDaNap);
router.post('/manual-charge', WalletLogController.manualChargeBalance);
router.patch('/update', WalletLogController.manualChargeBalance); // Add alias for FE calls
router.post('/cancel', checkToken, WalletLogController.cancelWalletLog);
router.get('/user-logs', checkToken, WalletLogController.getLogsByUser);

module.exports = router;
