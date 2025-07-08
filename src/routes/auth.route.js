const express = require('express');
const { register, login, checkmail } = require('../controllers/auth.controller');
const router = express.Router();

router.post("/register", register)
router.post("/login", login)
router.post('/checkmail',checkmail)
module.exports = router