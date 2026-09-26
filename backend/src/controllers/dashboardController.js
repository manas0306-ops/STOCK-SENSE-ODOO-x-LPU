const { query } = require('../config/db');
const { sendSuccess } = require('../utils/response');

class DashboardController {
  static async getSummary(req, res, next) {
    try {
      // 1. Total Products
      const totalProdRes = await query(`SELECT COUNT(*) FROM products`);
      const totalProducts = parseInt(totalProdRes.rows[0].count, 10);

      // 2. Product stock metrics (Total stock per product)
      const stockMetricsRes = await query(`
        SELECT 
          p.id,
          p.name,
          p.sku,
          p.reorder_level,
          p.unit_of_measure,
          c.name as category_name,
          COALESCE(SUM(s.quantity), 0) as current_stock
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN stocks s ON s.product_id = p.id
        GROUP BY p.id, p.name, p.sku, p.reorder_level, p.unit_of_measure, c.name
      `);

      let outOfStockCount = 0;
      let lowStockCount = 0;
      const lowStockProducts = [];

      stockMetricsRes.rows.forEach(p => {
        const current = parseFloat(p.current_stock);
        const reorder = parseFloat(p.reorder_level);
        if (current === 0) {
          outOfStockCount++;
        }
        if (current <= reorder) {
          lowStockCount++;
          lowStockProducts.push({
            id: p.id,
            name: p.name,
            sku: p.sku,
            unit_of_measure: p.unit_of_measure,
            category_name: p.category_name,
            current_stock: current,
            reorder_level: reorder,
            deficit: reorder > current ? (reorder - current) : 0,
          });
        }
      });

      // Sort low stock by deficit descending
      lowStockProducts.sort((a, b) => b.deficit - a.deficit);

      // 3. Pending Receipts
      const pendingRecRes = await query(`
        SELECT COUNT(*) FROM receipts WHERE status IN ('draft', 'ready')
      `);
      const pendingReceipts = parseInt(pendingRecRes.rows[0].count, 10);

      // 4. Pending Deliveries
      const pendingDelRes = await query(`
        SELECT COUNT(*) FROM deliveries WHERE status IN ('draft', 'ready')
      `);
      const pendingDeliveries = parseInt(pendingDelRes.rows[0].count, 10);

      // 5. Internal Transfers Total & Pending
      const trfRes = await query(`
        SELECT 
          COUNT(*) as total_transfers,
          COUNT(*) FILTER (WHERE status IN ('draft', 'ready')) as pending_transfers
        FROM transfers
      `);
      const totalTransfers = parseInt(trfRes.rows[0].total_transfers, 10);
      const pendingTransfers = parseInt(trfRes.rows[0].pending_transfers, 10);

      // 6. Recent Stock Ledger Movements (10 most recent)
      const recentLedgerRes = await query(`
        SELECT 
          l.id,
          l.timestamp,
          l.operation_type,
          p.name as product_name,
          p.sku,
          p.unit_of_measure,
          sl.name as source_location_name,
          dl.name as destination_location_name,
          l.quantity,
          l.previous_stock,
          l.new_stock,
          u.name as user_name
        FROM stock_ledger l
        JOIN products p ON p.id = l.product_id
        LEFT JOIN locations sl ON sl.id = l.source_location
        LEFT JOIN locations dl ON dl.id = l.destination_location
        LEFT JOIN users u ON u.id = l.user_id
        ORDER BY l.timestamp DESC, l.id DESC
        LIMIT 8
      `);

      // 7. Stock by Category
      const catStockRes = await query(`
        SELECT 
          COALESCE(c.name, 'Uncategorized') as category,
          COALESCE(SUM(s.quantity), 0) as total_units,
          COUNT(DISTINCT p.id) as product_count
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN stocks s ON s.product_id = p.id
        GROUP BY c.name
        ORDER BY total_units DESC
      `);

      // 8. Stock by Warehouse
      const whStockRes = await query(`
        SELECT 
          w.name as warehouse_name,
          COALESCE(SUM(s.quantity), 0) as total_units
        FROM warehouses w
        LEFT JOIN locations l ON l.warehouse_id = w.id
        LEFT JOIN stocks s ON s.location_id = l.id
        GROUP BY w.id, w.name
        ORDER BY w.name ASC
      `);

      return sendSuccess(res, {
        kpis: {
          totalProducts,
          lowStockCount,
          outOfStockCount,
          pendingReceipts,
          pendingDeliveries,
          internalTransfers: totalTransfers,
          pendingTransfers,
        },
        lowStockProducts: lowStockProducts.slice(0, 5),
        recentActivity: recentLedgerRes.rows,
        stockByCategory: catStockRes.rows,
        stockByWarehouse: whStockRes.rows,
      }, 'Dashboard summary metrics fetched');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = DashboardController;
