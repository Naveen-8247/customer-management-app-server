const sqlite3 = require("sqlite3").verbose();

// Open database
const db = new sqlite3.Database("./database.db", (err) => {
  if (err) console.error(err.message);
  else console.log("Connected to SQLite database.");
});

// Add new columns without UNIQUE
db.run(`ALTER TABLE customers ADD COLUMN email TEXT`, (err) => {
  if (err && !err.message.includes("duplicate column name")) console.error(err.message);
  else console.log("Email column added (or already exists).");
});

db.run(`ALTER TABLE customers ADD COLUMN gender TEXT CHECK(gender IN ('male','female','other'))`, (err) => {
  if (err && !err.message.includes("duplicate column name")) console.error(err.message);
  else console.log("Gender column added (or already exists).");
});

// Close DB
db.close();
