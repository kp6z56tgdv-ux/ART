const express = require('express');
const router = express.Router();
const { login, cambiarPassword, solicitarResetPassword, resetPassword } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/login', login);
router.put('/cuenta', authMiddleware, cambiarPassword);
router.post('/reset-password', solicitarResetPassword);
router.post('/reset-password-confirm', resetPassword);

module.exports = router;
