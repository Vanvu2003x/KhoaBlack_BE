const db = require("../configs/db.config");

async function addUser(user) {
    const sql = `
        INSERT INTO users (name,email, hash_password)
        VALUES ($1, $2,$3)
        RETURNING *;
    `;

    const values = [user.username,user.email, user.hash_password];
    const result = await db.query(sql, values);
    return result.rows[0];
}

async function getUserByUsername(username) {
    const sqlstr = `SELECT * FROM users WHERE email = $1`;
    const result = await db.query(sqlstr, [username]);
    return result.rows;
}

async function checkEmail(email) {
    const sqlstr = `Select * From users WHERE email = $1`;
    const result = await db.query(sqlstr, [email])
    return result.rowCount;
}

async function recharge_balance(id, balance) {
    const sqlstr = "UPDATE users SET balance = $1 WHERE id = $2";
    
    try {
        const result = await db.query(sqlstr, [balance, id]);

        if (result.rowCount === 0) {
            console.warn(`Không tìm thấy user với id: ${id}`);
            return false; 
        }

        return true;
    } catch (error) {
        console.error("Lỗi khi cập nhật balance:", error);
        throw error;
    }
}

module.exports = { addUser, getUserByUsername,checkEmail ,recharge_balance};
