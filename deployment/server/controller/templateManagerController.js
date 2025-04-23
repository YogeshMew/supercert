const asyncHandler = require('express-async-handler');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const templateManagerService = require('../services/templateManager');
const imageExtractorService = require('../services/imageExtractor');

// Create the uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads/templates');
fs.mkdirSync(uploadDir, { recursive: true });

// Set up storage for uploaded reference templates
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname) || '.jpg';
        cb(null, 'template-' + uniqueSuffix + ext);
    }
});

// Check if file is an image
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/tiff'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

// Create upload middleware with error handling
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB
    }
}).single('template');

// Wrapped middleware to handle multer errors
const uploadMiddleware = (req, res, next) => {
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({
                    success: false,
                    message: 'File is too large (max 10MB)'
                });
            }
            return res.status(400).json({
                success: false,
                message: `Upload error: ${err.message}`
            });
        } else if (err) {
            // Other errors
            return res.status(500).json({
                success: false,
                message: `Upload error: ${err.message}`
            });
        }
        next();
    });
};

// @desc    Upload a new reference template
// @route   POST /api/templates/reference
// @access  Admin
const addReferenceTemplate = asyncHandler(async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No template image file uploaded'
            });
        }

        const { board, program, description, notes } = req.body;

        if (!board || !program) {
            return res.status(400).json({
                success: false,
                message: 'Board name and program type are required'
            });
        }

        // Check if this is a Maharashtra SSC template based on the form data
        const isMaharashtraSSC = 
            board.toUpperCase().includes('MAHARASHTRA') && 
            program.toUpperCase().includes('SSC');
            
        console.log(`Processing template upload. Maharashtra SSC detected: ${isMaharashtraSSC}`);

        // Add the reference template
        let templateData = null;
        
        try {
            templateData = await templateManagerService.addReferenceTemplate(
                req.file,
                board,
                program,
                { description, notes }
            );
            
            // For Maharashtra SSC templates, ensure we have basic data even if extraction failed
            if (isMaharashtraSSC && templateData) {
                console.log("Ensuring Maharashtra SSC template has basic data");
                
                // If extraction failed but we know it's Maharashtra SSC, manually set these values
                if (!templateData.extractedData || 
                    (!templateData.extractedData.board && !templateData.extractedData.program)) {
                    
                    console.log("Extraction failed - setting default Maharashtra SSC values");
                    
                    // Create or update extractedData object with known values
                    templateData.extractedData = templateData.extractedData || {};
                    templateData.extractedData.board = "MAHARASHTRA STATE BOARD";
                    templateData.extractedData.program = "SSC";
                    
                    // Also update the source template record
                    await templateManagerService.updateReferenceTemplate(templateData.id, {
                        extractedData: templateData.extractedData
                    });
                    
                    console.log("Updated template with default Maharashtra SSC values");
                }
            }
        } catch (extractionError) {
            console.error("Error during template extraction:", extractionError);
            
            // If extraction fails for Maharashtra SSC, still create a template with default values
            if (isMaharashtraSSC) {
                console.log("Creating Maharashtra SSC template with default values despite extraction failure");
                
                // Create a basic template with known values
                templateData = await templateManagerService.addBasicTemplate(
                    req.file,
                    "MAHARASHTRA STATE BOARD",
                    "SSC",
                    {
                        description: description || "Maharashtra SSC Template",
                        notes: notes || "Created with default values due to extraction failure"
                    },
                    { board: "MAHARASHTRA STATE BOARD", program: "SSC" } // Default extracted data
                );
            } else {
                // For other templates, propagate the error
                throw extractionError;
            }
        }

        res.status(201).json({
            success: true,
            message: 'Reference template added successfully',
            template: templateData
        });
    } catch (error) {
        console.error('Error adding reference template:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to add reference template'
        });
    }
});

// @desc    Get all reference templates
// @route   GET /api/templates/reference
// @access  Admin
const getAllReferenceTemplates = asyncHandler(async (req, res) => {
    try {
        const templates = await templateManagerService.getAllReferenceTemplates();
        
        // Clean up the response to avoid sending large raw text data
        const simplifiedTemplates = templates.map(template => ({
            id: template.id,
            board: template.board,
            program: template.program,
            timestamp: template.timestamp,
            metadata: template.metadata,
            filename: template.filename,
            extractedFields: {
                studentName: template.extractedData?.studentName || null,
                board: template.extractedData?.board || null,
                program: template.extractedData?.program || null,
                examYear: template.extractedData?.examYear || null,
                hasSubjects: !!template.extractedData?.subjects,
                subjectCount: template.extractedData?.subjects ? 
                    (Array.isArray(template.extractedData.subjects) ? 
                        template.extractedData.subjects.length : 
                        Object.keys(template.extractedData.subjects).length) : 0
            }
        }));
        
        res.status(200).json({
            success: true,
            count: simplifiedTemplates.length,
            templates: simplifiedTemplates
        });
    } catch (error) {
        console.error('Error getting reference templates:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get reference templates'
        });
    }
});

// @desc    Get a specific reference template by ID
// @route   GET /api/templates/reference/:id
// @access  Admin
const getReferenceTemplateById = asyncHandler(async (req, res) => {
    try {
        const template = await templateManagerService.getReferenceTemplateById(req.params.id);
        
        if (!template) {
            return res.status(404).json({
                success: false,
                message: `Template with ID ${req.params.id} not found`
            });
        }
        
        res.status(200).json({
            success: true,
            template
        });
    } catch (error) {
        console.error(`Error getting reference template with ID ${req.params.id}:`, error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get reference template'
        });
    }
});

// @desc    Delete a reference template
// @route   DELETE /api/templates/reference/:id
// @access  Admin
const deleteReferenceTemplate = asyncHandler(async (req, res) => {
    try {
        const result = await templateManagerService.deleteReferenceTemplate(req.params.id);
        
        res.status(200).json({
            success: true,
            message: result.message
        });
    } catch (error) {
        console.error(`Error deleting reference template with ID ${req.params.id}:`, error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete reference template'
        });
    }
});

// @desc    Update a reference template metadata
// @route   PUT /api/templates/reference/:id
// @access  Admin
const updateReferenceTemplate = asyncHandler(async (req, res) => {
    try {
        const { board, program, description, notes } = req.body;
        
        const updates = {
            metadata: { description, notes }
        };
        
        if (board) updates.board = board;
        if (program) updates.program = program;
        
        const updatedTemplate = await templateManagerService.updateReferenceTemplate(req.params.id, updates);
        
        res.status(200).json({
            success: true,
            message: 'Template updated successfully',
            template: updatedTemplate
        });
    } catch (error) {
        console.error(`Error updating reference template with ID ${req.params.id}:`, error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update reference template'
        });
    }
});

// @desc    Match uploaded image with reference templates
// @route   POST /api/templates/match
// @access  Admin
const matchWithReferenceTemplates = asyncHandler(async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file uploaded'
            });
        }
        
        console.log(`Processing uploaded file: ${req.file.path}, size: ${req.file.size} bytes`);
        
        // Check file size (max 50MB)
        if (req.file.size > 50 * 1024 * 1024) {
            throw new Error('File size too large (max 50MB)');
        }
        
        // Check file type
        const allowedFileTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedFileTypes.includes(req.file.mimetype)) {
            throw new Error(`Invalid file type: ${req.file.mimetype}. Allowed types: ${allowedFileTypes.join(', ')}`);
        }
        
        // Extract data from the image with improved error handling
        let extractedData;
        try {
            console.log('Extracting data from uploaded image for template matching...');
            extractedData = await imageExtractorService.extractDataFromImage(req.file.path);
            console.log('Successfully extracted data from image');
        } catch (extractionError) {
            console.error('Error extracting data from image:', extractionError);
            return res.status(400).json({
                success: false,
                message: `Image extraction failed: ${extractionError.message}`,
                details: {
                    file: req.file.originalname,
                    error: extractionError.message,
                    extractedText: extractionError.extractedText || 'No text extracted'
                }
            });
        }
        
        // Match the extracted data with reference templates
        console.log('Matching extracted data with reference templates...');
        const matchResult = await templateManagerService.matchWithReferenceTemplates(extractedData);
        console.log(`Template matching result: ${matchResult.matched ? 'MATCHED' : 'NOT MATCHED'}`);
        
        res.status(200).json({
            success: true,
            extractedData: {
                studentName: extractedData.studentName,
                board: extractedData.board,
                program: extractedData.program,
                seatNumber: extractedData.seatNumber,
                rollNumber: extractedData.rollNumber,
                examYear: extractedData.examYear,
                subjects: extractedData.subjects ? 
                    (typeof extractedData.subjects === 'object' ? 
                        Object.keys(extractedData.subjects).length : 
                        'N/A') : 
                    'None detected'
            },
            matchResult
        });
    } catch (error) {
        console.error('Error in template matching:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to match with reference templates'
        });
    } finally {
        // Clean up uploaded file
        if (req.file && req.file.path) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting uploaded file:', err);
            });
        }
    }
});

// @desc    Get template image by ID
// @route   GET /api/templates/reference/:id/image
// @access  Admin
const getTemplateImage = asyncHandler(async (req, res) => {
    try {
        const template = await templateManagerService.getReferenceTemplateById(req.params.id);
        
        if (!template || !template.imagePath) {
            return res.status(404).json({
                success: false,
                message: `Template image with ID ${req.params.id} not found`
            });
        }
        
        // Check if file exists
        if (!fs.existsSync(template.imagePath)) {
            return res.status(404).json({
                success: false,
                message: 'Template image file not found on server'
            });
        }
        
        // Send the file
        res.sendFile(template.imagePath);
    } catch (error) {
        console.error(`Error getting template image with ID ${req.params.id}:`, error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get template image'
        });
    }
});

module.exports = {
    uploadMiddleware,
    addReferenceTemplate,
    getAllReferenceTemplates,
    getReferenceTemplateById,
    deleteReferenceTemplate,
    updateReferenceTemplate,
    matchWithReferenceTemplates,
    getTemplateImage
}; 