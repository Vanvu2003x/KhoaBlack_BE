const express = require('express');
const router = express.Router();
const PaymentController = require('./payment.controller');
const { checkToken } = require('../../middleware/auJWT.middleware');

router.post('/createQR', checkToken, PaymentController.createQR);
router.post('/web2m_hook', PaymentController.Web2mHook);

module.exports = router;
