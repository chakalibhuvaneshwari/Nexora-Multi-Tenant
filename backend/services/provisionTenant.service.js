
import { createTenantDatabase } from "./tenantDatabase.service.js";
import { initializeTenantDatabase } from "./initializeTenantDatabase.service.js";
import neonApi from "../config/neon.js";

export async function provisionTenant(orgId, owner) {
  let databaseName = null;

  try {
    console.log(`Starting provisioning for ${orgId}`);

    // 1. Create a separate database in Neon
    const database = await createTenantDatabase(orgId);

    databaseName = database.name;

    console.log("Tenant database created:", databaseName);

    // 2. Create tables and the first Super Admin
    await initializeTenantDatabase(databaseName, {
      ...owner,
      orgId
    });

    console.log(`Tenant ${orgId} provisioned successfully`);

    return {
      success: true,
      orgId,
      databaseName
    };

  } catch (error) {
    console.error("Tenant provisioning failed:", error.message);

    // 3. Remove an incomplete tenant database if one was created
    if (databaseName) {
      try {
        await neonApi.delete(
          `/projects/${process.env.NEON_PROJECT_ID}/branches/${process.env.NEON_BRANCH_ID}/databases/${encodeURIComponent(databaseName)}`
        );

        console.log("Incomplete tenant database deletion requested.");

      } catch (cleanupError) {
        console.error(
          "Tenant database cleanup failed:",
          cleanupError.response?.data || cleanupError.message
        );
      }
    }

    throw error;
  }
}
