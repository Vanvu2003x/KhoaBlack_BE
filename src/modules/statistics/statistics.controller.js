
const { db } = require("../../configs/drizzle");
const { users, orders, topupPackages, games, walletLogs } = require('../../db/schema');
const { desc, sum, count, eq, sql } = require('drizzle-orm');

const StatisticsController = {
    // Top Users by Total Order Amount (Success)
    getLeaderboard: async (req, res) => {
        try {
            // Aggregate total amount per user from 'orders' table where status = 'success'
            // We need to join with users table to get names

            // Drizzle aggregation
            // Top Depositors (Top Nạp)
            const leaderboard = await db
                .select({
                    id: users.id,
                    name: users.name,
                    total_amount: sum(walletLogs.amount).mapWith(Number).as('total_amount')
                })
                .from(walletLogs)
                .innerJoin(users, eq(walletLogs.user_id, users.id))
                .where(eq(walletLogs.status, 'Thành Công'))
                .groupBy(users.id)
                .orderBy(desc(sql`total_amount`))
                .limit(10);

            res.json({
                status: 'success',
                data: leaderboard
            });
        } catch (error) {
            console.error("Leaderboard Error:", error);
            res.status(500).json({ status: 'error', message: 'Internal Server Error' });
        }
    },

    // Best Selling Packages
    getBestSellers: async (req, res) => {
        try {
            // Count orders per package, verify status 'success'
            let bestSellers = await db
                .select({
                    package_name: topupPackages.package_name,
                    game_name: games.name,
                    price: topupPackages.price,
                    thumbnail: topupPackages.thumbnail,
                    game_image: games.thumbnail,
                    sold_count: count(orders.id).as('sold_count')
                })
                .from(orders)
                .leftJoin(topupPackages, eq(orders.package_id, topupPackages.id))
                .leftJoin(games, eq(topupPackages.game_id, games.id))
                .where(eq(orders.status, 'success'))
                .groupBy(topupPackages.id)
                .orderBy(desc(sql`sold_count`))
                .limit(5);

            console.log("[Statistics] Best Sellers count:", bestSellers.length);

            // Fallback: If no best sellers, show random active packages
            if (bestSellers.length === 0) {
                console.log("[Statistics] No best sellers, fetching fallback packages...");
                bestSellers = await db
                    .select({
                        package_name: topupPackages.package_name,
                        game_name: games.name,
                        price: topupPackages.price,
                        thumbnail: topupPackages.thumbnail,
                        game_image: games.thumbnail,
                        sold_count: sql`0`.as('sold_count')
                    })
                    .from(topupPackages)
                    .innerJoin(games, eq(topupPackages.game_id, games.id))
                    .where(eq(topupPackages.status, 'active'))
                    .limit(5);
            }

            res.json({
                status: 'success',
                data: bestSellers
            });
        } catch (error) {
            console.error("Best Sellers Error:", error);
            res.status(500).json({ status: 'error', message: 'Internal Server Error' });
        }
    }
};

module.exports = StatisticsController;
