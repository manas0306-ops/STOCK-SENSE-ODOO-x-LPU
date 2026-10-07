const express = require('express');
const CategoryController = require('../controllers/categoryController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, CategoryController.list);
router.post('/', requireAuth, requireRole('Inventory Manager'), CategoryController.create);

module.exports = router;
