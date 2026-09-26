const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');
const { ValidationError, UnauthorizedError } = require('../utils/errors');
const { sendSuccess } = require('../utils/response');

class AuthController {
  static async register(req, res, next) {
    try {
      const { name, email, password, role } = req.body;

      if (!name || !email || !password) {
        throw new ValidationError('Name, email, and password are required');
      }

      if (password.length < 6) {
        throw new ValidationError('Password must be at least 6 characters long');
      }

      const assignedRole = role === 'Warehouse Staff' ? 'Warehouse Staff' : 'Inventory Manager';
      const passwordHash = await bcrypt.hash(password, 10);

      const userRes = await query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, email, role, created_at`,
        [name.trim(), email.trim().toLowerCase(), passwordHash, assignedRole]
      );

      const user = userRes.rows[0];
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      return sendSuccess(res, { user, token }, 'User registered successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new ValidationError('Email and password are required');
      }

      const userRes = await query(
        `SELECT id, name, email, password_hash, role
         FROM users
         WHERE LOWER(email) = LOWER($1)`,
        [email.trim()]
      );

      if (userRes.rows.length === 0) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const user = userRes.rows[0];
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      const safeUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };

      return sendSuccess(res, { user: safeUser, token }, 'Login successful');
    } catch (err) {
      next(err);
    }
  }

  static async logout(req, res, next) {
    try {
      // In stateless JWT, client deletes token; server returns 200
      return sendSuccess(res, null, 'Logged out successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getMe(req, res, next) {
    try {
      return sendSuccess(res, { user: req.user }, 'Current user profile');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AuthController;
