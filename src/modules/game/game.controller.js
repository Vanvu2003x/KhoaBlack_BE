const GameService = require("./game.service");
const asyncHandler = require("../../utils/asyncHandler");
const { deleteFile } = require("../../utils/file.util");

const GameController = {
    getAllGames: asyncHandler(async (req, res) => {
        const result = await GameService.getAllGames();
        res.status(200).json(result);
    }),

    createGame: asyncHandler(async (req, res) => {
        const infoRaw = req.body.info;
        if (!infoRaw) {
            // Can throw here or let service handle, but service expects parsed data or validation
            // Better to validate basic input here or parsing
            throw { status: 400, message: "Thiếu thông tin game" };
        }

        let gameInfo;
        try {
            gameInfo = JSON.parse(infoRaw);
        } catch {
            throw { status: 400, message: "Thông tin game không hợp lệ (không phải JSON)" };
        }

        if (req.file) {
            gameInfo.thumbnail = "/uploads/" + req.file.filename;
        }

        const result = await GameService.createGame(gameInfo);
        return res.status(201).json(result);
    }),

    updateGame: asyncHandler(async (req, res) => {
        const infoRaw = req.body.info;
        if (!infoRaw) throw { status: 400, message: "Thiếu thông tin game" };

        let gameInfo;
        try {
            gameInfo = JSON.parse(infoRaw);
        } catch {
            throw { status: 400, message: "Thông tin game không hợp lệ (không phải JSON)" };
        }

        // Cleanup old file if new one is uploaded
        if (req.file) {
            gameInfo.thumbnail = "/uploads/" + req.file.filename;

            // Fetch old game to get old thumbnail path
            const oldGame = await GameService.getGameById(req.query.id);
            if (oldGame && oldGame.thumbnail) {
                deleteFile(oldGame.thumbnail);
            }
        }

        const result = await GameService.updateGame(req.query.id, gameInfo);
        return res.status(200).json(result);
    }),

    deleteGame: asyncHandler(async (req, res) => {
        const result = await GameService.deleteGame(req.query.id);

        // Cleanup file after deleting game
        if (result && result.thumbnail) {
            deleteFile(result.thumbnail);
        }

        return res.status(200).json(result);
    }),

    getGamesByType: asyncHandler(async (req, res) => {
        const result = await GameService.getGamesByType(req.query.type);
        res.status(200).json(result);
    }),

    getGameByGameCode: asyncHandler(async (req, res) => {
        const result = await GameService.getGameByGameCode(req.params.gamecode);
        return res.status(200).json(result);
    })
};

module.exports = GameController;
