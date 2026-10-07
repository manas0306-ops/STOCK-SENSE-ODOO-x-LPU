const express = require('express');
const ProductController = require('../controllers/productController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, ProductController.list);
router.post('/', requireAuth, requireRole('Inventory Manager'), ProductController.create);
router.get('/:id', requireAuth, ProductController.getById);
router.put('/:id', requireAuth, requireRole('Inventory Manager'), ProductController.update);

module.exports = router;
