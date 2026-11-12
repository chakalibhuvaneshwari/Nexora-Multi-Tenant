
import express from "express";

import {
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  publishProduct
} from "../controllers/product.controller.js";

import { authenticateToken } from "../middleware/auth.middleware.js";
import { authorizePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

// All product routes require login
router.use(authenticateToken);

// Create product
router.post(
  "/",
  authorizePermission("products.create"),
  createProduct
);

// View products
router.get(
  "/",
  authorizePermission("products.read"),
  getProducts
);

// Update product
router.put(
  "/:productId",
  authorizePermission("products.update"),
  updateProduct
);

// Delete product
router.delete(
  "/:productId",
  authorizePermission("products.delete"),
  deleteProduct
);

// Publish product
router.patch(
  "/:productId/publish",
  authorizePermission("products.publish"),
  publishProduct
);

export default router;