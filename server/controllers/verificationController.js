const certificateVerification = require('../services/certificateVerification');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Ensure the uploads/temp directory exists
        const uploadDir = path.join(__dirname, '../uploads/temp');
        fs.mkdir(uploadDir, { recursive: true })
            .then(() => cb(null, uploadDir))
            .catch(err => cb(err));
    },
    filename: function (req, file, cb) {
        // Generate a unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = function (req, file, cb) {
    // Accept images and PDFs only
    if (!file.originalname.match(/\.(jpg|jpeg|png|pdf)$/)) {
        return cb(new Error('Only image and PDF files are allowed!'), false);
    }
    cb(null, true);
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
}).single('certificate');

const verificationController = {
    async verifyCertificate(req, res) {
        try {
            // Handle file upload with better error handling
            await new Promise((resolve, reject) => {
                upload(req, res, function(err) {
                    if (err instanceof multer.MulterError) {
                        // A Multer error occurred during upload
                        reject({
                            status: 400,
                            message: err.message || 'File upload error',
                            details: err.code
                        });
                    } else if (err) {
                        // An unknown error occurred
                        reject({
                            status: 500,
                            message: err.message || 'Unknown upload error',
                            details: 'File upload failed'
                        });
                    }
                    resolve();
                });
            });

            if (!req.file) {
                throw {
                    status: 400,
                    message: 'No file uploaded',
                    details: 'Please provide a certificate file'
                };
            }

            // Get student data from request body
            const studentData = {
                name: req.body.name,
                email: req.body.email,
                batch: req.body.batch,
                department: req.body.department
            };

            // Validate required fields
            if (!studentData.name) {
                throw {
                    status: 400,
                    message: 'Missing student name',
                    details: 'Student name is required for verification'
                };
            }

            // Verify the certificate
            const verificationResults = await certificateVerification.verifyCertificate(
                req.file.path,
                studentData
            );

            // Clean up the uploaded file
            await fs.unlink(req.file.path).catch(console.error);

            // Return verification results
            res.json({
                success: true,
                verification: verificationResults,
                message: verificationResults.isValid 
                    ? 'Certificate verification successful' 
                    : 'Certificate verification failed'
            });

        } catch (error) {
            // Clean up the uploaded file in case of error
            if (req.file) {
                await fs.unlink(req.file.path).catch(console.error);
            }

            // Send appropriate error response
            const status = error.status || 500;
            const message = error.message || 'Internal server error';
            const details = error.details || 'An unexpected error occurred';

            res.status(status).json({
                success: false,
                message: message,
                details: details
            });
        }
    }
};

module.exports = verificationController; 