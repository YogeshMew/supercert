import React, { useState, useEffect } from 'react';
import api from '../../utils/axiosConfig';
import { motion } from 'framer-motion';
import { FaEnvelope, FaPlus, FaTrash, FaEdit, FaRedo, FaCheck, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const EmailTemplateManager = () => {
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedTemplates, setExpandedTemplates] = useState({});
    
    const [formData, setFormData] = useState({
        name: '',
        subject: '',
        body: '',
        type: 'custom',
        isDefault: false,
        variables: []
    });

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                duration: 0.5,
                when: "beforeChildren",
                staggerChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { duration: 0.3 } }
    };

    // Fetch templates on component mount
    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/api/email-templates');
            setTemplates(response.data);
        } catch (error) {
            console.error('Error fetching email templates:', error);
            toast.error('Failed to load email templates');
        } finally {
            setIsLoading(false);
        }
    };

    const createTemplate = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        
        try {
            // Basic form validation
            if (!formData.name || !formData.subject || !formData.body || !formData.type) {
                toast.error('Please fill in all required fields');
                setIsLoading(false);
                return;
            }
            
            // Ensure variables array is properly formatted
            const templateData = { ...formData };
            
            // Make sure variables is an array
            if (!Array.isArray(templateData.variables)) {
                templateData.variables = [];
            }
            
            // Make sure we have a variable for certificateHash/CID if it's a certificate-issued type
            if (templateData.type === 'certificate-issued' && !templateData.variables.includes('certificateHash')) {
                // Add the certificateHash variable automatically
                templateData.variables.push('certificateHash');
            }
            
            const response = await api.post('/api/email-templates', templateData);
            
            setTemplates([...templates, response.data]);
            toast.success('Email template created successfully');
            resetForm();
            setIsCreating(false);
        } catch (error) {
            console.error('Error creating template:', error);
            let errorMessage = 'Failed to create email template';
            
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
                console.error('Response data:', error.response.data);
                console.error('Response status:', error.response.status);
            } else if (error.request) {
                // The request was made but no response was received
                errorMessage = 'No response from server. Please check your connection.';
                console.error('Request:', error.request);
            } else {
                // Something happened in setting up the request that triggered an Error
                errorMessage = error.message;
            }
            
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const updateTemplate = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        
        try {
            // Basic form validation
            if (!formData.name || !formData.subject || !formData.body || !formData.type) {
                toast.error('Please fill in all required fields');
                setIsLoading(false);
                return;
            }
            
            // Ensure variables array is properly formatted
            const templateData = { ...formData };
            
            // Make sure variables is an array
            if (!Array.isArray(templateData.variables)) {
                templateData.variables = [];
            }
            
            // Make sure we have a variable for certificateHash/CID if it's a certificate-issued type
            if (templateData.type === 'certificate-issued' && !templateData.variables.includes('certificateHash')) {
                // Add the certificateHash variable automatically
                templateData.variables.push('certificateHash');
            }
            
            const response = await api.put(`/api/email-templates/${selectedTemplate._id}`, templateData);
            
            setTemplates(templates.map(template => 
                template._id === selectedTemplate._id ? response.data : template
            ));
            toast.success('Email template updated successfully');
            resetForm();
            setIsEditing(false);
            setSelectedTemplate(null);
        } catch (error) {
            console.error('Error updating template:', error);
            let errorMessage = 'Failed to update email template';
            
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
                console.error('Response data:', error.response.data);
                console.error('Response status:', error.response.status);
            } else if (error.request) {
                // The request was made but no response was received
                errorMessage = 'No response from server. Please check your connection.';
                console.error('Request:', error.request);
            } else {
                // Something happened in setting up the request that triggered an Error
                errorMessage = error.message;
            }
            
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const deleteTemplate = async (id) => {
        if (!window.confirm('Are you sure you want to delete this template?')) return;
        
        setIsLoading(true);
        try {
            await api.delete(`/api/email-templates/${id}`);
            
            setTemplates(templates.filter(template => template._id !== id));
            toast.success('Email template deleted successfully');
        } catch (error) {
            console.error('Error deleting template:', error);
            toast.error('Failed to delete email template');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const resetForm = () => {
        setFormData({
            name: 'Certificate Issuance Notification',
            subject: 'Your Certificate Has Been Issued',
            body: 'Hello {{ studentName }},\n\nThis is to inform you that your transcripts have been successfully uploaded to blockchain. You are requested to save the below hash(CID) for further verification purpose.\n\n{{ certificateHash }}\n\nBest Wishes,\n\n{{ institutionName }}',
            type: 'certificate-issued',
            isDefault: false,
            variables: ['studentName', 'certificateHash', 'institutionName']
        });
    };

    const handleEditClick = (template) => {
        setSelectedTemplate(template);
        setFormData({
            name: template.name,
            subject: template.subject,
            body: template.body,
            type: template.type,
            isDefault: template.isDefault,
            variables: template.variables || []
        });
        setIsEditing(true);
        setIsCreating(false);
    };

    const handleNewTemplateClick = () => {
        resetForm();
        setSelectedTemplate(null);
        setIsCreating(true);
        setIsEditing(false);
    };

    const toggleTemplateExpand = (id) => {
        setExpandedTemplates({
            ...expandedTemplates,
            [id]: !expandedTemplates[id]
        });
    };

    const addVariable = () => {
        const newVariable = prompt('Enter a variable name (without {{ }})');
        if (newVariable && newVariable.trim()) {
            setFormData({
                ...formData,
                variables: [...formData.variables, newVariable.trim()]
            });
        }
    };

    const removeVariable = (index) => {
        const updatedVariables = [...formData.variables];
        updatedVariables.splice(index, 1);
        setFormData({
            ...formData,
            variables: updatedVariables
        });
    };

    const getTemplateTypeLabel = (type) => {
        switch (type) {
            case 'certificate-issued':
                return 'Certificate Issued';
            case 'verification-success':
                return 'Verification Success';
            case 'welcome':
                return 'Welcome';
            case 'custom':
                return 'Custom';
            default:
                return type;
        }
    };

    return (
        <motion.div
            className="container py-4"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            <ToastContainer position="top-right" autoClose={3000} />
            
            <motion.div className="row mb-4" variants={itemVariants}>
                <div className="col-md-12">
                    <h2 className="text-primary fw-bold d-flex align-items-center">
                        <FaEnvelope className="me-2" /> Email Template Management
                    </h2>
                    <p className="text-muted">
                        Manage email templates for sending personalized emails to students when certificates are issued or verified.
                    </p>
                </div>
            </motion.div>

            <motion.div className="row mb-4" variants={itemVariants}>
                <div className="col-md-12">
                    <div className="card shadow-sm">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5 className="card-title mb-0">Your Email Templates</h5>
                                <motion.button
                                    className="btn btn-primary d-flex align-items-center gap-2"
                                    onClick={handleNewTemplateClick}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <FaPlus />
                                    <span>New Template</span>
                                </motion.button>
                            </div>

                            {isLoading && templates.length === 0 ? (
                                <div className="text-center py-4">
                                    <div className="spinner-border text-primary" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                    <p className="mt-2 text-muted">Loading templates...</p>
                                </div>
                            ) : templates.length === 0 ? (
                                <div className="alert alert-info" role="alert">
                                    No email templates found. Create a new template to get started.
                                </div>
                            ) : (
                                <div className="list-group">
                                    {templates.map((template) => (
                                        <div key={template._id} className="list-group-item list-group-item-action border-0 shadow-sm mb-2">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <div>
                                                    <h6 className="mb-1">{template.name}</h6>
                                                    <p className="text-muted mb-0 small">
                                                        {getTemplateTypeLabel(template.type)}
                                                        {template.isDefault && (
                                                            <span className="ms-2 badge bg-success">Default</span>
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="btn-group">
                                                    <motion.button
                                                        className="btn btn-sm btn-outline-primary"
                                                        onClick={() => toggleTemplateExpand(template._id)}
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                    >
                                                        {expandedTemplates[template._id] ? <FaChevronUp /> : <FaChevronDown />}
                                                    </motion.button>
                                                    <motion.button
                                                        className="btn btn-sm btn-outline-secondary"
                                                        onClick={() => handleEditClick(template)}
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                    >
                                                        <FaEdit />
                                                    </motion.button>
                                                    <motion.button
                                                        className="btn btn-sm btn-outline-danger"
                                                        onClick={() => deleteTemplate(template._id)}
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                    >
                                                        <FaTrash />
                                                    </motion.button>
                                                </div>
                                            </div>
                                            
                                            {expandedTemplates[template._id] && (
                                                <div className="mt-3">
                                                    <div className="card">
                                                        <div className="card-header bg-light">
                                                            <strong>Subject:</strong> {template.subject}
                                                        </div>
                                                        <div className="card-body">
                                                            <p className="card-text" style={{ whiteSpace: 'pre-wrap' }}>{template.body}</p>
                                                        </div>
                                                        {template.variables && template.variables.length > 0 && (
                                                            <div className="card-footer bg-light">
                                                                <strong>Variables:</strong>
                                                                <div className="mt-1">
                                                                    {template.variables.map((variable, index) => (
                                                                        <span key={index} className="badge bg-primary me-1">
                                                                            &#123;&#123; {variable} &#125;&#125;
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>

            {(isCreating || isEditing) && (
                <motion.div className="row mb-4" variants={itemVariants}>
                    <div className="col-md-12">
                        <div className="card shadow-sm">
                            <div className="card-body">
                                <h5 className="card-title">{isCreating ? 'Create New Template' : 'Edit Template'}</h5>
                                <form onSubmit={isCreating ? createTemplate : updateTemplate}>
                                    <div className="mb-3">
                                        <label htmlFor="templateName" className="form-label">Template Name</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="templateName"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            placeholder="Enter template name"
                                            required
                                        />
                                    </div>
                                    
                                    <div className="mb-3">
                                        <label htmlFor="templateType" className="form-label">Template Type</label>
                                        <select
                                            className="form-select"
                                            id="templateType"
                                            name="type"
                                            value={formData.type}
                                            onChange={handleChange}
                                            required
                                        >
                                            <option value="certificate-issued">Certificate Issued</option>
                                            <option value="verification-success">Verification Success</option>
                                            <option value="welcome">Welcome Message</option>
                                            <option value="custom">Custom</option>
                                        </select>
                                    </div>
                                    
                                    <div className="mb-3 form-check">
                                        <input
                                            type="checkbox"
                                            className="form-check-input"
                                            id="isDefault"
                                            name="isDefault"
                                            checked={formData.isDefault}
                                            onChange={handleChange}
                                        />
                                        <label className="form-check-label" htmlFor="isDefault">
                                            Set as default template for {getTemplateTypeLabel(formData.type)}
                                        </label>
                                    </div>
                                    
                                    <div className="mb-3">
                                        <label htmlFor="templateSubject" className="form-label">Email Subject</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="templateSubject"
                                            name="subject"
                                            value={formData.subject}
                                            onChange={handleChange}
                                            placeholder="Enter email subject"
                                            required
                                        />
                                    </div>
                                    
                                    <div className="mb-3">
                                        <label htmlFor="templateBody" className="form-label">Email Body</label>
                                        <textarea
                                            className="form-control"
                                            id="templateBody"
                                            name="body"
                                            value={formData.body}
                                            onChange={handleChange}
                                            rows="8"
                                            placeholder="Enter email body content"
                                            required
                                        ></textarea>
                                        <small className="form-text text-muted">
                                            You can use variables like &#123;&#123; studentName &#125;&#125; that will be replaced with actual values.
                                        </small>
                                    </div>
                                    
                                    <div className="mb-3">
                                        <label className="form-label d-flex justify-content-between align-items-center">
                                            <span>Template Variables</span>
                                            <button type="button" className="btn btn-sm btn-outline-primary" onClick={addVariable}>
                                                <FaPlus className="me-1" /> Add Variable
                                            </button>
                                        </label>
                                        <div className="card bg-light">
                                            <div className="card-body">
                                                {formData.variables.length === 0 ? (
                                                    <p className="mb-0 text-muted">No variables defined. Click 'Add Variable' to add one.</p>
                                                ) : (
                                                    <div className="d-flex flex-wrap gap-2">
                                                        {formData.variables.map((variable, index) => (
                                                            <div key={index} className="badge bg-primary d-flex align-items-center">
                                                                <span className="me-1">&#123;&#123; {variable} &#125;&#125;</span>
                                                                <button
                                                                    type="button"
                                                                    className="btn-close btn-close-white btn-sm"
                                                                    style={{ fontSize: '0.5rem' }}
                                                                    onClick={() => removeVariable(index)}
                                                                    aria-label="Remove variable"
                                                                ></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="mt-2">
                                                    <small className="text-muted">
                                                        Common variables: studentName, certificateHash, issueDate, institutionName, verificationLink
                                                    </small>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="d-flex gap-2">
                                        <button
                                            type="submit"
                                            className="btn btn-primary d-flex align-items-center gap-2"
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                                    <span>Processing...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <FaCheck />
                                                    <span>{isCreating ? 'Create Template' : 'Update Template'}</span>
                                                </>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() => {
                                                resetForm();
                                                setIsCreating(false);
                                                setIsEditing(false);
                                                setSelectedTemplate(null);
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};

export default EmailTemplateManager; 