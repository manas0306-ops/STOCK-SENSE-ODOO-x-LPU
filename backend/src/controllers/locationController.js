const { query } = require('../config/db');
const { ValidationError, NotFoundError } = require('../utils/errors');
const { sendSuccess } = require('../utils/response');

class LocationController {
  static async list(req, res, next) {
    try {
      const { warehouseId } = req.query;
      let sql = `
        SELECT 
          l.id,
          l.warehouse_id,
          w.name as warehouse_name,
          l.name,
          l.active,
          l.created_at,
          COALESCE(SUM(s.quantity), 0) as total_units_stored
        FROM locations l
        JOIN warehouses w ON w.id = l.warehouse_id
        LEFT JOIN stocks s ON s.location_id = l.id
        WHERE 1=1
      `;
      const params = [];

      if (warehouseId) {
        params.push(warehouseId);
        sql += ` AND l.warehouse_id = $${params.length}`;
      }

      sql += ` GROUP BY l.id, l.warehouse_id, w.name, l.name, l.active, l.created_at
               ORDER BY w.name ASC, l.name ASC`;

      const result = await query(sql, params);
      return sendSuccess(res, result.rows, 'Locations fetched');
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      const { warehouse_id, name, active } = req.body;
      if (!warehouse_id || !name || !name.trim()) {
        throw new ValidationError('Warehouse ID and location name are required');
      }

      const result = await query(
        `INSERT INTO locations (warehouse_id, name, active)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [warehouse_id, name.trim(), active !== undefined ? Boolean(active) : true]
      );
      return sendSuccess(res, result.rows[0], 'Location created', 201);
    } catch (err) {
      next(err);
    }
  }

  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const { warehouse_id, name, active } = req.body;

      if (!name || !name.trim()) {
        throw new ValidationError('Location name is required');
      }

      const result = await query(
        `UPDATE locations
         SET warehouse_id = COALESCE($1, warehouse_id),
             name = $2,
             active = COALESCE($3, active)
         WHERE id = $4
         RETURNING *`,
        [warehouse_id || null, name.trim(), active !== undefined ? Boolean(active) : null, id]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Location');
      }

      return sendSuccess(res, result.rows[0], 'Location updated');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = LocationController;
