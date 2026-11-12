
import { Client } from "pg";
import { tenantSchema } from "../database/tenantSchema.js";

export async function initializeTenantDatabase(databaseName, owner) {
  const connectionUrl = new URL(process.env.DATABASE_URL);

  // Connect to the newly created tenant database
  connectionUrl.pathname = `/${databaseName}`;

  const client = new Client({
    connectionString: connectionUrl.toString(),
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();

    console.log(`Connected to ${databaseName}`);

    await client.query("BEGIN");

    // Create tenant tables, default roles and permissions
    await client.query(tenantSchema);

    // Create the first employee (organization owner)
    const employeeResult = await client.query(
      `INSERT INTO employees
       (employee_code, full_name, email, designation)
       VALUES ($1, $2, $3, $4)
       RETURNING employee_id`,
      [
        `OWNER-${owner.orgId}`,
        owner.fullName,
        owner.email,
        "Super Admin"
      ]
    );

    const employeeId = employeeResult.rows[0].employee_id;

    // Find the Super Admin role
    const roleResult = await client.query(
      `SELECT role_id
       FROM roles
       WHERE role_name = 'SUPER_ADMIN'`
    );

    if (roleResult.rows.length === 0) {
      throw new Error("SUPER_ADMIN role was not created");
    }

    // Create the owner's login account
    await client.query(
      `INSERT INTO users
       (employee_id, role_id, email, password_hash)
       VALUES ($1, $2, $3, $4)`,
      [
        employeeId,
        roleResult.rows[0].role_id,
        owner.email,
        owner.passwordHash
      ]
    );

    await client.query("COMMIT");

    console.log(`Tenant tables and Super Admin created in ${databaseName}`);

    return true;

  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});

    console.error("Tenant initialization failed:", error.message);

    throw error;

  } finally {
    await client.end();
  }
}
