const express = require('express');
const LocationController = require('../controllers/locationController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, LocationController.list);
router.post('/', requireAuth, LocationController.create);
router.put('/:id', requireAuth, LocationController.update);

module.exports = router;
