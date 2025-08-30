const db = require("../configs/db.config");
const { userSocketMap } = require("../sockets/websocket");

async function addUser(user) {
  const sql = `
    INSERT INTO users (name, email, hash_password)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;

  const values = [user.name, user.email, user.hash_password]; 
  const result = await db.query(sql, values);
  return result.rows[0];
}

async function getInfoUser(userId) {
  const sql = `
    SELECT id, name, email, balance, role,create_at 
    FROM users 
    WHERE id = $1
  `;
  const result = await db.query(sql, [userId]);
  return result.rowCount > 0 ? result.rows[0] : null;
}

async function getUserByUsername(username) {
    const sqlstr = `SELECT * FROM users WHERE email = $1`;
    const result = await db.query(sqlstr, [username]);
    return result.rows;
}

async function getUser(role) {
  let sqlStr = `
    SELECT 
      u.*,
      COALESCE(o1.order_count, 0) AS so_don_order,
      COALESCE(o2.success_order_count, 0) AS so_don_da_nap,
      COALESCE(twl.total_amount, 0) AS tong_amount
    FROM users u
    LEFT JOIN (
      SELECT user_id, COUNT(*) AS order_count
      FROM orders
      GROUP BY user_id
    ) o1 ON o1.user_id = u.id
    LEFT JOIN (
      SELECT user_id_nap, COUNT(*) AS success_order_count
      FROM orders
      WHERE status = 'success'
      GROUP BY user_id_nap
    ) o2 ON o2.user_id_nap = u.id
    LEFT JOIN (
      SELECT user_id, SUM(amount) AS total_amount
      FROM topup_wallet_logs
      WHERE status = 'Thành Công'
      GROUP BY user_id
    ) twl ON twl.user_id = u.id
  `;

  const params = [];
  if (role) {
    sqlStr += ` WHERE u.role = $1`;
    params.push(role);
  }

  const result = await db.query(sqlStr, params);
  return result.rows;
}


async function checkEmail(email) {
    const sqlstr = `Select * From users WHERE email = $1`;
    const result = await db.query(sqlstr, [email])
    return result.rowCount;
}
async function recharge_balance(userId, amount, type) {
  const adjustedAmount = type === "credit" ? amount : -amount;
  const sqlUpdate = "UPDATE users SET balance = balance + $1 WHERE id = $2";
  const sqlSelect = "SELECT balance FROM users WHERE id = $1";

  try {
    const result = await db.query(sqlUpdate, [adjustedAmount, userId]);

    if (result.rowCount === 0) {
      console.warn(`Không tìm thấy user với id: ${userId}`);
      return false;
    }

    const newBalanceResult = await db.query(sqlSelect, [userId]);
    const newBalance = newBalanceResult.rows[0].balance;

    let socketEntry = null;

    for (const entry of userSocketMap.entries()) {
      const socketId = entry[0];
      const user = entry[1];

      if (user.id === userId) {
        socketEntry = [socketId, user];
        break;
      }
    }

    if (socketEntry) {
      const [socketId] = socketEntry;
      const io = require("../sockets/websocket").getIO();
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit("balance_update", newBalance);
        socket.emit("payment_success", {
          redirect: true,
          url: "/",
          message: "Thanh toán thành công!",
          balance: newBalance, 
        });
      }
    }

    return true;
  } catch (error) {
    console.error("Lỗi khi cập nhật balance:", error);
    throw error;
  }
}

async function getBalance(userId) {
  const sql = "SELECT balance FROM users WHERE id = $1";
  try {
    const result = await db.query(sql, [userId]);

    if (result.rowCount === 0) {
      console.warn(`Không tìm thấy user với id: ${userId}`);
      return null;
    }

    return result.rows[0].balance;
  } catch (error) {
    console.error("Lỗi khi lấy số dư người dùng:", error);
    throw error;
  }
}
checkRole = async (userId)=>{
    const sqlstr = "select * from users where id = $1"
    const result = await db.query(sqlstr, [userId])
    if(result.rowCount>0 && result.rows[0].role==="admin")
      return true
    else 
      return false
}
async function updateUserRole(userId, newRole) {
  try {
    const checkSql = `SELECT role FROM users WHERE id = $1`;
    const checkResult = await db.query(checkSql, [userId]);

    if (checkResult.rowCount === 0) {
      console.warn(`Không tìm thấy user với id: ${userId}`);
      return { success: false, message: "Không tìm thấy người dùng" };
    }

    if (checkResult.rows[0].role === "admin") {
      return { success: false, message: "Không thể thay đổi role của admin" };
    }

    // Cập nhật role
    const updateSql = `
      UPDATE users
      SET role = $1
      WHERE id = $2
      RETURNING id, name, email, role, balance, create_at
    `;
    const updateResult = await db.query(updateSql, [newRole, userId]);

    return { success: true, user: updateResult.rows[0] };
  } catch (error) {
    console.error("Lỗi khi cập nhật role người dùng:", error);
    throw error;
  }
}
async function changeHashPassword(userId, newHashPassword) {
  try {
    const sql = `
      UPDATE users
      SET hash_password = $1
      WHERE id = $2
      RETURNING id, name, email, role, balance, create_at
    `;
    const result = await db.query(sql, [newHashPassword, userId]);

    if (result.rowCount === 0) {
      console.warn(`Không tìm thấy user với id: ${userId}`);
      return { success: false, message: "Không tìm thấy người dùng" };
    }

    return { success: true, user: result.rows[0] };
  } catch (err) {
    console.error("Lỗi khi đổi mật khẩu:", err);
    throw err;
  }
}
async function searchUser(role, username) {
  let sqlStr = `
    SELECT 
      u.*,
      COALESCE(o1.order_count, 0) AS so_don_order,
      COALESCE(o2.success_order_count, 0) AS so_don_da_nap,
      COALESCE(twl.total_amount, 0) AS tong_amount
    FROM users u
    LEFT JOIN (
      SELECT user_id, COUNT(*) AS order_count
      FROM orders
      GROUP BY user_id
    ) o1 ON o1.user_id = u.id
    LEFT JOIN (
      SELECT user_id_nap, COUNT(*) AS success_order_count
      FROM orders
      WHERE status = 'success'
      GROUP BY user_id_nap
    ) o2 ON o2.user_id_nap = u.id
    LEFT JOIN (
      SELECT user_id, SUM(amount) AS total_amount
      FROM topup_wallet_logs
      WHERE status = 'Thành Công'
      GROUP BY user_id
    ) twl ON twl.user_id = u.id
    WHERE 1=1
  `;

  const params = [];
  let index = 1;

  if (role) {
    sqlStr += ` AND u.role = $${index}`;
    params.push(role);
    index++;
  }

  if (username) {
    sqlStr += ` AND (u.name ILIKE $${index} OR u.email ILIKE $${index})`;
    params.push(`%${username}%`);
    index++;
  }

  const result = await db.query(sqlStr, params);
  return result.rows;
}


module.exports = {searchUser   , changeHashPassword,addUser,getUser, getUserByUsername,checkEmail,updateUserRole ,recharge_balance,checkRole,getBalance,getInfoUser};
