
const { drizzle } = require("drizzle-orm/mysql2");
const mysql = require("mysql2/promise");
require("dotenv").config();

const poolConnection = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const db = drizzle(poolConnection);

module.exports = { db, poolConnection };
