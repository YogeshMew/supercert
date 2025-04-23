const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { spawn } = require('child_process');

// Python service endpoint
const PYTHON_SERVICE_URL = 'http://localhost:5000';

/**
 * TemplateVerifierService - Service to verify documents against templates
 * using the Python-based verification service
 */
class TemplateVerifierService {
  constructor() {
    this.templatesDir = path.join(__dirname, '../uploads/templates');
    this.tempDir = path.join(__dirname, '../uploads/temp');
    this.verificationThreshold = 0.65; // 65% similarity required for verification
    
    // Ensure directories exist
    if (!fs.existsSync(this.templatesDir)) {
      fs.mkdirSync(this.templatesDir, { recursive: true });
    }
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

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
      console.log(`Training template ${templateName} with image at ${imagePath}`);
      
      // Validate template name
      if (!templateName || typeof templateName !== 'string' || !templateName.trim()) {
        throw new Error('Invalid template name');
      }
      
      // Get template image file extension
      const ext = path.extname(imagePath);
      
      // Copy template to templates directory with proper name
      const templateDestination = path.join(this.templatesDir, `${templateName}${ext}`);
      fs.copyFileSync(imagePath, templateDestination);
      
      // Extract features using Python script
      const pythonScript = path.join(__dirname, '../../scripts/train_template.py');
      
      return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [
          pythonScript,
          templateDestination,
          templateName,
          '--extract-features',
          '--validate-template'
        ]);
        
        let resultData = '';
        let errorData = '';
        
        pythonProcess.stdout.on('data', (data) => {
          resultData += data.toString();
        });
        
        pythonProcess.stderr.on('data', (data) => {
          errorData += data.toString();
          console.error(`Python training error: ${data}`);
        });
        
        pythonProcess.on('close', (code) => {
          if (code !== 0) {
            console.error(`Python process exited with code ${code}`);
            return reject(new Error(`Template training failed: ${errorData}`));
          }
          
          try {
            const result = JSON.parse(resultData);
            
            // Validate training result
            if (!result.features || Object.keys(result.features).length === 0) {
              return reject(new Error('No features extracted from template'));
            }
            
            // Store template metadata
            const metadata = {
              name: templateName,
              path: templateDestination,
              features: result.features,
              createdAt: new Date().toISOString(),
              lastUpdated: new Date().toISOString()
            };
            
            // Save metadata to JSON file
            const metadataPath = path.join(this.templatesDir, `${templateName}.json`);
            fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
            
            resolve({
              success: true,
              templateName,
              features: result.features,
              metadata
            });
          } catch (error) {
            reject(new Error(`Failed to parse Python training result: ${error.message}`));
          }
        });
      });
      
    } catch (error) {
      console.error('Error training template:', error);
      throw new Error(`Template training failed: ${error.message}`);
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