const { pool } = require('../config/db');
const { seed } = require('./seed');

async function resetDemoData() {
  const client = await pool.connect();
  try {
    console.log('[Demo Reset] Cleaning all operational and ledger records...');
    await client.query('BEGIN');

    // Truncate operational tables and restart identity
    await client.query(`
      TRUNCATE TABLE 
        delivery_items, deliveries,
        receipt_items, receipts,
        transfer_items, transfers,
        adjustments,
        stock_ledger,
        stocks,
        suppliers,
        customers
      CASCADE;
    `);

    await client.query('COMMIT');
    console.log('[Demo Reset] Operational tables cleared.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Demo Reset] Failed to clean tables:', err);
    process.exit(1);
  } finally {
    client.release();
  }

  // Run the fresh seed
  console.log('[Demo Reset] Applying baseline seed data...');
  await seed();
  console.log('[Demo Reset] Demo environment successfully restored to pristine state!');
}

if (require.main === module) {
  resetDemoData();
}

module.exports = { resetDemoData };
