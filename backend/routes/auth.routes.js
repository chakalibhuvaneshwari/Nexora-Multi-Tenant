import { authorizePermission } from "../middleware/permission.middleware.js";

import express from "express";
import { login } from "../controllers/auth.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();

// Organization login
router.post("/login", login);

// Protected profile API
router.get("/profile", authenticateToken, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Authenticated user profile",
    user: req.user
  });
});

// Super Admin only API
router.get(
  "/admin-only",
  authenticateToken,
  authorizeRoles("SUPER_ADMIN"),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Welcome Super Admin! You are authorized.",
      role: req.user.role
    });
  }
);
// Product creation permission test API
router.get(
  "/test-product-permission",
  authenticateToken,
  authorizePermission("products.create"),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "You have permission to create products!",
      permission: "products.create"
    });
  }
);

export default router;
