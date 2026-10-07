const { getClient, query } = require('../config/db');
const InventoryEngine = require('../services/inventoryEngine');
const OperationStateMachine = require('../domain/stateMachine');
const DecimalUtil = require('../utils/decimal');
const { ValidationError, NotFoundError, AppError } = require('../utils/errors');
const { sendSuccess } = require('../utils/response');

class ReceiptController {
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
        whereSql += ` AND r.status = $${params.length}`;
      }

      const countRes = await query(`SELECT COUNT(*) as total FROM receipts r ${whereSql}`, params);
      const total = parseInt(countRes.rows[0]?.total || 0, 10);

      const sql = `
        SELECT 
          r.id,
          r.reference_no,
          r.supplier_id,
          s.name as supplier_name,
          r.destination_location_id,
          l.name as destination_location_name,
          w.name as warehouse_name,
          r.status,
          r.created_by,
          u.name as created_by_name,
          r.validated_at,
          r.created_at,
          COUNT(ri.id) as item_count,
          COALESCE(SUM(ri.quantity), 0) as total_quantity
        FROM receipts r
        LEFT JOIN suppliers s ON s.id = r.supplier_id
        JOIN locations l ON l.id = r.destination_location_id
        JOIN warehouses w ON w.id = l.warehouse_id
        LEFT JOIN users u ON u.id = r.created_by
        LEFT JOIN receipt_items ri ON ri.receipt_id = r.id
        ${whereSql}
        GROUP BY r.id, r.reference_no, r.supplier_id, s.name, r.destination_location_id, l.name, w.name, r.status, r.created_by, u.name, r.validated_at, r.created_at
        ORDER BY r.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;

      const result = await query(sql, [...params, limitNum, offset]);
      const items = result.rows.map(r => ({
        ...r,
        total_quantity: DecimalUtil.parseQuantity(r.total_quantity),
      }));

      // Backward compatible response (frontend array access) with pagination metadata
      return res.status(200).json({
        success: true,
        message: 'Receipts retrieved',
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

      const receiptRes = await query(
        `SELECT 
          r.id,
          r.reference_no,
          r.supplier_id,
          s.name as supplier_name,
          r.destination_location_id,
          l.name as destination_location_name,
          w.name as warehouse_name,
          r.status,
          r.created_by,
          u.name as created_by_name,
          r.validated_at,
          r.created_at,
          r.updated_at
        FROM receipts r
        LEFT JOIN suppliers s ON s.id = r.supplier_id
        JOIN locations l ON l.id = r.destination_location_id
        JOIN warehouses w ON w.id = l.warehouse_id
        LEFT JOIN users u ON u.id = r.created_by
        WHERE r.id = $1`,
        [id]
      );

      if (receiptRes.rows.length === 0) {
        throw new NotFoundError('Receipt');
      }

      const itemsRes = await query(
        `SELECT 
          ri.id,
          ri.product_id,
          p.name as product_name,
          p.sku,
          p.unit_of_measure,
          ri.quantity
        FROM receipt_items ri
        JOIN products p ON p.id = ri.product_id
        WHERE ri.receipt_id = $1
        ORDER BY ri.id ASC`,
        [id]
      );

      return sendSuccess(res, {
        ...receiptRes.rows[0],
        items: itemsRes.rows.map(i => ({ ...i, quantity: DecimalUtil.parseQuantity(i.quantity) })),
      }, 'Receipt details retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    const client = await getClient();
    try {
      const { supplier_id, destination_location_id, items, status = 'draft' } = req.body;

      if (!destination_location_id) {
        throw new ValidationError('Destination location is required');
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new ValidationError('At least one receipt item is required');
      }

      for (const itm of items) {
        const qty = DecimalUtil.parseQuantity(itm.quantity);
        if (!itm.product_id || isNaN(qty) || qty <= 0) {
          throw new ValidationError('Each item must have a valid product and positive quantity');
        }
      }

      await client.query('BEGIN');

      const refNo = `REC-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      const initialStatus = status === 'ready' ? 'ready' : 'draft';

      const recRes = await client.query(
        `INSERT INTO receipts (reference_no, supplier_id, destination_location_id, status, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [refNo, supplier_id || null, destination_location_id, initialStatus, req.user.id]
      );
      const receipt = recRes.rows[0];

      // Deterministic order for item insertion
      const sortedItems = InventoryEngine.sortItems(items);
      for (const itm of sortedItems) {
        await client.query(
          `INSERT INTO receipt_items (receipt_id, product_id, quantity)
           VALUES ($1, $2, $3)`,
          [receipt.id, itm.product_id, DecimalUtil.parseQuantity(itm.quantity)]
        );
      }

      await client.query('COMMIT');
      return sendSuccess(res, receipt, 'Receipt created successfully', 201);
    } catch (err) {
      await client.query('ROLLBACK');
      next(err);
    } finally {
      client.release();
    }
  }

  static async markReady(req, res, next) {
    const client = await getClient();
    try {
      const { id } = req.params;
      await client.query('BEGIN');

      const resCheck = await client.query(`SELECT status FROM receipts WHERE id = $1 FOR UPDATE`, [id]);
      if (resCheck.rows.length === 0) throw new NotFoundError('Receipt');

      const currentStatus = resCheck.rows[0].status;
      OperationStateMachine.assertTransition(currentStatus, 'ready', 'Receipt');

      const updateRes = await client.query(
        `UPDATE receipts SET status = 'ready', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        [id]
      );

      await client.query('COMMIT');
      return sendSuccess(res, updateRes.rows[0], 'Receipt marked as ready');
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

      const resCheck = await client.query(`SELECT status FROM receipts WHERE id = $1 FOR UPDATE`, [id]);
      if (resCheck.rows.length === 0) throw new NotFoundError('Receipt');

      const currentStatus = resCheck.rows[0].status;
      OperationStateMachine.assertTransition(currentStatus, 'canceled', 'Receipt');

      const updateRes = await client.query(
        `UPDATE receipts SET status = 'canceled', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        [id]
      );

      await client.query('COMMIT');
      return sendSuccess(res, updateRes.rows[0], 'Receipt canceled successfully');
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

      // Lock receipt for update (prevents race condition & double validation)
      const recRes = await client.query(
        `SELECT * FROM receipts WHERE id = $1 FOR UPDATE`,
        [id]
      );

      if (recRes.rows.length === 0) {
        throw new NotFoundError('Receipt');
      }

      const receipt = recRes.rows[0];

      // Enforce State Machine: only ready can transition to done
      OperationStateMachine.assertTransition(receipt.status, 'done', 'Receipt');

      // Fetch items
      const itemsRes = await client.query(
        `SELECT * FROM receipt_items WHERE receipt_id = $1`,
        [id]
      );

      if (itemsRes.rows.length === 0) {
        throw new ValidationError('Cannot validate a receipt with no items');
      }

      // Sort items deterministically to avoid deadlocks
      const sortedItems = InventoryEngine.sortItems(itemsRes.rows);

      const stockResults = [];
      for (const item of sortedItems) {
        const updateResult = await InventoryEngine.increaseStock(
          client,
          item.product_id,
          receipt.destination_location_id,
          item.quantity,
          req.user.id,
          'RECEIPT',
          receipt.id
        );
        stockResults.push(updateResult);
      }

      // Update receipt to done
      const updatedRec = await client.query(
        `UPDATE receipts
         SET status = 'done', validated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [id]
      );

      await client.query('COMMIT');
      return sendSuccess(res, {
        receipt: updatedRec.rows[0],
        stockUpdates: stockResults,
      }, 'Receipt validated and stock updated successfully');
    } catch (err) {
      await client.query('ROLLBACK');
      next(err);
    } finally {
      client.release();
    }
  }
}

module.exports = ReceiptController;
