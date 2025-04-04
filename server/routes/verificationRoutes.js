const express = require('express');
const router = express.Router();
const verificationController = require('../controllers/verificationController');
const validateToken = require('../middleware/validateTokenHandler');

// Public routes (no authentication required)
router.post('/certificate', verificationController.verifyCertificate);

// Protected routes (authentication required)
// Add any protected verification routes below
// router.use(validateToken);
// router.post('/protected-route', verificationController.protectedVerificationMethod);

module.exports = router; 