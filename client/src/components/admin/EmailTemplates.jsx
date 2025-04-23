import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaEnvelope, FaPlus, FaTrash, FaEdit, FaSave, FaCheck, FaTimes } from 'react-icons/fa';
import './EmailTemplates.css';

const EmailTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    subject: '',
    body: '',
    type: 'certificate-issued',
    isDefault: false
  });
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      // Use the correct API endpoint
      const response = await axios.get('http://localhost:5001/api/email-templates');
      setTemplates(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching email templates:', err);
      setError('Failed to load email templates. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate({ ...template });
  };

  const handleSaveEdit = async () => {
    try {
      setLoading(true);
      await axios.put(`http://localhost:5001/api/email-templates/${editingTemplate._id}`, editingTemplate);
      fetchTemplates();
      setEditingTemplate(null);
    } catch (err) {
      console.error('Error updating template:', err);
      setError('Failed to update template. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    
    try {
      setLoading(true);
      await axios.delete(`http://localhost:5001/api/email-templates/${id}`);
      fetchTemplates();
    } catch (err) {
      console.error('Error deleting template:', err);
      setError('Failed to delete template. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTemplate = () => {
    setIsAdding(true);
  };

  const handleSaveNewTemplate = async () => {
    try {
      setLoading(true);
      await axios.post('http://localhost:5001/api/email-templates', newTemplate);
      setNewTemplate({
        name: '',
        subject: '',
        body: '',
        type: 'certificate-issued',
        isDefault: false
      });
      setIsAdding(false);
      fetchTemplates();
    } catch (err) {
      console.error('Error creating template:', err);
      setError('Failed to create template. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewTemplate({
      name: '',
      subject: '',
      body: '',
      type: 'certificate-issued',
      isDefault: false
    });
  };

  const getTemplateTypeLabel = (type) => {
    switch (type) {
      case 'certificate-issued':
        return 'Certificate Issued';
      case 'verification-success':
        return 'Verification Success';
      case 'reset-password':
        return 'Reset Password';
      default:
        return type;
    }
  };

  if (loading && templates.length === 0) {
    return (
      <div className="email-templates-container">
        <h2><FaEnvelope /> Email Templates</h2>
        <div className="loading-spinner">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="email-templates-container">
      <div className="templates-header">
        <h2><FaEnvelope /> Email Templates</h2>
        <button 
          className="add-template-btn"
          onClick={handleAddTemplate}
          disabled={isAdding}
        >
          <FaPlus /> Add Template
        </button>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      {isAdding && (
        <div className="template-form">
          <h3>Create New Template</h3>
          <div className="form-group">
            <label>Name:</label>
            <input 
              type="text" 
              value={newTemplate.name} 
              onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})} 
              placeholder="Template Name"
            />
          </div>
          
          <div className="form-group">
            <label>Type:</label>
            <select 
              value={newTemplate.type} 
              onChange={(e) => setNewTemplate({...newTemplate, type: e.target.value})}
            >
              <option value="certificate-issued">Certificate Issued</option>
              <option value="verification-success">Verification Success</option>
              <option value="reset-password">Reset Password</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          
          <div className="form-group checkbox">
            <label>
              <input 
                type="checkbox" 
                checked={newTemplate.isDefault}
                onChange={(e) => setNewTemplate({...newTemplate, isDefault: e.target.checked})}
              />
              Default for this type
            </label>
          </div>
          
          <div className="form-group">
            <label>Subject:</label>
            <input 
              type="text" 
              value={newTemplate.subject} 
              onChange={(e) => setNewTemplate({...newTemplate, subject: e.target.value})} 
              placeholder="Email Subject"
            />
          </div>
          
          <div className="form-group">
            <label>Body:</label>
            <textarea 
              value={newTemplate.body} 
              onChange={(e) => setNewTemplate({...newTemplate, body: e.target.value})} 
              placeholder="Email Body"
              rows={10}
            />
            <div className="template-variables">
              <p>Available variables:</p>
              <ul>
                <li><code>{{ studentName }}</code> - Student's name</li>
                <li><code>{{ certificateHash }}</code> - Document hash/CID</li>
                <li><code>{{ institutionName }}</code> - Institution name</li>
                <li><code>{{ issueDate }}</code> - Date of issue</li>
              </ul>
            </div>
          </div>
          
          <div className="form-actions">
            <button className="save-btn" onClick={handleSaveNewTemplate}>
              <FaSave /> Save Template
            </button>
            <button className="cancel-btn" onClick={handleCancelAdd}>
              <FaTimes /> Cancel
            </button>
          </div>
        </div>
      )}
      
      {templates.length === 0 && !isAdding ? (
        <div className="no-templates">
          <p>No email templates found. Click "Add Template" to create your first template.</p>
        </div>
      ) : (
        <div className="templates-list">
          {templates.map(template => (
            <div key={template._id} className="template-card">
              {editingTemplate && editingTemplate._id === template._id ? (
                <div className="template-form">
                  <div className="form-group">
                    <label>Name:</label>
                    <input 
                      type="text" 
                      value={editingTemplate.name} 
                      onChange={(e) => setEditingTemplate({...editingTemplate, name: e.target.value})} 
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Type:</label>
                    <select 
                      value={editingTemplate.type} 
                      onChange={(e) => setEditingTemplate({...editingTemplate, type: e.target.value})}
                    >
                      <option value="certificate-issued">Certificate Issued</option>
                      <option value="verification-success">Verification Success</option>
                      <option value="reset-password">Reset Password</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  
                  <div className="form-group checkbox">
                    <label>
                      <input 
                        type="checkbox" 
                        checked={editingTemplate.isDefault}
                        onChange={(e) => setEditingTemplate({...editingTemplate, isDefault: e.target.checked})}
                      />
                      Default for this type
                    </label>
                  </div>
                  
                  <div className="form-group">
                    <label>Subject:</label>
                    <input 
                      type="text" 
                      value={editingTemplate.subject} 
                      onChange={(e) => setEditingTemplate({...editingTemplate, subject: e.target.value})} 
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Body:</label>
                    <textarea 
                      value={editingTemplate.body} 
                      onChange={(e) => setEditingTemplate({...editingTemplate, body: e.target.value})} 
                      rows={10}
                    />
                  </div>
                  
                  <div className="form-actions">
                    <button className="save-btn" onClick={handleSaveEdit}>
                      <FaSave /> Save Changes
                    </button>
                    <button className="cancel-btn" onClick={handleCancelEdit}>
                      <FaTimes /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="template-header">
                    <h3>{template.name}</h3>
                    <div className="template-badges">
                      <span className="template-type">{getTemplateTypeLabel(template.type)}</span>
                      {template.isDefault && <span className="default-badge">Default</span>}
                    </div>
                  </div>
                  <div className="template-subject">
                    <strong>Subject:</strong> {template.subject}
                  </div>
                  <div className="template-body">
                    <strong>Body:</strong>
                    <pre>{template.body}</pre>
                  </div>
                  <div className="template-actions">
                    <button className="edit-btn" onClick={() => handleEditTemplate(template)}>
                      <FaEdit /> Edit
                    </button>
                    <button className="delete-btn" onClick={() => handleDeleteTemplate(template._id)}>
                      <FaTrash /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmailTemplates; 