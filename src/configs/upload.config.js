
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueName + ext);
    }
});

const fileFilter = (req, file, cb) => {
    // Allowed extensions
    const filetypes = /jpeg|jpg|png|gif|webp/;
    // Check extension
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Error: Images Only! (jpeg, jpg, png, gif, webp)'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB Limit
    fileFilter: fileFilter
});

// Magic bytes validation - verify actual file content after upload
const MAGIC_BYTES = {
    'ffd8ff': 'jpg',      // JPEG
    '89504e47': 'png',    // PNG
    '47494638': 'gif',    // GIF
    '52494646': 'webp'    // WEBP (RIFF header)
};

const validateMagicBytes = (filePath) => {
    return new Promise((resolve, reject) => {
        const buffer = Buffer.alloc(8);
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, buffer, 0, 8, 0);
        fs.closeSync(fd);

        const hex = buffer.toString('hex').toLowerCase();

        for (const [magic, type] of Object.entries(MAGIC_BYTES)) {
            if (hex.startsWith(magic)) {
                return resolve(type);
            }
        }

        // Invalid file - delete it
        fs.unlinkSync(filePath);
        reject(new Error('Invalid image file: magic bytes mismatch'));
    });
};

// Middleware wrapper that validates magic bytes after upload
const secureUpload = (fieldName) => {
    return (req, res, next) => {
        upload.single(fieldName)(req, res, async (err) => {
            if (err) {
                return res.status(400).json({ status: false, message: err.message });
            }

            if (req.file) {
                try {
                    await validateMagicBytes(req.file.path);
                    next();
                } catch (validationError) {
                    return res.status(400).json({
                        status: false,
                        message: 'File không hợp lệ: không phải ảnh thật'
                    });
                }
            } else {
                next();
            }
        });
    };
};

module.exports = upload;
module.exports.secureUpload = secureUpload;
module.exports.validateMagicBytes = validateMagicBytes;

