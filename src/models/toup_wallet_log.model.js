const db = require("../configs/db.config");
const { customAlphabet } = require('nanoid');
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 16);

// Lấy tổng số tiền đã nạp (có thể lọc theo user và khoảng thời gian)
const getTongSoTienDaNap = async (user_id, fromDate, toDate) => {
  let sql = `
    SELECT SUM(amount) AS total_amount 
    FROM topup_wallet_logs 
    WHERE status = 'Thành Công'
  `;
  const params = [];
  let index = 1;

  if (user_id) {
    sql += ` AND user_id = $${index++}`;
    params.push(user_id);
  }

  if (fromDate) {
    sql += ` AND update_at >= $${index++}`;
    params.push(fromDate);
  }

  if (toDate) {
    sql += ` AND update_at <= $${index++}`;
    params.push(toDate);
  }

  const result = await db.query(sql, params);
  return result.rows[0].total_amount || 0;
};

// Tổng tiền đã nạp trong tháng này (có thể lọc theo user)
const getTongSoTienThangNay = async (user_id) => {
  let sql = `
    SELECT SUM(amount) AS total_amount
    FROM topup_wallet_logs 
    WHERE status = 'Thành Công' AND update_at >= date_trunc('month', now())
  `;
  const params = [];

  if (user_id) {
    sql += ` AND user_id = $1`;
    params.push(user_id);
  }

  const result = await db.query(sql, params);
  return result.rows[0].total_amount || 0;
};

// Thống kê tổng tiền nạp theo từng ngày trong 30 ngày gần nhất (có thể lọc theo user)
const getThongKe30NgayGanNhat = async (user_id) => {
  const params = [];
  let index = 1;

  let sql = `
    WITH dates AS (
      SELECT generate_series(
        CURRENT_DATE - INTERVAL '29 days', 
        CURRENT_DATE, 
        INTERVAL '1 day'
      )::date AS date
    )
    SELECT 
      d.date,
      COALESCE(SUM(t.amount), 0) AS total_amount
    FROM dates d
    LEFT JOIN topup_wallet_logs t 
      ON DATE(t.update_at) = d.date AND t.status = 'Thành Công'
  `;

  if (user_id) {
    sql += ` AND t.user_id = $${index++}`;
    params.push(user_id);
  }

  sql += `
    GROUP BY d.date
    ORDER BY d.date ASC
  `;

  const result = await db.query(sql, params);
  return result.rows;
};

// Lấy danh sách log trạng thái 'Đang Chờ' (có thể lọc theo user, phân trang)
async function getLogsPendding(user_id = null, page = 1) {
  const limit = 10;
  const offset = (page - 1) * limit;

  let sql = `
    SELECT 
      l.id,
      l.user_id,
      u.email,
      l.amount,
      l.status,
      l.created_at,
      l.update_at
    FROM topup_wallet_logs l
    LEFT JOIN users u ON l.user_id = u.id
    WHERE l.status = 'Đang Chờ'
  `;

  const params = [];

  if (user_id) {
    sql += ` AND l.user_id = $1`;
    params.push(user_id);
  }

  sql += ` ORDER BY l.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

  const result = await db.query(sql, params);
  return result.rows;
}

// Lấy tổng số bản ghi, có thể lọc theo trạng thái và user
async function getTotal(status = null, user_id = null) {
  let sqlstr = "SELECT COUNT(*) FROM topup_wallet_logs";
  const params = [];
  const conditions = [];

  if (status) {
    conditions.push(`status = $${params.length + 1}`);
    params.push(status);
  }

  if (user_id) {
    conditions.push(`user_id = $${params.length + 1}`);
    params.push(user_id);
  }

  if (conditions.length > 0) {
    sqlstr += " WHERE " + conditions.join(" AND ");
  }

  const result = await db.query(sqlstr, params);
  return result.rows[0].count;
}

// Lấy danh sách log (có thể lọc theo user, phân trang)
async function getLogs(user_id = null, page = 1) {
  const limit = 10;
  const offset = (page - 1) * limit;

  let sql = `
    SELECT 
      l.id,
      l.user_id,
      u.email,
      l.amount,
      l.status,
      l.created_at,
      l.update_at
    FROM topup_wallet_logs l
    LEFT JOIN users u ON l.user_id = u.id
  `;

  const params = [];

  if (user_id) {
    sql += ` WHERE l.user_id = $1`;
    params.push(user_id);
  }

  sql += ` ORDER BY l.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

  const result = await db.query(sql, params);
  return result.rows;
}

// Lấy chi tiết log theo ID
async function getLogById(id) {
  const result = await db.query(
    "SELECT * FROM topup_wallet_logs WHERE id = $1",
    [id]
  );
  return result.rows[0];
}

// Thêm log mới (chỉ gồm id, user_id, amount)
async function addLog(data) {
  const { user_id, amount } = data;
  const id = nanoid();

  const sql = `
    INSERT INTO topup_wallet_logs (id, user_id, amount)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;

  const result = await db.query(sql, [id, user_id, amount]);
  return result.rows[0];
}

// Cập nhật trạng thái log và thời gian cập nhật
async function updateLog(id, status) {
  const update_at = new Date();

  const sql = `
    UPDATE topup_wallet_logs
    SET update_at = $1,
        status = $2
    WHERE id = $3
    RETURNING *;
  `;

  const result = await db.query(sql, [update_at, status, id]);
  return result.rows[0];
}

// Tổng tiền hôm nay (có thể lọc theo user)
const getTongSoTienHomNay = async (user_id) => {
  let sql = `
    SELECT SUM(amount) AS total_amount
    FROM topup_wallet_logs 
    WHERE status = 'Thành Công' AND DATE(update_at) = CURRENT_DATE
  `;
  const params = [];

  if (user_id) {
    sql += ` AND user_id = $1`;
    params.push(user_id);
  }

  const result = await db.query(sql, params);
  return result.rows[0].total_amount || 0;
};

module.exports = {
  getLogs,
  getLogById,
  addLog,
  updateLog,
  getTotal,
  getTongSoTienDaNap,
  getLogsPendding,
  getTongSoTienThangNay,
  getThongKe30NgayGanNhat,
  getTongSoTienHomNay
};
