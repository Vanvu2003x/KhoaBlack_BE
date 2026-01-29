const upload = require('../configs/upload.config');

module.exports = upload.single('image');
