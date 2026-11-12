
import express from "express";
import {
  getOrders,
  getOrderById,
  updateOrderStatus
} from "../controllers/order.controller.js";

import { authenticateToken } from "../middleware/auth.middleware.js";
import { authorizePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.use(authenticateToken);

router.get("/", authorizePermission("orders.read"), getOrders);
router.get("/:orderId", authorizePermission("orders.read"), getOrderById);
router.patch("/:orderId/status", authorizePermission("orders.update"), updateOrderStatus);

export default router;