const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const app = express();

// ✅ Allow both your Vercel frontend & local development
app.use(cors({
  origin: [
    "https://customer-managemrnt-app-client.vercel.app", // your deployed frontend
    "http://localhost:3000" // for local testing
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());

// ✅ Connect to SQLite
const db = new sqlite3.Database("./database.db", (error) => {
  if (error) {
    console.error("Database connection error:", error.message);
  } else {
    console.log("Connected to SQLite database.");
  }
});

db.run("PRAGMA foreign_keys = ON");

// ✅ Create customers table
const createCustomersTableQuery = `
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone_number TEXT NOT NULL UNIQUE
  )
`;
db.run(createCustomersTableQuery);

// ✅ Create addresses table
const createAddressesTableQuery = `
  CREATE TABLE IF NOT EXISTS addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    address_details TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pin_code TEXT NOT NULL,
    FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
  )
`;
db.run(createAddressesTableQuery);

// ✅ Create a new customer
app.post("/api/customers", (req, res) => {
  const { first_name, last_name, phone_number } = req.body;

  const query = `
    INSERT INTO customers (first_name, last_name, phone_number)
    VALUES (?, ?, ?)
  `;

  db.run(query, [first_name, last_name, phone_number], function (error) {
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    res.json({ message: "Customer created", id: this.lastID });
  });
});

// ✅ Get all customers
app.get("/api/customers", (req, res) => {
  db.all("SELECT * FROM customers", [], (error, rows) => {
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    res.json({ message: "success", data: rows });
  });
});

// ✅ Get a single customer
app.get("/api/customers/:id", (req, res) => {
  db.get("SELECT * FROM customers WHERE id = ?", [req.params.id], (error, row) => {
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    if (!row) {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.json({ message: "success", data: row });
  });
});

// ✅ Update customer
app.put("/api/customers/:id", (req, res) => {
  const { first_name, last_name, phone_number } = req.body;

  const query = `
    UPDATE customers
    SET first_name = ?, last_name = ?, phone_number = ?
    WHERE id = ?
  `;

  db.run(query, [first_name, last_name, phone_number, req.params.id], function (error) {
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.json({ message: "Customer updated" });
  });
});

// ✅ Delete customer
app.delete("/api/customers/:id", (req, res) => {
  db.run("DELETE FROM customers WHERE id = ?", [req.params.id], function (error) {
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.json({ message: "Customer deleted" });
  });
});

// ✅ Add address
app.post("/api/customers/:id/addresses", (req, res) => {
  const { address_details, city, state, pin_code } = req.body;

  const query = `
    INSERT INTO addresses (customer_id, address_details, city, state, pin_code)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.run(query, [req.params.id, address_details, city, state, pin_code], function (error) {
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    res.json({ message: "Address added", id: this.lastID });
  });
});

// ✅ Get addresses
app.get("/api/customers/:id/addresses", (req, res) => {
  db.all("SELECT * FROM addresses WHERE customer_id = ?", [req.params.id], (error, rows) => {
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    res.json({ message: "success", data: rows });
  });
});

// ✅ Delete address
app.delete("/api/addresses/:addressId", (req, res) => {
  db.run("DELETE FROM addresses WHERE id = ?", [req.params.addressId], function (error) {
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Address not found" });
    }
    res.json({ message: "Address deleted" });
  });
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});



