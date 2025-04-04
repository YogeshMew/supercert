// Conditionally load Document model
let Document;
try {
    Document = require('../models/Document');
} catch (err) {
    console.warn('Document model not available:', err.message);
}

const asyncHandler = require('express-async-handler');

// @desc    Extract data from document image
// @route   POST /api/documents/extract
// @access  Admin
const extractDocumentData = asyncHandler(async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No document file uploaded'
            });
        }

        // Get the uploaded file path
        const documentPath = req.file.path;

        // Use the imageExtractor service directly without template matching
        const imageExtractorService = require('../services/imageExtractor');
        const extractedData = await imageExtractorService.extractDataFromImage(documentPath);

        // Return the extracted data
        res.status(200).json({
            success: true,
            message: 'Document data extracted successfully',
            extractedData
        });
    } catch (error) {
        console.error('Error extracting document data:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to extract document data'
        });
    }
});

module.exports = {
    extractDocumentData
}; 