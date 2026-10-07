const { query } = require('../config/db');
const DecimalUtil = require('../utils/decimal');

class ProductRepository {
  static async list({ page = 1, limit = 50, search, categoryId, lowStock }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      params.push(`%${search.trim()}%`);
      whereClause += ` AND (p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`;
    }

    if (categoryId) {
      params.push(parseInt(categoryId, 10));
      whereClause += ` AND p.category_id = $${params.length}`;
    }

    let havingClause = '';
    if (lowStock === 'true') {
      havingClause = 'HAVING COALESCE(SUM(s.quantity), 0) <= p.reorder_level';
    }

    // Count query
    const countSql = `
      SELECT COUNT(*) as total FROM (
        SELECT p.id
        FROM products p
        LEFT JOIN stocks s ON s.product_id = p.id
        ${whereClause}
        GROUP BY p.id
        ${havingClause}
      ) sub
    `;
    const countRes = await query(countSql, params);
    const total = parseInt(countRes.rows[0]?.total || 0, 10);

    // Data query
    const dataSql = `
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.category_id,
        c.name as category_name,
        p.unit_of_measure,
        p.reorder_level,
        COALESCE(SUM(s.quantity), 0) as current_stock,
        p.created_at,
        p.updated_at
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN stocks s ON s.product_id = p.id
      ${whereClause}
      GROUP BY p.id, p.name, p.sku, p.category_id, c.name, p.unit_of_measure, p.reorder_level, p.created_at, p.updated_at
      ${havingClause}
      ORDER BY p.name ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const dataRes = await query(dataSql, [...params, limitNum, offset]);
    const items = dataRes.rows.map(r => ({
      ...r,
      current_stock: DecimalUtil.parseQuantity(r.current_stock),
      reorder_level: DecimalUtil.parseQuantity(r.reorder_level),
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

  static async getById(id) {
    const res = await query(
      `SELECT 
        p.id,
        p.name,
        p.sku,
        p.category_id,
        c.name as category_name,
        p.unit_of_measure,
        p.reorder_level,
        p.created_at,
        p.updated_at
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = $1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      ...r,
      reorder_level: DecimalUtil.parseQuantity(r.reorder_level),
    };
  }
}

module.exports = ProductRepository;
