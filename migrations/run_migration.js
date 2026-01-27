const { db } = require("../src/configs/drizzle");
const { sql } = require("drizzle-orm");

async function runMigration() {
    try {
        console.log("Running migration: fix_orders_api_id_type");

        // Modify api_id column in orders table
        await db.execute(sql`
            ALTER TABLE orders 
            MODIFY COLUMN api_id VARCHAR(50)
        `);
        console.log("✅ Modified orders.api_id to VARCHAR(50)");

        console.log("Migration completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

runMigration();
