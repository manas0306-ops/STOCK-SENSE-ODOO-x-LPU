const express = require('express');
const LedgerController = require('../controllers/ledgerController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, LedgerController.list);

module.exports = router;
