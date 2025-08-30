const topupModel = require("../models/toupPackage.model");

// 1. Lấy tất cả gói nạp
exports.getAllTopupPackages = async (req, res) => {
    try {
        const result = await topupModel.getAllPackages();
        res.json(result);
    } catch (error) {
        console.error("Lỗi khi lấy toàn bộ gói:", error);
        res.status(500).json({ message: "Lỗi server" });
    }
};

// 2. Lấy gói nạp theo game_code (slug) + tùy chọn id_server
exports.getTopupPackagesByGameSlug = async (req, res) => {
    const game_code = req.params.game_code;
    const { id_server = null } = req.query;

    try {
        const result = await topupModel.getPackagesByGameCode(game_code, id_server);

        const filtered = req.isAdmin
            ? result
            : result.map(pkg => ({
                id: pkg.id,
                package_name: pkg.package_name,
                game_id: pkg.game_id,
                price: pkg.price,
                thumbnail: pkg.thumbnail,
                package_type: pkg.package_type,
                status: pkg.status,
                id_server: pkg.id_server,
                sale: pkg.sale
            }));

        res.json(filtered);
    } catch (error) {
        console.error("Lỗi khi lấy gói theo game_code:", error);
        res.status(500).json({ message: "Lỗi khi lấy gói theo game_code" });
    }
};

// 3. Tạo mới gói nạp
exports.createTopupPackage = async (req, res) => {
    try {
        const { package_name, game_id, price, origin_price, package_type, id_server, sale = false } = req.body;
        const file = req.file;

        const thumbnail = file ? `/uploads/${file.filename}` : null;

        const newPackage = await topupModel.createPackage({
            package_name,
            game_id,
            price,
            origin_price,
            thumbnail,
            package_type,
            id_server,
            sale
        });

        res.status(201).json(newPackage);
    } catch (error) {
        console.error("Lỗi khi tạo gói:", error);
        res.status(500).json({ message: "Lỗi server khi tạo gói" });
    }
};

// 4. Cập nhật gói nạp
exports.updateTopupPackage = async (req, res) => {
    try {
        const id = req.query.id;
        const { package_name, price, origin_price, package_type, id_server, sale } = req.body;
        const file = req.file;

        const dataToUpdate = {
            package_name,
            price,
            origin_price,
            package_type,
            id_server,
            sale
        };

        if (file) {
            dataToUpdate.thumbnail = `/uploads/${file.filename}`;
        }

        const updated = await topupModel.updatePackage(id, dataToUpdate);

        if (!updated) {
            return res.status(404).json({ message: "Không tìm thấy gói để cập nhật" });
        }

        res.json(updated);
    } catch (error) {
        console.error("❌ Lỗi khi cập nhật:", error);
        res.status(500).json({ message: "Lỗi cập nhật gói nạp" });
    }
};

// 5. Lấy gói nạp kiểu log (nếu có trong model)
exports.getLogTopupPackages = async (req, res) => {
    try {
        const result = await topupModel.getLogTypeTopupPackages();
        res.json(result);
    } catch (error) {
        console.error("Lỗi khi lấy gói kiểu log:", error);
        res.status(500).json({ message: "Lỗi lấy gói kiểu log" });
    }
};

// 6. Xóa gói nạp theo id
exports.deleteTopupPackage = async (req, res) => {
    try {
        const id = req.params.id;

        const deletedPackage = await topupModel.delPackages(id);

        if (!deletedPackage) {
            return res.status(404).json({ message: "Không tìm thấy gói để xóa" });
        }

        res.json({ message: "Xóa thành công", data: deletedPackage });
    } catch (error) {
        console.error("Lỗi khi xóa gói nạp:", error);
        res.status(500).json({ message: "Lỗi server khi xóa gói" });
    }
};

// 7. Tìm kiếm gói nạp theo keyword, game_id, id_server, sale
exports.searchTopupPackages = async (req, res) => {
    try {
        const { keyword = "", game_id = null, id_server = null, sale = null } = req.query;
        const result = await topupModel.searchPackages({
            keyword,
            game_id,
            id_server,
            sale: sale !== null ? sale === "true" : null // ép kiểu boolean
        });
        res.json(result);
    } catch (error) {
        console.error("Lỗi tìm kiếm gói nạp:", error);
        res.status(500).json({ message: "Lỗi khi tìm kiếm gói nạp" });
    }
};

// 8. Cập nhật trạng thái gói nạp
exports.updateStatus = async (req, res) => {
    try {
        const id = req.query.id;
        const { newStatus } = req.body;

        if (!id || newStatus === undefined) {
            return res.status(400).json({ message: "Thiếu id hoặc trạng thái mới" });
        }

        const result = await topupModel.patchPackage(id, newStatus);

        if (result) {
            res.json({ message: "Cập nhật trạng thái thành công", data: result });
        } else {
            res.status(404).json({ message: "Không tìm thấy gói nạp với ID đã cho" });
        }
    } catch (error) {
        console.error("Lỗi cập nhật gói nạp:", error);
        res.status(500).json({ message: "Lỗi khi cập nhật gói nạp" });
    }
};

// 9. (Tuỳ chọn) Cập nhật sale (true/false)
exports.updateSale = async (req, res) => {
    try {
        const id = req.query.id;
        const { sale } = req.body;

        if (!id || sale === undefined) {
            return res.status(400).json({ message: "Thiếu id hoặc sale mới" });
        }

        const updated = await topupModel.updatePackage(id, { sale });

        if (!updated) {
            return res.status(404).json({ message: "Không tìm thấy gói để cập nhật sale" });
        }

        res.json({ message: "Cập nhật sale thành công", data: updated });
    } catch (error) {
        console.error("❌ Lỗi khi cập nhật sale:", error);
        res.status(500).json({ message: "Lỗi khi cập nhật sale" });
    }
};
