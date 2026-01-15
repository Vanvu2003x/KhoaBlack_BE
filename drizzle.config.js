
import { defineConfig } from "drizzle-kit";
require("dotenv").config();

export default defineConfig({
    driver: "mysql2",
    schema: "./src/db/schema.js",
    out: "./drizzle",
    dbCredentials: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: Number(process.env.DB_PORT),
    },
});
