const express = require('express');
const router = express.Router();
const { getPackage } = require('../controllers/list_rechange_package_game_uid.controller');

router.get('/:slug', getPackage);
module.exports = router;
