const express = require('express');
const router = express.Router();
const morishopController = require('./morishop.controller');

// Define routes
router.post('/balance', morishopController.checkSaldo); // Using POST to match general pattern, but GET could work too. keeping standard.
router.post('/services', morishopController.getServices);
router.post('/order', morishopController.createOrder);
router.post('/status', morishopController.checkStatus);

module.exports = router;
