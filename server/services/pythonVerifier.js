const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

class PythonVerifierService {
  constructor() {
    this.baseUrl = 'http://localhost:5000';
    console.log('PythonVerifierService initialized');
  }

  /**
   * Ensure the Python service is running
   * @returns {Promise<boolean>} Whether the service is running
   */
  async checkHealth() {
    try {
      const response = await axios.get(`${this.baseUrl}/health`);
      return response.data.status === 'healthy';
    } catch (error) {
      console.error('Python service health check failed:', error.message);
      return false;
    }
  }

  /**
   * Get list of available templates
   * @returns {Promise<Array>} List of template names
   */
  async getTemplates() {
    try {
      const response = await axios.get(`${this.baseUrl}/templates`);
      if (response.data.success) {
        return response.data.templates;
      }
      return [];
    } catch (error) {
      console.error('Failed to get templates from Python service:', error.message);
      return [];
    }
  }

  /**
   * Train a new template
   * @param {string} imagePath - Path to the template image
   * @param {string} templateName - Name for the template
   * @returns {Promise<Object>} Training result
   */
  async trainTemplate(imagePath, templateName) {
    try {
      const form = new FormData();
      form.append('document', fs.createReadStream(imagePath));
      form.append('name', templateName);

      const response = await axios.post(`${this.baseUrl}/train`, form, {
        headers: {
          ...form.getHeaders()
        }
      });

      return response.data;
    } catch (error) {
      console.error('Failed to train template:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        return error.response.data;
      }
      return {
        success: false,
        message: `Error training template: ${error.message}`
      };
    }
  }

  /**
   * Verify a document against a template
   * @param {string} documentPath - Path to the document image
   * @param {string} [templateName] - Optional template name to verify against
   * @returns {Promise<Object>} Verification result
   */
  async verifyDocument(documentPath, templateName = null) {
    try {
      const form = new FormData();
      form.append('document', fs.createReadStream(documentPath));
      
      if (templateName) {
        form.append('template', templateName);
      }

      const response = await axios.post(`${this.baseUrl}/verify`, form, {
        headers: {
          ...form.getHeaders()
        }
      });

      return response.data;
    } catch (error) {
      console.error('Failed to verify document:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        return error.response.data;
      }
      return {
        success: false,
        message: `Error verifying document: ${error.message}`
      };
    }
  }
}

module.exports = new PythonVerifierService(); 