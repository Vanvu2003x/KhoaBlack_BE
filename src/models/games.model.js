const db = require("../configs/db.config");

// Lấy danh sách tất cả game
async function getListGame() {
    const result = await db.query("SELECT * FROM games");
    return result.rows;
}

// Lấy game theo id (uuid)
async function getGameById(id) {
    const result = await db.query("SELECT * FROM games WHERE id = $1", [id]);
    return result.rows[0];
}

// Lấy game theo gamecode
async function getGameByGameCode(gamecode) {
    const result = await db.query("SELECT * FROM games WHERE gamecode = $1", [gamecode]);
    return result.rows[0];
}

// Thêm game mới
async function addGame(data) {
    const { name, thumbnail, sever, gamecode, publisher, status } = data;

    const sql = `
        INSERT INTO games (name, thumbnail, sever, gamecode, publisher)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
    `;

    const result = await db.query(sql, [
        name,
        thumbnail,
        sever,
        gamecode,
        publisher,
    ]);

    return result.rows[0];
}

//hàm update
async function updateGame(id, data) {
    const fields = [];
    const values = [];
    let index = 1;

    if (data.name !== undefined) {
        fields.push(`name = $${index++}`);
        values.push(data.name);
    }

    if (data.thumbnail !== undefined && data.thumbnail !== "") {
        fields.push(`thumbnail = $${index++}`);
        values.push(data.thumbnail);
    }

    if (data.sever !== undefined) {
        fields.push(`sever = $${index++}`);
        values.push(data.sever);
    }

    if (data.gamecode !== undefined) {
        fields.push(`gamecode = $${index++}`);
        values.push(data.gamecode);
    }

    if (data.publisher !== undefined) {
        fields.push(`publisher = $${index++}`);
        values.push(data.publisher);
    }

    if (data.status !== undefined) {
        fields.push(`status = $${index++}`);
        values.push(data.status);
    }

    if (fields.length === 0) {
        throw new Error("Không có trường nào để cập nhật.");
    }

    const sql = `
        UPDATE games
        SET ${fields.join(', ')}
        WHERE id = $${index}
        RETURNING *;
    `;
    values.push(id);

    const result = await db.query(sql, values);
    return result.rows[0];
}


// Xoá game
async function deleteGame(id) {
    const sql = "DELETE FROM games WHERE id = $1 RETURNING *";
    const result = await db.query(sql, [id]);
    return result.rows[0];
}

async function getGamesByTopupType(type) {
    let sql;
    let params = [];

    if (type === "ACC") {
        sql = `
            SELECT DISTINCT g.*
            FROM games g
            INNER JOIN acc a ON a.game_id = g.id
        `;
    } else {
        sql = `
            SELECT DISTINCT g.*
            FROM games g
            INNER JOIN topup_packages tp ON tp.game_id = g.id
            WHERE tp.package_type = $1
        `;
        params = [type];
    }

    const result = await db.query(sql, params);
    return result.rows;
}

module.exports = {
    getListGame,
    getGameById,
    getGameByGameCode,
    addGame,
    updateGame,
    deleteGame,
    getGamesByTopupType
};
