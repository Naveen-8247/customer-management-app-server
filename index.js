const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { authMiddleware, adminOnly, SECRET_KEY } = require("./authMiddleware");
const cors = require("cors");

const app = express();

app.use(cors({
  origin: ["http://localhost:3000", "https://customer-managemrnt-app-client.vercel.app"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
}));

app.use(cors());

app.use(express.json());

// Database
const db = new sqlite3.Database("./database.db", (error) => {
  if (error) console.error("DB connection error:", error.message);
  else console.log("Connected to SQLite database.");
});

db.run("PRAGMA foreign_keys = ON");

// Tables
db.run(`CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_number TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  gender TEXT CHECK(gender IN ('male','female','other'))
)`);

db.run(`CREATE TABLE IF NOT EXISTS addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  address_details TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pin_code TEXT NOT NULL,
  FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
)`);

db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','user'))
)`);


//seed user and admin 
async function seedUsers() {
  db.get(`SELECT * FROM users WHERE username='admin'`, async (err, row) => {
    if (!row) {
      const hashedAdmin = await bcrypt.hash("admin123", 10);
      db.run(`INSERT INTO users (username,password,role) VALUES (?,?,?)`, ["admin", hashedAdmin, "admin"]);
      console.log("Seeded admin account");
    }
  });

  db.get(`SELECT * FROM users WHERE username='user'`, async (err, row) => {
    if (!row) {
      const hashedUser = await bcrypt.hash("user123", 10);
      db.run(`INSERT INTO users (username,password,role) VALUES (?,?,?)`, ["user", hashedUser, "user"]);
      console.log("Seeded user account");
    }
  });
}
seedUsers();


// Login route
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM users WHERE username=?`, [username], async (err, user) => {
    if (err || !user) return res.status(400).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: "Invalid credentials" });

    // Token without expiry
    const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY);
    res.json({ token, role: user.role });
  });
});

// CRUD APIs
app.post("/api/customers", authMiddleware, adminOnly, (req, res) => {
  const { first_name, last_name, phone_number, email, gender } = req.body;
  db.run(
    `INSERT INTO customers (first_name,last_name,phone_number,email,gender) VALUES (?,?,?,?,?)`,
    [first_name, last_name, phone_number, email, gender],
    function (error) {
      if (error) return res.status(400).json({ error: error.message });
      res.json({ message: "Customer created", id: this.lastID });
    }
  );
});

app.get("/api/customers", authMiddleware, (req, res) => {
  db.all(`SELECT * FROM customers`, [], (error, rows) => {
    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: "success", data: rows });
  });
});

app.get("/api/customers/:id", authMiddleware, (req, res) => {
  db.get(`SELECT * FROM customers WHERE id=?`, [req.params.id], (error, row) => {
    if (error) return res.status(400).json({ error: error.message });
    if (!row) return res.status(404).json({ error: "Customer not found" });
    res.json({ message: "success", data: row });
  });
});

app.put("/api/customers/:id", authMiddleware, adminOnly, (req, res) => {
  const { first_name, last_name, phone_number, email, gender } = req.body;
  db.run(
    `UPDATE customers SET first_name=?, last_name=?, phone_number=?, email=?, gender=? WHERE id=?`,
    [first_name, last_name, phone_number, email, gender, req.params.id],
    function (error) {
      if (error) return res.status(400).json({ error: error.message });
      if (this.changes === 0) return res.status(404).json({ error: "Customer not found" });
      res.json({ message: "Customer updated" });
    }
  );
});

// Add address for a customer
app.post("/api/customers/:id/addresses", authMiddleware, adminOnly, (req, res) => {
  const { address_details, city, state, pin_code } = req.body;
  const customerId = req.params.id;

  db.run(
    `INSERT INTO addresses (customer_id, address_details, city, state, pin_code) VALUES (?, ?, ?, ?, ?)`,
    [customerId, address_details, city, state, pin_code],
    function (error) {
      if (error) return res.status(400).json({ error: error.message });
      res.json({ message: "Address added", id: this.lastID });
    }
  );
});

// Get all addresses of a customer
app.get("/api/customers/:id/addresses", authMiddleware, (req, res) => {
  const customerId = req.params.id;
  db.all(`SELECT * FROM addresses WHERE customer_id=?`, [customerId], (error, rows) => {
    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: "success", data: rows });
  });
});

// Delete an address
app.delete("/api/customers/:customerId/addresses/:addressId", authMiddleware, adminOnly, (req, res) => {
  const { addressId } = req.params;

  db.run(
    `DELETE FROM addresses WHERE id=?`,
    [addressId],
    function (error) {
      if (error) return res.status(400).json({ error: error.message });
      if (this.changes === 0) return res.status(404).json({ error: "Address not found" });
      res.json({ message: "Address deleted successfully" });
    }
  );
});



app.delete("/api/customers/:id", authMiddleware, adminOnly, (req, res) => {
  db.run(`DELETE FROM customers WHERE id=?`, [req.params.id], function (error) {
    if (error) return res.status(400).json({ error: error.message });
    if (this.changes === 0) return res.status(404).json({ error: "Customer not found" });
    res.json({ message: "Customer deleted" });
  });
});

// Get logged-in user profile
app.get("/api/profile", authMiddleware, (req, res) => {
  const userId = req.user.id;
  db.get(`SELECT id, username, role FROM users WHERE id=?`, [userId], (err, row) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ message: "success", data: row });
  });
});

// Update user profile with current password check
app.put("/api/profile", authMiddleware, (req, res) => {
  const { username, currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword) return res.status(400).json({ error: "Current password required" });

  // Get the user
  db.get(`SELECT * FROM users WHERE id=?`, [userId], async (err, user) => {
    if (err || !user) return res.status(400).json({ error: "User not found" });

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(400).json({ error: "Current password is incorrect" });

    let query = `UPDATE users SET username=?`;
    let params = [username];

    if (newPassword) {
      const hashedNew = await bcrypt.hash(newPassword, 10);
      query += `, password=?`;
      params.push(hashedNew);
    }

    query += ` WHERE id=?`;
    params.push(userId);

    db.run(query, params, function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ message: "Profile updated successfully" });
    });
  });
});




// Start server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});



