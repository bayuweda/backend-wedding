require("dotenv").config();
const mysql = require("mysql2/promise");

async function test() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT, 10),
      ssl: { rejectUnauthorized: false },
    });
    console.log("✅ Connected to Railway database!");
    await conn.end();
  } catch (err) {
    console.error("❌ Connection failed:", err);
  }
}

test();
