const { getClient, query } = require('../config/db');
const InventoryEngine = require('../services/inventoryEngine');
const { ValidationError, NotFoundError, AppError } = require('../utils/errors');
const { sendSuccess } = require('../utils/response');

class AdjustmentController {
  static async list(req, res, next) {
    try {
      const sql = `
        SELECT 
          a.id,
          a.reference_no,
          a.product_id,
          p.name as product_name,
          p.sku,
          p.unit_of_measure,
          a.location_id,
          l.name as location_name,
          w.name as warehouse_name,
          a.system_quantity,
          a.counted_quantity,
          (a.counted_quantity - a.system_quantity) as difference,
          a.reason,
          a.status,
          a.created_by,
          u.name as created_by_name,
          a.created_at
        FROM adjustments a
        JOIN products p ON p.id = a.product_id
        JOIN locations l ON l.id = a.location_id
        JOIN warehouses w ON w.id = l.warehouse_id
        LEFT JOIN users u ON u.id = a.created_by
        ORDER BY a.created_at DESC
      `;
      const result = await query(sql);
      return sendSuccess(res, result.rows, 'Adjustments retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const sql = `
        SELECT 
          a.id,
          a.reference_no,
          a.product_id,
          p.name as product_name,
          p.sku,
          p.unit_of_measure,
          a.location_id,
          l.name as location_name,
          w.name as warehouse_name,
          a.system_quantity,
          a.counted_quantity,
          (a.counted_quantity - a.system_quantity) as difference,
          a.reason,
          a.status,
          a.created_by,
          u.name as created_by_name,
          a.created_at
        FROM adjustments a
        JOIN products p ON p.id = a.product_id
        JOIN locations l ON l.id = a.location_id
        JOIN warehouses w ON w.id = l.warehouse_id
        LEFT JOIN users u ON u.id = a.created_by
        WHERE a.id = $1
      `;
      const result = await query(sql, [id]);
      if (result.rows.length === 0) {
        throw new NotFoundError('Adjustment');
      }
      return sendSuccess(res, result.rows[0], 'Adjustment retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    const client = await getClient();
    try {
      const { product_id, location_id, counted_quantity, reason, auto_validate = true } = req.body;

      if (!product_id || !location_id) {
        throw new ValidationError('Product and location are required');
      }

      const counted = parseFloat(counted_quantity);
      if (isNaN(counted) || counted < 0) {
        throw new ValidationError('Counted quantity must be a non-negative number');
      }

      if (!reason || !reason.trim()) {
        throw new ValidationError('Reason is required for inventory adjustment');
      }

      await client.query('BEGIN');

      // Fetch current system quantity for this product at this location
      const stockRes = await client.query(
        `SELECT quantity FROM stocks WHERE product_id = $1 AND location_id = $2 FOR UPDATE`,
        [product_id, location_id]
      );
      const systemQuantity = stockRes.rows.length > 0 ? parseFloat(stockRes.rows[0].quantity) : 0.0;

      const refNo = `ADJ-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      const status = auto_validate ? 'done' : 'draft';

      const adjRes = await client.query(
        `INSERT INTO adjustments (
          reference_no, product_id, location_id, system_quantity, counted_quantity, reason, status, created_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [refNo, product_id, location_id, systemQuantity, counted, reason.trim(), status, req.user.id]
      );
      const adjustment = adjRes.rows[0];

      let stockUpdate = null;
      if (auto_validate) {
        stockUpdate = await InventoryEngine.setStock(
          client,
          product_id,
          location_id,
          counted,
          reason.trim(),
          req.user.id,
          'ADJUSTMENT',
          adjustment.id
        );
      }

      await client.query('COMMIT');
      return sendSuccess(res, {
        adjustment,
        stockUpdate,
      }, 'Adjustment created and applied', 201);
    } catch (err) {
      await client.query('ROLLBACK');
      next(err);
    } finally {
      client.release();
    }
  }

  static async validate(req, res, next) {
    const client = await getClient();
    try {
      const { id } = req.params;
      await client.query('BEGIN');

      const adjRes = await client.query(
        `SELECT * FROM adjustments WHERE id = $1 FOR UPDATE`,
        [id]
      );

      if (adjRes.rows.length === 0) {
        throw new NotFoundError('Adjustment');
      }

      const adjustment = adjRes.rows[0];
      if (adjustment.status === 'done') {
        throw new AppError('This adjustment is already validated', 400, 'ALREADY_VALIDATED');
      }

      const stockUpdate = await InventoryEngine.setStock(
        client,
        adjustment.product_id,
        adjustment.location_id,
        adjustment.counted_quantity,
        adjustment.reason,
        req.user.id,
        'ADJUSTMENT',
        adjustment.id
      );

      const updateRes = await client.query(
        `UPDATE adjustments SET status = 'done' WHERE id = $1 RETURNING *`,
        [id]
      );

      await client.query('COMMIT');
      return sendSuccess(res, {
        adjustment: updateRes.rows[0],
        stockUpdate,
      }, 'Adjustment validated and stock updated');
    } catch (err) {
      await client.query('ROLLBACK');
      next(err);
    } finally {
      client.release();
    }
  }
}

module.exports = AdjustmentController;
