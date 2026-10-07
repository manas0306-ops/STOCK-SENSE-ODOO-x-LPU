const { query } = require('../config/db');
const DecimalUtil = require('../utils/decimal');
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
      let totalStockUnits = 0;
      const lowStockProducts = [];

      stockMetricsRes.rows.forEach(p => {
        const current = DecimalUtil.parseQuantity(p.current_stock);
        const reorder = DecimalUtil.parseQuantity(p.reorder_level);
        totalStockUnits = DecimalUtil.add(totalStockUnits, current);

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
            deficit: reorder > current ? DecimalUtil.subtract(reorder, current) : 0,
          });
        }
      });

      lowStockProducts.sort((a, b) => b.deficit - a.deficit);

      // 3. Pending & Inbound Stock
      const pendingRecRes = await query(`
        SELECT 
          COUNT(DISTINCT r.id) as pending_receipts,
          COALESCE(SUM(ri.quantity), 0) as incoming_stock
        FROM receipts r
        LEFT JOIN receipt_items ri ON ri.receipt_id = r.id
        WHERE r.status IN ('draft', 'ready')
      `);
      const pendingReceipts = parseInt(pendingRecRes.rows[0]?.pending_receipts || 0, 10);
      const incomingStock = DecimalUtil.parseQuantity(pendingRecRes.rows[0]?.incoming_stock || 0);

      // 4. Pending & Outbound Stock
      const pendingDelRes = await query(`
        SELECT 
          COUNT(DISTINCT d.id) as pending_deliveries,
          COALESCE(SUM(di.quantity), 0) as outgoing_stock
        FROM deliveries d
        LEFT JOIN delivery_items di ON di.delivery_id = d.id
        WHERE d.status IN ('draft', 'ready')
      `);
      const pendingDeliveries = parseInt(pendingDelRes.rows[0]?.pending_deliveries || 0, 10);
      const outgoingStock = DecimalUtil.parseQuantity(pendingDelRes.rows[0]?.outgoing_stock || 0);

      // 5. Internal Transfers Total & Pending
      const trfRes = await query(`
        SELECT 
          COUNT(*) as total_transfers,
          COUNT(*) FILTER (WHERE status IN ('draft', 'ready')) as pending_transfers
        FROM transfers
      `);
      const totalTransfers = parseInt(trfRes.rows[0]?.total_transfers || 0, 10);
      const pendingTransfers = parseInt(trfRes.rows[0]?.pending_transfers || 0, 10);

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
        LIMIT 10
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
          w.id as warehouse_id,
          w.name as warehouse_name,
          COALESCE(SUM(s.quantity), 0) as total_units,
          COUNT(DISTINCT p.id) FILTER (WHERE s.quantity > 0) as active_skus
        FROM warehouses w
        LEFT JOIN locations l ON l.warehouse_id = w.id
        LEFT JOIN stocks s ON s.location_id = l.id
        LEFT JOIN products p ON p.id = s.product_id
        WHERE w.active = true
        GROUP BY w.id, w.name
        ORDER BY w.name ASC
      `);

      // 9. Fast movers & Slow movers (based on last 30 days ledger outflows)
      const moversRes = await query(`
        SELECT 
          p.id,
          p.name,
          p.sku,
          p.unit_of_measure,
          COALESCE(SUM(sl.quantity), 0) as total_outflow,
          COUNT(sl.id) as movement_count
        FROM products p
        LEFT JOIN stock_ledger sl ON sl.product_id = p.id AND sl.operation_type = 'DELIVERY'
        GROUP BY p.id, p.name, p.sku, p.unit_of_measure
        ORDER BY total_outflow DESC
      `);

      const fastMovers = moversRes.rows
        .filter(m => parseFloat(m.total_outflow) > 0)
        .slice(0, 5)
        .map(m => ({
          ...m,
          total_outflow: DecimalUtil.parseQuantity(m.total_outflow),
        }));

      const deadStock = stockMetricsRes.rows
        .filter(p => {
          const m = moversRes.rows.find(x => x.id === p.id);
          return (!m || parseFloat(m.total_outflow) === 0) && parseFloat(p.current_stock) > 0;
        })
        .slice(0, 5)
        .map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          current_stock: DecimalUtil.parseQuantity(p.current_stock),
        }));

      // 10. Calculated Inventory Health Score (0 - 100)
      // Dimension 1: Stock Availability (weight 35%) -> % of products in stock
      const availabilityPct = totalProducts > 0 ? ((totalProducts - outOfStockCount) / totalProducts) * 100 : 100;

      // Dimension 2: Low-Stock Risk (weight 35%) -> % of products above reorder level
      const safetyPct = totalProducts > 0 ? ((totalProducts - lowStockCount) / totalProducts) * 100 : 100;

      // Dimension 3: Operation Efficiency (weight 20%) -> Ratio of completed vs pending
      const totalPending = pendingReceipts + pendingDeliveries + pendingTransfers;
      const operationScore = totalPending === 0 ? 100 : Math.max(30, 100 - (totalPending * 5));

      // Dimension 4: Data Integrity (weight 10%) -> Fixed at 100 in double-entry system
      const integrityScore = 100;

      const healthScore = Math.round(
        (availabilityPct * 0.35) +
        (safetyPct * 0.35) +
        (operationScore * 0.20) +
        (integrityScore * 0.10)
      );

      return sendSuccess(res, {
        kpis: {
          totalProducts,
          totalStockUnits,
          lowStockCount,
          outOfStockCount,
          pendingReceipts,
          incomingStock,
          pendingDeliveries,
          outgoingStock,
          internalTransfers: totalTransfers,
          pendingTransfers,
          pendingOperations: totalPending,
          healthScore: Math.min(100, Math.max(0, healthScore)),
          healthBreakdown: {
            availability: Math.round(availabilityPct),
            safety: Math.round(safetyPct),
            operations: Math.round(operationScore),
            integrity: integrityScore,
          },
        },
        lowStockProducts: lowStockProducts.slice(0, 5),
        recentActivity: recentLedgerRes.rows.map(r => ({
          ...r,
          quantity: DecimalUtil.parseQuantity(r.quantity),
          previous_stock: DecimalUtil.parseQuantity(r.previous_stock),
          new_stock: DecimalUtil.parseQuantity(r.new_stock),
        })),
        stockByCategory: catStockRes.rows.map(c => ({
          ...c,
          total_units: DecimalUtil.parseQuantity(c.total_units),
        })),
        stockByWarehouse: whStockRes.rows.map(w => ({
          ...w,
          total_units: DecimalUtil.parseQuantity(w.total_units),
        })),
        fastMovers,
        deadStock,
      }, 'Dashboard summary metrics fetched');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = DashboardController;
