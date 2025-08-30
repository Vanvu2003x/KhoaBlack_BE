const pool = require("../configs/db.config");

const OrderModel = {
  // Thêm order
  async createOrder({ user_id, status = "pending", account_info, amount, package_id, profit = 0 }) {
    const query = `
      INSERT INTO orders 
        (user_id, package_id, account_info, amount, profit, status, create_at, update_at)
      VALUES 
        ($1, $2, $3::jsonb, $4, $5, $6, NOW(), NOW())
      RETURNING *;
    `;

    const values = [user_id, package_id, account_info, amount, profit, status];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  // Lấy tất cả đơn hàng (có phân trang)
  async getAllOrders(page = 1) {
    const limit = 10;
    const offset = (page - 1) * limit;

    const ordersQuery = `
      SELECT 
        o.id,
        o.user_id,
        u.email AS user_email,
        u.name AS user_name,
        un.email AS user_nap_email,
        un.name AS user_nap_name,
        o.status,
        o.account_info,
        o.amount,
        o.update_at,
        o.create_at,
        tp.package_name,
        tp.thumbnail,
        tp.package_type,
        g.name AS game_name,
        o.profit
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN users un ON o.user_id_nap = un.id
      JOIN topup_packages tp ON o.package_id = tp.id
      JOIN games g ON tp.game_id = g.id
      ORDER BY o.update_at DESC
      LIMIT $1 OFFSET $2;
    `;

    const countByStatusQuery = `SELECT status, COUNT(*) as count FROM orders GROUP BY status;`;
    const totalQuery = `SELECT COUNT(*) AS total FROM orders`;

    const [ordersRes, countRes, totalRes] = await Promise.all([
      pool.query(ordersQuery, [limit, offset]),
      pool.query(countByStatusQuery),
      pool.query(totalQuery),
    ]);

    const counts = { pending: 0, processing: 0, success: 0, cancelled: 0, failed: 0 };
    countRes.rows.forEach(row => { counts[row.status] = parseInt(row.count); });

    return { orders: ordersRes.rows, stats: counts, total: parseInt(totalRes.rows[0].total) };
  },

  // Lấy đơn hàng theo trạng thái
  async getOrdersByStatus(status, page = 1) {
    const limit = 10;
    const offset = (page - 1) * limit;

    const ordersQuery = `
      SELECT 
        o.id,
        o.user_id,
        u.email AS user_email,
        u.name AS user_name,
        un.email AS user_nap_email,
        un.name AS user_nap_name,
        o.status,
        o.account_info,
        o.amount,
        o.update_at,
        o.create_at,
        tp.package_name,
        tp.thumbnail,
        tp.package_type,
        g.name AS game_name,
        o.profit
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN users un ON o.user_id_nap = un.id
      JOIN topup_packages tp ON o.package_id = tp.id
      JOIN games g ON tp.game_id = g.id
      WHERE o.status = $1
      ORDER BY o.update_at DESC
      LIMIT $2 OFFSET $3;
    `;

    const totalQuery = `SELECT COUNT(*) AS total FROM orders WHERE status = $1`;

    const [ordersRes, totalRes] = await Promise.all([
      pool.query(ordersQuery, [status, limit, offset]),
      pool.query(totalQuery, [status]),
    ]);

    return { orders: ordersRes.rows, total: parseInt(totalRes.rows[0].total) };
  },
// Thêm vào trong OrderModel
async getPendingTotal() {
  const query = `
    SELECT COUNT(*) AS pending_total
    FROM orders
    WHERE status = 'pending'
  `;
  const result = await pool.query(query);
  return parseInt(result.rows[0].pending_total, 10);
}
,
  // Lấy đơn hàng của 1 user
  async getOrdersByUserId(user_id, page = 1) {
    const limit = 10;
    const offset = (page - 1) * limit;

    const ordersQuery = `
      SELECT 
        o.id,
        o.user_id,
        u.email AS user_email,
        u.name AS user_name,
        un.email AS user_nap_email,
        un.name AS user_nap_name,
        o.status,
        o.account_info,
        o.amount,
        o.update_at,
        o.create_at,
        tp.package_name,
        tp.thumbnail,
        tp.package_type,
        g.name AS game_name,
        o.profit
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN users un ON o.user_id_nap = un.id
      JOIN topup_packages tp ON o.package_id = tp.id
      JOIN games g ON tp.game_id = g.id
      WHERE o.user_id = $1
      ORDER BY o.update_at DESC
      LIMIT $2 OFFSET $3;
    `;

    const totalQuery = `SELECT COUNT(*) AS total FROM orders WHERE user_id = $1`;

    const [ordersRes, totalRes] = await Promise.all([
      pool.query(ordersQuery, [user_id, limit, offset]),
      pool.query(totalQuery, [user_id]),
    ]);

    return { orders: ordersRes.rows, total: parseInt(totalRes.rows[0].total) };
  },

  // Tìm kiếm đơn hàng
  async searchOrders(keyword, page = 1) {
    const limit = 10;
    const offset = (page - 1) * limit;
    const likeKeyword = `%${keyword}%`;

    const ordersQuery = `
      SELECT 
        o.id,
        o.user_id,
        u.email AS user_email,
        u.name AS user_name,
        un.email AS user_nap_email,
        un.name AS user_nap_name,
        o.status,
        o.account_info,
        o.amount,
        o.update_at,
        o.create_at,
        tp.package_name,
        tp.thumbnail,
        tp.package_type,
        g.name AS game_name,
        o.profit
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN users un ON o.user_id_nap = un.id
      JOIN topup_packages tp ON o.package_id = tp.id
      JOIN games g ON tp.game_id = g.id
      WHERE o.id::text ILIKE $1
         OR u.email ILIKE $1
         OR un.email ILIKE $1
         OR tp.package_name ILIKE $1
         OR g.name ILIKE $1
      ORDER BY o.update_at DESC
      LIMIT $2 OFFSET $3;
    `;

    const totalQuery = `
      SELECT COUNT(*) AS total
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN users un ON o.user_id_nap = un.id
      JOIN topup_packages tp ON o.package_id = tp.id
      JOIN games g ON tp.game_id = g.id
      WHERE o.id::text ILIKE $1
         OR u.email ILIKE $1
         OR un.email ILIKE $1
         OR tp.package_name ILIKE $1
         OR g.name ILIKE $1;
    `;

    const [ordersRes, totalRes] = await Promise.all([
      pool.query(ordersQuery, [likeKeyword, limit, offset]),
      pool.query(totalQuery, [likeKeyword]),
    ]);

    return { orders: ordersRes.rows, total: parseInt(totalRes.rows[0].total) };
  },

  // Lấy 1 đơn hàng theo ID
  async getOrderById(id) {
    const query = `
      SELECT 
        o.id,
        o.user_id,
        u.email AS user_email,
        u.name AS user_name,
        un.email AS user_nap_email,
        un.name AS user_nap_name,
        o.status,
        o.account_info,
        o.amount,
        o.update_at,
        o.create_at,
        tp.package_name,
        tp.thumbnail,
        tp.package_type,
        g.name AS game_name,
        o.profit
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN users un ON o.user_id_nap = un.id
      JOIN topup_packages tp ON o.package_id = tp.id
      JOIN games g ON tp.game_id = g.id
      WHERE o.id = $1;
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  // Tổng hợp chi phí
  async getCostSummary() {
    const totalAllQuery = `
      SELECT COALESCE(SUM(amount - profit), 0) AS total
      FROM orders
      WHERE status = 'success'
    `;

    const totalMonthQuery = `
      SELECT COALESCE(SUM(amount - profit), 0) AS total
      FROM orders
      WHERE status = 'success'
        AND DATE_TRUNC('month', update_at) = DATE_TRUNC('month', CURRENT_DATE)
    `;

    const totalTodayQuery = `
      SELECT COALESCE(SUM(amount - profit), 0) AS total
      FROM orders
      WHERE status = 'success'
        AND DATE(update_at) = CURRENT_DATE
    `;

    const last30DaysQuery = `
      SELECT 
        gs.date AS date,
        COALESCE(SUM(o.amount - o.profit), 0) AS total_cost
      FROM generate_series(
          CURRENT_DATE - INTERVAL '29 days',
          CURRENT_DATE,
          '1 day'
      ) AS gs(date)
      LEFT JOIN orders o
        ON DATE(o.update_at) = gs.date
        AND o.status = 'success'
      GROUP BY gs.date
      ORDER BY gs.date ASC
    `;

    const [totalAllRes, totalMonthRes, totalTodayRes, last30DaysRes] = await Promise.all([
      pool.query(totalAllQuery),
      pool.query(totalMonthQuery),
      pool.query(totalTodayQuery),
      pool.query(last30DaysQuery),
    ]);

    return {
      status: true,
      total_cost: totalAllRes.rows[0].total,
      total_cost_this_month: totalMonthRes.rows[0].total,
      total_cost_today: totalTodayRes.rows[0].total,
      last_30_days: last30DaysRes.rows.map(row => ({ date: row.date, total_cost: row.total_cost })),
    };
  },

  // Lấy tất cả đơn hàng theo user_id (có phân trang)
  async getAllOrdersByUserId(user_id, page = 1) {
    return this.getOrdersByUserId(user_id, page);
  },

  // Lấy order theo trạng thái nhưng có user_id_nap
  async getOrdersByStatusWithNap(status, page = 1) {
    const limit = 10;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        o.id,
        o.user_id,
        u.email AS user_email,
        u.name AS user_name,
        un.email AS user_nap_email,
        un.name AS user_nap_name,
        o.status,
        o.account_info,
        o.amount,
        o.update_at,
        o.create_at,
        tp.package_name,
        tp.thumbnail,
        tp.package_type,
        g.name AS game_name,
        o.profit
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN users un ON o.user_id_nap = un.id
      JOIN topup_packages tp ON o.package_id = tp.id
      JOIN games g ON tp.game_id = g.id
      WHERE o.status = $1
      ORDER BY o.update_at DESC
      LIMIT $2 OFFSET $3;
    `;

    const totalQuery = `
      SELECT COUNT(*) AS total 
      FROM orders 
      WHERE status = $1 AND user_id_nap IS NOT NULL
    `;

    const [ordersRes, totalRes] = await Promise.all([
      pool.query(query, [status, limit, offset]),
      pool.query(totalQuery, [status]),
    ]);

    return { orders: ordersRes.rows, total: parseInt(totalRes.rows[0].total) };
  },

  // Thống kê số đơn theo trạng thái cho một user_id_nap
  async getOrderStatsByUserNap(userIdNap) {
    const query = `
      SELECT 
        status,
        COUNT(*) AS total
      FROM orders
      WHERE user_id_nap = $1
      GROUP BY status
    `;
    const result = await pool.query(query, [userIdNap]);
    return result.rows;
  },

  // Nhận đơn hàng
  async receiveOrder(id, user_id_nap) {
    const query = `
      UPDATE orders
      SET status = $1,
          user_id_nap = $2,
          update_at = NOW()
      WHERE id = $3
      RETURNING *;
    `;
    const values = ["processing", user_id_nap, id];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  // Cập nhật trạng thái đơn hàng
  async updateOrderStatus(id, status) {
    const query = `
      UPDATE orders
      SET status = $1,
          update_at = NOW()
      WHERE id = $2
      RETURNING *;
    `;
    const result = await pool.query(query, [status, id]);
    return result.rows[0];
  },

  // Hoàn thành đơn hàng
  async completeOrder(id) {
    return this.updateOrderStatus(id, "success");
  },

  // Hủy đơn hàng và hoàn tiền
  async cancelOrderAndRefund(id) {
    const order = await this.getOrderById(id);
    if (!order) throw new Error("Đơn hàng không tồn tại");

    const updatedOrder = await this.updateOrderStatus(id, "cancel");

    const refundAmount = order.amount - order.profit;
    await this.refundUser(order.user_id, refundAmount);

    return updatedOrder;
  },
// Lịch sử giao dịch của 1 user (phân trang)
async  getCombinedTransactionHistory(user_id, page = 1, limit = 10) {
  const offset = (page - 1) * limit;

  const query = `
   SELECT id, amount, status, created_at, 'order' as type, account_info as description
FROM orders
WHERE user_id = $1
UNION ALL
SELECT id, amount, status, created_at, 'wallet' as type, '' as description
FROM topup_wallet_logs
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

  `;

  const { rows } = await pool.query(query, [user_id, limit, offset]);

  // Đếm tổng số bản ghi
  const countQuery = `
    SELECT COUNT(*) as total FROM (
      SELECT id FROM orders WHERE user_id = $1
      UNION ALL
      SELECT id FROM topup_wallet_logs WHERE user_id = $1
    ) as combined
  `;
  const countResult = await pool.query(countQuery, [user_id]);
  const total = parseInt(countResult.rows[0].total, 10);

  return {
    transactions: rows,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
  },
// Lấy tổng tiền user đã tiêu + tổng tiền nạp trong tháng
async getUserFinancialSummary(user_id) {
  const query = `
    SELECT
      -- Tổng tiêu (toàn bộ)
      (SELECT COALESCE(SUM(amount), 0)
       FROM orders
       WHERE user_id = $1 AND status = 'success') AS tong_tieu,

      -- Tổng tiêu trong tháng
      (SELECT COALESCE(SUM(amount), 0)
       FROM orders
       WHERE user_id = $1 
         AND status = 'success'
         AND DATE_TRUNC('month', update_at) = DATE_TRUNC('month', CURRENT_DATE)
      ) AS tong_tieu_thang,

      -- Tổng nạp (toàn bộ)
      (SELECT COALESCE(SUM(amount), 0)
       FROM topup_wallet_logs
       WHERE user_id = $1 AND status = 'success') AS tong_nap,

      -- Tổng nạp trong tháng
      (SELECT COALESCE(SUM(amount), 0)
       FROM topup_wallet_logs
       WHERE user_id = $1 
         AND status = 'success'
         AND DATE_TRUNC('month', update_at) = DATE_TRUNC('month', CURRENT_DATE)
      ) AS tong_nap_thang
  `;
  const result = await pool.query(query, [user_id]);
  return result.rows[0]; // { tong_tieu, tong_tieu_thang, tong_nap, tong_nap_thang }
}




};

module.exports = OrderModel;
