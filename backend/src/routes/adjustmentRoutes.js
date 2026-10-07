const express = require('express');
const AdjustmentController = require('../controllers/adjustmentController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireIdempotency } = require('../middleware/idempotency');
const validate = require('../middleware/validate');
const { createAdjustmentSchema } = require('../validators/schemas');

const router = express.Router();

router.get('/', requireAuth, AdjustmentController.list);
router.post('/', requireAuth, requireRole('Inventory Manager'), validate(createAdjustmentSchema), AdjustmentController.create);
router.get('/:id', requireAuth, AdjustmentController.getById);
router.post('/:id/cancel', requireAuth, requireRole('Inventory Manager'), AdjustmentController.cancel);
router.post('/:id/validate', requireAuth, requireRole('Inventory Manager'), requireIdempotency, AdjustmentController.validate);

module.exports = router;
