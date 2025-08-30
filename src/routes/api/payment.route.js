
const express = require('express');
const { createQR } = require('../../controllers/payment.controller');
const { checkToken } = require('../../middleware/auJWT.middleware');
const { cancelWalletLogController } = require('../../controllers/ToUpWalletLog.controller');
const router = express.Router();

router.post('/createQR',checkToken,createQR)
router.patch('/cancel',checkToken,cancelWalletLogController)
module.exports = router