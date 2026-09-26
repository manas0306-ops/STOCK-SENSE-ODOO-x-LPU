const express = require('express');
const ProductController = require('../controllers/productController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, ProductController.list);
router.post('/', requireAuth, ProductController.create);
router.get('/:id', requireAuth, ProductController.getById);
router.put('/:id', requireAuth, ProductController.update);

module.exports = router;
