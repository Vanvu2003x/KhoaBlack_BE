const { db } = require("../src/configs/drizzle");
const { orders, topupPackages, games } = require("../src/db/schema");
const { desc, count, eq, sql } = require('drizzle-orm');

async function verifyBestSellers() {
    try {
        console.log("Testing getBestSellers query...");

        // Original Query Logic
        const bestSellers = await db
            .select({
                package_name: topupPackages.package_name,
                game_name: games.name,
                price: topupPackages.price,
                sold_count: count(orders.id).as('sold_count')
            })
            .from(orders)
            .innerJoin(topupPackages, eq(orders.package_id, topupPackages.id))
            .innerJoin(games, eq(topupPackages.game_id, games.id))
            .where(eq(orders.status, 'success'))
            .groupBy(topupPackages.id)
            .orderBy(desc(sql`sold_count`))
            .limit(5);

        console.log(`Initial Query Result: ${bestSellers.length} items`);
        console.log(JSON.stringify(bestSellers, null, 2));

        // Proposed Fix (Left Join)
        console.log("\nTesting Proposed Fix (Left Join)...");
        const bestSellersFixed = await db
            .select({
                package_name: topupPackages.package_name,
                game_name: games.name,
                price: topupPackages.price,
                sold_count: count(orders.id).as('sold_count')
            })
            .from(orders)
            .leftJoin(topupPackages, eq(orders.package_id, topupPackages.id))
            .leftJoin(games, eq(topupPackages.game_id, games.id))
            .where(eq(orders.status, 'success'))
            .groupBy(topupPackages.id)
            .orderBy(desc(sql`sold_count`))
            .limit(5);

        console.log(`Fixed Query Result: ${bestSellersFixed.length} items`);
        console.log(JSON.stringify(bestSellersFixed, null, 2));

        process.exit(0);
    } catch (error) {
        console.error("Verification failed:", error);
        process.exit(1);
    }
}

verifyBestSellers();
