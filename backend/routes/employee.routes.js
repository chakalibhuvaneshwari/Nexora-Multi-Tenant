
import express from "express";
import {
  createEmployee,
  getEmployees,
  updateEmployee
} from "../controllers/employee.controller.js";

import { authenticateToken } from "../middleware/auth.middleware.js";
import { authorizePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.use(authenticateToken);

router.post("/", authorizePermission("employees.manage"), createEmployee);
router.get("/", authorizePermission("employees.manage"), getEmployees);
router.put("/:employeeId", authorizePermission("employees.manage"), updateEmployee);

export default router;