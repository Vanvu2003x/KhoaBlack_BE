const db = require("../configs/db.config");

async function getPackageBySlug(slug) {
    const sqlstr = `
        SELECT 
            p.id_package,
            p.name_package,
            p.price,
            p.thumbnail
        FROM list_package_uid p
        JOIN games g ON p.id_game = g.id
        WHERE g.slug = $1
    `;

    const result = await db.query(sqlstr, [slug]);
    return result.rows;
}

module.exports = { getPackageBySlug };
