const db = require("../configs/db.config");

// 1. Lấy tất cả gói nạp (sắp xếp theo giá tăng dần)
async function getAllPackages() {
    const result = await db.query("SELECT * FROM topup_packages ORDER BY price ASC");
    return result.rows;
}

// 2. Lấy gói theo gamecode (slug) và tùy chọn lọc server
async function getPackagesByGameCode(game_code, id_server = null) {
    let sql = `
        SELECT tp.*
        FROM topup_packages tp
        JOIN games g ON tp.game_id = g.id
        WHERE g.gamecode = $1
    `;
    const params = [game_code];

    if (id_server) {
        params.push(id_server);
        sql += ` AND tp.id_server = $${params.length}`;
    }

    sql += " ORDER BY tp.price ASC"; // 🔥 Sắp xếp theo giá

    const result = await db.query(sql, params);
    return result.rows;
}

// 3. Tạo mới gói nạp
async function createPackage(data) {
    const { package_name, game_id, price, origin_price, thumbnail, package_type, id_server, sale = false } = data;
    const sql = `
        INSERT INTO topup_packages
        (package_name, game_id, price, origin_price, thumbnail, package_type, id_server, sale)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
    `;
    const result = await db.query(sql, [
        package_name,
        game_id,
        price,
        origin_price,
        thumbnail,
        package_type,
        id_server,
        sale
    ]);
    return result.rows[0];
}

// 4. Sửa gói status
async function patchPackage(id, newStatus) {
    const result = await db.query(
        `UPDATE topup_packages
         SET status = $1 
         WHERE id = $2 
         RETURNING *`,
        [newStatus, id]
    );
    return result.rows[0];
}

// 5. Cập nhật toàn bộ gói nạp
async function updatePackage(id, data) {
    try {
        const fields = [];
        const values = [];
        let paramIndex = 1;

        if (data.package_name !== undefined) {
            fields.push(`package_name = $${paramIndex++}`);
            values.push(data.package_name);
        }

        if (data.price !== undefined) {
            fields.push(`price = $${paramIndex++}`);
            values.push(parseInt(data.price));
        }

        if (data.origin_price !== undefined) {
            fields.push(`origin_price = $${paramIndex++}`);
            values.push(parseInt(data.origin_price));
        }

        if (data.package_type !== undefined) {
            fields.push(`package_type = $${paramIndex++}`);
            values.push(data.package_type);
        }

        if (data.thumbnail !== undefined) {
            fields.push(`thumbnail = $${paramIndex++}`);
            values.push(data.thumbnail);
        }

        if (data.id_server !== undefined) {
            fields.push(`id_server = $${paramIndex++}`);
            values.push(data.id_server);
        }

        if (data.sale !== undefined) {
            fields.push(`sale = $${paramIndex++}`);
            values.push(data.sale);
        }

        if (fields.length === 0) {
            throw new Error("Không có dữ liệu nào để cập nhật");
        }

        const sql = `
            UPDATE topup_packages
            SET ${fields.join(", ")}
            WHERE id = $${paramIndex}
            RETURNING *;
        `;
        values.push(id);

        const result = await db.query(sql, values);
        return result.rows[0] || null;
    } catch (err) {
        console.error("❌ Lỗi khi cập nhật gói nạp:", err);
        throw err;
    }
}

// 6. Lấy các gói theo package_type (sắp xếp theo giá tăng dần)
async function getPackagesByType(type) {
    const sql = `SELECT * FROM topup_packages WHERE package_type = $1 ORDER BY price ASC`;
    const result = await db.query(sql, [type]);
    return result.rows;
}

// 7. Xóa gói nạp theo id
async function delPackages(id) {
    const sql = `DELETE FROM topup_packages WHERE id = $1 RETURNING *`;
    const result = await db.query(sql, [id]);
    return result.rows[0];
}

// 8. Tìm kiếm gói nạp theo keyword, game_id, id_server, sale (sắp xếp theo giá)
async function searchPackages({ keyword = "", game_id = null, id_server = null, sale = null }) {
    let sql = `SELECT * FROM topup_packages WHERE 1=1`;
    const params = [];

    if (keyword) {
        params.push(`%${keyword.toLowerCase()}%`);
        sql += ` AND LOWER(package_name) LIKE $${params.length}`;
    }

    if (game_id) {
        params.push(game_id);
        sql += ` AND game_id = $${params.length}`;
    }

    if (id_server) {
        params.push(id_server);
        sql += ` AND id_server = $${params.length}`;
    }

    if (sale !== null) {
        params.push(sale);
        sql += ` AND sale = $${params.length}`;
    }

    sql += " ORDER BY price ASC"; // 🔥 Sắp xếp theo giá

    const result = await db.query(sql, params);
    return result.rows;
}

// 9. Lấy giá gói nạp theo ID
async function getPackagePriceById(id) {
    const sql = `SELECT id, price FROM topup_packages WHERE id = $1`;
    const result = await db.query(sql, [id]);
    return result.rows[0]; 
}

// 10. Lấy lợi nhuận gói nạp (profit = price - origin_price)
async function getPackageProfitById(id) {
    const sql = `
        SELECT (price - origin_price) AS profit
        FROM topup_packages
        WHERE id = $1
    `;
    const result = await db.query(sql, [id]);
    return result.rows[0]?.profit ?? null;
}

// 11. Lấy amount của gói nạp theo ID
async function getPackageAmountById(id) {
    const sql = `SELECT price FROM topup_packages WHERE id = $1`;
    const result = await db.query(sql, [id]);
    return result.rows[0]?.price ?? null;
}

module.exports = {
    getAllPackages,
    getPackagesByGameCode,
    createPackage,
    patchPackage,
    updatePackage,
    getPackagesByType,
    delPackages,
    searchPackages,
    getPackagePriceById,
    getPackageProfitById,
    getPackageAmountById
};
