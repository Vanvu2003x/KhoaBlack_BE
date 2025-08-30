const express = require("express");
const {
    getAllGames,
    CreateGame,
    DeleteGameController,
    UpdateGameController,
    getGamesByTypeController, // ✅ import controller mới
    getGameByGameCodeController
} = require("../../controllers/games.controller");

const uploadImageMiddleware = require("../../middleware/uploadImage.middleware");
const { checkRoleMDW } = require("../../middleware/auJWT.middleware");

const router = express.Router();

// GET all games
router.get("/", getAllGames);

// ✅ NEW: GET games by topup type (VD: ?type=UID)
router.get("/by-type", getGamesByTypeController);

// POST create game
router.post("/upload", checkRoleMDW, uploadImageMiddleware, CreateGame);

// DELETE game
router.delete("/delete", checkRoleMDW, DeleteGameController);

// PATCH update game
router.patch("/update", checkRoleMDW, uploadImageMiddleware, UpdateGameController);

// Get By gGame code
router.get("/game/:gamecode", getGameByGameCodeController);

module.exports = router;
