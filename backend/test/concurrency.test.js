const test = require('node:test');
const assert = require('node:assert');
const { pool, getClient } = require('../src/config/db');
const InventoryEngine = require('../src/services/inventoryEngine');

test('Inventory Engine Concurrency & Race Condition Prevention Suite', async (t) => {
  let testProdId;
  let testLocId;
  let userId;

  await t.test('Setup isolated concurrent test SKU', async () => {
    const userRes = await pool.query(`SELECT id FROM users LIMIT 1`);
    userId = userRes.rows[0].id;

    const locRes = await pool.query(`SELECT id FROM locations LIMIT 1`);
    testLocId = locRes.rows[0].id;

    // Create a product with 10 units
    const prodRes = await pool.query(`
      INSERT INTO products (name, sku, unit_of_measure, reorder_level)
      VALUES ('Race Condition Test SKU', 'RACE-SKU-999', 'units', 5)
      RETURNING id
    `);
    testProdId = prodRes.rows[0].id;

    // Seed exactly 10 units
    const client = await getClient();
    try {
      await client.query('BEGIN');
      await InventoryEngine.increaseStock(client, testProdId, testLocId, 10.0, userId, 'CONCURRENCY_TEST', 1);
      await client.query('COMMIT');
    } finally {
      client.release();
    }
  });

  await t.test('Simultaneous Delivery Requests: Only 1 succeeds when 2 clients request 10 units simultaneously', async () => {
    // 2 workers both try to deliver 10 units at the exact same moment.
    // Stock is 10. Exactly ONE must succeed and exactly ONE must fail with INSUFFICIENT_STOCK.
    const worker = async (workerId) => {
      const client = await getClient();
      try {
        await client.query('BEGIN');
        await InventoryEngine.decreaseStock(client, testProdId, testLocId, 10.0, userId, 'CONCURRENCY_DELIVERY', workerId);
        await client.query('COMMIT');
        return { success: true, workerId };
      } catch (err) {
        await client.query('ROLLBACK');
        return { success: false, workerId, error: err.code || err.message };
      } finally {
        client.release();
      }
    };

    const results = await Promise.all([worker(1), worker(2)]);
    const succeeded = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    assert.strictEqual(succeeded.length, 1, 'Exactly one concurrent decrease must succeed');
    assert.strictEqual(failed.length, 1, 'Exactly one concurrent decrease must fail');
    assert.strictEqual(failed[0].error, 'INSUFFICIENT_STOCK', 'Error must be INSUFFICIENT_STOCK');

    // Final stock must be exactly 0, never negative
    const finalStock = await pool.query(
      `SELECT quantity FROM stocks WHERE product_id = $1 AND location_id = $2`,
      [testProdId, testLocId]
    );
    assert.strictEqual(parseFloat(finalStock.rows[0].quantity), 0.0, 'Final stock must be exactly 0');
  });

  await t.test('Cleanup concurrency test SKU', async () => {
    await pool.query(`DELETE FROM stock_ledger WHERE product_id = $1`, [testProdId]);
    await pool.query(`DELETE FROM stocks WHERE product_id = $1`, [testProdId]);
    await pool.query(`DELETE FROM products WHERE id = $1`, [testProdId]);
  });
});
