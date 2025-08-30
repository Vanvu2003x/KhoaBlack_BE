const db = require("../configs/db.config");

const accModel = {
  // Lấy account theo game_id, filter, phân trang
  async getAccByGame({ game_id, keyword, min, max, limit, offset }) {
    try {
      let sql = "SELECT * FROM acc WHERE game_id = $1";
      let countSql = "SELECT COUNT(*) AS total FROM acc WHERE game_id = $1";
      let params = [game_id];
      let countParams = [game_id];
      let idx = 2;

      if (keyword) {
        sql += ` AND (info ILIKE $${idx} OR id::text ILIKE $${idx})`;
        countSql += ` AND (info ILIKE $${idx} OR id::text ILIKE $${idx})`;
        params.push(`%${keyword}%`);
        countParams.push(`%${keyword}%`);
        idx++;
      }

      if (min !== undefined) {
        sql += ` AND price >= $${idx}`;
        countSql += ` AND price >= $${idx}`;
        params.push(min);
        countParams.push(min);
        idx++;
      }

      if (max !== undefined) {
        sql += ` AND price <= $${idx}`;
        countSql += ` AND price <= $${idx}`;
        params.push(max);
        countParams.push(max);
        idx++;
      }

      sql += " ORDER BY id DESC";

      if (limit !== undefined && offset !== undefined) {
        sql += ` LIMIT $${idx} OFFSET $${idx + 1}`;
        params.push(limit, offset);
      }

      const [dataRes, countRes] = await Promise.all([
        db.query(sql, params),
        db.query(countSql, countParams),
      ]);

      return {
        total: Number(countRes.rows[0].total),
        data: dataRes.rows,
      };
    } catch (err) {
      console.error("Error in getAccByGame:", err);
      throw err;
    }
  },

  async addAcc({ info, image, price, game_id }) {
    try {
      const sql = `
        INSERT INTO acc (info, image, price, game_id)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `;
      const result = await db.query(sql, [info, image, price, game_id]);
      return result.rows[0];
    } catch (err) {
      console.error("Error in addAcc:", err);
      throw err;
    }
  },

  async updateAcc(id, { info, image, price, status, game_id }) {
    try {
      const sql = `
        UPDATE acc
        SET info = $1, image = $2, price = $3, status = $4, game_id = $5
        WHERE id = $6
        RETURNING *;
      `;
      const result = await db.query(sql, [info, image, price, status, game_id, id]);
      return result.rows[0];
    } catch (err) {
      console.error("Error in updateAcc:", err);
      throw err;
    }
  },

  async deleteAcc(id) {
    try {
      const sql = "DELETE FROM acc WHERE id = $1 RETURNING *";
      const result = await db.query(sql, [id]);
      return result.rows[0];
    } catch (err) {
      console.error("Error in deleteAcc:", err);
      throw err;
    }
  },

  async updateStatus(id, status) {
    const query = `
      UPDATE acc 
      SET status = $2
      WHERE id = $1
      RETURNING *;
    `;
    const result = await db.query(query, [id, status]);
    return result.rows[0];
  },

  async getAccStats() {
    try {
      const sql = `
        SELECT 
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'available') AS available,
          COUNT(*) FILTER (WHERE status = 'selling') AS selling,
          COUNT(*) FILTER (WHERE status = 'sold') AS sold
        FROM acc;
      `;
      const result = await db.query(sql);
      return result.rows[0];
    } catch (err) {
      console.error("Error in getAccStats:", err);
      throw err;
    }
  },
  async getPriceById(id) {
  try {
    const sql = `
      SELECT price
      FROM acc
      WHERE id = $1;
    `;
    const result = await db.query(sql, [id]);
    return result.rows[0] ? result.rows[0].price : null;
  } catch (err) {
    console.error("Error in getPriceById:", err);
    throw err;
  }
}

};

module.exports = accModel;
