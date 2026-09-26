const express = require('express');
const CategoryController = require('../controllers/categoryController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, CategoryController.list);
router.post('/', requireAuth, CategoryController.create);

module.exports = router;
