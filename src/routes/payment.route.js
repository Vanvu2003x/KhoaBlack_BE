const express = require('express');
const { CreateLinkPayment } = require('../controllers/payment.controller');
const checkToken = require('../middleware/auJWT.middleware');
const router = express.Router();
router.post('/create-payment',checkToken,CreateLinkPayment);

module.exports = router;