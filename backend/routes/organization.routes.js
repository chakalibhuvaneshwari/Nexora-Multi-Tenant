
import express from "express";
import { registerOrganization } from "../controllers/organization.controller.js";

const router = express.Router();

// Organization signup
router.post("/signup", registerOrganization);

export default router;
