const { db, poolConnection } = require('../src/configs/drizzle');
const { topupPackages } = require('../src/db/schema');
const { eq } = require('drizzle-orm');
const crypto = require('crypto');

async function main() {
    try {
        console.log("Verifying profit_percent_user column...");

        // 1. Create a dummy package with profit_percent_user
        const testId = crypto.randomUUID();
        const testData = {
            id: testId,
            package_name: "Test Profit User",
            game_id: "test-game-id", // might fail of FK
            price: 1000,
            profit_percent_user: 15
        };

        // Note: We need a valid game_id. Since we might fail FK constraint, let's just checking the column existence via SQL DESCRIBE first.

        const [columns] = await poolConnection.query("SHOW COLUMNS FROM topup_packages LIKE 'profit_percent_user'");
        console.log("Column Check:", columns);

        if (columns.length === 0) {
            console.error("❌ Column profit_percent_user MISSING in DB!");
        } else {
            console.log("✅ Column profit_percent_user EXISTS in DB.");
        }

        // 2. Check if a package actually has value.
        // Let's pick *any* package and try to update its profit_percent_user
        const [packages] = await poolConnection.query("SELECT id FROM topup_packages LIMIT 1");
        if (packages.length > 0) {
            const pid = packages[0].id;
            console.log(`Updating package ${pid} with profit_percent_user = 123...`);
            await poolConnection.query("UPDATE topup_packages SET profit_percent_user = 123 WHERE id = ?", [pid]);

            const [readBack] = await poolConnection.query("SELECT profit_percent_user FROM topup_packages WHERE id = ?", [pid]);
            console.log("Read back value:", readBack[0].profit_percent_user);

            if (readBack[0].profit_percent_user === 123) {
                console.log("✅ DB Read/Write Successful!");
            } else {
                console.log("❌ DB Read/Write FAILED! Got:", readBack[0].profit_percent_user);
            }
        } else {
            console.log("No packages to test update on.");
        }

    } catch (e) {
        console.error("Error:", e);
    } finally {
        process.exit(0);
    }
}

main();
