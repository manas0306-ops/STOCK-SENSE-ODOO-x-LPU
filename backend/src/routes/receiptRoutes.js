const express = require('express');
const ReceiptController = require('../controllers/receiptController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, ReceiptController.list);
router.post('/', requireAuth, ReceiptController.create);
router.get('/:id', requireAuth, ReceiptController.getById);
router.post('/:id/ready', requireAuth, ReceiptController.markReady);
router.post('/:id/validate', requireAuth, ReceiptController.validate);

module.exports = router;
