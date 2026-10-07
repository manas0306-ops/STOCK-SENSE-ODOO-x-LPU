const express = require('express');
const ProductController = require('../controllers/productController');
const { requireAuth, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createProductSchema, updateProductSchema } = require('../validators/schemas');

const router = express.Router();

router.get('/', requireAuth, ProductController.list);
router.post('/', requireAuth, requireRole('Inventory Manager'), validate(createProductSchema), ProductController.create);
router.get('/:id', requireAuth, ProductController.getById);
router.put('/:id', requireAuth, requireRole('Inventory Manager'), validate(updateProductSchema), ProductController.update);

module.exports = router;
