import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaCloudUploadAlt, FaCheck, FaExclamationCircle, FaSpinner, FaImage } from 'react-icons/fa';
import './TemplateTrainer.css';

const TemplateTrainer = () => {
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [isTraining, setIsTraining] = useState(false);
  const [error, setError] = useState('');
  const [trainingResult, setTrainingResult] = useState(null);
  const [existingTemplates, setExistingTemplates] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Fetch existing templates when component mounts
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get('/api/verify/templates');
      if (response.data.success) {
        setExistingTemplates(response.data.templates);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      setError('Failed to fetch existing templates');
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    // Reset states
    setError('');
    setTrainingResult(null);
    
    if (!selectedFile) {
      return;
    }
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Only JPG and PNG images are allowed');
      return;
    }
    
    // Validate file size (max 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }
    
    setFile(selectedFile);
    
    // Create file preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreview(reader.result);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleTemplateNameChange = (e) => {
    const value = e.target.value;
    
    // Only allow alphanumeric characters, hyphens, and underscores
    if (/^[a-zA-Z0-9-_]*$/.test(value) || value === '') {
      setTemplateName(value);
      setError('');
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleReset = () => {
    setFile(null);
    setFilePreview('');
    setTemplateName('');
    setError('');
    setTrainingResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTrainTemplate = async () => {
    // Validate inputs
    if (!file) {
      setError('Please select a template image');
      return;
    }
    
    if (!templateName.trim()) {
      setError('Please enter a template name');
      return;
    }
    
    if (existingTemplates.includes(templateName)) {
      setError('A template with this name already exists');
      return;
    }
    
    setIsTraining(true);
    setError('');
    setTrainingResult(null);
    
    try {
      const formData = new FormData();
      formData.append('name', templateName);
      formData.append('document', file);
      
      console.log('Sending template training request:', {
        name: templateName,
        fileSize: file.size,
        fileType: file.type
      });
      
      const response = await axios.post('/api/verify/train', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('Template training response:', response.data);
      
      if (response.data.success) {
        setTrainingResult(response.data);
        // Refresh template list
        fetchTemplates();
      } else {
        setError(response.data.message || 'Failed to train template');
      }
    } catch (error) {
      console.error('Error training template:', error);
      setError(error.response?.data?.message || 'Failed to train template. Please try again.');
    } finally {
      setIsTraining(false);
    }
  };

  return (
    <div className="template-trainer">
      <h2>Template Trainer</h2>
      <p className="template-trainer-description">
        Train document templates to use in the document verification system.
      </p>
      
      <div className="template-container">
        <div className="template-upload-section">
          <h3>Upload Template</h3>
          
          <div className="upload-container">
            {!filePreview ? (
              <div className="upload-area" onClick={handleUploadClick}>
                <FaCloudUploadAlt className="upload-icon" />
                <p>Click to upload a template image</p>
                <p className="file-format-info">JPG or PNG, max 5MB</p>
              </div>
            ) : (
              <div className="image-preview-container">
                <img 
                  src={filePreview} 
                  alt="Template Preview" 
                  className="template-preview" 
                />
                <button 
                  className="change-image-btn"
                  onClick={handleUploadClick}
                >
                  Change Image
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="file-input"
              accept="image/jpeg,image/jpg,image/png"
              onChange={handleFileChange}
            />
          </div>
          
          <div className="template-name-input">
            <label htmlFor="templateName">Template Name:</label>
            <input
              type="text"
              id="templateName"
              value={templateName}
              onChange={handleTemplateNameChange}
              placeholder="Enter a unique name (e.g., SSC-Marksheet, Birth-Certificate)"
              maxLength={50}
              disabled={isTraining}
            />
            <span className="input-help">
              Only letters, numbers, hyphens and underscores allowed
            </span>
          </div>
          
          {error && (
            <div className="error-message">
              <FaExclamationCircle /> {error}
            </div>
          )}
          
          <div className="template-buttons">
            <button
              className="train-button"
              onClick={handleTrainTemplate}
              disabled={!file || !templateName || isTraining}
            >
              {isTraining ? (
                <>
                  <FaSpinner className="spinner-icon" /> Training...
                </>
              ) : (
                'Train Template'
              )}
            </button>
            <button
              className="clear-button"
              onClick={handleReset}
              disabled={isTraining}
            >
              Clear
            </button>
          </div>
          
          {trainingResult && (
            <div className="training-result">
              <div className="result-status success">
                <FaCheck className="status-icon" /> Template trained successfully
              </div>
              <div className="template-details">
                <h4>Template Details</h4>
                <div className="detail-item">
                  <span className="detail-label">Name:</span>
                  <span className="detail-value">{trainingResult.name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Features:</span>
                  <span className="detail-value">
                    {trainingResult.features ? Object.keys(trainingResult.features).length : 0} extracted
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="template-info-section">
          <h3>Existing Templates</h3>
          
          <div className="existing-templates">
            {existingTemplates.length > 0 ? (
              <ul className="template-list">
                {existingTemplates.map((template, index) => (
                  <li key={index} className="template-list-item">
                    <FaImage style={{ marginRight: '8px' }} />
                    <span className="template-name">{template}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-templates-message">No templates available</p>
            )}
          </div>
          
          <div className="training-instructions">
            <h4>How to Train a Template</h4>
            <ol>
              <li>Upload a high-quality, clear image of the document</li>
              <li>Enter a unique, descriptive name for the template</li>
              <li>Click "Train Template" and wait for the process to complete</li>
              <li>Use the trained template for document verification</li>
            </ol>
            
            <div className="training-tips">
              <h5>Tips for Best Results:</h5>
              <ul>
                <li>Use clean, well-lit images with clear text</li>
                <li>Ensure the document fills most of the frame</li>
                <li>Include all document edges and corners</li>
                <li>Avoid glare, shadows, and fingerprints</li>
                <li>Use authentic documents as templates</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateTrainer; 