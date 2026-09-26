const express = require('express');
const TransferController = require('../controllers/transferController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, TransferController.list);
router.post('/', requireAuth, TransferController.create);
router.get('/:id', requireAuth, TransferController.getById);
router.post('/:id/ready', requireAuth, TransferController.markReady);
router.post('/:id/validate', requireAuth, TransferController.validate);

module.exports = router;
