const express = require('express');
const DashboardController = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, DashboardController.getSummary);
router.get('/summary', requireAuth, DashboardController.getSummary);

module.exports = router;
