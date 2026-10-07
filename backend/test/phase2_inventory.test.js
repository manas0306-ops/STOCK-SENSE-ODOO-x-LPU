const test = require('node:test');
const assert = require('node:assert');
const DecimalUtil = require('../src/utils/decimal');
const InventoryEngine = require('../src/services/inventoryEngine');
const { InsufficientStockError } = require('../src/utils/errors');

test('Phase 2 - Inventory Engine, Decimal Precision & Transaction Integrity', async (t) => {
  await t.test('1. Decimal precision eliminates floating-point anomalies', () => {
    // Standard JS float error: 0.1 + 0.2 = 0.30000000000000004
    const floatSum = 0.1 + 0.2;
    assert.notStrictEqual(floatSum, 0.3); // Proves the JS bug exists

    // DecimalUtil fix:
    const safeSum = DecimalUtil.add(0.1, 0.2);
    assert.strictEqual(safeSum, 0.3);

    const safeDiff = DecimalUtil.subtract(0.3, 0.2);
    assert.strictEqual(safeDiff, 0.1);

    const rounded = DecimalUtil.round(123.456, 2);
    assert.strictEqual(rounded, 123.46);
  });

  await t.test('2. Multi-item operations sort deterministically by product_id to prevent deadlocks', () => {
    const unsorted = [
      { product_id: 42, quantity: 5 },
      { product_id: 3, quantity: 10 },
      { product_id: 19, quantity: 2 },
    ];

    const sorted = InventoryEngine.sortItems(unsorted);
    assert.deepStrictEqual(sorted.map(i => i.product_id), [3, 19, 42], 'Must sort in ascending product_id order');
  });

  await t.test('3. Stock deduction logic checks: exact delivery down to 0, and rejection on overdraw', async () => {
    // In-memory test client simulation
    const mockDb = {
      products: { 1: { id: 1, unit_of_measure: 'kg' } },
      stocks: { '1_10': { quantity: '10.00' } },
      ledger: [],
    };

    const mockClient = {
      query: async (sql, params) => {
        if (sql.includes('SELECT unit_of_measure FROM products')) {
          const prod = mockDb.products[params[0]];
          return { rows: prod ? [prod] : [] };
        }
        if (sql.includes('SELECT quantity FROM stocks WHERE product_id = $1 AND location_id = $2 FOR UPDATE')) {
          const stock = mockDb.stocks[`${params[0]}_${params[1]}`];
          return { rows: stock ? [stock] : [] };
        }
        if (sql.includes('UPDATE stocks')) {
          mockDb.stocks[`${params[0]}_${params[1]}`] = { quantity: params[2].toString() };
          return { rows: [] };
        }
        if (sql.includes('INSERT INTO stock_ledger')) {
          mockDb.ledger.push(params);
          return { rows: [{ id: mockDb.ledger.length, quantity: params[4] }] };
        }
        return { rows: [] };
      },
    };

    // Scenario A: Stock = 10, Delivery = 10 -> Result = 0
    const result1 = await InventoryEngine.decreaseStock(mockClient, 1, 10, 10.0, 1, 'DELIVERY', 101);
    assert.strictEqual(result1.newStock, 0.0);
    assert.strictEqual(mockDb.stocks['1_10'].quantity, '0');

    // Scenario B: Stock = 0, Delivery = 1 -> Must throw InsufficientStockError
    await assert.rejects(
      async () => {
        await InventoryEngine.decreaseStock(mockClient, 1, 10, 1.0, 1, 'DELIVERY', 102);
      },
      (err) => {
        assert.ok(err instanceof InsufficientStockError);
        assert.strictEqual(err.statusCode, 400);
        assert.strictEqual(err.code, 'INSUFFICIENT_STOCK');
        return true;
      }
    );
  });
});
