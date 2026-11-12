
import bcrypt from "bcrypt";
import { connectTenantDatabase } from "../services/tenantConnection.service.js";

// ADD EMPLOYEE
export async function createEmployee(req, res) {
  const {
    employeeCode,
    fullName,
    email,
    password,
    phone,
    department,
    designation,
    roleName
  } = req.body || {};

  if (!employeeCode || !fullName || !email || !password || !roleName) {
    return res.status(400).json({
      success: false,
      message: "Employee code, name, email, password and role are required"
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must contain at least 8 characters"
    });
  }

  let client;

  try {
    client = await connectTenantDatabase(req.user.orgId);
    await client.query("BEGIN");

    const roleResult = await client.query(
      "SELECT role_id FROM roles WHERE role_name = $1",
      [roleName.trim().toUpperCase()]
    );

    if (roleResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Invalid role name"
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const employeeResult = await client.query(
      `INSERT INTO employees
       (employee_code, full_name, email, phone, department, designation)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        employeeCode.trim(),
        fullName.trim(),
        email.trim().toLowerCase(),
        phone || null,
        department || null,
        designation || null
      ]
    );

    const employee = employeeResult.rows[0];

    await client.query(
      `INSERT INTO users
       (employee_id, role_id, email, password_hash)
       VALUES ($1, $2, $3, $4)`,
      [
        employee.employee_id,
        roleResult.rows[0].role_id,
        employee.email,
        passwordHash
      ]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Employee created successfully",
      employee: {
        ...employee,
        role: roleName.trim().toUpperCase()
      }
    });

  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});

    console.error("Create employee error:", error.message);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Employee code or email already exists"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Could not create employee"
    });

  } finally {
    if (client) await client.end().catch(() => {});
  }
}

// VIEW EMPLOYEES
export async function getEmployees(req, res) {
  let client;

  try {
    client = await connectTenantDatabase(req.user.orgId);

    const result = await client.query(
      `SELECT
         e.employee_id,
         e.employee_code,
         e.full_name,
         e.email,
         e.phone,
         e.department,
         e.designation,
         e.employment_status,
         e.created_at,
         r.role_name,
         u.is_active AS user_active
       FROM employees e
       LEFT JOIN users u ON e.employee_id = u.employee_id
       LEFT JOIN roles r ON u.role_id = r.role_id
       ORDER BY e.employee_id`
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      employees: result.rows
    });

  } catch (error) {
    console.error("Get employees error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not retrieve employees"
    });

  } finally {
    if (client) await client.end().catch(() => {});
  }
}

// UPDATE EMPLOYEE
export async function updateEmployee(req, res) {
  const { employeeId } = req.params;

  if (!/^[1-9]\d*$/.test(employeeId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid employee ID"
    });
  }

  const allowedFields = {
    fullName: "full_name",
    phone: "phone",
    department: "department",
    designation: "designation",
    employmentStatus: "employment_status"
  };

  const updates = Object.entries(req.body || {}).filter(
    ([key, value]) => Object.hasOwn(allowedFields, key) && value !== undefined
  );

  if (updates.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Provide at least one valid field to update"
    });
  }

  for (const [key, value] of updates) {
    if (key === "fullName" && (!value || !value.trim())) {
      return res.status(400).json({
        success: false,
        message: "Full name cannot be empty"
      });
    }

    if (
      key === "employmentStatus" &&
      !["ACTIVE", "INACTIVE"].includes(value)
    ) {
      return res.status(400).json({
        success: false,
        message: "Employment status must be ACTIVE or INACTIVE"
      });
    }
  }

  let client;

  try {
    client = await connectTenantDatabase(req.user.orgId);
    await client.query("BEGIN");

    const values = updates.map(([key, value]) =>
      key === "fullName" ? value.trim() : value
    );

    const setClause = updates
      .map(([key], index) => `${allowedFields[key]} = $${index + 1}`)
      .join(", ");

    values.push(employeeId);

    const result = await client.query(
      `UPDATE employees
       SET ${setClause}
       WHERE employee_id = $${values.length}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    const statusUpdate = updates.find(
      ([key]) => key === "employmentStatus"
    );

    if (statusUpdate) {
      await client.query(
        `UPDATE users
         SET is_active = $1
         WHERE employee_id = $2`,
        [statusUpdate[1] === "ACTIVE", employeeId]
      );
    }

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      employee: result.rows[0]
    });

  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});

    console.error("Update employee error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not update employee"
    });

  } finally {
    if (client) await client.end().catch(() => {});
  }
}