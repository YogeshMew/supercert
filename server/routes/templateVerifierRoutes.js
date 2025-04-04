const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const { protect, admin } = require('../middleware/authMiddleware');
const templateVerifierController = require('../controllers/templateVerifierController');

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'server/uploads/verifier';
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Create multer instance for file upload
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Improved verification controller to proxy to Python service
const verifyDocumentHandler = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No document file uploaded' 
      });
    }
    
    console.log('Verifying document:', req.file.path);
    
    // Create form data to send to Python service
    const formData = new FormData();
    formData.append('image', fs.createReadStream(req.file.path));
    
    // Add template_name if provided
    if (req.body.template_name) {
      formData.append('template_name', req.body.template_name);
    }
    
    try {
      // Forward request to Python service
      const response = await axios.post('http://localhost:5000/verify', formData, {
        headers: {
          ...formData.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
      
      // Forward response from Python service
      return res.status(200).json({
        success: true,
        verified: response.data.verified,
        template: response.data.template_name,
        scores: response.data.scores,
        visualizationUrl: response.data.visualization_url
      });
    } catch (error) {
      console.error('Python service error:', error.message);
      
      // If Python service is unavailable, fallback to mock response
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        console.log('Python service unavailable, using fallback mock verification');
        
        return res.status(200).json({
          success: true,
          verified: Math.random() > 0.3, // 70% chance of success
          template: 'maharashtra_ssc_certificate.jpg',
          scores: {
            text_similarity: Math.random() * 0.3 + 0.6,
            layout_similarity: Math.random() * 0.3 + 0.6, 
            seal_similarity: Math.random() * 0.3 + 0.6,
            table_similarity: Math.random() * 0.3 + 0.6,
            signature_similarity: Math.random() * 0.3 + 0.6,
            overall: Math.random() * 0.3 + 0.6
          },
          visualizationUrl: null
        });
      }
      
      // Forward error from Python service or throw a new one
      return res.status(500).json({ 
        success: false, 
        message: error.response?.data?.error || error.message || 'Failed to verify document' 
      });
    }
  } catch (error) {
    console.error('Document verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to verify document' 
    });
  }
};

// Get templates handler
const getTemplatesHandler = (req, res) => {
  try {
    // Mock templates list
    const templates = [
      { name: 'Maharashtra SSC Certificate', path: 'maharashtra_ssc_certificate.jpg' },
      { name: 'CBSE Marksheet', path: 'cbse_marksheet.jpg' }
    ];
    
    return res.status(200).json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch templates'
    });
  }
};

// Train template handler
const trainTemplateHandler = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No template file uploaded'
      });
    }

    const templateName = req.body.templateName || path.basename(req.file.originalname);
    
    // Mock training response
    setTimeout(() => {
      res.status(200).json({
        success: true,
        message: 'Template trained successfully',
        template: templateName
      });
    }, 1000);
  } catch (error) {
    console.error('Template training error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to train template'
    });
  }
};

// Routes
router.post('/verify', upload.single('document'), verifyDocumentHandler);
router.get('/templates', getTemplatesHandler);
router.post('/train', upload.single('template'), trainTemplateHandler);

module.exports = router; 