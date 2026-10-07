const { AppError } = require('../utils/errors');

/**
 * In-memory sliding window rate limiter
 * Protects against brute-force attacks and abuse without external Redis dependency.
 */
function createRateLimiter({ windowMs = 60 * 1000, max = 30, message = 'Too many requests, please try again later.' }) {
  const requests = new Map();

  // Periodic cleanup of expired entries
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of requests.entries()) {
      const valid = timestamps.filter(t => now - t < windowMs);
      if (valid.length === 0) {
        requests.delete(key);
      } else {
        requests.set(key, valid);
      }
    }
  }, Math.max(windowMs, 30000)).unref();

  return (req, res, next) => {
    if (process.env.NODE_ENV === 'test') {
      return next(); // bypass during unit tests
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const key = `${ip}_${req.baseUrl || req.path}`;
    const now = Date.now();

    let timestamps = requests.get(key) || [];
    timestamps = timestamps.filter(t => now - t < windowMs);

    if (timestamps.length >= max) {
      const resetTime = Math.ceil((timestamps[0] + windowMs - now) / 1000);
      res.setHeader('Retry-After', resetTime);
      return next(new AppError(message, 429, 'RATE_LIMIT_EXCEEDED'));
    }

    timestamps.push(now);
    requests.set(key, timestamps);
    next();
  };
}

module.exports = {
  createRateLimiter,
  authLimiter: createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20, message: 'Too many authentication attempts. Please try again in 15 minutes.' }),
  otpLimiter: createRateLimiter({ windowMs: 10 * 60 * 1000, max: 5, message: 'Too many password reset attempts. Please try again later.' }),
};
