
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Client } from "pg";
import pool from "../config/db.js";

export async function login(req, res) {
  const { orgId, email, password } = req.body;

  // 1. Validate required fields
  if (!orgId || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "Organization ID, email and password are required"
    });
  }

  const normalizedOrgId = orgId.trim().toUpperCase();
  const normalizedEmail = email.trim().toLowerCase();

  let tenantClient;

  try {
    // 2. Find organization in master database
    const orgResult = await pool.query(
      `SELECT org_id, tenant_database_name, status
       FROM organizations
       WHERE org_id = $1`,
      [normalizedOrgId]
    );

    if (orgResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Organization not found"
      });
    }

    const organization = orgResult.rows[0];

    // 3. Check organization status
    if (
      organization.status !== "ACTIVE" ||
      !organization.tenant_database_name
    ) {
      return res.status(403).json({
        success: false,
        message: "Organization is not active"
      });
    }

    // 4. Connect to the organization's tenant database
    const connectionUrl = new URL(process.env.DATABASE_URL);
    connectionUrl.pathname =
      `/${organization.tenant_database_name}`;

    tenantClient = new Client({
      connectionString: connectionUrl.toString(),
      ssl: {
        rejectUnauthorized: false
      }
    });

    await tenantClient.connect();

    // 5. Find the user and their role
    const userResult = await tenantClient.query(
      `SELECT
          u.user_id,
          u.email,
          u.password_hash,
          e.full_name,
          r.role_name
       FROM users u
       JOIN employees e
         ON u.employee_id = e.employee_id
       JOIN roles r
         ON u.role_id = r.role_id
       WHERE LOWER(u.email) = $1`,
      [normalizedEmail]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const user = userResult.rows[0];

    // 6. Verify password
    const passwordMatch = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // 7. Check JWT configuration
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing in environment variables");
    }

    // 8. Generate JWT token
    const token = jwt.sign(
      {
        userId: user.user_id,
        orgId: normalizedOrgId,
        role: user.role_name
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d"
      }
    );

    // 9. Return successful login response
    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        userId: user.user_id,
        orgId: normalizedOrgId,
        fullName: user.full_name,
        email: user.email,
        role: user.role_name
      }
    });

  } catch (error) {
    console.error("Login failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Login failed"
    });

  } finally {
    if (tenantClient) {
      await tenantClient.end().catch(() => {});
    }
  }
}
