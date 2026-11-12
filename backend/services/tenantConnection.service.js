
import { Client } from "pg";
import pool from "../config/db.js";

export async function connectTenantDatabase(orgId) {
  // Find the organization's tenant database
  const result = await pool.query(
    `SELECT tenant_database_name
     FROM organizations
     WHERE org_id = $1
       AND status = 'ACTIVE'`,
    [orgId]
  );

  if (result.rows.length === 0) {
    const error = new Error("Organization not found or inactive");
    error.statusCode = 403;
    throw error;
  }

  const databaseName = result.rows[0].tenant_database_name;

  // Build the connection URL for this tenant
  const connectionUrl = new URL(process.env.DATABASE_URL);
  connectionUrl.pathname = `/${databaseName}`;

  const tenantClient = new Client({
    connectionString: connectionUrl.toString(),
    ssl: {
      rejectUnauthorized: false
    }
  });

  await tenantClient.connect();

  return tenantClient;
}
