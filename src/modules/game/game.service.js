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
            name: data.name,
            thumbnail: data.thumbnail,
            server: data.server, // JSON type
            gamecode: data.gamecode,
            publisher: data.publisher,
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
        if (data.thumbnail !== undefined && data.thumbnail !== "") updateData.thumbnail = data.thumbnail;
        if (data.server !== undefined) updateData.server = data.server;
        if (data.gamecode !== undefined) updateData.gamecode = data.gamecode;
        if (data.publisher !== undefined) updateData.publisher = data.publisher;

        if (Object.keys(updateData).length === 0) {
            throw new Error("Không có trường nào để cập nhật.");
        }

        await db.update(games)
            .set(updateData)
            .where(eq(games.id, id));

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
