const { db, poolConnection } = require('../src/configs/drizzle');
const { sql } = require('drizzle-orm');

async function main() {
    try {
        console.log("Fixing DB Schema...");
        // Raw SQL to alter table
        // Use poolConnection for raw query if drizzle execute is tricky, but drizzle has execute
        // Drizzle's execute takes a SQL template tag usually.
        // Let's use the pool directly to be 100% standard SQL strings without template tag parsing issues if any.

        await poolConnection.query("ALTER TABLE topup_packages ADD COLUMN profit_percent_user INT DEFAULT 0");

        console.log("DB Schema Fixed Successfully!");
    } catch (e) {
        console.error("Error fixing schema:", e);
    } finally {
        process.exit(0);
    }
}

main();
