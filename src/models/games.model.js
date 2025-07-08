const db = require("../configs/db.config")
async function getListGame() {
    const result = await db.query("Select * from games")
    return result.rows;
}

async function getGameBySlug(slug) {
    const result = await db.query(`select * from games where slug = $1`,[slug]);
    return result.rows;
}
module.exports ={getListGame,getGameBySlug}