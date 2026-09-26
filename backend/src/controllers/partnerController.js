const { query } = require('../config/db');
const { ValidationError } = require('../utils/errors');
const { sendSuccess } = require('../utils/response');

class PartnerController {
  // Suppliers
  static async listSuppliers(req, res, next) {
    try {
      const result = await query(`SELECT * FROM suppliers ORDER BY name ASC`);
      return sendSuccess(res, result.rows, 'Suppliers fetched');
    } catch (err) {
      next(err);
    }
  }

  static async createSupplier(req, res, next) {
    try {
      const { name, contact } = req.body;
      if (!name || !name.trim()) {
        throw new ValidationError('Supplier name is required');
      }
      const result = await query(
        `INSERT INTO suppliers (name, contact) VALUES ($1, $2) RETURNING *`,
        [name.trim(), contact?.trim() || null]
      );
      return sendSuccess(res, result.rows[0], 'Supplier created', 201);
    } catch (err) {
      next(err);
    }
  }

  // Customers
  static async listCustomers(req, res, next) {
    try {
      const result = await query(`SELECT * FROM customers ORDER BY name ASC`);
      return sendSuccess(res, result.rows, 'Customers fetched');
    } catch (err) {
      next(err);
    }
  }

  static async createCustomer(req, res, next) {
    try {
      const { name, contact } = req.body;
      if (!name || !name.trim()) {
        throw new ValidationError('Customer name is required');
      }
      const result = await query(
        `INSERT INTO customers (name, contact) VALUES ($1, $2) RETURNING *`,
        [name.trim(), contact?.trim() || null]
      );
      return sendSuccess(res, result.rows[0], 'Customer created', 201);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = PartnerController;
