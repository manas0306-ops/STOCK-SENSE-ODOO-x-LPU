const express = require('express');
const TransferController = require('../controllers/transferController');
const { requireAuth } = require('../middleware/auth');
const { requireIdempotency } = require('../middleware/idempotency');
const validate = require('../middleware/validate');
const { createTransferSchema } = require('../validators/schemas');

const router = express.Router();

router.get('/', requireAuth, TransferController.list);
router.post('/', requireAuth, validate(createTransferSchema), TransferController.create);
router.get('/:id', requireAuth, TransferController.getById);
router.post('/:id/ready', requireAuth, TransferController.markReady);
router.post('/:id/cancel', requireAuth, TransferController.cancel);
router.post('/:id/validate', requireAuth, requireIdempotency, TransferController.validate);

module.exports = router;
