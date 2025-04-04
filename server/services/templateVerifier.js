const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { spawn } = require('child_process');

class TemplateVerifierService {
  constructor() {
    this.templatesDir = path.join(__dirname, '../uploads/templates');
    this.featureDir = path.join(__dirname, '../data/features');
    this.tempDir = path.join(__dirname, '../uploads/temp');
    this.imageExtractorService = require('./imageExtractor');
    this.pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:5000';
    this.verificationResults = {};
    
    // Ensure templates directory exists
    this.ensureDirectories();
  }

  async ensureDirectories() {
    try {
      if (!fs.existsSync(this.templatesDir)) {
        fs.mkdirSync(this.templatesDir, { recursive: true });
      }
      if (!fs.existsSync(this.featureDir)) {
        fs.mkdirSync(this.featureDir, { recursive: true });
      }
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }
      console.log('Template directories created or verified');
    } catch (error) {
      console.error('Error creating template directories:', error);
    }
  }

  async verifyWithTemplate(documentPath, templateName) {
    try {
      console.log(`Verifying document ${documentPath} against template ${templateName}`);
      
      // First copy the document to the temp directory with a predictable name
      const documentFilename = path.basename(documentPath);
      const tempDocumentPath = path.join(this.tempDir, documentFilename);
      
      fs.copyFileSync(documentPath, tempDocumentPath);
      
      // Method 1: Use Python script with child_process
      return await this.verifyWithPythonScript(tempDocumentPath, templateName);
      
      // Method 2: Call Python API (fallback)
      // return await this.verifyWithPythonAPI(documentPath, templateName);
    } catch (error) {
      console.error('Error in document verification:', error);
      throw new Error(`Verification failed: ${error.message}`);
    }
  }

  async verifyWithPythonScript(documentPath, templateName) {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(__dirname, '../../scripts/verify_document.py');
      
      // Check if debug flag should be enabled
      const debug = process.env.DEBUG_VERIFICATION === 'true';
      
      const args = [
        pythonScript,
        documentPath,
        templateName
      ];
      
      if (debug) {
        args.push('--debug');
      }
      
      const pythonProcess = spawn('python', args);

      let resultData = '';
      let errorData = '';

      pythonProcess.stdout.on('data', (data) => {
        resultData += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
        console.error(`Python verification error: ${data}`);
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`Python process exited with code ${code}`);
          return reject(new Error(`Python verification failed: ${errorData}`));
        }

        try {
          const result = JSON.parse(resultData);
          
          // Update the analysis path to be relative to the server
          if (result.analysis) {
            // Make sure it's a server-relative path
            result.analysis = path.relative(path.join(__dirname, '../..'), result.analysis);
          }
          
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse Python verification result: ${error.message}`));
        }
      });
    });
  }

  async verifyWithPythonAPI(documentPath, templateName) {
    try {
      const formData = new FormData();
      formData.append('document', fs.createReadStream(documentPath));
      formData.append('template', templateName);

      const response = await axios.post(`${this.pythonServiceUrl}/verify`, formData, {
        headers: {
          ...formData.getHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.status !== 200) {
        throw new Error(`API verification failed: ${response.data.message || 'Unknown error'}`);
      }

      return response.data;
    } catch (error) {
      console.error('Error calling Python verification API:', error);
      throw new Error(`API verification failed: ${error.message}`);
    }
  }

  async getAvailableTemplates() {
    try {
      // Get all files in templates directory
      const files = fs.readdirSync(this.templatesDir);
      
      // Filter image files and extract template names
      const templates = files
        .filter(file => /\.(jpg|jpeg|png)$/i.test(file))
        .map(file => path.parse(file).name);
      
      return templates;
    } catch (error) {
      console.error('Error getting available templates:', error);
      throw new Error(`Failed to get available templates: ${error.message}`);
    }
  }

  async trainTemplate(templatePath, templateName) {
    try {
      console.log(`Training template ${templateName} with image at ${templatePath}`);
      
      // Ensure template name is valid
      if (!templateName || typeof templateName !== 'string' || !templateName.trim()) {
        throw new Error('Invalid template name');
      }
      
      // Get template image file extension
      const ext = path.extname(templatePath);
      
      // Copy template to templates directory with proper name
      const templateDestination = path.join(this.templatesDir, `${templateName}${ext}`);
      fs.copyFileSync(templatePath, templateDestination);
      
      // Extract features using Python script
      const pythonScript = path.join(__dirname, '../../scripts/train_template.py');
      
      return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [pythonScript, templateDestination, templateName]);
        
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
            resolve(result);
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

  async findBestMatchingTemplate(documentPath) {
    try {
      console.log(`Finding best matching template for document ${documentPath}`);
      
      // Get available templates
      const templates = await this.getAvailableTemplates();
      
      if (!templates || templates.length === 0) {
        return {
          success: false,
          message: 'No templates available for matching',
          verified: false,
          scores: {
            overall: 0,
            text_similarity: 0,
            layout_similarity: 0,
            seal_similarity: 0
          }
        };
      }
      
      console.log(`Found ${templates.length} templates to match against`);
      
      // Check each template and find the best match
      let bestMatch = null;
      let highestScore = 0;
      const threshold = 0.65; // Minimum score to consider a match
      
      for (const template of templates) {
        console.log(`Checking template: ${template}`);
        
        try {
          // Verify document against this template
          const result = await this.verifyWithTemplate(documentPath, template);
          
          // If verification succeeded and score is higher than current best
          if (result.success && result.scores && result.scores.overall > highestScore) {
            highestScore = result.scores.overall;
            bestMatch = {
              ...result,
              matchedTemplate: template
            };
            
            console.log(`New best match: ${template} with score ${highestScore}`);
            
            // If score is above threshold, we can stop early
            if (highestScore >= threshold) {
              console.log(`Found good match (${highestScore} >= ${threshold}), stopping search`);
              break;
            }
          }
        } catch (error) {
          console.error(`Error matching against template ${template}:`, error);
          // Continue with next template
        }
      }
      
      // Return best match if found, otherwise return not verified
      if (bestMatch && highestScore >= threshold) {
        console.log(`Best matching template: ${bestMatch.matchedTemplate} with score ${highestScore}`);
        return {
          ...bestMatch,
          verified: true
        };
      } else if (bestMatch) {
        console.log(`Best template ${bestMatch.matchedTemplate} with score ${highestScore} below threshold (${threshold})`);
        return {
          ...bestMatch,
          verified: false
        };
      } else {
        console.log('No matching template found');
        return {
          success: true,
          message: 'No matching template found',
          verified: false,
          scores: {
            overall: 0,
            text_similarity: 0,
            layout_similarity: 0,
            seal_similarity: 0
          }
        };
      }
    } catch (error) {
      console.error('Error finding best matching template:', error);
      throw new Error(`Template matching failed: ${error.message}`);
    }
  }
}

module.exports = new TemplateVerifierService(); 