const templateTrainer = require('../services/templateTrainer');
const templateValidator = require('../services/templateValidator');
const path = require('path');

class TemplateController {
    async trainTemplate(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'No template file uploaded'
                });
            }

            const imagePath = req.file.path;
            const templateType = req.body.templateType || 'SSC';

            const result = await templateTrainer.trainFromImage(imagePath, templateType);

            if (result.success) {
                res.json({
                    success: true,
                    message: 'Template trained successfully',
                    patterns: templateTrainer.getPatterns()
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: result.error || 'Failed to train template'
                });
            }
        } catch (error) {
            console.error('Template training error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async getTemplatePatterns(req, res) {
        try {
            const patterns = templateTrainer.getPatterns();
            res.json({
                success: true,
                patterns
            });
        } catch (error) {
            console.error('Error fetching template patterns:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    
    async validateExtractedData(req, res) {
        try {
            const extractedData = req.body;
            
            if (!extractedData) {
                return res.status(400).json({
                    success: false,
                    error: 'No data provided for validation'
                });
            }
            
            const validationResults = templateValidator.validateExtractedData(extractedData);
            
            res.json({
                success: true,
                isValid: validationResults.isValid,
                matchedPatterns: validationResults.matchedPatterns,
                missingPatterns: validationResults.missingPatterns,
                details: validationResults.details
            });
        } catch (error) {
            console.error('Validation error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = new TemplateController(); 