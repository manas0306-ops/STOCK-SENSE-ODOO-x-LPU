const { getClient, query } = require('../config/db');
const ProductRepository = require('../repositories/productRepo');
const InventoryEngine = require('../services/inventoryEngine');
const DecimalUtil = require('../utils/decimal');
const { ValidationError, NotFoundError } = require('../utils/errors');
const { sendSuccess } = require('../utils/response');

class ProductController {
  static async list(req, res, next) {
    try {
      const { search, categoryId, lowStock, page = 1, limit = 50 } = req.query;
      const { items, pagination } = await ProductRepository.list({
        search,
        categoryId,
        lowStock,
        page,
        limit,
      });

      return res.status(200).json({
        success: true,
        message: 'Products fetched successfully',
        data: items,
        pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const product = await ProductRepository.getById(id);

      if (!product) {
        throw new NotFoundError('Product');
      }

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
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const { name, sku, category_id, unit_of_measure, reorder_level, initial_stock, initial_location_id } = req.body;

      if (!name || !sku) {
        throw new ValidationError('Product name and SKU are required');
      }

      const cleanSku = sku.trim().toUpperCase();
      const reorderLevelNum = DecimalUtil.parseQuantity(reorder_level || 0);

      const result = await client.query(
        `INSERT INTO products (name, sku, category_id, unit_of_measure, reorder_level)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [name.trim(), cleanSku, category_id || null, unit_of_measure?.trim() || 'Units', reorderLevelNum]
      );

      const product = result.rows[0];
      const initialQty = DecimalUtil.parseQuantity(initial_stock || 0);

      if (!isNaN(initialQty) && initialQty > 0) {
        let locId = initial_location_id;
        if (!locId) {
          const locRes = await client.query(`SELECT id FROM locations WHERE active = true ORDER BY id ASC LIMIT 1`);
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
      return sendSuccess(res, {
        ...product,
        reorder_level: reorderLevelNum,
      }, 'Product created successfully', 201);
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
      const reorderLevelNum = DecimalUtil.parseQuantity(reorder_level || 0);

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

      return sendSuccess(res, {
        ...result.rows[0],
        reorder_level: reorderLevelNum,
      }, 'Product updated successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ProductController;
