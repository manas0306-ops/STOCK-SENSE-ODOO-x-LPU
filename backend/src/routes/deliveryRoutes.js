const express = require('express');
const DeliveryController = require('../controllers/deliveryController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, DeliveryController.list);
router.post('/', requireAuth, DeliveryController.create);
router.get('/:id', requireAuth, DeliveryController.getById);
router.post('/:id/ready', requireAuth, DeliveryController.markReady);
router.post('/:id/validate', requireAuth, DeliveryController.validate);

module.exports = router;
