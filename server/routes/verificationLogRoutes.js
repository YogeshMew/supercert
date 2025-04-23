const express = require('express');
const router = express.Router();
const verificationLogController = require('../controller/verificationLogController');
const { protect, admin } = require('../middleware/authMiddleware');

// Route for logging verification attempts
router.post('/log', verificationLogController.logVerification);

// Protected routes (admin only)
router.get('/logs', protect, admin, verificationLogController.getLogs);
router.get('/stats', protect, admin, verificationLogController.getVerificationStats);
router.get('/rejection-reasons', protect, admin, verificationLogController.getTopRejectionReasons);

module.exports = router; 