const { getClient, query } = require('../config/db');
const InventoryEngine = require('../services/inventoryEngine');
const OperationStateMachine = require('../domain/stateMachine');
const DecimalUtil = require('../utils/decimal');
const { ValidationError, NotFoundError, AppError } = require('../utils/errors');
const { sendSuccess } = require('../utils/response');

class AdjustmentController {
  static async list(req, res, next) {
    try {
      const { status, page = 1, limit = 50 } = req.query;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
      const offset = (pageNum - 1) * limitNum;

      let whereSql = 'WHERE 1=1';
      const params = [];
      if (status) {
        params.push(status.toLowerCase());
        whereSql += ` AND a.status = $${params.length}`;
      }

      const countRes = await query(`SELECT COUNT(*) as total FROM adjustments a ${whereSql}`, params);
      const total = parseInt(countRes.rows[0]?.total || 0, 10);

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
        ${whereSql}
        ORDER BY a.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;

      const result = await query(sql, [...params, limitNum, offset]);
      const items = result.rows.map(r => ({
        ...r,
        system_quantity: DecimalUtil.parseQuantity(r.system_quantity),
        counted_quantity: DecimalUtil.parseQuantity(r.counted_quantity),
        difference: DecimalUtil.parseQuantity(r.difference),
      }));

      return res.status(200).json({
        success: true,
        message: 'Adjustments retrieved',
        data: items,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      });
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

      const r = result.rows[0];
      return sendSuccess(res, {
        ...r,
        system_quantity: DecimalUtil.parseQuantity(r.system_quantity),
        counted_quantity: DecimalUtil.parseQuantity(r.counted_quantity),
        difference: DecimalUtil.parseQuantity(r.difference),
      }, 'Adjustment retrieved');
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

      const counted = DecimalUtil.parseQuantity(counted_quantity);
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
      const systemQuantity = stockRes.rows.length > 0 ? DecimalUtil.parseQuantity(stockRes.rows[0].quantity) : 0.0;

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

  static async cancel(req, res, next) {
    const client = await getClient();
    try {
      const { id } = req.params;
      await client.query('BEGIN');

      const adjRes = await client.query(`SELECT * FROM adjustments WHERE id = $1 FOR UPDATE`, [id]);
      if (adjRes.rows.length === 0) throw new NotFoundError('Adjustment');

      const adjustment = adjRes.rows[0];
      OperationStateMachine.assertTransition(adjustment.status, 'canceled', 'Adjustment');

      const updateRes = await client.query(
        `UPDATE adjustments SET status = 'canceled' WHERE id = $1 RETURNING *`,
        [id]
      );

      await client.query('COMMIT');
      return sendSuccess(res, updateRes.rows[0], 'Adjustment canceled successfully');
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

      // Enforce State Machine transition
      OperationStateMachine.assertTransition(adjustment.status, 'done', 'Adjustment');

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
