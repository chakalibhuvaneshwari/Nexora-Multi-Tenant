
import neonApi from "../config/neon.js";

export async function createTenantDatabase(orgId) {
  // Validate the organization ID
  if (!/^[a-zA-Z0-9]{1,50}$/.test(orgId)) {
    throw new Error("Invalid organization ID");
  }

  // Generate a unique database name
const normalizedOrgId = orgId.trim().toUpperCase();
const databaseName = `tenant_${normalizedOrgId.toLowerCase()}`;

  try {
    const response = await neonApi.post(
      `/projects/${process.env.NEON_PROJECT_ID}/branches/${process.env.NEON_BRANCH_ID}/databases`,
      {
        database: {
          name: databaseName,
          owner_name: "neondb_owner"
        }
      }
    );

    return response.data.database;

  } catch (error) {
    console.error(
      "Tenant database creation failed:",
      error.response?.data || error.message
    );

    throw new Error("Could not create tenant database");
  }
}
