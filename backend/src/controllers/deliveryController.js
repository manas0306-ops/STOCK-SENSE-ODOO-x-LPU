const { getClient, query } = require('../config/db');
const InventoryEngine = require('../services/inventoryEngine');
const { ValidationError, NotFoundError, AppError } = require('../utils/errors');
const { sendSuccess } = require('../utils/response');

class DeliveryController {
  static async list(req, res, next) {
    try {
      const { status } = req.query;
      let sql = `
        SELECT 
          d.id,
          d.reference_no,
          d.customer_id,
          c.name as customer_name,
          d.source_location_id,
          l.name as source_location_name,
          w.name as warehouse_name,
          d.status,
          d.created_by,
          u.name as created_by_name,
          d.validated_at,
          d.created_at,
          COUNT(di.id) as item_count,
          COALESCE(SUM(di.quantity), 0) as total_quantity
        FROM deliveries d
        LEFT JOIN customers c ON c.id = d.customer_id
        JOIN locations l ON l.id = d.source_location_id
        JOIN warehouses w ON w.id = l.warehouse_id
        LEFT JOIN users u ON u.id = d.created_by
        LEFT JOIN delivery_items di ON di.delivery_id = d.id
        WHERE 1=1
      `;
      const params = [];
      if (status) {
        params.push(status);
        sql += ` AND d.status = $${params.length}`;
      }

      sql += ` GROUP BY d.id, d.reference_no, d.customer_id, c.name, d.source_location_id, l.name, w.name, d.status, d.created_by, u.name, d.validated_at, d.created_at
               ORDER BY d.created_at DESC`;

      const result = await query(sql, params);
      return sendSuccess(res, result.rows, 'Deliveries retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const { id } = req.params;

      const delRes = await query(
        `SELECT 
          d.id,
          d.reference_no,
          d.customer_id,
          c.name as customer_name,
          d.source_location_id,
          l.name as source_location_name,
          w.name as warehouse_name,
          d.status,
          d.created_by,
          u.name as created_by_name,
          d.validated_at,
          d.created_at,
          d.updated_at
        FROM deliveries d
        LEFT JOIN customers c ON c.id = d.customer_id
        JOIN locations l ON l.id = d.source_location_id
        JOIN warehouses w ON w.id = l.warehouse_id
        LEFT JOIN users u ON u.id = d.created_by
        WHERE d.id = $1`,
        [id]
      );

      if (delRes.rows.length === 0) {
        throw new NotFoundError('Delivery Order');
      }

      const delivery = delRes.rows[0];

      // Fetch items along with current available stock at source location
      const itemsRes = await query(
        `SELECT 
          di.id,
          di.product_id,
          p.name as product_name,
          p.sku,
          p.unit_of_measure,
          di.quantity,
          COALESCE(s.quantity, 0) as current_available_stock
        FROM delivery_items di
        JOIN products p ON p.id = di.product_id
        LEFT JOIN stocks s ON s.product_id = di.product_id AND s.location_id = $2
        WHERE di.delivery_id = $1
        ORDER BY di.id ASC`,
        [id, delivery.source_location_id]
      );

      return sendSuccess(res, {
        ...delivery,
        items: itemsRes.rows,
      }, 'Delivery details retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    const client = await getClient();
    try {
      const { customer_id, source_location_id, items, status = 'draft' } = req.body;

      if (!source_location_id) {
        throw new ValidationError('Source location is required');
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new ValidationError('At least one delivery item is required');
      }

      for (const itm of items) {
        if (!itm.product_id || !itm.quantity || parseFloat(itm.quantity) <= 0) {
          throw new ValidationError('Each item must have a valid product and positive quantity');
        }
      }

      await client.query('BEGIN');

      const refNo = `DEL-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      const initialStatus = ['draft', 'ready'].includes(status) ? status : 'draft';

      const delRes = await client.query(
        `INSERT INTO deliveries (reference_no, customer_id, source_location_id, status, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [refNo, customer_id || null, source_location_id, initialStatus, req.user.id]
      );
      const delivery = delRes.rows[0];

      for (const itm of items) {
        await client.query(
          `INSERT INTO delivery_items (delivery_id, product_id, quantity)
           VALUES ($1, $2, $3)`,
          [delivery.id, itm.product_id, parseFloat(itm.quantity)]
        );
      }

      await client.query('COMMIT');
      return sendSuccess(res, delivery, 'Delivery order created successfully', 201);
    } catch (err) {
      await client.query('ROLLBACK');
      next(err);
    } finally {
      client.release();
    }
  }

  static async markReady(req, res, next) {
    try {
      const { id } = req.params;
      const resCheck = await query(`SELECT status FROM deliveries WHERE id = $1`, [id]);
      if (resCheck.rows.length === 0) throw new NotFoundError('Delivery Order');
      if (resCheck.rows[0].status === 'done') {
        throw new AppError('Delivery order is already validated', 400, 'ALREADY_VALIDATED');
      }

      const updateRes = await query(
        `UPDATE deliveries SET status = 'ready', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        [id]
      );
      return sendSuccess(res, updateRes.rows[0], 'Delivery marked as ready');
    } catch (err) {
      next(err);
    }
  }

  static async validate(req, res, next) {
    const client = await getClient();
    try {
      const { id } = req.params;
      await client.query('BEGIN');

      // Lock delivery for update (prevents double validation)
      const delRes = await client.query(
        `SELECT * FROM deliveries WHERE id = $1 FOR UPDATE`,
        [id]
      );

      if (delRes.rows.length === 0) {
        throw new NotFoundError('Delivery Order');
      }

      const delivery = delRes.rows[0];

      // Strict Idempotency Check
      if (delivery.status === 'done') {
        throw new AppError('This delivery has already been validated and cannot be applied again', 400, 'ALREADY_VALIDATED');
      }

      const itemsRes = await client.query(
        `SELECT * FROM delivery_items WHERE delivery_id = $1`,
        [id]
      );

      if (itemsRes.rows.length === 0) {
        throw new ValidationError('Cannot validate a delivery order with no items');
      }

      const stockResults = [];
      for (const item of itemsRes.rows) {
        const updateResult = await InventoryEngine.decreaseStock(
          client,
          item.product_id,
          delivery.source_location_id,
          item.quantity,
          req.user.id,
          'DELIVERY',
          delivery.id
        );
        stockResults.push(updateResult);
      }

      // Update delivery to done
      const updatedDel = await client.query(
        `UPDATE deliveries
         SET status = 'done', validated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [id]
      );

      await client.query('COMMIT');
      return sendSuccess(res, {
        delivery: updatedDel.rows[0],
        stockUpdates: stockResults,
      }, 'Delivery validated and stock decreased successfully');
    } catch (err) {
      await client.query('ROLLBACK');
      next(err);
    } finally {
      client.release();
    }
  }
}

module.exports = DeliveryController;
