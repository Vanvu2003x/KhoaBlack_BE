const { db } = require("../src/configs/drizzle");
const { sql } = require("drizzle-orm");

async function runMigration() {
    try {
        console.log("Running migration: add_two_tier_pricing");

        // Add origin_markup_percent to games
        await db.execute(sql`
            ALTER TABLE games 
            ADD COLUMN origin_markup_percent INT DEFAULT 0 
            COMMENT '% markup from API price to origin price'
        `);
        console.log("✅ Added origin_markup_percent to games");

        // Add api_price to topup_packages
        await db.execute(sql`
            ALTER TABLE topup_packages 
            ADD COLUMN api_price INT 
            COMMENT 'Price from supplier API (harga)'
        `);
        console.log("✅ Added api_price to topup_packages");

        // Copy origin_price to api_price for existing records
        await db.execute(sql`
            UPDATE topup_packages 
            SET api_price = origin_price 
            WHERE api_price IS NULL
        `);
        console.log("✅ Migrated existing data");

        console.log("Migration completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

runMigration();
