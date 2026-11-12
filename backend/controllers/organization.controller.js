
import bcrypt from "bcrypt";
import pool from "../config/db.js";
import neonApi from "../config/neon.js";
import { provisionTenant } from "../services/provisionTenant.service.js";

export async function registerOrganization(req, res) {
  const {
    orgId,
    orgName,
    fullName,
    email,
    password,
    confirmPassword,
    country
  } = req.body;

  // 1. Validate required fields
  if (
    !orgId || !orgName || !fullName ||
    !email || !password || !confirmPassword || !country
  ) {
    return res.status(400).json({
      success: false,
      message: "All fields are required"
    });
  }

  // 2. Validate organization ID
  if (!/^[A-Za-z0-9]{1,50}$/.test(orgId.trim())) {
    return res.status(400).json({
      success: false,
      message: "Organization ID must contain only letters and numbers"
    });
  }

  // 3. Validate email
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({
      success: false,
      message: "Please enter a valid email address"
    });
  }

  // 4. Validate password
  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must contain at least 8 characters"
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "Passwords do not match"
    });
  }

  const normalizedOrgId = orgId.trim().toUpperCase();
  const normalizedEmail = email.trim().toLowerCase();

  let organizationInserted = false;
  let databaseName = null;

  try {
    // 5. Hash the password
    const passwordHash = await bcrypt.hash(password, 12);

    // 6. Save organization and owner in master database
    const masterClient = await pool.connect();

    try {
      await masterClient.query("BEGIN");

      await masterClient.query(
        `INSERT INTO organizations
         (org_id, org_name, email, country, status)
         VALUES ($1, $2, $3, $4, 'PROVISIONING')`,
        [
          normalizedOrgId,
          orgName.trim(),
          normalizedEmail,
          country.trim()
        ]
      );

      await masterClient.query(
        `INSERT INTO master_users
         (org_id, full_name, email, password_hash, role)
         VALUES ($1, $2, $3, $4, 'SUPER_ADMIN')`,
        [
          normalizedOrgId,
          fullName.trim(),
          normalizedEmail,
          passwordHash
        ]
      );

      await masterClient.query("COMMIT");
      organizationInserted = true;

    } catch (error) {
      await masterClient.query("ROLLBACK");
      throw error;

    } finally {
      masterClient.release();
    }

    // 7. Create and initialize the separate tenant database
    const provisioningResult = await provisionTenant(
      normalizedOrgId,
      {
        fullName: fullName.trim(),
        email: normalizedEmail,
        passwordHash
      }
    );

    databaseName = provisioningResult.databaseName;

    // 8. Activate organization and create trial subscription
    const activationClient = await pool.connect();

    try {
      await activationClient.query("BEGIN");

      await activationClient.query(
        `INSERT INTO subscriptions (org_id)
         VALUES ($1)`,
        [normalizedOrgId]
      );

      await activationClient.query(
        `UPDATE organizations
         SET tenant_database_name = $1,
             status = 'ACTIVE',
             updated_at = CURRENT_TIMESTAMP
         WHERE org_id = $2`,
        [databaseName, normalizedOrgId]
      );

      await activationClient.query("COMMIT");

    } catch (error) {
      await activationClient.query("ROLLBACK");
      throw error;

    } finally {
      activationClient.release();
    }

    // 9. Return success response
    return res.status(201).json({
      success: true,
      message: "Organization registered successfully",
      organization: {
        orgId: normalizedOrgId,
        orgName: orgName.trim(),
        databaseName,
        role: "SUPER_ADMIN",
        trialDays: 14
      }
    });

  } catch (error) {
    console.error("Organization signup failed:", error.message);

    // 10. Clean up tenant database if activation failed
    if (databaseName) {
      try {
        await neonApi.delete(
          `/projects/${process.env.NEON_PROJECT_ID}/branches/${process.env.NEON_BRANCH_ID}/databases/${encodeURIComponent(databaseName)}`
        );

        console.log("Incomplete tenant database deleted.");

      } catch (cleanupError) {
        console.error(
          "Tenant cleanup failed:",
          cleanupError.response?.data || cleanupError.message
        );
      }
    }

    // 11. Mark organization as failed
    if (organizationInserted) {
      await pool.query(
        `UPDATE organizations
         SET status = 'FAILED',
             updated_at = CURRENT_TIMESTAMP
         WHERE org_id = $1`,
        [normalizedOrgId]
      ).catch((updateError) => {
        console.error("Status update failed:", updateError.message);
      });
    }

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Organization ID is already registered"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Organization registration failed"
    });
  }
}
