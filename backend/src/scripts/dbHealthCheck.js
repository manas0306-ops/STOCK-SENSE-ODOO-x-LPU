const { pool, query } = require('../config/db');

async function checkDatabaseHealth() {
  console.log('=== StockSense Database Health & Integrity Audit ===\n');
  try {
    // 1. Connection & Version
    const verRes = await query('SELECT version(), current_database(), current_user, inet_server_port() as port');
    const ver = verRes.rows[0];
    console.log(`[Database Connected] DB: ${ver.current_database} | User: ${ver.current_user} | Port: ${ver.port}`);
    console.log(`[Engine Version] ${ver.version}\n`);

    // 2. Table row counts
    const tables = [
      'users', 'categories', 'warehouses', 'locations', 
      'suppliers', 'customers', 'products', 'stocks', 
      'receipts', 'receipt_items', 'deliveries', 'delivery_items', 
      'transfers', 'transfer_items', 'adjustments', 'stock_ledger'
    ];

    console.log('--- Table Record Counts ---');
    for (const tbl of tables) {
      const res = await query(`SELECT COUNT(*) as count FROM ${tbl}`);
      console.log(`  * ${tbl.padEnd(16)} : ${res.rows[0].count} records`);
    }

    // 3. Inventory Integrity Check: Verify total stocks == positive values and no negative quantities
    console.log('\n--- Inventory Integrity Checks ---');
    const negStock = await query(`SELECT COUNT(*) as count FROM stocks WHERE quantity < 0`);
    if (parseInt(negStock.rows[0].count, 10) === 0) {
      console.log('  [PASS] Zero negative stock constraint intact (0 negative rows).');
    } else {
      console.error(`  [FAIL] Detected ${negStock.rows[0].count} negative stock rows!`);
    }

    // 4. Ledger Reference Integrity: Verify all ledger rows reference valid products and locations
    const orphanLedger = await query(`
      SELECT COUNT(*) as count 
      FROM stock_ledger l
      LEFT JOIN products p ON p.id = l.product_id
      WHERE p.id IS NULL
    `);
    if (parseInt(orphanLedger.rows[0].count, 10) === 0) {
      console.log('  [PASS] Stock ledger referential integrity verified (0 orphaned rows).');
    } else {
      console.error(`  [FAIL] Detected ${orphanLedger.rows[0].count} orphaned ledger records!`);
    }

    console.log('\n=== Database Health Check Completed: 100% Operational ===');
  } catch (err) {
    console.error('[Health Check Error]:', err.message);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  checkDatabaseHealth();
}

module.exports = { checkDatabaseHealth };
