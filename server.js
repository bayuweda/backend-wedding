// server.js (CommonJS)
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Pool koneksi MySQL (lebih aman untuk production)
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "wedding_invitation",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// helper untuk query -> mengubah callback ke promise
const query = (sql, params) =>
  new Promise((resolve, reject) => {
    pool.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

// buat tabel jika belum ada (opsional)
(async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS guests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        status ENUM('pending','confirmed','declined') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ ensured guests table exists");
  } catch (err) {
    console.error("Table creation error:", err);
  }
})();

// ROUTES
app.get("/", (req, res) => res.json({ ok: true }));

// GET all guests
app.get("/guests", async (req, res) => {
  try {
    const rows = await query("SELECT * FROM guests ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET single guest by id
app.get("/guests/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const rows = await query("SELECT * FROM guests WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add guest
app.post("/guests", async (req, res) => {
  const { name, email = null, phone = null } = req.body;
  if (!name || !name.trim())
    return res.status(400).json({ error: "Name required" });

  try {
    const result = await query(
      "INSERT INTO guests (name, email, phone) VALUES (?, ?, ?)",
      [name.trim(), email, phone]
    );
    res.json({
      id: result.insertId,
      name: name.trim(),
      email,
      phone,
      status: "pending",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH update guest (e.g. status or name)
app.patch("/guests/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, status } = req.body;
  try {
    const fields = [];
    const params = [];
    if (name !== undefined) {
      fields.push("name = ?");
      params.push(name);
    }
    if (email !== undefined) {
      fields.push("email = ?");
      params.push(email);
    }
    if (phone !== undefined) {
      fields.push("phone = ?");
      params.push(phone);
    }
    if (status !== undefined) {
      fields.push("status = ?");
      params.push(status);
    }

    if (!fields.length)
      return res.status(400).json({ error: "No fields to update" });

    params.push(id);
    const sql = `UPDATE guests SET ${fields.join(", ")} WHERE id = ?`;
    await query(sql, params);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE guest
app.delete("/guests/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query("DELETE FROM guests WHERE id = ?", [id]);
    res.json({ deleted: result.affectedRows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// comment

// ================== COMMENTS ================== //

// GET all comments
app.get("/comments", async (req, res) => {
  try {
    const rows = await query("SELECT * FROM comments ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add comment
app.post("/comments", async (req, res) => {
  const { name, message, isPresent } = req.body;
  if (!name || !message) {
    return res.status(400).json({ error: "Nama dan pesan harus diisi" });
  }

  try {
    const result = await query(
      "INSERT INTO comments (name, message, is_present) VALUES (?, ?, ?)",
      [name.trim(), message.trim(), !!isPresent]
    );
    res.json({
      id: result.insertId,
      name: name.trim(),
      message: message.trim(),
      is_present: !!isPresent,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE comment (opsional)
app.delete("/comments/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query("DELETE FROM comments WHERE id = ?", [id]);
    res.json({ deleted: result.affectedRows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
