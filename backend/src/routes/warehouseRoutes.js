const express = require('express');
const WarehouseController = require('../controllers/warehouseController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, WarehouseController.list);
router.post('/', requireAuth, WarehouseController.create);
router.put('/:id', requireAuth, WarehouseController.update);

module.exports = router;
