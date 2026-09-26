const { pool, query } = require('../config/db');
const InventoryEngine = require('../services/inventoryEngine');
const { ValidationError, NotFoundError } = require('../utils/errors');
const { sendSuccess } = require('../utils/response');

class ProductController {
  static async list(req, res, next) {
    try {
      const { search, categoryId, lowStock } = req.query;

      let sql = `
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
        WHERE 1=1
      `;
      const params = [];

      if (search) {
        params.push(`%${search.trim()}%`);
        sql += ` AND (p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`;
      }

      if (categoryId) {
        params.push(categoryId);
        sql += ` AND p.category_id = $${params.length}`;
      }

      sql += ` GROUP BY p.id, p.name, p.sku, p.category_id, c.name, p.unit_of_measure, p.reorder_level, p.created_at, p.updated_at`;

      if (lowStock === 'true') {
        sql += ` HAVING COALESCE(SUM(s.quantity), 0) <= p.reorder_level`;
      }

      sql += ` ORDER BY p.name ASC`;

      const result = await query(sql, params);
      return sendSuccess(res, result.rows, 'Products fetched successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const { id } = req.params;

      const prodRes = await query(
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

      if (prodRes.rows.length === 0) {
        throw new NotFoundError('Product');
      }

      const product = prodRes.rows[0];
      const stockBreakdown = await InventoryEngine.getStockByLocation(id);
      const totalStock = await InventoryEngine.getAvailableStock(id);

      return sendSuccess(res, {
        ...product,
        total_stock: totalStock,
        stock_by_location: stockBreakdown,
      }, 'Product details retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { name, sku, category_id, unit_of_measure, reorder_level, initial_stock, initial_location_id } = req.body;

      if (!name || !sku) {
        throw new ValidationError('Product name and SKU are required');
      }

      const cleanSku = sku.trim().toUpperCase();
      const reorderLevelNum = parseFloat(reorder_level || 0);

      if (isNaN(reorderLevelNum) || reorderLevelNum < 0) {
        throw new ValidationError('Reorder level must be a non-negative number');
      }

      const result = await client.query(
        `INSERT INTO products (name, sku, category_id, unit_of_measure, reorder_level)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [name.trim(), cleanSku, category_id || null, unit_of_measure?.trim() || 'Units', reorderLevelNum]
      );

      const product = result.rows[0];
      const initialQty = parseFloat(initial_stock || 0);

      if (!isNaN(initialQty) && initialQty > 0) {
        let locId = initial_location_id;
        if (!locId) {
          const locRes = await client.query(`SELECT id FROM locations WHERE type = 'internal' ORDER BY id ASC LIMIT 1`);
          if (locRes.rows.length > 0) {
            locId = locRes.rows[0].id;
          }
        }
        if (locId) {
          await InventoryEngine.increaseStock(
            client,
            product.id,
            locId,
            initialQty,
            req.user?.id || null,
            'INITIAL_STOCK',
            product.id
          );
        }
      }

      await client.query('COMMIT');
      return sendSuccess(res, product, 'Product created successfully', 201);
    } catch (err) {
      await client.query('ROLLBACK');
      next(err);
    } finally {
      client.release();
    }
  }

  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const { name, sku, category_id, unit_of_measure, reorder_level } = req.body;

      if (!name || !sku) {
        throw new ValidationError('Product name and SKU are required');
      }

      const cleanSku = sku.trim().toUpperCase();
      const reorderLevelNum = parseFloat(reorder_level || 0);

      const result = await query(
        `UPDATE products
         SET name = $1, sku = $2, category_id = $3, unit_of_measure = $4, reorder_level = $5, updated_at = CURRENT_TIMESTAMP
         WHERE id = $6
         RETURNING *`,
        [name.trim(), cleanSku, category_id || null, unit_of_measure?.trim() || 'Units', reorderLevelNum, id]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Product');
      }

      return sendSuccess(res, result.rows[0], 'Product updated successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ProductController;
