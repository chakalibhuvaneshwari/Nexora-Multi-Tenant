
import dotenv from "dotenv";
import neonApi from "./config/neon.js";

dotenv.config();

async function checkDatabaseRoles() {
  try {
    const response = await neonApi.get(
      `/projects/${process.env.NEON_PROJECT_ID}/branches/${process.env.NEON_BRANCH_ID}/roles`
    );

    console.log("Neon database roles:");

    response.data.roles.forEach((role) => {
      console.log("-", role.name);
    });

  } catch (error) {
    console.error(
      "Failed to fetch roles:",
      error.response?.data?.message || error.message
    );
  }
}

checkDatabaseRoles();
