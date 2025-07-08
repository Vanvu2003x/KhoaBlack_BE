const express = require('express');
const router = express.Router();
const { getGame,getGameBySlugHandler } = require('../controllers/games.controller');

router.get('/', getGame); 
router.get('/:slug',getGameBySlugHandler)
module.exports = router;
