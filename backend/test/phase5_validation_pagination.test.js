const test = require('node:test');
const assert = require('node:assert');
const {
  createReceiptSchema,
  createDeliverySchema,
  createTransferSchema,
  createProductSchema,
  paginationSchema,
} = require('../src/validators/schemas');

test('Phase 5 & 6 - Centralized Validation & Pagination Constraints', async (t) => {
  await t.test('1. Validation rejects invalid or negative quantities', () => {
    // Negative receipt item quantity
    const invalidReceipt = {
      destination_location_id: 1,
      items: [{ product_id: 5, quantity: -10 }],
    };
    const res = createReceiptSchema.safeParse(invalidReceipt);
    assert.strictEqual(res.success, false);

    // Zero quantity
    const zeroReceipt = {
      destination_location_id: 1,
      items: [{ product_id: 5, quantity: 0 }],
    };
    assert.strictEqual(createReceiptSchema.safeParse(zeroReceipt).success, false);

    // Empty items array
    const emptyReceipt = {
      destination_location_id: 1,
      items: [],
    };
    assert.strictEqual(createReceiptSchema.safeParse(emptyReceipt).success, false);
  });

  await t.test('2. Transfer validation rejects identical source and destination locations', () => {
    const sameLocTransfer = {
      source_location_id: 2,
      destination_location_id: 2,
      items: [{ product_id: 1, quantity: 5 }],
    };
    const res = createTransferSchema.safeParse(sameLocTransfer);
    assert.strictEqual(res.success, false);
    assert.ok(res.error.issues.some(i => i.message.includes('must be different')));
  });

  await t.test('3. Pagination schema enforces bounds (max 100 limit, min page 1)', () => {
    // Normal defaults
    const parsedDefault = paginationSchema.parse({});
    assert.strictEqual(parsedDefault.page, 1);
    assert.strictEqual(parsedDefault.limit, 25);

    // Exceeding max limit (e.g., 500 requested) -> Rejected or capped
    const oversized = paginationSchema.safeParse({ limit: 500 });
    assert.strictEqual(oversized.success, false);

    // Valid custom limit
    const validCustom = paginationSchema.parse({ page: 2, limit: 50 });
    assert.strictEqual(validCustom.page, 2);
    assert.strictEqual(validCustom.limit, 50);
  });
});
