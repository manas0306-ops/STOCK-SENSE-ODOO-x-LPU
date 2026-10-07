const test = require('node:test');
const assert = require('node:assert');
const env = require('../src/config/env');
const { createRateLimiter } = require('../src/middleware/rateLimiter');
const { requireRole } = require('../src/middleware/auth');

test('Phase 1 - Security & Configuration Hardening Test Suite', async (t) => {
  await t.test('1. Environment Configuration has safe defaults', () => {
    assert.strictEqual(typeof env.PORT, 'number');
    assert.strictEqual(env.DB_PORT, 5432, 'Default PostgreSQL port must be 5432');
    assert.ok(env.JWT_SECRET, 'JWT_SECRET must be defined');
    assert.strictEqual(typeof env.ALLOW_DEMO_OTP, 'boolean');
  });

  await t.test('2. Rate limiter enforces request thresholds', async () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 2, message: 'Too many requests' });
    const req = { ip: '127.0.0.1', path: '/test-route' };
    const res = { setHeader: () => {} };

    await new Promise((resolve, reject) => {
      // Request 1: allowed
      limiter(req, res, (err1) => {
        if (err1) return reject(err1);

        // Request 2: allowed
        limiter(req, res, (err2) => {
          if (err2) return reject(err2);

          // Request 3: blocked (max is 2)
          const oldEnv = process.env.NODE_ENV;
          process.env.NODE_ENV = 'development';
          limiter(req, res, (err3) => {
            process.env.NODE_ENV = oldEnv;
            try {
              assert.ok(err3, 'Third request must trigger rate limit error');
              assert.strictEqual(err3.statusCode, 429);
              assert.strictEqual(err3.code, 'RATE_LIMIT_EXCEEDED');
              resolve();
            } catch (e) {
              reject(e);
            }
          });
        });
      });
    });
  });

  await t.test('3. RBAC middleware rejects unauthorized roles', () => {
    const managerOnly = requireRole('Inventory Manager');

    // Case 1: No user
    managerOnly({ user: null }, {}, (err) => {
      assert.ok(err);
      assert.strictEqual(err.statusCode, 401);
    });

    // Case 2: Wrong role
    managerOnly({ user: { role: 'Warehouse Staff' } }, {}, (err) => {
      assert.ok(err);
      assert.strictEqual(err.statusCode, 403);
    });

    // Case 3: Correct role
    managerOnly({ user: { role: 'Inventory Manager' } }, {}, (err) => {
      assert.strictEqual(err, undefined);
    });
  });
});
