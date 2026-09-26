const { getClient, query } = require('../config/db');
const InventoryEngine = require('../services/inventoryEngine');
const { ValidationError, NotFoundError, AppError } = require('../utils/errors');
const { sendSuccess } = require('../utils/response');

class TransferController {
  static async list(req, res, next) {
    try {
      const { status } = req.query;
      let sql = `
        SELECT 
          t.id,
          t.reference_no,
          t.source_location_id,
          sl.name as source_location_name,
          sw.name as source_warehouse_name,
          t.destination_location_id,
          dl.name as destination_location_name,
          dw.name as destination_warehouse_name,
          t.status,
          t.created_by,
          u.name as created_by_name,
          t.validated_at,
          t.created_at,
          COUNT(ti.id) as item_count,
          COALESCE(SUM(ti.quantity), 0) as total_quantity
        FROM transfers t
        JOIN locations sl ON sl.id = t.source_location_id
        JOIN warehouses sw ON sw.id = sl.warehouse_id
        JOIN locations dl ON dl.id = t.destination_location_id
        JOIN warehouses dw ON dw.id = dl.warehouse_id
        LEFT JOIN users u ON u.id = t.created_by
        LEFT JOIN transfer_items ti ON ti.transfer_id = t.id
        WHERE 1=1
      `;
      const params = [];
      if (status) {
        params.push(status);
        sql += ` AND t.status = $${params.length}`;
      }

      sql += ` GROUP BY t.id, t.reference_no, t.source_location_id, sl.name, sw.name, 
                        t.destination_location_id, dl.name, dw.name, t.status, t.created_by, 
                        u.name, t.validated_at, t.created_at
               ORDER BY t.created_at DESC`;

      const result = await query(sql, params);
      return sendSuccess(res, result.rows, 'Transfers retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const { id } = req.params;

      const trfRes = await query(
        `SELECT 
          t.id,
          t.reference_no,
          t.source_location_id,
          sl.name as source_location_name,
          sw.name as source_warehouse_name,
          t.destination_location_id,
          dl.name as destination_location_name,
          dw.name as destination_warehouse_name,
          t.status,
          t.created_by,
          u.name as created_by_name,
          t.validated_at,
          t.created_at,
          t.updated_at
        FROM transfers t
        JOIN locations sl ON sl.id = t.source_location_id
        JOIN warehouses sw ON sw.id = sl.warehouse_id
        JOIN locations dl ON dl.id = t.destination_location_id
        JOIN warehouses dw ON dw.id = dl.warehouse_id
        LEFT JOIN users u ON u.id = t.created_by
        WHERE t.id = $1`,
        [id]
      );

      if (trfRes.rows.length === 0) {
        throw new NotFoundError('Internal Transfer');
      }

      const transfer = trfRes.rows[0];

      const itemsRes = await query(
        `SELECT 
          ti.id,
          ti.product_id,
          p.name as product_name,
          p.sku,
          p.unit_of_measure,
          ti.quantity,
          COALESCE(s.quantity, 0) as source_available_stock
        FROM transfer_items ti
        JOIN products p ON p.id = ti.product_id
        LEFT JOIN stocks s ON s.product_id = ti.product_id AND s.location_id = $2
        WHERE ti.transfer_id = $1
        ORDER BY ti.id ASC`,
        [id, transfer.source_location_id]
      );

      return sendSuccess(res, {
        ...transfer,
        items: itemsRes.rows,
      }, 'Transfer details retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    const client = await getClient();
    try {
      const { source_location_id, destination_location_id, items, status = 'draft' } = req.body;

      if (!source_location_id || !destination_location_id) {
        throw new ValidationError('Source and destination locations are required');
      }

      if (Number(source_location_id) === Number(destination_location_id)) {
        throw new ValidationError('Source and destination locations must be different');
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new ValidationError('At least one transfer item is required');
      }

      for (const itm of items) {
        if (!itm.product_id || !itm.quantity || parseFloat(itm.quantity) <= 0) {
          throw new ValidationError('Each item must have a valid product and positive quantity');
        }
      }

      await client.query('BEGIN');

      const refNo = `TRF-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      const initialStatus = ['draft', 'ready'].includes(status) ? status : 'draft';

      const trfRes = await client.query(
        `INSERT INTO transfers (reference_no, source_location_id, destination_location_id, status, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [refNo, source_location_id, destination_location_id, initialStatus, req.user.id]
      );
      const transfer = trfRes.rows[0];

      for (const itm of items) {
        await client.query(
          `INSERT INTO transfer_items (transfer_id, product_id, quantity)
           VALUES ($1, $2, $3)`,
          [transfer.id, itm.product_id, parseFloat(itm.quantity)]
        );
      }

      await client.query('COMMIT');
      return sendSuccess(res, transfer, 'Internal transfer created successfully', 201);
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
      const resCheck = await query(`SELECT status FROM transfers WHERE id = $1`, [id]);
      if (resCheck.rows.length === 0) throw new NotFoundError('Internal Transfer');
      if (resCheck.rows[0].status === 'done') {
        throw new AppError('Transfer is already validated', 400, 'ALREADY_VALIDATED');
      }

      const updateRes = await query(
        `UPDATE transfers SET status = 'ready', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        [id]
      );
      return sendSuccess(res, updateRes.rows[0], 'Transfer marked as ready');
    } catch (err) {
      next(err);
    }
  }

  static async validate(req, res, next) {
    const client = await getClient();
    try {
      const { id } = req.params;
      await client.query('BEGIN');

      // Lock transfer record
      const trfRes = await client.query(
        `SELECT * FROM transfers WHERE id = $1 FOR UPDATE`,
        [id]
      );

      if (trfRes.rows.length === 0) {
        throw new NotFoundError('Internal Transfer');
      }

      const transfer = trfRes.rows[0];

      if (transfer.status === 'done') {
        throw new AppError('This transfer has already been validated and cannot be applied again', 400, 'ALREADY_VALIDATED');
      }

      const itemsRes = await client.query(
        `SELECT * FROM transfer_items WHERE transfer_id = $1`,
        [id]
      );

      if (itemsRes.rows.length === 0) {
        throw new ValidationError('Cannot validate a transfer with no items');
      }

      const transferResults = [];
      for (const item of itemsRes.rows) {
        const result = await InventoryEngine.transferStock(
          client,
          item.product_id,
          transfer.source_location_id,
          transfer.destination_location_id,
          item.quantity,
          req.user.id,
          'TRANSFER',
          transfer.id
        );
        transferResults.push(result);
      }

      // Update transfer status
      const updatedTrf = await client.query(
        `UPDATE transfers
         SET status = 'done', validated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [id]
      );

      await client.query('COMMIT');
      return sendSuccess(res, {
        transfer: updatedTrf.rows[0],
        movements: transferResults,
      }, 'Transfer validated successfully');
    } catch (err) {
      await client.query('ROLLBACK');
      next(err);
    } finally {
      client.release();
    }
  }
}

module.exports = TransferController;
