const { db } = require("./src/configs/drizzle");
const { games } = require("./src/db/schema");

async function check() {
    try {
        const allGames = await db.select().from(games);
        console.log("Total Games:", allGames.length);
        console.log("Games:", JSON.stringify(allGames, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
