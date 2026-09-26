const { query } = require('../config/db');
const { ValidationError, NotFoundError } = require('../utils/errors');
const { sendSuccess } = require('../utils/response');

class WarehouseController {
  static async list(req, res, next) {
    try {
      const result = await query(
        `SELECT 
          w.id,
          w.name,
          w.active,
          w.created_at,
          COUNT(l.id) as location_count
         FROM warehouses w
         LEFT JOIN locations l ON l.warehouse_id = w.id
         GROUP BY w.id, w.name, w.active, w.created_at
         ORDER BY w.name ASC`
      );
      return sendSuccess(res, result.rows, 'Warehouses fetched');
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      const { name, active } = req.body;
      if (!name || !name.trim()) {
        throw new ValidationError('Warehouse name is required');
      }

      const result = await query(
        `INSERT INTO warehouses (name, active) VALUES ($1, $2) RETURNING *`,
        [name.trim(), active !== undefined ? Boolean(active) : true]
      );
      return sendSuccess(res, result.rows[0], 'Warehouse created', 201);
    } catch (err) {
      next(err);
    }
  }

  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const { name, active } = req.body;

      if (!name || !name.trim()) {
        throw new ValidationError('Warehouse name is required');
      }

      const result = await query(
        `UPDATE warehouses SET name = $1, active = $2 WHERE id = $3 RETURNING *`,
        [name.trim(), active !== undefined ? Boolean(active) : true, id]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Warehouse');
      }

      return sendSuccess(res, result.rows[0], 'Warehouse updated');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = WarehouseController;
