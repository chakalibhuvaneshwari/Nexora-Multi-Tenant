
import { connectTenantDatabase } from "../services/tenantConnection.service.js";

// VIEW ALL ORDERS
export async function getOrders(req, res) {
  let client;

  try {
    client = await connectTenantDatabase(req.user.orgId);

    const result = await client.query(
      `SELECT
         o.order_id,
         o.order_number,
         o.customer_id,
         c.full_name AS customer_name,
         c.email AS customer_email,
         o.order_status,
         o.total_amount,
         o.created_at,
         o.updated_at,
         COUNT(oi.order_item_id)::INTEGER AS item_count
       FROM order_history o
       LEFT JOIN customers c ON o.customer_id = c.customer_id
       LEFT JOIN order_items oi ON o.order_id = oi.order_id
       GROUP BY o.order_id, c.full_name, c.email
       ORDER BY o.created_at DESC`
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      orders: result.rows
    });

  } catch (error) {
    console.error("Get orders error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not retrieve orders"
    });

  } finally {
    if (client) await client.end().catch(() => {});
  }
}

// VIEW ONE ORDER WITH ITEMS
export async function getOrderById(req, res) {
  const { orderId } = req.params;

  if (!/^[1-9]\d*$/.test(orderId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid order ID"
    });
  }

  let client;

  try {
    client = await connectTenantDatabase(req.user.orgId);

    const orderResult = await client.query(
      `SELECT o.*, c.full_name AS customer_name, c.email AS customer_email
       FROM order_history o
       LEFT JOIN customers c ON o.customer_id = c.customer_id
       WHERE o.order_id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    const itemsResult = await client.query(
      `SELECT
         oi.order_item_id,
         oi.product_id,
         p.product_name,
         oi.quantity,
         oi.unit_price,
         oi.subtotal
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.product_id
       WHERE oi.order_id = $1`,
      [orderId]
    );

    return res.status(200).json({
      success: true,
      order: orderResult.rows[0],
      items: itemsResult.rows
    });

  } catch (error) {
    console.error("Get order error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not retrieve order"
    });

  } finally {
    if (client) await client.end().catch(() => {});
  }
}

// UPDATE ORDER STATUS
export async function updateOrderStatus(req, res) {
  const { orderId } = req.params;
  const { orderStatus } = req.body || {};

  const allowedStatuses = [
    "PLACED",
    "PROCESSED",
    "READY_TO_SHIP",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED"
  ];

  if (!/^[1-9]\d*$/.test(orderId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid order ID"
    });
  }

  if (!allowedStatuses.includes(orderStatus)) {
    return res.status(400).json({
      success: false,
      message: "Invalid order status"
    });
  }

  let client;

  try {
    client = await connectTenantDatabase(req.user.orgId);

    const result = await client.query(
      `UPDATE order_history
       SET order_status = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE order_id = $2
       RETURNING *`,
      [orderStatus, orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order: result.rows[0]
    });

  } catch (error) {
    console.error("Update order error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not update order status"
    });

  } finally {
    if (client) await client.end().catch(() => {});
  }
}