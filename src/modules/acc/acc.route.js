const express = require('express');
const router = express.Router();
const AccController = require('./acc.controller');
const upload = require('../../configs/upload.config');

router.post('/', upload.single("image"), AccController.createAcc);
router.get('/game', AccController.getAccByGame);
router.delete('/:id', AccController.deleteAcc);
router.put('/:id', upload.single("image"), AccController.updateAcc);
router.get('/stats', AccController.getAccStats); // Check usage
router.get('/search', AccController.filterAccByGame); // Check usage

module.exports = router;
