const { query } = require('../config/db');
const { sendSuccess } = require('../utils/response');

class LedgerController {
  static async list(req, res, next) {
    try {
      const { productId, operationType, locationId, userId, startDate, endDate, limit = 100, offset = 0 } = req.query;

      let sql = `
        SELECT 
          l.id,
          l.timestamp,
          l.product_id,
          p.name as product_name,
          p.sku,
          p.unit_of_measure,
          l.operation_type,
          l.source_location,
          sl.name as source_location_name,
          sw.name as source_warehouse_name,
          l.destination_location,
          dl.name as destination_location_name,
          dw.name as destination_warehouse_name,
          l.quantity,
          l.user_id,
          u.name as user_name,
          l.previous_stock,
          l.new_stock,
          l.reference_type,
          l.reference_id
        FROM stock_ledger l
        JOIN products p ON p.id = l.product_id
        LEFT JOIN locations sl ON sl.id = l.source_location
        LEFT JOIN warehouses sw ON sw.id = sl.warehouse_id
        LEFT JOIN locations dl ON dl.id = l.destination_location
        LEFT JOIN warehouses dw ON dw.id = dl.warehouse_id
        LEFT JOIN users u ON u.id = l.user_id
        WHERE 1=1
      `;
      const params = [];

      if (productId) {
        params.push(productId);
        sql += ` AND l.product_id = $${params.length}`;
      }

      if (operationType) {
        params.push(operationType);
        sql += ` AND l.operation_type = $${params.length}`;
      }

      if (locationId) {
        params.push(locationId);
        sql += ` AND (l.source_location = $${params.length} OR l.destination_location = $${params.length})`;
      }

      if (userId) {
        params.push(userId);
        sql += ` AND l.user_id = $${params.length}`;
      }

      if (startDate) {
        params.push(startDate);
        sql += ` AND l.timestamp >= $${params.length}`;
      }

      if (endDate) {
        params.push(endDate);
        sql += ` AND l.timestamp <= $${params.length}`;
      }

      sql += ` ORDER BY l.timestamp DESC, l.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(parseInt(limit, 10) || 100, parseInt(offset, 10) || 0);

      const result = await query(sql, params);
      return sendSuccess(res, result.rows, 'Stock ledger retrieved');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = LedgerController;
