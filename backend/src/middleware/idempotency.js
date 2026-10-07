const { AppError } = require('../utils/errors');

/**
 * Idempotency Middleware
 * Prevents double-submissions, network retries, and rapid clicks from duplicating inventory transactions.
 */
class IdempotencyStore {
  constructor(ttlMs = 24 * 60 * 60 * 1000) {
    this.store = new Map();
    this.ttlMs = ttlMs;

    setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.store.entries()) {
        if (now - item.timestamp > this.ttlMs) {
          this.store.delete(key);
        }
      }
    }, 60 * 1000).unref();
  }

  get(key) {
    return this.store.get(key);
  }

  set(key, data) {
    this.store.set(key, { ...data, timestamp: Date.now() });
  }

  delete(key) {
    this.store.delete(key);
  }
}

const idempotencyStore = new IdempotencyStore();

function requireIdempotency(req, res, next) {
  const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
  if (!idempotencyKey) {
    return next(); // Key is optional unless strictly enforced on specific routes
  }

  const existing = idempotencyStore.get(idempotencyKey);
  if (existing) {
    if (existing.status === 'in_progress') {
      return next(new AppError('A request with this Idempotency-Key is currently processing', 409, 'IDEMPOTENCY_CONFLICT'));
    }

    if (existing.status === 'completed') {
      res.setHeader('X-Idempotent-Replay', 'true');
      return res.status(existing.statusCode).json(existing.body);
    }
  }

  // Mark in-progress
  idempotencyStore.set(idempotencyKey, { status: 'in_progress' });

  // Intercept res.json
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      idempotencyStore.set(idempotencyKey, {
        status: 'completed',
        statusCode: res.statusCode,
        body,
      });
    } else {
      // If the request failed, release key so user can retry with valid data
      idempotencyStore.delete(idempotencyKey);
    }
    return originalJson(body);
  };

  next();
}

module.exports = {
  requireIdempotency,
  idempotencyStore,
};
