const { query } = require('../config/db');
const { ValidationError } = require('../utils/errors');
const { sendSuccess } = require('../utils/response');

class CategoryController {
  static async list(req, res, next) {
    try {
      const result = await query(
        `SELECT c.id, c.name, COUNT(p.id) as product_count, c.created_at
         FROM categories c
         LEFT JOIN products p ON p.category_id = c.id
         GROUP BY c.id, c.name, c.created_at
         ORDER BY c.name ASC`
      );
      return sendSuccess(res, result.rows, 'Categories fetched');
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      const { name } = req.body;
      if (!name || !name.trim()) {
        throw new ValidationError('Category name is required');
      }

      const result = await query(
        `INSERT INTO categories (name) VALUES ($1) RETURNING *`,
        [name.trim()]
      );
      return sendSuccess(res, result.rows[0], 'Category created', 201);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = CategoryController;
