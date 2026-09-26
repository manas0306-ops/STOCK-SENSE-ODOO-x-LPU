const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');
const { ValidationError, UnauthorizedError, NotFoundError } = require('../utils/errors');
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

  static async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      if (!email || !email.trim()) {
        throw new ValidationError('Email is required');
      }

      const userRes = await query(
        `SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1)`,
        [email.trim()]
      );

      if (userRes.rows.length === 0) {
        throw new NotFoundError('User with this email');
      }

      const user = userRes.rows[0];
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpHashed = await bcrypt.hash(otp, 10);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await query(
        `UPDATE users 
         SET reset_otp = $1, reset_otp_expires_at = $2, reset_otp_attempts = 0 
         WHERE id = $3`,
        [otpHashed, expiresAt, user.id]
      );

      return sendSuccess(res, {
        email: user.email,
        demoOtp: otp,
        expiresInMinutes: 10
      }, 'Password reset OTP generated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async resetPassword(req, res, next) {
    try {
      const { email, otp, newPassword } = req.body;

      if (!email || !otp || !newPassword) {
        throw new ValidationError('Email, OTP, and new password are required');
      }

      if (newPassword.length < 6) {
        throw new ValidationError('Password must be at least 6 characters long');
      }

      const userRes = await query(
        `SELECT id, email, reset_otp, reset_otp_expires_at, reset_otp_attempts
         FROM users
         WHERE LOWER(email) = LOWER($1)`,
        [email.trim()]
      );

      if (userRes.rows.length === 0) {
        throw new NotFoundError('User');
      }

      const user = userRes.rows[0];

      if (!user.reset_otp || !user.reset_otp_expires_at) {
        throw new ValidationError('No active password reset request found. Please request a new OTP.');
      }

      if (new Date() > new Date(user.reset_otp_expires_at)) {
        await query(`UPDATE users SET reset_otp = NULL, reset_otp_expires_at = NULL WHERE id = $1`, [user.id]);
        throw new ValidationError('OTP has expired. Please request a new one.');
      }

      if (user.reset_otp_attempts >= 5) {
        await query(`UPDATE users SET reset_otp = NULL, reset_otp_expires_at = NULL WHERE id = $1`, [user.id]);
        throw new ValidationError('Maximum verification attempts exceeded. Please request a new OTP.');
      }

      const isOtpValid = await bcrypt.compare(otp.toString().trim(), user.reset_otp);
      if (!isOtpValid) {
        await query(
          `UPDATE users SET reset_otp_attempts = reset_otp_attempts + 1 WHERE id = $1`,
          [user.id]
        );
        throw new ValidationError('Invalid OTP. Please check the code and try again.');
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      await query(
        `UPDATE users
         SET password_hash = $1, reset_otp = NULL, reset_otp_expires_at = NULL, reset_otp_attempts = 0, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [newPasswordHash, user.id]
      );

      return sendSuccess(res, null, 'Password has been reset successfully. You can now log in with your new password.');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AuthController;
