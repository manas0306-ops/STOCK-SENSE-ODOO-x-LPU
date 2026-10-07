const express = require('express');
const WarehouseController = require('../controllers/warehouseController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, WarehouseController.list);
router.post('/', requireAuth, requireRole('Inventory Manager'), WarehouseController.create);
router.put('/:id', requireAuth, requireRole('Inventory Manager'), WarehouseController.update);

module.exports = router;
