const express = require('express');
const path = require('path');
const { protect, admin } = require('../middleware/authMiddleware');
const {
  uploadMiddleware,
  verifyDocument,
  getTemplates,
  trainTemplate
} = require('../controller/templateVerifierController');
const verificationController = require('../controller/verificationController');
const fs = require('fs');

const router = express.Router();

// @desc    Get analysis image
// @route   GET /api/verify/analysis/:filename
// @access  Public
router.get('/analysis/:filename', (req, res) => {
  const filename = req.params.filename;
  
  // First check the server temp directory
  let filePath = path.join(__dirname, '../uploads/temp', filename);
  
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  
  // If not found in server temp, check Python service temp directory
  filePath = path.join(__dirname, '../../pythonService/temp', filename);
  
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error(`Analysis image not found: ${filename}`, err);
      res.status(404).json({
        success: false,
        message: 'Analysis image not found'
      });
    }
  });
});

// Public routes
router.post('/document', verificationController.handleUpload, verificationController.verifyDocument);
router.get('/templates', verificationController.getTemplates);

// Admin routes
router.post('/train', protect, admin, verificationController.handleUpload, verificationController.trainTemplate);

module.exports = router; 