const { getListGame, getGameBySlug } = require("../models/games.model");

async function getGame(req, res) {
    try {
        const games = await getListGame();
        res.status(200).json(games);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách game:', error);
        res.status(500).json({ error: "Lỗi server khi lấy game" });
    }
}

async function getGameBySlugHandler(req, res) {
    try {
        const slug = req.params.slug;
        const game = await getGameBySlug(slug);

        if (!game || game.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy game" });
        }

        res.status(200).json(game);
    } catch (error) {
        console.error('Lỗi khi lấy game theo slug:', error);
        res.status(500).json({ error: "Lỗi server khi lấy game theo slug" });
    }
}

module.exports = {
    getGame,
    getGameBySlugHandler
};
