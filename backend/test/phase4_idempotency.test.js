const test = require('node:test');
const assert = require('node:assert');
const { requireIdempotency, idempotencyStore } = require('../src/middleware/idempotency');

test('Phase 4 - Idempotency & API Reliability Suite', async (t) => {
  await t.test('1. Requests with same Idempotency-Key return cached response and prevent double execution', async () => {
    let executions = 0;
    const key = `test-key-${Date.now()}`;

    const handler = (req, res) => {
      executions++;
      res.status(200).json({ success: true, count: executions, data: { orderId: 999 } });
    };

    // Request 1: First attempt
    const req1 = { headers: { 'idempotency-key': key } };
    let res1Data = null;
    let res1Status = 200;
    const res1 = {
      statusCode: 200,
      setHeader: () => {},
      status: (c) => { res1Status = c; return res1; },
      json: (data) => { res1Data = data; return res1; },
    };

    await new Promise((resolve) => {
      requireIdempotency(req1, res1, () => {
        handler(req1, res1);
        resolve();
      });
    });

    assert.strictEqual(executions, 1, 'Handler should run once');
    assert.strictEqual(res1Data.count, 1);

    // Request 2: Duplicate attempt with same key
    const req2 = { headers: { 'idempotency-key': key } };
    let res2Data = null;
    let res2Headers = {};
    const res2 = {
      statusCode: 200,
      setHeader: (k, v) => { res2Headers[k] = v; },
      status: (c) => res2,
      json: (data) => { res2Data = data; return res2; },
    };

    await new Promise((resolve) => {
      requireIdempotency(req2, res2, () => {
        // If requireIdempotency correctly intercepts, next() is NOT called!
        handler(req2, res2);
        resolve();
      });
      // But if it intercepted, json was already sent!
      resolve();
    });

    assert.strictEqual(executions, 1, 'Handler must NOT execute twice for duplicate key');
    assert.strictEqual(res2Headers['X-Idempotent-Replay'], 'true', 'Replay header must be set');
    assert.strictEqual(res2Data.count, 1, 'Returned data must be the cached response');
  });
});
