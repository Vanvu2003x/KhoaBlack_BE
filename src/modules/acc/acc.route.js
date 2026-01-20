const express = require('express');
const router = express.Router();
const AccController = require('./acc.controller');
const upload = require('../../configs/upload.config');

router.post('/', upload.single('image'), AccController.createAcc);
router.get('/game', AccController.getAccByGame);
router.get('/stats', AccController.getAccStats);
router.get('/search', AccController.filterAccByGame);
router.get('/:id', AccController.getAccById); // Get single account
router.put('/:id', upload.single('image'), AccController.updateAcc);
router.delete('/:id', AccController.deleteAcc);

module.exports = router;
