
import { connectTenantDatabase } from "../services/tenantConnection.service.js";

// CREATE PRODUCT
export async function createProduct(req, res) {
  const {
    productName,
    sku,
    description,
    price,
    stockQuantity
  } = req.body;

  if (!productName || price === undefined || price === null) {
    return res.status(400).json({
      success: false,
      message: "Product name and price are required"
    });
  }

  if (!Number.isFinite(Number(price)) || Number(price) < 0) {
    return res.status(400).json({
      success: false,
      message: "Price must be a valid non-negative number"
    });
  }

  if (
    stockQuantity !== undefined &&
    (!Number.isInteger(Number(stockQuantity)) || Number(stockQuantity) < 0)
  ) {
    return res.status(400).json({
      success: false,
      message: "Stock quantity must be a non-negative integer"
    });
  }

  let client;

  try {
    client = await connectTenantDatabase(req.user.orgId);

    const result = await client.query(
      `INSERT INTO products
       (product_name, sku, description, price, stock_quantity)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        productName.trim(),
        sku?.trim() || null,
        description?.trim() || null,
        Number(price),
        stockQuantity === undefined ? 0 : Number(stockQuantity)
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: result.rows[0]
    });

  } catch (error) {
    console.error("Create product error:", error.message);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "SKU already exists"
      });
    }

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Could not create product"
    });

  } finally {
    if (client) await client.end().catch(() => {});
  }
}

// GET ALL PRODUCTS
export async function getProducts(req, res) {
  let client;

  try {
    client = await connectTenantDatabase(req.user.orgId);

    const result = await client.query(
      `SELECT *
       FROM products
       ORDER BY created_at DESC`
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      products: result.rows
    });

  } catch (error) {
    console.error("Get products error:", error.message);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Could not retrieve products"
    });

  } finally {
    if (client) await client.end().catch(() => {});
  }
}

// UPDATE PRODUCT
export async function updateProduct(req, res) {
  const { productId } = req.params;

  if (!/^[1-9]\d*$/.test(productId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID"
    });
  }

  const allowedFields = {
    productName: "product_name",
    sku: "sku",
    description: "description",
    price: "price",
    stockQuantity: "stock_quantity"
  };

  const updates = Object.entries(req.body)
    .filter(([key, value]) =>
      Object.hasOwn(allowedFields, key) && value !== undefined
    );

  if (updates.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Provide at least one valid field to update"
    });
  }

  for (const [key, value] of updates) {
    if (key === "productName" && (typeof value !== "string" || !value.trim())) {
      return res.status(400).json({
        success: false,
        message: "Product name cannot be empty"
      });
    }

    if (key === "price" && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
      return res.status(400).json({
        success: false,
        message: "Price must be non-negative"
      });
    }

    if (
      key === "stockQuantity" &&
      (!Number.isInteger(Number(value)) || Number(value) < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Stock quantity must be a non-negative integer"
      });
    }
  }

  let client;

  try {
    client = await connectTenantDatabase(req.user.orgId);

    const values = updates.map(([key, value]) => {
      if (key === "productName" || key === "sku" || key === "description") {
        return typeof value === "string" ? value.trim() || null : value;
      }

      return Number(value);
    });

    const setClause = updates
      .map(([key], index) => `${allowedFields[key]} = $${index + 1}`)
      .join(", ");

    values.push(productId);

    const result = await client.query(
      `UPDATE products
       SET ${setClause},
           updated_at = CURRENT_TIMESTAMP
       WHERE product_id = $${values.length}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: result.rows[0]
    });

  } catch (error) {
    console.error("Update product error:", error.message);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "SKU already exists"
      });
    }

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Could not update product"
    });

  } finally {
    if (client) await client.end().catch(() => {});
  }
}

// DELETE PRODUCT
export async function deleteProduct(req, res) {
  const { productId } = req.params;

  if (!/^[1-9]\d*$/.test(productId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID"
    });
  }

  let client;

  try {
    client = await connectTenantDatabase(req.user.orgId);

    const result = await client.query(
      `DELETE FROM products
       WHERE product_id = $1
       RETURNING product_id, product_name`,
      [productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
      product: result.rows[0]
    });

  } catch (error) {
    console.error("Delete product error:", error.message);

    if (error.code === "23503") {
      return res.status(409).json({
        success: false,
        message: "This product is linked to existing orders and cannot be deleted"
      });
    }

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Could not delete product"
    });

  } finally {
    if (client) await client.end().catch(() => {});
  }
}

// PUBLISH PRODUCT
export async function publishProduct(req, res) {
  const { productId } = req.params;

  if (!/^[1-9]\d*$/.test(productId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID"
    });
  }

  let client;

  try {
    client = await connectTenantDatabase(req.user.orgId);

    const result = await client.query(
      `UPDATE products
       SET product_status = 'PUBLISHED',
           updated_at = CURRENT_TIMESTAMP
       WHERE product_id = $1
       RETURNING *`,
      [productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product published successfully",
      product: result.rows[0]
    });

  } catch (error) {
    console.error("Publish product error:", error.message);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Could not publish product"
    });

  } finally {
    if (client) await client.end().catch(() => {});
  }
}