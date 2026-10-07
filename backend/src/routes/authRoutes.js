const express = require('express');
const AuthController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { authLimiter, otpLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/register', authLimiter, AuthController.register);
router.post('/login', authLimiter, AuthController.login);
router.post('/logout', requireAuth, AuthController.logout);
router.get('/me', requireAuth, AuthController.getMe);
router.post('/forgot-password', otpLimiter, AuthController.forgotPassword);
router.post('/reset-password', otpLimiter, AuthController.resetPassword);

module.exports = router;
