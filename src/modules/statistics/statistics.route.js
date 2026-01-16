const StatisticsController = require('./statistics.controller');
const RevenueController = require('./revenue.controller');
const express = require('express');
const router = express.Router();

// Leaderboard and best sellers
router.get('/leaderboard', StatisticsController.getLeaderboard);
router.get('/best-sellers', StatisticsController.getBestSellers);

// Revenue analytics endpoints
router.get('/revenue/overview', RevenueController.getRevenueOverview);
router.get('/revenue/profit-margin', RevenueController.getProfitMargin);
router.get('/revenue/growth', RevenueController.getGrowthRates);
router.get('/revenue/top-sources', RevenueController.getTopSources);
router.get('/revenue/by-period', RevenueController.getByPeriod);

module.exports = router;
