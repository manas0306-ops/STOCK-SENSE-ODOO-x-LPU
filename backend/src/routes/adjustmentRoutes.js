const express = require('express');
const AdjustmentController = require('../controllers/adjustmentController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, AdjustmentController.list);
router.post('/', requireAuth, AdjustmentController.create);
router.get('/:id', requireAuth, AdjustmentController.getById);
router.post('/:id/validate', requireAuth, AdjustmentController.validate);

module.exports = router;
