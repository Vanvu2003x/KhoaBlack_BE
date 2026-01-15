const StatisticsController = require('./statistics.controller');
const express = require('express');
const router = express.Router();

router.get('/leaderboard', StatisticsController.getLeaderboard);
router.get('/best-sellers', StatisticsController.getBestSellers);

module.exports = router;
