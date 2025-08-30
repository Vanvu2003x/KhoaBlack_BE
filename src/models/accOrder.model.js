const db = require("../configs/db.config");

const AccOrdersModel = {
  // Thêm order mới + cập nhật acc.status = 'sold'
  async createOrder({ acc_id, user_id, price, status, contact_info }) {
    try {
      await db.query("BEGIN");

      const insertQuery = `
        INSERT INTO acc_orders (acc_id, user_id, price, status, contact_info, create_at, update_at)
        VALUES ($1, $2, $3, $4, $5::jsonb, NOW(), NOW())
        RETURNING *;
      `;
      const insertValues = [
        acc_id,
        user_id,
        price,
        status || "pending",
        JSON.stringify(contact_info || {})
      ];
      const result = await db.query(insertQuery, insertValues);
      const newOrder = result.rows[0];

      // Update acc.status = 'sold'
      await db.query(
        `UPDATE acc SET status = 'sold' WHERE id = $1`,
        [acc_id]
      );

      await db.query("COMMIT");
      return newOrder;
    } catch (err) {
      await db.query("ROLLBACK");
      throw err;
    }
  },

  // Hủy order + reset acc.status về 'pending'
// Hủy order + reset acc.status về 'selling'
async cancelOrder(orderId) {
  try {
    await db.query("BEGIN");

    // Lấy order
    const orderRes = await db.query(`SELECT * FROM acc_orders WHERE id = $1`, [orderId]);
    const order = orderRes.rows[0];
    if (!order) throw new Error("Order không tồn tại");

    // Cập nhật trạng thái order
    const updateOrderRes = await db.query(
      `UPDATE acc_orders SET status = 'canceled', update_at = NOW() WHERE id = $1 RETURNING *`,
      [orderId]
    );

    // Cập nhật acc.status về 'selling'
    await db.query(
      `UPDATE acc SET status = 'selling' WHERE id = $1`,
      [order.acc_id]  // dùng order.acc_id chứ không phải acc_id
    );

    await db.query("COMMIT");
    return updateOrderRes.rows[0];
  } catch (err) {
    await db.query("ROLLBACK");
    console.error("Lỗi cancelOrder:", err);
    throw err;
  }
},
  // Cập nhật status order (giữ nguyên)
  async updateStatus(id, status) {
    const query = `
      UPDATE acc_orders
      SET status = $2
      WHERE id = $1
      RETURNING *;
    `;
    const values = [id, status];
    const result = await db.query(query, values);
    return result.rows[0];
  },

  // Cập nhật/merge contact_info (partial)
  async updateContactInfo(id, partialContactInfo) {
    const query = `
      UPDATE acc_orders
      SET contact_info = contact_info || $2::jsonb,
          update_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;
    const values = [id, JSON.stringify(partialContactInfo || {})];
    const result = await db.query(query, values);
    return result.rows[0];
  },

  // Lấy order theo user_id kèm acc info + user info + game thumbnail
  async getByUserId(user_id) {
    const query = `
      SELECT ao.*, 
             a.image AS acc_image, 
             u.name AS user_name, u.email AS user_email,
             g.thumbnail AS game_thumbnail
      FROM acc_orders ao
      JOIN acc a ON ao.acc_id = a.id
      JOIN users u ON ao.user_id = u.id
      JOIN games g ON a.game_id = g.id
      WHERE ao.user_id = $1
      ORDER BY ao.create_at DESC;
    `;
    const result = await db.query(query, [user_id]);
    return result.rows;
  },

  // Lấy order theo id
  async getById(id) {
    const query = `
      SELECT ao.*, 
             a.image AS acc_image, 
             u.name AS user_name, u.email AS user_email,
             g.thumbnail AS game_thumbnail
      FROM acc_orders ao
      JOIN acc a ON ao.acc_id = a.id
      JOIN users u ON ao.user_id = u.id
      JOIN games g ON a.game_id = g.id
      WHERE ao.id = $1;
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  // Lấy order theo acc_id
  async getByAccId(acc_id) {
    const query = `
      SELECT ao.*, 
             a.image AS acc_image, 
             u.name AS user_name, u.email AS user_email,
             g.thumbnail AS game_thumbnail
      FROM acc_orders ao
      JOIN acc a ON ao.acc_id = a.id
      JOIN users u ON ao.user_id = u.id
      JOIN games g ON a.game_id = g.id
      WHERE ao.acc_id = $1
      ORDER BY ao.create_at DESC;
    `;
    const result = await db.query(query, [acc_id]);
    return result.rows;
  },

  // Lấy tất cả order
  async getAll() {
    const query = `
      SELECT ao.*, 
             a.image AS acc_image, 
             u.name AS user_name, u.email AS user_email,
             g.thumbnail AS game_thumbnail
      FROM acc_orders ao
      JOIN acc a ON ao.acc_id = a.id
      JOIN users u ON ao.user_id = u.id
      JOIN games g ON a.game_id = g.id
      ORDER BY ao.create_at DESC;
    `;
    const result = await db.query(query);
    return result.rows;
  },

  // Cập nhật status order (dùng khi cần)
  async updateStatusTo(id, newStatus) {
    const query = `
      UPDATE acc_orders
      SET status = $2, update_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;
    const values = [id, newStatus];
    const result = await db.query(query, values);
    return result.rows[0];
  },

  // Tìm theo contact (phone/email)
  async findByContact({ phone, email }) {
    const conds = [];
    const params = [];
    let i = 1;

    if (phone) {
      conds.push(`ao.contact_info->>'phone' = $${i++}`);
      params.push(phone);
    }
    if (email) {
      conds.push(`LOWER(ao.contact_info->>'email') = LOWER($${i++})`);
      params.push(email);
    }

    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const query = `
      SELECT ao.*, 
             a.image AS acc_image, 
             u.name AS user_name, u.email AS user_email,
             g.thumbnail AS game_thumbnail
      FROM acc_orders ao
      JOIN acc a ON ao.acc_id = a.id
      JOIN users u ON ao.user_id = u.id
      JOIN games g ON a.game_id = g.id
      ${where}
      ORDER BY ao.create_at DESC;
    `;
    const result = await db.query(query, params);
    return result.rows;
  },
  // Lấy tất cả đơn theo user_id, bao gồm acc info + user info + game thumbnail
async getAllByUserId(user_id) {
  const query = `
    SELECT ao.*, 
           a.image AS acc_image, 
           u.name AS user_name, u.email AS user_email,
           g.thumbnail AS game_thumbnail
    FROM acc_orders ao
    JOIN acc a ON ao.acc_id = a.id
    JOIN users u ON ao.user_id = u.id
    JOIN games g ON a.game_id = g.id
    WHERE ao.user_id = $1
    ORDER BY ao.create_at DESC;
  `;
  const result = await db.query(query, [user_id]);
  return result.rows;
}

};

module.exports = AccOrdersModel;
