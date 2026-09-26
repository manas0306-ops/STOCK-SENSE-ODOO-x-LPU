const test = require('node:test');
const assert = require('node:assert');
const { pool, getClient } = require('../src/config/db');
const InventoryEngine = require('../src/services/inventoryEngine');

test('Inventory Engine & Acceptance Test Suite', async (t) => {
  let testUserId = null;
  let steelProductId = null;
  let mainStoreLocId = null;
  let productionLocId = null;

  // Setup: Get IDs for testing
  await t.test('Initial setup and prerequisite checks', async () => {
    const userRes = await pool.query(`SELECT id FROM users WHERE email = 'manager@stocksense.com'`);
    assert.ok(userRes.rows.length > 0, 'Seed manager user must exist');
    testUserId = userRes.rows[0].id;

    const locRes = await pool.query(`
      SELECT id, name FROM locations WHERE name IN ('Main Store', 'Production')
    `);
    const locMap = {};
    locRes.rows.forEach(r => locMap[r.name] = r.id);
    mainStoreLocId = locMap['Main Store'];
    productionLocId = locMap['Production'];
    assert.ok(mainStoreLocId, 'Main Store location must exist');
    assert.ok(productionLocId, 'Production location must exist');

    // Create or find a test product
    const prodRes = await pool.query(`
      SELECT id FROM products WHERE sku = 'TEST-STL-999'
    `);
    if (prodRes.rows.length > 0) {
      steelProductId = prodRes.rows[0].id;
    } else {
      const insRes = await pool.query(`
        INSERT INTO products (name, sku, unit_of_measure, reorder_level)
        VALUES ('Test Industrial Steel', 'TEST-STL-999', 'kg', 25.00)
        RETURNING id
      `);
      steelProductId = insRes.rows[0].id;
    }

    // Clean up previous test stocks and ledger
    await pool.query(`DELETE FROM stock_ledger WHERE product_id = $1`, [steelProductId]);
    await pool.query(`DELETE FROM stocks WHERE product_id = $1`, [steelProductId]);
  });

  // Step 1: Receive 100 kg Steel into Main Store -> Stock = 100 kg
  await t.test('Receipt: Increase stock by 100 kg', async () => {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const res = await InventoryEngine.increaseStock(
        client,
        steelProductId,
        mainStoreLocId,
        100.0,
        testUserId,
        'RECEIPT',
        99901
      );
      await client.query('COMMIT');

      assert.strictEqual(res.previousStock, 0);
      assert.strictEqual(res.newStock, 100.0);
      assert.strictEqual(res.quantity, 100.0);

      // Verify stock table in DB
      const checkStock = await pool.query(
        `SELECT quantity FROM stocks WHERE product_id = $1 AND location_id = $2`,
        [steelProductId, mainStoreLocId]
      );
      assert.strictEqual(parseFloat(checkStock.rows[0].quantity), 100.0);

      // Verify ledger table in DB
      const checkLedger = await pool.query(
        `SELECT * FROM stock_ledger WHERE product_id = $1 AND reference_type = 'RECEIPT' AND reference_id = 99901`,
        [steelProductId]
      );
      assert.strictEqual(checkLedger.rows.length, 1);
      assert.strictEqual(checkLedger.rows[0].operation_type, 'RECEIPT');
      assert.strictEqual(parseFloat(checkLedger.rows[0].quantity), 100.0);
      assert.strictEqual(parseFloat(checkLedger.rows[0].previous_stock), 0.0);
      assert.strictEqual(parseFloat(checkLedger.rows[0].new_stock), 100.0);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  });

  // Step 2: Transfer 20 kg from Main Store to Production -> Main Store = 80 kg, Production = 20 kg
  await t.test('Transfer: Move 20 kg to Production atomically', async () => {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const res = await InventoryEngine.transferStock(
        client,
        steelProductId,
        mainStoreLocId,
        productionLocId,
        20.0,
        testUserId,
        'TRANSFER',
        99902
      );
      await client.query('COMMIT');

      assert.strictEqual(res.source.previousStock, 100.0);
      assert.strictEqual(res.source.newStock, 80.0);
      assert.strictEqual(res.destination.previousStock, 0.0);
      assert.strictEqual(res.destination.newStock, 20.0);

      // Verify stocks in DB
      const mainStock = await pool.query(
        `SELECT quantity FROM stocks WHERE product_id = $1 AND location_id = $2`,
        [steelProductId, mainStoreLocId]
      );
      const prodStock = await pool.query(
        `SELECT quantity FROM stocks WHERE product_id = $1 AND location_id = $2`,
        [steelProductId, productionLocId]
      );
      assert.strictEqual(parseFloat(mainStock.rows[0].quantity), 80.0);
      assert.strictEqual(parseFloat(prodStock.rows[0].quantity), 20.0);

      // Total available stock across all locations must remain exactly 100 kg
      const totalAvailable = await InventoryEngine.getAvailableStock(steelProductId);
      assert.strictEqual(totalAvailable, 100.0);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  });

  // Step 3: Reject invalid transfer (source == destination)
  await t.test('Transfer edge case: Same source and destination must be rejected', async () => {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      let failed = false;
      try {
        await InventoryEngine.transferStock(
          client,
          steelProductId,
          mainStoreLocId,
          mainStoreLocId,
          10.0,
          testUserId
        );
      } catch (err) {
        failed = true;
        assert.match(err.message, /Source and destination locations must be different/);
      }
      assert.strictEqual(failed, true, 'Should have thrown error');
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  // Step 4: Reject over-transfer (transfer > available)
  await t.test('Transfer edge case: Transferring more than available must be rejected', async () => {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      let failed = false;
      try {
        await InventoryEngine.transferStock(
          client,
          steelProductId,
          mainStoreLocId,
          productionLocId,
          500.0, // only 80 available
          testUserId
        );
      } catch (err) {
        failed = true;
        assert.match(err.message, /Insufficient stock/);
      }
      assert.strictEqual(failed, true, 'Should have thrown error for over-transfer');
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  // Step 5: Deliver 20 kg from Production -> Production = 0 kg
  await t.test('Delivery: Deliver 20 kg from Production to customer', async () => {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const res = await InventoryEngine.decreaseStock(
        client,
        steelProductId,
        productionLocId,
        20.0,
        testUserId,
        'DELIVERY',
        99903
      );
      await client.query('COMMIT');

      assert.strictEqual(res.previousStock, 20.0);
      assert.strictEqual(res.newStock, 0.0);

      const prodStock = await pool.query(
        `SELECT quantity FROM stocks WHERE product_id = $1 AND location_id = $2`,
        [steelProductId, productionLocId]
      );
      assert.strictEqual(parseFloat(prodStock.rows[0].quantity), 0.0);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  });

  // Step 6: Reject delivery exceeding available stock (never negative stock)
  await t.test('Delivery edge case: Over-delivery must be rejected', async () => {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      let failed = false;
      try {
        await InventoryEngine.decreaseStock(
          client,
          steelProductId,
          productionLocId,
          1.0, // 0 available now in Production
          testUserId
        );
      } catch (err) {
        failed = true;
        assert.match(err.message, /Insufficient stock/);
      }
      assert.strictEqual(failed, true, 'Should have thrown error for over-delivery');
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  // Step 7: Adjust for 3 kg damaged stock in Main Store (80 -> 77)
  await t.test('Adjustment: Reconcile physical count (80 -> 77 kg)', async () => {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const res = await InventoryEngine.setStock(
        client,
        steelProductId,
        mainStoreLocId,
        77.0,
        'Damaged during handling in warehouse aisle 3',
        testUserId,
        'ADJUSTMENT',
        99904
      );
      await client.query('COMMIT');

      assert.strictEqual(res.previousStock, 80.0);
      assert.strictEqual(res.countedQuantity, 77.0);
      assert.strictEqual(res.delta, -3.0);

      const checkStock = await pool.query(
        `SELECT quantity FROM stocks WHERE product_id = $1 AND location_id = $2`,
        [steelProductId, mainStoreLocId]
      );
      assert.strictEqual(parseFloat(checkStock.rows[0].quantity), 77.0);

      // Verify adjustment ledger entry
      const checkLedger = await pool.query(
        `SELECT * FROM stock_ledger WHERE product_id = $1 AND operation_type = 'ADJUSTMENT' AND reference_id = 99904`,
        [steelProductId]
      );
      assert.strictEqual(checkLedger.rows.length, 1);
      assert.strictEqual(parseFloat(checkLedger.rows[0].quantity), -3.0);
      assert.strictEqual(parseFloat(checkLedger.rows[0].previous_stock), 80.0);
      assert.strictEqual(parseFloat(checkLedger.rows[0].new_stock), 77.0);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  });

  // Cleanup test records
  await t.test('Cleanup test records', async () => {
    await pool.query(`DELETE FROM stock_ledger WHERE product_id = $1`, [steelProductId]);
    await pool.query(`DELETE FROM stocks WHERE product_id = $1`, [steelProductId]);
    await pool.query(`DELETE FROM products WHERE id = $1`, [steelProductId]);
  });
});
