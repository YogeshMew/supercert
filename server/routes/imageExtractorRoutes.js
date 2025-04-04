const express = require('express');
const router = express.Router();
const {
  uploadMiddleware,
  extractImageData,
  testImageExtraction,
  generatePdfFromData
} = require('../controller/imageExtractorController');
const validateToken = require('../middleware/validateTokenHandler');

// Public routes - no authentication required
router.post('/image', uploadMiddleware, extractImageData);
router.post('/generate-pdf', (req, res, next) => {
  // Set a longer timeout (2 minutes) for PDF generation
  req.setTimeout(120000);
  next();
}, generatePdfFromData);

// Protected routes requiring authentication
router.use(validateToken);

// Test route with sample image (protected)
router.get('/test', testImageExtraction);

module.exports = router; 