const { db } = require("../src/configs/drizzle");
const { games } = require("../src/db/schema");
const { like } = require("drizzle-orm");

async function fixGameCodes() {
    console.log("Starting GameCode Fix...");

    // Find games with 'mobile-legends-global-' prefix
    // Note: like is case-insensitive in many SQL dialects but let's be safe
    const gamesToFix = await db.select().from(games).where(like(games.gamecode, 'mobile-legends-global-%'));

    console.log(`Found ${gamesToFix.length} games to fix.`);

    for (const game of gamesToFix) {
        // Double check standard format "mobile-legends-global-{timestamp}"
        if (game.gamecode.match(/^mobile-legends-global-\d+$/)) {
            const newCode = 'mobile-legends-global';
            console.log(`Fixing game: ${game.name} (${game.id}) | ${game.gamecode} -> ${newCode}`);

            try {
                await db.update(games)
                    .set({ gamecode: newCode })
                    .where({ id: game.id });
                console.log(" - Success");
            } catch (error) {
                console.error(" - Failed:", error.message);
            }
        } else {
            console.log(`Skipping non-matching gamecode: ${game.gamecode}`);
        }
    }

    console.log("Finished.");
    process.exit(0);
}

fixGameCodes().catch(err => {
    console.error("Script error:", err);
    process.exit(1);
});
