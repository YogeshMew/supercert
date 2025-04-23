import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaUpload, FaCheckCircle, FaTimesCircle, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import './DocumentVerifier.css';

const DocumentVerifier = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Fetch available templates on component mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await axios.get('/api/verify/templates');
        setTemplates(response.data.templates || []);
        if (response.data.templates && response.data.templates.length > 0) {
          setSelectedTemplate(response.data.templates[0]);
        }
      } catch (err) {
        console.error('Error fetching templates:', err);
        setError('Could not load templates. Please try again later.');
      }
    };

    fetchTemplates();
  }, []);

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset previous results
    setResult(null);
    setError(null);
    
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG)');
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds the 10MB limit');
      return;
    }

    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Handle template selection
  const handleTemplateChange = (e) => {
    setSelectedTemplate(e.target.value);
    // Reset results when template changes
    setResult(null);
  };

  // Handle verify button click
  const handleVerify = async () => {
    if (!selectedFile || !selectedTemplate) {
      setError('Please select both a document and a template');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('document', selectedFile);
    formData.append('templateName', selectedTemplate);

    try {
      const response = await axios.post('/api/verify/document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setResult(response.data);
    } catch (err) {
      console.error('Error verifying document:', err);
      setError(err.response?.data?.message || 'Failed to verify document. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Render verification score with color coding
  const renderScore = (score) => {
    let color = '';
    if (score >= 80) color = 'green';
    else if (score >= 60) color = 'orange';
    else color = 'red';

    return <span style={{ color }}>{score}%</span>;
  };

  return (
    <div className="document-verifier">
      <h2>Document Verification</h2>
      <div className="verification-container">
        <div className="upload-section">
          <h3>Upload Document for Verification</h3>
          
          <div className="file-upload">
            <label className="file-upload-label">
              <input 
                type="file" 
                onChange={handleFileChange} 
                accept="image/jpeg,image/png"
                className="file-input"
              />
              <div className="upload-icon">
                {preview ? (
                  <img src={preview} alt="Document preview" className="preview-image" />
                ) : (
                  <FaUpload size={32} />
                )}
              </div>
              <span>Select document image</span>
            </label>
          </div>

          <div className="template-selection">
            <label htmlFor="template">Select Template:</label>
            <select 
              id="template" 
              value={selectedTemplate} 
              onChange={handleTemplateChange}
              disabled={loading || templates.length === 0}
            >
              {templates.length === 0 && <option value="">No templates available</option>}
              {templates.map((template, index) => (
                <option key={index} value={template}>
                  {template}
                </option>
              ))}
            </select>
          </div>

          <button 
            className="verify-button" 
            onClick={handleVerify} 
            disabled={!selectedFile || !selectedTemplate || loading}
          >
            {loading ? (
              <>
                <FaSpinner className="spinner" /> Verifying...
              </>
            ) : (
              'Verify Document'
            )}
          </button>

          {error && (
            <div className="error-message">
              <FaExclamationTriangle /> {error}
            </div>
          )}
        </div>

        {result && (
          <div className="result-section">
            <h3>Verification Results</h3>
            
            <div className="verification-status">
              {result.verified ? (
                <div className="verified">
                  <FaCheckCircle className="icon" />
                  <h4>Document Verified</h4>
                  <p>This document matches the template {selectedTemplate}</p>
                </div>
              ) : (
                <div className="not-verified">
                  <FaTimesCircle className="icon" />
                  <h4>Document Not Verified</h4>
                  <p>This document does not match the template {selectedTemplate}</p>
                </div>
              )}
            </div>

            <div className="verification-details">
              <h4>Verification Score: {renderScore(result.score)}</h4>
              
              <div className="score-breakdown">
                <h5>Score Breakdown:</h5>
                <ul>
                  {result.analysis && (
                    <>
                      <li>
                        <span>Text Similarity:</span> {renderScore(result.analysis.textScore || 0)}
                      </li>
                      <li>
                        <span>Layout Matching:</span> {renderScore(result.analysis.layoutScore || 0)}
                      </li>
                      <li>
                        <span>Structure Comparison:</span> {renderScore(result.analysis.structureScore || 0)}
                      </li>
                    </>
                  )}
                </ul>
              </div>

              {result.extractedData && (
                <div className="extracted-data">
                  <h5>Extracted Information:</h5>
                  <ul>
                    {Object.entries(result.extractedData).map(([key, value]) => (
                      <li key={key}>
                        <span>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</span> {value || 'Not found'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {result.analysisImage && (
              <div className="analysis-image">
                <h5>Analysis Visualization:</h5>
                <img src={result.analysisImage} alt="Document analysis" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentVerifier; 