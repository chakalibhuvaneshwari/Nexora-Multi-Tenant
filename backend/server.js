
import employeeRoutes from "./routes/employee.routes.js";
import orderRoutes from "./routes/order.routes.js";
import productRoutes from "./routes/product.routes.js";
import authRoutes from "./routes/auth.routes.js";
import organizationRoutes from "./routes/organization.routes.js";
import pool from "./config/db.js";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";

dotenv.config();

const app = express();

app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));

app.use(express.json());
app.use("/api/organizations", organizationRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/orders", orderRoutes);

// Welcome route
app.get("/", (req, res) => {
  res.send("Welcome to Nexora Backend!");
});

// Health check route
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Nexora backend is running successfully",
    application: "Nexora"
  });
});

const PORT = process.env.PORT || 5000;
app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT current_database() AS database_name, NOW() AS server_time"
    );

    res.status(200).json({
      success: true,
      message: "Neon database connected successfully",
      database: result.rows[0].database_name,
      serverTime: result.rows[0].server_time
    });

  } catch (error) {
    console.error("Database connection error:", error.message);

    res.status(500).json({
      success: false,
      message: "Database connection failed"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Nexora server running on port ${PORT}`);
});