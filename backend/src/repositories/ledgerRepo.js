const { query } = require('../config/db');
const DecimalUtil = require('../utils/decimal');

class LedgerRepository {
  static async list({ page = 1, limit = 25, productId, operationType, locationId, startDate, endDate }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const offset = (pageNum - 1) * limitNum;

    let baseSql = `
      FROM stock_ledger sl
      JOIN products p ON p.id = sl.product_id
      LEFT JOIN locations src ON src.id = sl.source_location
      LEFT JOIN locations dst ON dst.id = sl.destination_location
      LEFT JOIN warehouses src_w ON src_w.id = src.warehouse_id
      LEFT JOIN warehouses dst_w ON dst_w.id = dst.warehouse_id
      LEFT JOIN users u ON u.id = sl.user_id
      WHERE 1=1
    `;
    const params = [];

    if (productId) {
      params.push(parseInt(productId, 10));
      baseSql += ` AND sl.product_id = $${params.length}`;
    }

    if (operationType) {
      params.push(operationType.toUpperCase());
      baseSql += ` AND sl.operation_type = $${params.length}`;
    }

    if (locationId) {
      params.push(parseInt(locationId, 10));
      baseSql += ` AND (sl.source_location = $${params.length} OR sl.destination_location = $${params.length})`;
    }

    if (startDate) {
      params.push(startDate);
      baseSql += ` AND sl.timestamp >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      baseSql += ` AND sl.timestamp <= $${params.length}`;
    }

    // Count query
    const countRes = await query(`SELECT COUNT(*) as total ${baseSql}`, params);
    const total = parseInt(countRes.rows[0]?.total || 0, 10);

    // Data query
    const selectSql = `
      SELECT 
        sl.id,
        sl.timestamp,
        sl.product_id,
        p.name as product_name,
        p.sku,
        p.unit_of_measure,
        sl.operation_type,
        sl.source_location as source_location_id,
        src.name as source_location_name,
        src_w.name as source_warehouse_name,
        sl.destination_location as destination_location_id,
        dst.name as destination_location_name,
        dst_w.name as destination_warehouse_name,
        sl.quantity,
        sl.user_id,
        u.name as user_name,
        sl.previous_stock,
        sl.new_stock,
        sl.reference_type,
        sl.reference_id
      ${baseSql}
      ORDER BY sl.timestamp DESC, sl.id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const dataRes = await query(selectSql, [...params, limitNum, offset]);
    const items = dataRes.rows.map(r => ({
      ...r,
      quantity: DecimalUtil.parseQuantity(r.quantity),
      previous_stock: DecimalUtil.parseQuantity(r.previous_stock),
      new_stock: DecimalUtil.parseQuantity(r.new_stock),
    }));

    return {
      items,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }
}

module.exports = LedgerRepository;
