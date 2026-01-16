const AccService = require("./acc.service");
const asyncHandler = require("../../utils/asyncHandler");

const AccController = {
    createAcc: asyncHandler(async (req, res) => {
        const result = await AccService.createAcc(req.body, req.file);
        res.status(201).json(result);
    }),

    getAccByGame: asyncHandler(async (req, res) => {
        const result = await AccService.getAccByGame(req.query.game_id, req.query);
        res.json(result);
    }),

    updateAcc: asyncHandler(async (req, res) => {
        const result = await AccService.updateAcc(req.params.id, req.body, req.file);
        res.json(result);
    }),

    deleteAcc: asyncHandler(async (req, res) => {
        const result = await AccService.deleteAcc(req.params.id);
        res.json(result);
    }),

    getAccStats: asyncHandler(async (req, res) => {
        const result = await AccService.getAccStats();
        res.json(result);
    }),

    filterAccByGame: asyncHandler(async (req, res) => {
        const result = await AccService.filterAccByGame(req.query);
        res.json(result);
    })
};

module.exports = AccController;
