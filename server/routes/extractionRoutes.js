const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect, admin } = require('../middleware/authMiddleware');

// Configure storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'server/uploads/extraction';
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'extract-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Create upload instance
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Accept images and PDFs
    const filetypes = /jpeg|jpg|png|pdf/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image and PDF files are allowed'));
  }
});

// Mock function for document data extraction
const extractData = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Mock extraction process
    const extractedData = {
      studentName: 'Sample Student',
      board: 'MAHARASHTRA STATE BOARD',
      program: 'SSC',
      seatNumber: 'S123456',
      examYear: '2023',
      subjects: [
        { name: 'English', score: '85' },
        { name: 'Mathematics', score: '90' },
        { name: 'Science', score: '82' }
      ]
    };
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    res.status(200).json({
      success: true,
      extractedData
    });
  } catch (error) {
    console.error('Extraction error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Data extraction failed'
    });
  }
};

// PDF Generation endpoint
const generatePdf = async (req, res) => {
  try {
    // Check for required data
    if (!req.body) {
      return res.status(400).json({
        success: false,
        message: 'No data provided for PDF generation'
      });
    }
    
    // In a real implementation, this would generate a PDF
    // For now, return a mock PDF as a blob
    
    // Generate sample PDF data
    const pdfBuffer = Buffer.from('Mock PDF content');
    
    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=transcript.pdf');
    
    // Send the PDF buffer
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'PDF generation failed'
    });
  }
};

// Routes
router.post('/extract-data', upload.single('document'), extractData);
router.post('/generate-pdf', generatePdf);

module.exports = router; 