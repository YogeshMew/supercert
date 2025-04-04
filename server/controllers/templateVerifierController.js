const path = require('path');
const fs = require('fs');
const templateVerifierService = require('../services/templateVerifierService');
const logger = require('../utils/logger');

/**
 * Controller for template verification functionality
 */
const templateVerifierController = {
  /**
   * Verify a document against a template or auto-match
   * @param {Object} req Express request object
   * @param {Object} res Express response object
   */
  async verifyDocument(req, res) {
    try {
      // Check if document file exists
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'No document file uploaded' 
        });
      }

      // Get template name if provided
      const templateName = req.body.templateName || null;
      
      // Verify the document
      const result = await templateVerifierService.verifyDocument(
        req.file.path,
        templateName
      );
      
      return res.status(200).json({
        success: true,
        verified: result.verified,
        template: result.template_name,
        scores: result.scores,
        visualizationUrl: result.visualization_url
      });
    } catch (error) {
      logger.error('Document verification error:', error);
      return res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to verify document' 
      });
    }
  },

  /**
   * Get list of available templates
   * @param {Object} req Express request object
   * @param {Object} res Express response object 
   */
  async getTemplates(req, res) {
    try {
      const templates = await templateVerifierService.getTemplates();
      return res.status(200).json({
        success: true,
        templates
      });
    } catch (error) {
      logger.error('Error fetching templates:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch templates'
      });
    }
  },

  /**
   * Train a new template
   * @param {Object} req Express request object
   * @param {Object} res Express response object
   */
  async trainTemplate(req, res) {
    try {
      // Check if template file exists
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No template file uploaded'
        });
      }

      const templateName = req.body.templateName || path.basename(req.file.originalname);
      
      // Train the template
      const result = await templateVerifierService.trainTemplate(
        req.file.path,
        templateName
      );
      
      return res.status(200).json({
        success: true,
        message: 'Template trained successfully',
        template: result.template_name
      });
    } catch (error) {
      logger.error('Template training error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to train template'
      });
    }
  }
};

module.exports = templateVerifierController; 