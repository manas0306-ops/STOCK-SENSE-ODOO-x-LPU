const { query } = require('../config/db');
const DecimalUtil = require('../utils/decimal');
const { InsufficientStockError, ValidationError } = require('../utils/errors');

class InventoryEngine {
  /**
   * Deterministically sort items by product_id ASC to eliminate database deadlocks
   * across concurrent multi-item operations.
   */
  static sortItems(items) {
    if (!Array.isArray(items)) return [];
    return [...items].sort((a, b) => {
      const idA = Number(a.product_id || a.productId);
      const idB = Number(b.product_id || b.productId);
      return idA - idB;
    });
  }

  /**
   * Increase stock at a specific location (Receipt)
   */
  static async increaseStock(client, productId, locationId, quantity, userId, refType = 'RECEIPT', refId = null) {
    const qty = DecimalUtil.parseQuantity(quantity);
    if (isNaN(qty) || qty <= 0) {
      throw new ValidationError('Quantity must be a positive number');
    }

    // 1. Lock stock record
    const stockRes = await client.query(
      `SELECT quantity FROM stocks WHERE product_id = $1 AND location_id = $2 FOR UPDATE`,
      [productId, locationId]
    );

    const previousStock = stockRes.rows.length > 0 ? DecimalUtil.parseQuantity(stockRes.rows[0].quantity) : 0.0;
    const newStock = DecimalUtil.add(previousStock, qty);

    // 2. Upsert stock record
    await client.query(
      `INSERT INTO stocks (product_id, location_id, quantity, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (product_id, location_id)
       DO UPDATE SET quantity = $3, updated_at = CURRENT_TIMESTAMP`,
      [productId, locationId, newStock]
    );

    // 3. Immutable ledger entry
    const ledgerRes = await client.query(
      `INSERT INTO stock_ledger (
        product_id, operation_type, source_location, destination_location,
        quantity, user_id, previous_stock, new_stock, reference_type, reference_id
       ) VALUES ($1, 'RECEIPT', NULL, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [productId, locationId, qty, userId, previousStock, newStock, refType, refId]
    );

    return {
      productId,
      locationId,
      previousStock,
      newStock,
      quantity: qty,
      ledger: ledgerRes.rows[0],
    };
  }

  /**
   * Decrease stock at a specific location (Delivery)
   * Enforces zero negative stock rule strictly.
   */
  static async decreaseStock(client, productId, locationId, quantity, userId, refType = 'DELIVERY', refId = null) {
    const qty = DecimalUtil.parseQuantity(quantity);
    if (isNaN(qty) || qty <= 0) {
      throw new ValidationError('Quantity must be a positive number');
    }

    // 1. Get product unit of measure
    const prodRes = await client.query(
      `SELECT unit_of_measure FROM products WHERE id = $1`,
      [productId]
    );
    const unit = prodRes.rows[0]?.unit_of_measure || 'Units';

    // 2. Lock stock record
    const stockRes = await client.query(
      `SELECT quantity FROM stocks WHERE product_id = $1 AND location_id = $2 FOR UPDATE`,
      [productId, locationId]
    );

    const available = stockRes.rows.length > 0 ? DecimalUtil.parseQuantity(stockRes.rows[0].quantity) : 0.0;

    if (DecimalUtil.isLessThan(available, qty)) {
      throw new InsufficientStockError(available, qty, unit);
    }

    const previousStock = available;
    const newStock = DecimalUtil.subtract(previousStock, qty);

    // 3. Update stock record
    await client.query(
      `UPDATE stocks
       SET quantity = $3, updated_at = CURRENT_TIMESTAMP
       WHERE product_id = $1 AND location_id = $2`,
      [productId, locationId, newStock]
    );

    // 4. Ledger entry
    const ledgerRes = await client.query(
      `INSERT INTO stock_ledger (
        product_id, operation_type, source_location, destination_location,
        quantity, user_id, previous_stock, new_stock, reference_type, reference_id
       ) VALUES ($1, 'DELIVERY', $2, NULL, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [productId, locationId, qty, userId, previousStock, newStock, refType, refId]
    );

    return {
      productId,
      locationId,
      previousStock,
      newStock,
      quantity: qty,
      ledger: ledgerRes.rows[0],
    };
  }

  /**
   * Transfer stock from one location to another
   * Creates TRANSFER_OUT and TRANSFER_IN in a single atomic transaction.
   */
  static async transferStock(client, productId, fromLocationId, toLocationId, quantity, userId, refType = 'TRANSFER', refId = null) {
    const qty = DecimalUtil.parseQuantity(quantity);
    if (isNaN(qty) || qty <= 0) {
      throw new ValidationError('Quantity must be a positive number');
    }

    if (Number(fromLocationId) === Number(toLocationId)) {
      throw new ValidationError('Source and destination locations must be different');
    }

    // 1. Get product unit of measure
    const prodRes = await client.query(
      `SELECT unit_of_measure FROM products WHERE id = $1`,
      [productId]
    );
    const unit = prodRes.rows[0]?.unit_of_measure || 'Units';

    // 2. Lock source stock
    const sourceRes = await client.query(
      `SELECT quantity FROM stocks WHERE product_id = $1 AND location_id = $2 FOR UPDATE`,
      [productId, fromLocationId]
    );

    const sourceAvailable = sourceRes.rows.length > 0 ? DecimalUtil.parseQuantity(sourceRes.rows[0].quantity) : 0.0;

    if (DecimalUtil.isLessThan(sourceAvailable, qty)) {
      throw new InsufficientStockError(sourceAvailable, qty, unit);
    }

    const prevSourceStock = sourceAvailable;
    const newSourceStock = DecimalUtil.subtract(prevSourceStock, qty);

    // Update source
    await client.query(
      `UPDATE stocks
       SET quantity = $3, updated_at = CURRENT_TIMESTAMP
       WHERE product_id = $1 AND location_id = $2`,
      [productId, fromLocationId, newSourceStock]
    );

    // 3. Lock destination stock
    const destRes = await client.query(
      `SELECT quantity FROM stocks WHERE product_id = $1 AND location_id = $2 FOR UPDATE`,
      [productId, toLocationId]
    );

    const prevDestStock = destRes.rows.length > 0 ? DecimalUtil.parseQuantity(destRes.rows[0].quantity) : 0.0;
    const newDestStock = DecimalUtil.add(prevDestStock, qty);

    // Upsert destination
    await client.query(
      `INSERT INTO stocks (product_id, location_id, quantity, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (product_id, location_id)
       DO UPDATE SET quantity = $3, updated_at = CURRENT_TIMESTAMP`,
      [productId, toLocationId, newDestStock]
    );

    // 4. Ledger entries (double-entry model)
    const ledgerOut = await client.query(
      `INSERT INTO stock_ledger (
        product_id, operation_type, source_location, destination_location,
        quantity, user_id, previous_stock, new_stock, reference_type, reference_id
       ) VALUES ($1, 'TRANSFER_OUT', $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [productId, fromLocationId, toLocationId, qty, userId, prevSourceStock, newSourceStock, refType, refId]
    );

    const ledgerIn = await client.query(
      `INSERT INTO stock_ledger (
        product_id, operation_type, source_location, destination_location,
        quantity, user_id, previous_stock, new_stock, reference_type, reference_id
       ) VALUES ($1, 'TRANSFER_IN', $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [productId, fromLocationId, toLocationId, qty, userId, prevDestStock, newDestStock, refType, refId]
    );

    return {
      productId,
      fromLocationId,
      toLocationId,
      quantity: qty,
      source: { previousStock: prevSourceStock, newStock: newSourceStock },
      destination: { previousStock: prevDestStock, newStock: newDestStock },
      ledgers: [ledgerOut.rows[0], ledgerIn.rows[0]],
    };
  }

  /**
   * Set stock directly during physical inventory reconciliation (Adjustment)
   */
  static async setStock(client, productId, locationId, countedQuantity, reason, userId, refType = 'ADJUSTMENT', refId = null) {
    const counted = DecimalUtil.parseQuantity(countedQuantity);
    if (isNaN(counted) || counted < 0) {
      throw new ValidationError('Counted quantity must be non-negative');
    }

    if (!reason || reason.trim() === '') {
      throw new ValidationError('A reason is required for inventory adjustment');
    }

    // Lock current stock
    const stockRes = await client.query(
      `SELECT quantity FROM stocks WHERE product_id = $1 AND location_id = $2 FOR UPDATE`,
      [productId, locationId]
    );

    const previousStock = stockRes.rows.length > 0 ? DecimalUtil.parseQuantity(stockRes.rows[0].quantity) : 0.0;
    const delta = DecimalUtil.subtract(counted, previousStock);
    const newStock = counted;

    // Upsert stock record
    await client.query(
      `INSERT INTO stocks (product_id, location_id, quantity, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (product_id, location_id)
       DO UPDATE SET quantity = $3, updated_at = CURRENT_TIMESTAMP`,
      [productId, locationId, newStock]
    );

    // Ledger entry
    const ledgerRes = await client.query(
      `INSERT INTO stock_ledger (
        product_id, operation_type, source_location, destination_location,
        quantity, user_id, previous_stock, new_stock, reference_type, reference_id
       ) VALUES ($1, 'ADJUSTMENT', $2, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [productId, locationId, delta, userId, previousStock, newStock, refType, refId]
    );

    return {
      productId,
      locationId,
      previousStock,
      countedQuantity: newStock,
      delta,
      reason,
      ledger: ledgerRes.rows[0],
    };
  }

  /**
   * Query helper: Get stock breakdown by location for a product
   */
  static async getStockByLocation(productId) {
    const res = await query(
      `SELECT 
        l.id as location_id,
        l.name as location_name,
        w.id as warehouse_id,
        w.name as warehouse_name,
        COALESCE(s.quantity, 0) as quantity,
        s.updated_at
       FROM locations l
       JOIN warehouses w ON w.id = l.warehouse_id
       LEFT JOIN stocks s ON s.location_id = l.id AND s.product_id = $1
       WHERE l.active = true AND w.active = true
       ORDER BY w.name, l.name`,
      [productId]
    );
    return res.rows.map(r => ({
      ...r,
      quantity: DecimalUtil.parseQuantity(r.quantity),
    }));
  }

  /**
   * Query helper: Total available stock for a product across all locations
   */
  static async getAvailableStock(productId) {
    const res = await query(
      `SELECT COALESCE(SUM(s.quantity), 0) as total_stock
       FROM stocks s
       JOIN locations l ON l.id = s.location_id
       WHERE s.product_id = $1 AND l.active = true`,
      [productId]
    );
    return DecimalUtil.parseQuantity(res.rows[0]?.total_stock || 0);
  }

  /**
   * Query helper: Get all products with stock <= reorder_level
   */
  static async getLowStockProducts() {
    const res = await query(
      `SELECT 
        p.id,
        p.name,
        p.sku,
        p.unit_of_measure,
        p.reorder_level,
        c.name as category_name,
        COALESCE(SUM(s.quantity), 0) as current_stock,
        (p.reorder_level - COALESCE(SUM(s.quantity), 0)) as deficit
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN stocks s ON s.product_id = p.id
       GROUP BY p.id, p.name, p.sku, p.unit_of_measure, p.reorder_level, c.name
       HAVING COALESCE(SUM(s.quantity), 0) <= p.reorder_level
       ORDER BY deficit DESC, p.name ASC`
    );
    return res.rows.map(r => ({
      ...r,
      current_stock: DecimalUtil.parseQuantity(r.current_stock),
      reorder_level: DecimalUtil.parseQuantity(r.reorder_level),
      deficit: DecimalUtil.parseQuantity(r.deficit),
    }));
  }
}

module.exports = InventoryEngine;
