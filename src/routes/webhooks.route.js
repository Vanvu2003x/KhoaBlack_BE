// routes/web2mWebhook.js
const express = require("express");
const { Web2mHook } = require("../modules/payment/payment.controller");
const router = express.Router();

router.post('/web2m', Web2mHook);


module.exports = router;
