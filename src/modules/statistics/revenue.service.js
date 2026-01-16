const { db } = require("../../configs/drizzle");
const { walletLogs, orders, users, topupPackages, games } = require("../../db/schema");
const { eq, sql, desc, and, gte, lte } = require("drizzle-orm");

const RevenueService = {
    /**
     * Get comprehensive revenue statistics
     * Includes: total revenue, monthly, daily, and 30-day breakdown
     */
    getRevenueStats: async () => {
        try {
            // Get overall revenue stats from wallet logs (successful deposits)
            const [totalStats] = await db.execute(sql`
                SELECT 
                    COALESCE(SUM(amount), 0) AS tong_tien_da_nap,
                    COALESCE(SUM(CASE 
                        WHEN DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m') 
                        THEN amount ELSE 0 
                    END), 0) AS tong_tien_thang_nay,
                    COALESCE(SUM(CASE 
                        WHEN DATE(created_at) = CURDATE() 
                        THEN amount ELSE 0 
                    END), 0) AS tong_tien_hom_nay
                FROM topup_wallet_logs
                WHERE status = 'Thành Công'
            `);

            // Get last 30 days breakdown
            const last30Days = await db.execute(sql`
                SELECT 
                    DATE(created_at) as date,
                    COALESCE(SUM(amount), 0) as total_amount
                FROM topup_wallet_logs
                WHERE status = 'Thành Công'
                    AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                GROUP BY DATE(created_at)
                ORDER BY date ASC
            `);

            return {
                status: true,
                tong_tien_da_nap: Number(totalStats[0].tong_tien_da_nap),
                tong_tien_thang_nay: Number(totalStats[0].tong_tien_thang_nay),
                tong_tien_hom_nay: Number(totalStats[0].tong_tien_hom_nay),
                thong_ke_30_ngay: last30Days[0].map(row => ({
                    date: row.date,
                    total_amount: Number(row.total_amount)
                }))
            };
        } catch (error) {
            console.error("Error in getRevenueStats:", error);
            throw error;
        }
    },

    /**
     * Calculate profit margins (revenue - cost)
     * Returns profit, margin percentage, and breakdown
     */
    getProfitMargins: async () => {
        try {
            // Get revenue from wallet logs
            const [revenueData] = await db.execute(sql`
                SELECT 
                    COALESCE(SUM(amount), 0) AS total_revenue,
                    COALESCE(SUM(CASE 
                        WHEN DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m') 
                        THEN amount ELSE 0 
                    END), 0) AS revenue_this_month,
                    COALESCE(SUM(CASE 
                        WHEN DATE(created_at) = CURDATE() 
                        THEN amount ELSE 0 
                    END), 0) AS revenue_today
                FROM topup_wallet_logs
                WHERE status = 'Thành Công'
            `);

            // Get cost from orders (amount - profit)
            const [costData] = await db.execute(sql`
                SELECT 
                    COALESCE(SUM(amount - profit), 0) AS total_cost,
                    COALESCE(SUM(CASE 
                        WHEN DATE_FORMAT(updated_at, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m') 
                        THEN amount - profit ELSE 0 
                    END), 0) AS cost_this_month,
                    COALESCE(SUM(CASE 
                        WHEN DATE(updated_at) = CURDATE() 
                        THEN amount - profit ELSE 0 
                    END), 0) AS cost_today
                FROM orders
                WHERE status = 'success'
            `);

            const totalRevenue = Number(revenueData[0].total_revenue);
            const totalCost = Number(costData[0].total_cost);
            const totalProfit = totalRevenue - totalCost;
            const profitMarginPercent = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

            const monthRevenue = Number(revenueData[0].revenue_this_month);
            const monthCost = Number(costData[0].cost_this_month);
            const monthProfit = monthRevenue - monthCost;
            const monthMarginPercent = monthRevenue > 0 ? (monthProfit / monthRevenue) * 100 : 0;

            const todayRevenue = Number(revenueData[0].revenue_today);
            const todayCost = Number(costData[0].cost_today);
            const todayProfit = todayRevenue - todayCost;
            const todayMarginPercent = todayRevenue > 0 ? (todayProfit / todayRevenue) * 100 : 0;

            return {
                status: true,
                total: {
                    revenue: totalRevenue,
                    cost: totalCost,
                    profit: totalProfit,
                    margin_percent: profitMarginPercent
                },
                this_month: {
                    revenue: monthRevenue,
                    cost: monthCost,
                    profit: monthProfit,
                    margin_percent: monthMarginPercent
                },
                today: {
                    revenue: todayRevenue,
                    cost: todayCost,
                    profit: todayProfit,
                    margin_percent: todayMarginPercent
                }
            };
        } catch (error) {
            console.error("Error in getProfitMargins:", error);
            throw error;
        }
    },

    /**
     * Calculate growth rates comparing current vs previous periods
     */
    getGrowthRates: async () => {
        try {
            // Get current month and previous month revenue
            const [monthlyGrowth] = await db.execute(sql`
                SELECT 
                    COALESCE(SUM(CASE 
                        WHEN DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m') 
                        THEN amount ELSE 0 
                    END), 0) AS current_month,
                    COALESCE(SUM(CASE 
                        WHEN DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH), '%Y-%m') 
                        THEN amount ELSE 0 
                    END), 0) AS previous_month
                FROM topup_wallet_logs
                WHERE status = 'Thành Công'
            `);

            // Get today and yesterday revenue
            const [dailyGrowth] = await db.execute(sql`
                SELECT 
                    COALESCE(SUM(CASE 
                        WHEN DATE(created_at) = CURDATE() 
                        THEN amount ELSE 0 
                    END), 0) AS today,
                    COALESCE(SUM(CASE 
                        WHEN DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) 
                        THEN amount ELSE 0 
                    END), 0) AS yesterday
                FROM topup_wallet_logs
                WHERE status = 'Thành Công'
            `);

            const currentMonth = Number(monthlyGrowth[0].current_month);
            const previousMonth = Number(monthlyGrowth[0].previous_month);
            const monthlyGrowthRate = previousMonth > 0
                ? ((currentMonth - previousMonth) / previousMonth) * 100
                : (currentMonth > 0 ? 100 : 0);

            const today = Number(dailyGrowth[0].today);
            const yesterday = Number(dailyGrowth[0].yesterday);
            const dailyGrowthRate = yesterday > 0
                ? ((today - yesterday) / yesterday) * 100
                : (today > 0 ? 100 : 0);

            return {
                status: true,
                monthly: {
                    current: currentMonth,
                    previous: previousMonth,
                    growth_rate: monthlyGrowthRate,
                    trend: monthlyGrowthRate >= 0 ? 'up' : 'down'
                },
                daily: {
                    today: today,
                    yesterday: yesterday,
                    growth_rate: dailyGrowthRate,
                    trend: dailyGrowthRate >= 0 ? 'up' : 'down'
                }
            };
        } catch (error) {
            console.error("Error in getGrowthRates:", error);
            throw error;
        }
    },

    /**
     * Get top revenue sources (top users by deposit amount)
     */
    getTopRevenueSources: async (limit = 10) => {
        try {
            const topUsers = await db.execute(sql`
                SELECT 
                    u.id,
                    u.name,
                    u.email,
                    COALESCE(SUM(w.amount), 0) as total_deposited,
                    COUNT(w.id) as transaction_count
                FROM users u
                INNER JOIN topup_wallet_logs w ON u.id = w.user_id
                WHERE w.status = 'Thành Công'
                GROUP BY u.id, u.name, u.email
                ORDER BY total_deposited DESC
                LIMIT ${limit}
            `);

            return {
                status: true,
                top_sources: topUsers[0].map(user => ({
                    user_id: user.id,
                    name: user.name,
                    email: user.email,
                    total_deposited: Number(user.total_deposited),
                    transaction_count: Number(user.transaction_count)
                }))
            };
        } catch (error) {
            console.error("Error in getTopRevenueSources:", error);
            throw error;
        }
    },

    /**
     * Get revenue data filtered by period (daily, weekly, monthly)
     */
    getRevenueByPeriod: async (period = 'daily') => {
        try {
            let groupByClause, dateRangeClause;

            switch (period) {
                case 'weekly':
                    groupByClause = sql`YEARWEEK(created_at)`;
                    dateRangeClause = sql`created_at >= DATE_SUB(CURDATE(), INTERVAL 12 WEEK)`;
                    break;
                case 'monthly':
                    groupByClause = sql`DATE_FORMAT(created_at, '%Y-%m')`;
                    dateRangeClause = sql`created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)`;
                    break;
                case 'daily':
                default:
                    groupByClause = sql`DATE(created_at)`;
                    dateRangeClause = sql`created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`;
                    break;
            }

            const periodData = await db.execute(sql`
                SELECT 
                    ${groupByClause} as period,
                    DATE(created_at) as date,
                    COALESCE(SUM(amount), 0) as total_amount
                FROM topup_wallet_logs
                WHERE status = 'Thành Công'
                    AND ${dateRangeClause}
                GROUP BY period, date
                ORDER BY date ASC
            `);

            return {
                status: true,
                period_type: period,
                data: periodData[0].map(row => ({
                    period: row.period,
                    date: row.date,
                    total_amount: Number(row.total_amount)
                }))
            };
        } catch (error) {
            console.error("Error in getRevenueByPeriod:", error);
            throw error;
        }
    }
};

module.exports = RevenueService;
