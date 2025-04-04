import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DocumentVerification.css';

const DocumentVerification = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [verificationResults, setVerificationResults] = useState(null);
  const [error, setError] = useState(null);

  // Fetch available templates on component mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await axios.get('/api/verify/templates');
        if (response.data.success && response.data.templates.length > 0) {
          setTemplates(response.data.templates);
          setSelectedTemplate(response.data.templates[0]);
        }
      } catch (err) {
        console.error('Error fetching templates:', err);
        setError('Failed to load document templates');
      }
    };

    fetchTemplates();
  }, []);

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Reset previous results
    setVerificationResults(null);
    setError(null);
    
    setSelectedFile(file);
    
    // Create file preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Handle template selection
  const handleTemplateChange = (e) => {
    setSelectedTemplate(e.target.value);
    // Reset verification results when template changes
    setVerificationResults(null);
  };

  // Handle document verification
  const handleVerifyDocument = async () => {
    if (!selectedFile || !selectedTemplate) {
      setError('Please select both a document and a template');
      return;
    }

    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('document', selectedFile);
    formData.append('template', selectedTemplate);

    try {
      const response = await axios.post('/api/verify/document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setVerificationResults(response.data);
    } catch (err) {
      console.error('Verification error:', err);
      setError(err.response?.data?.message || 'Failed to verify document');
    } finally {
      setIsLoading(false);
    }
  };

  // Render score with color indication
  const renderScoreWithIndicator = (score) => {
    let status = 'Poor';
    let className = 'score-poor';
    
    if (score >= 80) {
      status = 'Good';
      className = 'score-good';
    } else if (score >= 50) {
      status = 'Fair';
      className = 'score-fair';
    }
    
    return (
      <div className={`score-indicator ${className}`}>
        {score.toFixed(1)}% <span className="score-label">{status}</span>
      </div>
    );
  };

  return (
    <div className="document-verification">
      <h1>Document Verification</h1>
      <p className="verification-subtitle">Verify a document against trained templates</p>
      
      <div className="verification-container">
        <div className="upload-section">
          <h2>Upload Document</h2>
          
          <div className="template-select">
            <label htmlFor="template-select">Template</label>
            <select 
              id="template-select"
              value={selectedTemplate}
              onChange={handleTemplateChange}
            >
              {templates.map((template, index) => (
                <option key={index} value={template}>
                  {template}
                </option>
              ))}
            </select>
            <small className="template-hint">Select a template or let the system find the best match</small>
          </div>
          
          <div className="file-upload-container">
            <label htmlFor="file-upload" className="upload-label">
              Upload Document to Verify
            </label>
            <div className="file-input-wrapper">
              <input 
                id="file-upload" 
                type="file" 
                onChange={handleFileChange}
                accept="image/jpeg,image/png"
              />
              <span className="file-name">
                {selectedFile ? selectedFile.name : 'Choose file'}
              </span>
            </div>
            <button 
              className="upload-button"
              onClick={() => document.getElementById('file-upload').click()}
            >
              Browse...
            </button>
          </div>
          
          {filePreview && (
            <div className="preview-container">
              <h3>Preview:</h3>
              <img 
                src={filePreview} 
                alt="Document preview" 
                className="document-preview" 
              />
            </div>
          )}
          
          <button 
            className="verify-button"
            onClick={handleVerifyDocument}
            disabled={isLoading || !selectedFile || !selectedTemplate}
          >
            {isLoading ? 'Verifying...' : 'Verify Document'}
          </button>
        </div>
        
        <div className="results-section">
          <h2>Verification Results</h2>
          
          {verificationResults ? (
            <>
              <div className={`verification-status ${verificationResults.verified ? 'verified' : 'not-verified'}`}>
                <div className="status-icon">
                  {verificationResults.verified ? '✓' : '✗'}
                </div>
                <div className="status-text">
                  Document {verificationResults.verified ? 'Verified' : 'Not Verified'}
                </div>
                <div className="template-info">
                  Template: {selectedTemplate}
                </div>
              </div>
              
              <div className="verification-scores">
                <h3>Verification Scores:</h3>
                
                <div className="score-item">
                  <div className="score-label">Overall Score</div>
                  <div className="score-description">Combined verification score</div>
                  {renderScoreWithIndicator(verificationResults.scores.overall * 100)}
                </div>
                
                <div className="score-item">
                  <div className="score-label">Visual Similarity</div>
                  <div className="score-description">How visually similar the document is to the template</div>
                  {renderScoreWithIndicator(verificationResults.scores.text_similarity * 100 || 0)}
                </div>
                
                <div className="score-item">
                  <div className="score-label">Layout Score</div>
                  <div className="score-description">How well document layout matches the template</div>
                  {renderScoreWithIndicator(verificationResults.scores.layout_similarity * 100 || 0)}
                </div>
                
                <div className="score-item">
                  <div className="score-label">Logo & Seal Detection</div>
                  <div className="score-description">Logo and official seal verification</div>
                  {renderScoreWithIndicator(verificationResults.scores.seal_similarity * 100 || 0)}
                </div>
              </div>
              
              <div className="document-analysis">
                <h3>Document Analysis:</h3>
                
                {verificationResults.analysis && (
                  <div className="analysis-image-container">
                    <img 
                      src={`/api/verify/analysis/${verificationResults.analysis.split('/').pop()}`} 
                      alt="Document analysis" 
                      className="analysis-image" 
                    />
                    
                    <div className="analysis-legend">
                      <div className="color-coded-analysis">
                        <span className="info-icon">ℹ</span> Color-coded analysis:
                      </div>
                      <ul className="legend-items">
                        <li><span className="blue-box"></span> Features detected in uploaded document</li>
                        <li><span className="green-box"></span> Features matched with template</li>
                        <li><span className="red-box"></span> Features missing from the template</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="no-results">
              <div className="placeholder-icon">📄</div>
              <p>Upload and verify a document to see results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentVerification; 