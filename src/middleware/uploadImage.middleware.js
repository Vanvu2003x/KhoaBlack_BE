const multer = require('multer');
const storage = require('../configs/upload.config');

const upload = multer({ storage });

module.exports = upload.single('image');
