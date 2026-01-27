const express = require('express');
const router = express.Router();
const toolsGameController = require('./toolsgame.controller');

router.post('/sync-napgame', toolsGameController.manualSync);

module.exports = router;
