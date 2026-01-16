const fs = require('fs');
const path = require('path');

const deleteFile = (filePath) => {
    try {
        if (!filePath) return;

        // Construct absolute path if it is relative (uploads are in src/uploads relative to root usually, 
        // but here we might receive 'uploads/filename.jpg' or just 'filename.jpg')
        // Based on upload.config.js, uploads are in 'src/uploads'. 
        // The DB usually stores 'uploads/filename.ext' or similar.

        // Let's assume the DB stores the relative path from the static root.
        // We need to resolve it to the absolute system path.

        const rootDir = path.resolve(__dirname, '..', '..'); // d:\Web\khoablack\KhoaBlack_BE
        const absolutePath = path.join(rootDir, filePath);

        if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
            console.log(`[FileUtil] Deleted: ${absolutePath}`);
        } else {
            // Try checking if it's directly in src/uploads
            const uploadPath = path.join(rootDir, 'src', 'uploads', path.basename(filePath));
            if (fs.existsSync(uploadPath)) {
                fs.unlinkSync(uploadPath);
                console.log(`[FileUtil] Deleted: ${uploadPath}`);
            }
        }
    } catch (error) {
        console.error(`[FileUtil] Error deleting file: ${filePath}`, error);
    }
};

module.exports = {
    deleteFile
};
