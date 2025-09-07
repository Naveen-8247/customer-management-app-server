const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const app = express();

app.use(cors({
  origin: "https://customer-managemrnt-app-client.vercel.app", 
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database("./database.db", (error) => {
  if (error) {
    console.error("Database connection error:", error.message);
  } else {
    console.log("Connected to SQLite database.");
  }
});

db.run("PRAGMA foreign_keys = ON");



// SQL to create customers table
const createCustomersTableQuery = `
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone_number TEXT NOT NULL UNIQUE
  )
`;
db.run(createCustomersTableQuery);

// SQL to create addresses table
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


// Create a new customer
app.post("/api/customers", (request, response) => {
  const { first_name, last_name, phone_number } = request.body;

  const createCustomerQuery = `
    INSERT INTO customers (first_name, last_name, phone_number)
    VALUES (:first_name, :last_name, :phone_number)
  `;

  db.run(
    createCustomerQuery,
    {
      ":first_name": first_name,
      ":last_name": last_name,
      ":phone_number": phone_number
    },
    function (error) {
      if (error) {
        return response.status(400).json({ error: error.message });
      }
      response.json({ message: "Customer created", id: this.lastID });
    }
  );
});

// Get all customers
app.get("/api/customers", (request, response) => {
  const getAllCustomersQuery = "SELECT * FROM customers";

  db.all(getAllCustomersQuery, [], (error, rows) => {
    if (error) {
      return response.status(400).json({ error: error.message });
    }
    response.json({ message: "success", data: rows });
  });
});

// Get a single customer by ID
app.get("/api/customers/:id", (request, response) => {
  const getCustomerByIdQuery = "SELECT * FROM customers WHERE id = :id";

  db.get(getCustomerByIdQuery, { ":id": request.params.id }, (error, row) => {
    if (error) {
      return response.status(400).json({ error: error.message });
    }
    if (!row) {
      return response.status(404).json({ error: "Customer not found" });
    }
    response.json({ message: "success", data: row });
  });
});

// Update a customer
app.put("/api/customers/:id", (request, response) => {
  const { first_name, last_name, phone_number } = request.body;

  const updateCustomerQuery = `
    UPDATE customers
    SET first_name = :first_name, last_name = :last_name, phone_number = :phone_number
    WHERE id = :id
  `;

  db.run(
    updateCustomerQuery,
    {
      ":first_name": first_name,
      ":last_name": last_name,
      ":phone_number": phone_number,
      ":id": request.params.id
    },
    function (error) {
      if (error) {
        return response.status(400).json({ error: error.message });
      }
      if (this.changes === 0) {
        return response.status(404).json({ error: "Customer not found" });
      }
      response.json({ message: "Customer updated" });
    }
  );
});

// Delete a customer
app.delete("/api/customers/:id", (request, response) => {
  const deleteCustomerQuery = "DELETE FROM customers WHERE id = :id";

  db.run(deleteCustomerQuery, { ":id": request.params.id }, function (error) {
    if (error) {
      return response.status(400).json({ error: error.message });
    }
    if (this.changes === 0) {
      return response.status(404).json({ error: "Customer not found" });
    }
    response.json({ message: "Customer deleted" });
  });
});


// Add address for a customer
app.post("/api/customers/:id/addresses", (request, response) => {
  const { address_details, city, state, pin_code } = request.body;

  const addAddressQuery = `
    INSERT INTO addresses (customer_id, address_details, city, state, pin_code)
    VALUES (:customer_id, :address_details, :city, :state, :pin_code)
  `;

  db.run(
    addAddressQuery,
    {
      ":customer_id": request.params.id,
      ":address_details": address_details,
      ":city": city,
      ":state": state,
      ":pin_code": pin_code
    },
    function (error) {
      if (error) {
        return response.status(400).json({ error: error.message });
      }
      response.json({ message: "Address added", id: this.lastID });
    }
  );
});

// Get all addresses for a customer
app.get("/api/customers/:id/addresses", (request, response) => {
  const getAddressesQuery = "SELECT * FROM addresses WHERE customer_id = :customer_id";

  db.all(getAddressesQuery, { ":customer_id": request.params.id }, (error, rows) => {
    if (error) {
      return response.status(400).json({ error: error.message });
    }
    response.json({ message: "success", data: rows });
  });
});

// Delete an address
app.delete("/api/addresses/:addressId", (request, response) => {
  const deleteAddressQuery = "DELETE FROM addresses WHERE id = :addressId";

  db.run(deleteAddressQuery, { ":addressId": request.params.addressId }, function (error) {
    if (error) {
      return response.status(400).json({ error: error.message });
    }
    if (this.changes === 0) {
      return response.status(404).json({ error: "Address not found" });
    }
    response.json({ message: "Address deleted" });
  });
});

//start server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});



