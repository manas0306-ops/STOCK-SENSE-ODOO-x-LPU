const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/server');
const { pool } = require('../src/config/db');

let server;
let baseUrl;
let managerToken = '';
let staffToken = '';
let testProductId;
let mainStoreId;
let productionId;
let supplierId;
let customerId;

test('StockSense Complete REST API Integration Test Suite', async (t) => {
  // Start server on a dynamic port
  await t.test('Start test HTTP server', async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}/api`;
        console.log(`Test server running at ${baseUrl}`);
        resolve();
      });
    });

    const locRes = await pool.query(`SELECT id, name FROM locations WHERE name IN ('Main Store', 'Production')`);
    const locMap = {};
    locRes.rows.forEach(r => locMap[r.name] = r.id);
    mainStoreId = locMap['Main Store'];
    productionId = locMap['Production'];

    const supRes = await pool.query(`SELECT id FROM suppliers LIMIT 1`);
    supplierId = supRes.rows[0]?.id;

    const custRes = await pool.query(`SELECT id FROM customers LIMIT 1`);
    customerId = custRes.rows[0]?.id;
  });

  // 1. Auth Tests
  await t.test('POST /auth/login - Manager login', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@stocksense.com', password: 'admin123' }),
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.token);
    assert.strictEqual(body.data.user.role, 'Inventory Manager');
    managerToken = body.data.token;
  });

  await t.test('POST /auth/login - Staff login', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'staff@stocksense.com', password: 'staff123' }),
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.token);
    assert.strictEqual(body.data.user.role, 'Warehouse Staff');
    staffToken = body.data.token;
  });

  await t.test('POST /auth/login - Invalid credentials rejected', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@stocksense.com', password: 'wrongpassword' }),
    });
    const body = await res.json();
    assert.strictEqual(res.status, 401);
    assert.strictEqual(body.success, false);
  });

  await t.test('GET /auth/me - Protected route access', async () => {
    const res = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.data.user.email, 'manager@stocksense.com');
  });

  // 2. Product Tests
  await t.test('POST /products - Create product', async () => {
    const res = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({
        name: 'API Test Steel Rods',
        sku: 'TEST-ROD-001',
        unit_of_measure: 'kg',
        reorder_level: 20.0,
      }),
    });
    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.success, true);
    testProductId = body.data.id;
  });

  await t.test('POST /products - Duplicate SKU rejected', async () => {
    const res = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({
        name: 'Duplicate SKU Product',
        sku: 'TEST-ROD-001',
        unit_of_measure: 'kg',
        reorder_level: 10.0,
      }),
    });
    const body = await res.json();
    assert.strictEqual(res.status, 409);
    assert.strictEqual(body.code, 'DUPLICATE_KEY_ERROR');
  });

  await t.test('GET /products - List products with calculated current_stock', async () => {
    const res = await fetch(`${baseUrl}/products`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(body.data));
    const created = body.data.find(p => p.id === testProductId);
    assert.ok(created);
    assert.strictEqual(parseFloat(created.current_stock), 0);
  });

  // 3. Receipt Flow Test
  let receiptId;
  await t.test('POST /receipts - Create draft receipt', async () => {
    const res = await fetch(`${baseUrl}/receipts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({
        supplier_id: supplierId,
        destination_location_id: mainStoreId,
        status: 'draft',
        items: [{ product_id: testProductId, quantity: 100 }],
      }),
    });
    const body = await res.json();
    assert.strictEqual(res.status, 201);
    receiptId = body.data.id;
  });

  await t.test('POST /receipts/:id/validate - Validate receipt (Stock +100)', async () => {
    const res = await fetch(`${baseUrl}/receipts/${receiptId}/validate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.data.receipt.status, 'done');

    // Verify product total stock updated
    const prodCheck = await fetch(`${baseUrl}/products/${testProductId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    const prodBody = await prodCheck.json();
    assert.strictEqual(prodBody.data.total_stock, 100);
  });

  await t.test('POST /receipts/:id/validate - Idempotency: Duplicate validation rejected', async () => {
    const res = await fetch(`${baseUrl}/receipts/${receiptId}/validate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    const body = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(body.code, 'ALREADY_VALIDATED');
  });

  // 4. Transfer Flow Test
  let transferId;
  await t.test('POST /transfers - Create transfer (Main Store -> Production 20 kg)', async () => {
    const res = await fetch(`${baseUrl}/transfers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({
        source_location_id: mainStoreId,
        destination_location_id: productionId,
        items: [{ product_id: testProductId, quantity: 20 }],
      }),
    });
    const body = await res.json();
    assert.strictEqual(res.status, 201);
    transferId = body.data.id;
  });

  await t.test('POST /transfers/:id/validate - Validate transfer (Main Store = 80, Production = 20)', async () => {
    const res = await fetch(`${baseUrl}/transfers/${transferId}/validate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.data.transfer.status, 'done');

    // Verify stock distribution
    const prodCheck = await fetch(`${baseUrl}/products/${testProductId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    const prodBody = await prodCheck.json();
    assert.strictEqual(prodBody.data.total_stock, 100);
    const mainStoreStock = prodBody.data.stock_by_location.find(l => l.location_id === mainStoreId);
    const prodStock = prodBody.data.stock_by_location.find(l => l.location_id === productionId);
    assert.strictEqual(parseFloat(mainStoreStock.quantity), 80);
    assert.strictEqual(parseFloat(prodStock.quantity), 20);
  });

  // 5. Delivery Flow Test
  let deliveryId;
  await t.test('POST /deliveries - Create delivery (Production -> Customer 20 kg)', async () => {
    const res = await fetch(`${baseUrl}/deliveries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({
        customer_id: customerId,
        source_location_id: productionId,
        items: [{ product_id: testProductId, quantity: 20 }],
      }),
    });
    const body = await res.json();
    assert.strictEqual(res.status, 201);
    deliveryId = body.data.id;
  });

  await t.test('POST /deliveries/:id/validate - Validate delivery (Production = 0)', async () => {
    const res = await fetch(`${baseUrl}/deliveries/${deliveryId}/validate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.data.delivery.status, 'done');

    // Verify stock decreased to 80 total
    const prodCheck = await fetch(`${baseUrl}/products/${testProductId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    const prodBody = await prodCheck.json();
    assert.strictEqual(prodBody.data.total_stock, 80);
  });

  // 6. Delivery Over-stock Test
  await t.test('Delivery over-stock rejection', async () => {
    const resCreate = await fetch(`${baseUrl}/deliveries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({
        customer_id: customerId,
        source_location_id: productionId, // 0 available now
        items: [{ product_id: testProductId, quantity: 5 }],
      }),
    });
    const createBody = await resCreate.json();
    const overDelId = createBody.data.id;

    const resVal = await fetch(`${baseUrl}/deliveries/${overDelId}/validate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    const valBody = await resVal.json();
    assert.strictEqual(resVal.status, 400);
    assert.strictEqual(valBody.code, 'INSUFFICIENT_STOCK');
  });

  // 7. Adjustment Flow Test
  await t.test('POST /adjustments - Adjust 3 kg damage in Main Store (80 -> 77)', async () => {
    const res = await fetch(`${baseUrl}/adjustments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({
        product_id: testProductId,
        location_id: mainStoreId,
        counted_quantity: 77,
        reason: 'Damaged in storage during heavy rainfall',
        auto_validate: true,
      }),
    });
    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.data.stockUpdate.previousStock, 80);
    assert.strictEqual(body.data.stockUpdate.countedQuantity, 77);
    assert.strictEqual(body.data.stockUpdate.delta, -3);

    // Verify product total stock is now 77
    const prodCheck = await fetch(`${baseUrl}/products/${testProductId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    const prodBody = await prodCheck.json();
    assert.strictEqual(prodBody.data.total_stock, 77);
  });

  // 8. Stock Ledger Verification
  await t.test('GET /ledger - Query audit trail', async () => {
    const res = await fetch(`${baseUrl}/ledger?productId=${testProductId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    // Should have: RECEIPT, TRANSFER_OUT, TRANSFER_IN, DELIVERY, ADJUSTMENT
    assert.ok(body.data.length >= 5);
    const opTypes = body.data.map(l => l.operation_type);
    assert.ok(opTypes.includes('RECEIPT'));
    assert.ok(opTypes.includes('TRANSFER_OUT'));
    assert.ok(opTypes.includes('TRANSFER_IN'));
    assert.ok(opTypes.includes('DELIVERY'));
    assert.ok(opTypes.includes('ADJUSTMENT'));
  });

  // 9. Dashboard Verification
  await t.test('GET /dashboard - KPIs and analytical breakdown', async () => {
    const res = await fetch(`${baseUrl}/dashboard`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(body.data.kpis.totalProducts > 0);
    assert.ok(body.data.recentActivity.length > 0);
  });

  // Cleanup
  await t.test('Teardown test server and cleanup records', async () => {
    await pool.query(`DELETE FROM stock_ledger WHERE product_id = $1`, [testProductId]);
    await pool.query(`DELETE FROM stocks WHERE product_id = $1`, [testProductId]);
    await pool.query(`DELETE FROM receipt_items WHERE product_id = $1`, [testProductId]);
    await pool.query(`DELETE FROM delivery_items WHERE product_id = $1`, [testProductId]);
    await pool.query(`DELETE FROM transfer_items WHERE product_id = $1`, [testProductId]);
    await pool.query(`DELETE FROM adjustments WHERE product_id = $1`, [testProductId]);
    await pool.query(`DELETE FROM receipts WHERE id = $1`, [receiptId]);
    await pool.query(`DELETE FROM deliveries WHERE id = $1`, [deliveryId]);
    await pool.query(`DELETE FROM transfers WHERE id = $1`, [transferId]);
    await pool.query(`DELETE FROM products WHERE id = $1`, [testProductId]);

    await new Promise((resolve) => server.close(resolve));
  });
});
