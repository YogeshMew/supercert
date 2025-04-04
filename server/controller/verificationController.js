const fs = require('fs');
const path = require('path');
const multer = require('multer');
const templateVerifier = require('../services/templateVerifier');
const pythonVerifier = require('../services/pythonVerifier');

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Ensure uploads directory exists
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Use timestamp + original name to avoid conflicts
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

// Configure upload middleware
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
  fileFilter: function (req, file, cb) {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|bmp|tiff)$/i)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
}).single('document');

// Handle file upload with middleware
const handleUpload = (req, res, next) => {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: `Error: ${err.message}` });
    }
    // Continue to the next middleware/controller
    next();
  });
};

// Verify document using Python service (preferred)
const verifyDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No document file provided' });
    }

    // Check if Python service is healthy
    const isPythonServiceRunning = await pythonVerifier.checkHealth();
    
    if (isPythonServiceRunning) {
      // Use Python service for verification
      console.log('Using Python service for document verification');
      const templateName = req.body.template || null;
      const result = await pythonVerifier.verifyDocument(req.file.path, templateName);
      
      return res.json(result);
    } else {
      // Fall back to legacy template verifier
      console.log('Python service unavailable, using legacy verifier');
      const templateName = req.body.template || null;
      
      if (templateName) {
        // Verify against specific template
        const result = await templateVerifier.verifyDocument(req.file.path, templateName);
        return res.json(result);
      } else {
        // Find best matching template
        const result = await templateVerifier.findBestMatchingTemplate(req.file.path);
        return res.json(result);
      }
    }
  } catch (error) {
    console.error('Error in verifyDocument:', error);
    return res.status(500).json({
      success: false,
      message: `Error during verification: ${error.message}`
    });
  }
};

// Train template
const trainTemplate = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No template file provided' });
    }

    const templateName = req.body.name;
    if (!templateName) {
      return res.status(400).json({ success: false, message: 'Template name is required' });
    }

    // Check if template name is valid
    if (!/^[a-zA-Z0-9_-]+$/.test(templateName)) {
      return res.status(400).json({
        success: false,
        message: 'Template name can only contain letters, numbers, hyphens, and underscores'
      });
    }

    // Check if Python service is healthy
    const isPythonServiceRunning = await pythonVerifier.checkHealth();
    
    if (isPythonServiceRunning) {
      // Use Python service for training
      console.log('Using Python service for template training');
      const result = await pythonVerifier.trainTemplate(req.file.path, templateName);
      return res.json(result);
    } else {
      // Fall back to legacy template trainer
      console.log('Python service unavailable, using legacy trainer');
      const result = await templateVerifier.trainTemplate(req.file.path, templateName);
      return res.json(result);
    }
  } catch (error) {
    console.error('Error in trainTemplate:', error);
    return res.status(500).json({
      success: false,
      message: `Error during template training: ${error.message}`
    });
  }
};

// Get available templates
const getTemplates = async (req, res) => {
  try {
    // Check if Python service is healthy
    const isPythonServiceRunning = await pythonVerifier.checkHealth();
    
    if (isPythonServiceRunning) {
      // Use Python service to get templates
      console.log('Using Python service to get templates');
      const templates = await pythonVerifier.getTemplates();
      return res.json({ success: true, templates });
    } else {
      // Fall back to legacy service
      console.log('Python service unavailable, using legacy service');
      const templates = await templateVerifier.getTemplates();
      return res.json({ success: true, templates });
    }
  } catch (error) {
    console.error('Error in getTemplates:', error);
    return res.status(500).json({
      success: false, 
      message: `Error getting templates: ${error.message}`
    });
  }
};

module.exports = {
  handleUpload,
  verifyDocument,
  trainTemplate,
  getTemplates
}; 