const RevenueService = require('./revenue.service');
const asyncHandler = require('../../utils/asyncHandler');

const RevenueController = {
    /**
     * GET /api/statistics/revenue/overview
     * Get comprehensive revenue overview
     */
    getRevenueOverview: asyncHandler(async (req, res) => {
        const result = await RevenueService.getRevenueStats();
        res.json(result);
    }),

    /**
     * GET /api/statistics/revenue/profit-margin
     * Get profit margin calculations
     */
    getProfitMargin: asyncHandler(async (req, res) => {
        const result = await RevenueService.getProfitMargins();
        res.json(result);
    }),

    /**
     * GET /api/statistics/revenue/growth
     * Get growth rate comparisons
     */
    getGrowthRates: asyncHandler(async (req, res) => {
        const result = await RevenueService.getGrowthRates();
        res.json(result);
    }),

    /**
     * GET /api/statistics/revenue/top-sources
     * Get top revenue contributors
     */
    getTopSources: asyncHandler(async (req, res) => {
        const limit = req.query.limit ? parseInt(req.query.limit) : 10;
        const result = await RevenueService.getTopRevenueSources(limit);
        res.json(result);
    }),

    /**
     * GET /api/statistics/revenue/by-period?period=daily|weekly|monthly
     * Get revenue data filtered by period
     */
    getByPeriod: asyncHandler(async (req, res) => {
        const period = req.query.period || 'daily';
        const result = await RevenueService.getRevenueByPeriod(period);
        res.json(result);
    })
};

module.exports = RevenueController;
