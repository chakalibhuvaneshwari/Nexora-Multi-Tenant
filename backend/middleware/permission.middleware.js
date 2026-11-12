
import { Client } from "pg";
import pool from "../config/db.js";

export function authorizePermission(permissionName) {
  return async (req, res, next) => {
    let tenantClient;

    try {
      // 1. Get organization and user details from verified JWT
      const { orgId, userId, role } = req.user;

      // 2. Find the tenant database in master_db
      const orgResult = await pool.query(
        `SELECT tenant_database_name
         FROM organizations
         WHERE org_id = $1
           AND status = 'ACTIVE'`,
        [orgId]
      );

      if (orgResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: "Organization is not active"
        });
      }

      const databaseName =
        orgResult.rows[0].tenant_database_name;

      // 3. Connect to the correct tenant database
      const connectionUrl = new URL(process.env.DATABASE_URL);
      connectionUrl.pathname = `/${databaseName}`;

      tenantClient = new Client({
        connectionString: connectionUrl.toString(),
        ssl: {
          rejectUnauthorized: false
        }
      });

      await tenantClient.connect();

      // 4. Check the user's permission in tenant database
      const permissionResult = await tenantClient.query(
        `SELECT p.permission_name
         FROM users u
         JOIN roles r
           ON u.role_id = r.role_id
         JOIN role_permissions rp
           ON r.role_id = rp.role_id
         JOIN permissions p
           ON rp.permission_id = p.permission_id
         WHERE u.user_id = $1
           AND r.role_name = $2
           AND p.permission_name = $3`,
        [userId, role, permissionName]
      );

      // 5. Deny access if permission is not assigned
      if (permissionResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: "You do not have this permission",
          requiredPermission: permissionName
        });
      }

      // 6. Permission exists; allow the request
      next();

    } catch (error) {
      console.error("Permission check failed:", error.message);

      return res.status(500).json({
        success: false,
        message: "Permission verification failed"
      });

    } finally {
      if (tenantClient) {
        await tenantClient.end().catch(() => {});
      }
    }
  };
}
