const express = require("express");
const { handleWebhook } = require("../controllers/payment_webhook");
const router = express.Router();
router.post("/webhook", handleWebhook);

module.exports = router;
