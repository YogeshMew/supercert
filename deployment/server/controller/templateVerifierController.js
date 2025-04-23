const multer = require('multer');
const path = require('path');
const fs = require('fs');
const asyncHandler = require('express-async-handler');
const templateVerifierService = require('../services/templateVerifier');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'doc-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB size limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb('Error: Only images (JPEG, PNG) are allowed!');
    }
  }
});

// Middleware to handle file uploads
const uploadMiddleware = upload.single('document');

// @desc    Verify a document against a template
// @route   POST /api/verify/document
// @access  Public
const verifyDocument = asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No document file uploaded'
      });
    }

    const documentPath = req.file.path;
    const { template } = req.body;
    let verificationResult;

    // If a specific template is provided, verify against that specific template
    if (template) {
      verificationResult = await templateVerifierService.verifyWithTemplate(documentPath, template);
      verificationResult.matchedTemplate = template;
    }
    // If no template provided, perform auto-matching against all available templates
    else {
      verificationResult = await templateVerifierService.findBestMatchingTemplate(documentPath);
    }

    // Delete the uploaded file after verification
    fs.unlink(documentPath, (err) => {
      if (err) {
        console.error(`Error deleting uploaded file ${documentPath}: ${err.message}`);
      }
    });

    // Return the verification result
    res.status(200).json({
      success: true,
      message: 'Document verification completed',
      verified: verificationResult.verified,
      scores: verificationResult.scores,
      analysis: verificationResult.analysis,
      matchedTemplate: verificationResult.matchedTemplate
    });

  } catch (error) {
    console.error('Error verifying document:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify document'
    });
  }
});

// @desc    Get available templates
// @route   GET /api/verify/templates
// @access  Public
const getTemplates = asyncHandler(async (req, res) => {
  try {
    const templates = await templateVerifierService.getAvailableTemplates();

    res.status(200).json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get templates'
    });
  }
});

// @desc    Train a new template
// @route   POST /api/verify/train
// @access  Private/Admin
const trainTemplate = asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No template file uploaded'
      });
    }

    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Template name is required'
      });
    }

    // Store template in templates directory
    const templateDir = path.join(__dirname, '../uploads/templates');
    if (!fs.existsSync(templateDir)) {
      fs.mkdirSync(templateDir, { recursive: true });
    }

    const templatePath = path.join(templateDir, `${name}${path.extname(req.file.originalname)}`);

    // Copy file to templates directory
    fs.copyFileSync(req.file.path, templatePath);

    // Train the template
    const trainingResult = await templateVerifierService.trainTemplate(templatePath, name);

    // Delete the uploaded file after training
    fs.unlink(req.file.path, (err) => {
      if (err) {
        console.error(`Error deleting uploaded file ${req.file.path}: ${err.message}`);
      }
    });

    // Return the training result
    res.status(200).json({
      success: true,
      message: 'Template training completed',
      name,
      features: trainingResult.features,
      metadata: trainingResult.metadata
    });

  } catch (error) {
    console.error('Error training template:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to train template'
    });
  }
});

module.exports = {
  uploadMiddleware,
  verifyDocument,
  getTemplates,
  trainTemplate
}; 