const express = require('express');
const router = express.Router();
const GameController = require('./game.controller');
const upload = require('../../configs/upload.config');

router.get('/', GameController.getAllGames);
router.post('/upload', upload.single("thumbnail"), GameController.createGame);
router.delete('/delete', GameController.deleteGame);
router.patch('/update', upload.single("thumbnail"), GameController.updateGame); // FE uses PATCH
router.get('/by-type', GameController.getGamesByType);
router.get('/game/:gamecode', GameController.getGameByGameCode); // FE uses /api/games/game/:gamecode

module.exports = router;
