const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');

const JWT_SECRET = process.env.JWT_SECRET || 'stocksense_hackathon_super_secret_jwt_key_2026';

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token missing or invalid');
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      throw new UnauthorizedError('Token expired or invalid');
    }

    // Verify user still exists in database
    const userRes = await query('SELECT id, name, email, role FROM users WHERE id = $1', [decoded.id]);
    if (userRes.rows.length === 0) {
      throw new UnauthorizedError('User account not found');
    }

    req.user = userRes.rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError(`Requires one of roles: ${allowedRoles.join(', ')}`));
    }
    next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
  JWT_SECRET,
};
