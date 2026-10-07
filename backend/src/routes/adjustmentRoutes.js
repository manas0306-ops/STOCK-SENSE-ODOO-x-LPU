const express = require('express');
const AdjustmentController = require('../controllers/adjustmentController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, AdjustmentController.list);
router.post('/', requireAuth, requireRole('Inventory Manager'), AdjustmentController.create);
router.get('/:id', requireAuth, AdjustmentController.getById);
router.post('/:id/validate', requireAuth, requireRole('Inventory Manager'), AdjustmentController.validate);

module.exports = router;
