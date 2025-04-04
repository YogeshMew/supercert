const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const documentController = require('../controller/documentController');
const multer = require('multer');
const path = require('path');

// Configure multer for document uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'server/uploads/documents');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'document-' + uniqueSuffix + ext);
    }
});

// Create multer upload instance
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        // Accept only images
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed'));
    }
});

// Route for extracting data from document
router.post('/extract', protect, admin, upload.single('document'), documentController.extractDocumentData);

// Add more document routes as needed
// ... 

module.exports = router; 