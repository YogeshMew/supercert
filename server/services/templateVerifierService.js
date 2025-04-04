const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Python service endpoint
const PYTHON_SERVICE_URL = 'http://localhost:5000';

/**
 * TemplateVerifierService - Service to verify documents against templates
 * using the Python-based verification service
 */
class TemplateVerifierService {
  /**
   * Check if the Python verification service is running
   * @returns {Promise<boolean>} True if service is running
   */
  async isServiceRunning() {
    try {
      const response = await axios.get(`${PYTHON_SERVICE_URL}/health`, {
        timeout: 5000 // 5 second timeout
      });
      return response.status === 200;
    } catch (error) {
      logger.error('Verification service health check failed:', error.message);
      return false;
    }
  }

  /**
   * Get list of available templates
   * @returns {Promise<Array>} List of templates
   */
  async getTemplates() {
    try {
      const response = await axios.get(`${PYTHON_SERVICE_URL}/templates`);
      return response.data.templates;
    } catch (error) {
      logger.error('Failed to get templates:', error.message);
      throw new Error('Failed to retrieve templates from verification service');
    }
  }

  /**
   * Train a new template
   * @param {string} imagePath Path to template image
   * @param {string} templateName Name for the template
   * @returns {Promise<Object>} Training result
   */
  async trainTemplate(imagePath, templateName) {
    try {
      const formData = new FormData();
      formData.append('image', fs.createReadStream(imagePath));
      
      if (templateName) {
        formData.append('template_name', templateName);
      }

      const response = await axios.post(`${PYTHON_SERVICE_URL}/train`, formData, {
        headers: {
          ...formData.getHeaders()
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to train template:', error.message);
      throw new Error('Failed to train template: ' + (error.response?.data?.error || error.message));
    }
  }

  /**
   * Verify a document against a specific template or auto-match
   * @param {string} documentPath Path to document image
   * @param {string} templateName (Optional) Template name to match against
   * @returns {Promise<Object>} Verification result
   */
  async verifyDocument(documentPath, templateName = null) {
    try {
      // Check if service is running
      const isRunning = await this.isServiceRunning();
      if (!isRunning) {
        throw new Error('Verification service is not running');
      }

      const formData = new FormData();
      formData.append('image', fs.createReadStream(documentPath));
      
      if (templateName) {
        formData.append('template_name', templateName);
      }

      const response = await axios.post(`${PYTHON_SERVICE_URL}/verify`, formData, {
        headers: {
          ...formData.getHeaders()
        }
      });

      // Add absolute URL to visualization
      if (response.data.visualization_url) {
        response.data.visualization_url = `${PYTHON_SERVICE_URL}${response.data.visualization_url}`;
      }

      return response.data;
    } catch (error) {
      logger.error('Document verification failed:', error.message);
      if (error.response && error.response.data) {
        logger.error('Verification service response:', error.response.data);
      }
      throw new Error('Failed to verify document: ' + (error.response?.data?.error || error.message));
    }
  }

  /**
   * Find the best matching template for a document
   * @param {string} documentPath Path to document image
   * @returns {Promise<Object>} Best matching template result
   */
  async findBestMatchingTemplate(documentPath) {
    return this.verifyDocument(documentPath);
  }
}

module.exports = new TemplateVerifierService(); 