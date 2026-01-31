const express = require('express');
const router = express.Router();
const CallbackController = require('./callback.controller');

router.post('/morishop', CallbackController.morishopCallback);
router.get('/napgame247', CallbackController.napgameCallback); // NapGame usually GET? Or POST? Keep both/check docs if possible. Assuming POST for now based on standard. Use REQUEST inspection later.
router.post('/napgame247', CallbackController.napgameCallback);

module.exports = router;
