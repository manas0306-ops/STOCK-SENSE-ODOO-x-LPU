const express = require('express');
const ReceiptController = require('../controllers/receiptController');
const { requireAuth } = require('../middleware/auth');
const { requireIdempotency } = require('../middleware/idempotency');
const validate = require('../middleware/validate');
const { createReceiptSchema } = require('../validators/schemas');

const router = express.Router();

router.get('/', requireAuth, ReceiptController.list);
router.post('/', requireAuth, validate(createReceiptSchema), ReceiptController.create);
router.get('/:id', requireAuth, ReceiptController.getById);
router.post('/:id/ready', requireAuth, ReceiptController.markReady);
router.post('/:id/cancel', requireAuth, ReceiptController.cancel);
router.post('/:id/validate', requireAuth, requireIdempotency, ReceiptController.validate);

module.exports = router;
