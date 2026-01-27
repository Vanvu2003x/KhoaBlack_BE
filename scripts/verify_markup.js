const { db, poolConnection } = require('../src/configs/drizzle');
const { games } = require('../src/db/schema');
const { eq } = require('drizzle-orm');
const crypto = require('crypto');

async function main() {
    try {
        console.log("Verifying DB Schema...");

        // 1. Create a dummy game with decimal markup
        const testId = crypto.randomUUID();
        const testGameCode = 'test-verification-' + Date.now();

        await db.insert(games).values({
            id: testId,
            name: 'Verification Game',
            gamecode: testGameCode,
            origin_markup_percent: 1.55,
            profit_percent_basic: 10,
            profit_percent_pro: 10,
            profit_percent_plus: 10
        });

        // 2. Read back
        const [readGame] = await db.select().from(games).where(eq(games.id, testId));

        console.log("Mock Game Inserted with 1.55");
        console.log("Read Back Markup:", readGame.origin_markup_percent);

        if (readGame.origin_markup_percent === 1.55) {
            console.log("VERIFICATION SUCCESS: Decimal value retained.");
        } else {
            console.log("VERIFICATION FAILED: Value is", readGame.origin_markup_percent);
        }

        // Cleanup
        await db.delete(games).where(eq(games.id, testId));

    } catch (e) {
        console.error("Error verifying:", e);
    } finally {
        process.exit(0);
    }
}

main();
