const { getPackageBySlug } = require("../models/list_rechange_game_uid.model");

async function getPackage(req, res) {
    try {
        const { slug } = req.params;
        const result = await getPackageBySlug(slug);

        if (result.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy game hoặc không có gói nạp' });
        }

        res.json(result);
    } catch (error) {
        console.error('❌ Lỗi khi truy vấn gói nạp theo slug:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
}

module.exports = { getPackage };
