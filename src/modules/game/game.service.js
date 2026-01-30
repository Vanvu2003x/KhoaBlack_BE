const { db } = require("../../configs/drizzle");
const { games, topupPackages, acc } = require("../../db/schema");
const { eq, sql } = require("drizzle-orm");
const crypto = require("crypto");

const GameService = {
    getAllGames: async () => {
        const result = await db.select().from(games);
        return result;
    },

    getGameById: async (id) => {
        const [game] = await db.select().from(games).where(eq(games.id, id));
        return game;
    },

    getGameByGameCode: async (gamecode) => {
        const [game] = await db.select().from(games).where(eq(games.gamecode, gamecode));
        return game;
    },

    createGame: async (data) => {
        const newGame = {
            id: crypto.randomUUID(),
            api_id: data.api_id, // Store external ID
            name: data.name,
            thumbnail: data.thumbnail,
            server: data.server, // JSON type
            gamecode: data.gamecode,
            publisher: data.publisher,
            profit_percent_basic: data.profit_percent_basic || 0,
            profit_percent_pro: data.profit_percent_pro || 0,
            profit_percent_plus: data.profit_percent_plus || 0,
            origin_markup_percent: data.origin_markup_percent !== undefined ? Number(data.origin_markup_percent) : 0,
        };

        await db.insert(games).values(newGame);

        // Return created game
        const [createdGame] = await db.select().from(games).where(eq(games.id, newGame.id));
        return createdGame;
    },

    updateGame: async (id, data) => {
        // Filter out undefined fields
        const updateData = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.api_id !== undefined) updateData.api_id = data.api_id;
        if (data.thumbnail !== undefined && data.thumbnail !== "") updateData.thumbnail = data.thumbnail;
        if (data.server !== undefined) updateData.server = data.server;
        if (data.gamecode !== undefined) updateData.gamecode = data.gamecode;
        if (data.publisher !== undefined) updateData.publisher = data.publisher;

        // Profit Percentages
        let profitChanged = false;
        if (data.profit_percent_basic !== undefined) { updateData.profit_percent_basic = Number(data.profit_percent_basic); profitChanged = true; }
        if (data.profit_percent_pro !== undefined) { updateData.profit_percent_pro = Number(data.profit_percent_pro); profitChanged = true; }
        if (data.profit_percent_plus !== undefined) { updateData.profit_percent_plus = Number(data.profit_percent_plus); profitChanged = true; }


        if (data.origin_markup_percent !== undefined) { updateData.origin_markup_percent = Number(data.origin_markup_percent); profitChanged = true; }

        if (Object.keys(updateData).length === 0) {
            throw new Error("Không có trường nào để cập nhật.");
        }

        await db.transaction(async (tx) => {
            // Update Game
            await tx.update(games)
                .set(updateData)
                .where(eq(games.id, id));

            // If Profits or Markup Changed, Trigger Cascade Update for Packages
            if (profitChanged) {
                // 1. Get current game config
                const [game] = await tx.select().from(games).where(eq(games.id, id));

                const percentBasic = game.profit_percent_basic || 0;
                const percentPro = game.profit_percent_pro || 0;
                const percentPlus = game.profit_percent_plus || 0;
                const markupCoefficient = game.origin_markup_percent || 1; // e.g. 1.55 = 55% markup

                // 2. Fetch all packages
                const packages = await tx.select().from(topupPackages).where(eq(topupPackages.game_id, id));

                // 3. Update each package
                for (const pkg of packages) {
                    const apiPrice = pkg.api_price || 0;

                    // Recalculate Origin Price: if has api_price, use coefficient; otherwise keep existing origin_price
                    const originPrice = apiPrice > 0
                        ? Math.ceil(apiPrice * markupCoefficient)
                        : (pkg.origin_price || 0);

                    const priceBasic = Math.ceil(originPrice * (1 + percentBasic / 100));
                    const pricePro = Math.ceil(originPrice * (1 + percentPro / 100));
                    const pricePlus = Math.ceil(originPrice * (1 + percentPlus / 100));

                    await tx.update(topupPackages)
                        .set({
                            origin_price: originPrice, // Update origin price
                            price: priceBasic, // Default price
                            price_basic: priceBasic,
                            price_pro: pricePro,
                            price_plus: pricePlus,
                            profit_percent_basic: percentBasic,
                            profit_percent_pro: percentPro,
                            profit_percent_plus: percentPlus
                        })
                        .where(eq(topupPackages.id, pkg.id));
                }
            }
        });

        const [updatedGame] = await db.select().from(games).where(eq(games.id, id));
        return updatedGame;
    },

    deleteGame: async (id) => {
        const [deletedGame] = await db.select().from(games).where(eq(games.id, id));
        await db.delete(games).where(eq(games.id, id));
        return deletedGame;
    },

    getGamesByType: async (type) => {
        let result;
        if (type === "ACC") {
            // SELECT DISTINCT g.* FROM games g INNER JOIN acc a ON a.game_id = g.id
            result = await db.selectDistinct({
                id: games.id,
                name: games.name,
                thumbnail: games.thumbnail,
                server: games.server,
                gamecode: games.gamecode,
                publisher: games.publisher
            })
                .from(games)
                .innerJoin(acc, eq(acc.game_id, games.id));
        } else {
            // SELECT DISTINCT g.* FROM games g INNER JOIN topup_packages tp ON tp.game_id = g.id WHERE tp.package_type = $1
            result = await db.selectDistinct({
                id: games.id,
                name: games.name,
                thumbnail: games.thumbnail,
                server: games.server,
                gamecode: games.gamecode,
                publisher: games.publisher
            })
                .from(games)
                .innerJoin(topupPackages, eq(topupPackages.game_id, games.id))
                .where(eq(topupPackages.package_type, type));
        }
        return result;
    }
};

module.exports = GameService;
