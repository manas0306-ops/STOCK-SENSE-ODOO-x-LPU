const express = require('express');
const DeliveryController = require('../controllers/deliveryController');
const { requireAuth } = require('../middleware/auth');
const { requireIdempotency } = require('../middleware/idempotency');
const validate = require('../middleware/validate');
const { createDeliverySchema } = require('../validators/schemas');

const router = express.Router();

router.get('/', requireAuth, DeliveryController.list);
router.post('/', requireAuth, validate(createDeliverySchema), DeliveryController.create);
router.get('/:id', requireAuth, DeliveryController.getById);
router.post('/:id/ready', requireAuth, DeliveryController.markReady);
router.post('/:id/cancel', requireAuth, DeliveryController.cancel);
router.post('/:id/validate', requireAuth, requireIdempotency, DeliveryController.validate);

module.exports = router;
