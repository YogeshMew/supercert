const asyncHandler = require('express-async-handler');
const EmailTemplate = require('../model/emailTemplateModel');

// Helper function to check authentication
const checkAuthentication = (req, res) => {
    if (!req.user || !req.user.id) {
        res.status(401);
        throw new Error("User not authenticated or invalid user data");
    }
    return req.user.id;
};

// @desc Get all email templates for an institution
// @route GET /api/email-templates
// @access Private (Admin only)
const getEmailTemplates = asyncHandler(async (req, res) => {
    // Get the institution ID from the authenticated user
    const institutionId = checkAuthentication(req, res);
    
    // Find all templates for this institution
    const templates = await EmailTemplate.find({ institution: institutionId }).sort({ createdAt: -1 });
    res.status(200).json(templates);
});

// @desc Get a specific email template
// @route GET /api/email-templates/:id
// @access Private (Admin only)
const getEmailTemplate = asyncHandler(async (req, res) => {
    const institutionId = checkAuthentication(req, res);
    
    const template = await EmailTemplate.findById(req.params.id);
    
    if (!template) {
        res.status(404);
        throw new Error("Email template not found");
    }
    
    // Check if the template belongs to the authenticated user's institution
    if (template.institution.toString() !== institutionId) {
        res.status(403);
        throw new Error("You don't have permission to access this template");
    }
    
    res.status(200).json(template);
});

// @desc Create a new email template
// @route POST /api/email-templates
// @access Private (Admin only)
const createEmailTemplate = asyncHandler(async (req, res) => {
    const institutionId = checkAuthentication(req, res);
    
    const { name, subject, body, type, variables, isDefault } = req.body;
    
    if (!name || !subject || !body || !type) {
        res.status(400);
        throw new Error("Please provide all required fields");
    }
    
    // If setting this template as default, unset any other default templates of the same type
    if (isDefault) {
        await EmailTemplate.updateMany(
            { institution: institutionId, type: type, isDefault: true },
            { isDefault: false }
        );
    }
    
    // Create the email template
    const template = await EmailTemplate.create({
        name,
        subject,
        body,
        type,
        variables: variables || [],
        institution: institutionId,
        isDefault: !!isDefault
    });
    
    if (template) {
        res.status(201).json(template);
    } else {
        res.status(400);
        throw new Error("Failed to create email template");
    }
});

// @desc Update an email template
// @route PUT /api/email-templates/:id
// @access Private (Admin only)
const updateEmailTemplate = asyncHandler(async (req, res) => {
    const institutionId = checkAuthentication(req, res);
    
    const template = await EmailTemplate.findById(req.params.id);
    
    if (!template) {
        res.status(404);
        throw new Error("Email template not found");
    }
    
    // Check if the template belongs to the authenticated user's institution
    if (template.institution.toString() !== institutionId) {
        res.status(403);
        throw new Error("You don't have permission to update this template");
    }
    
    const { name, subject, body, type, variables, isDefault } = req.body;
    
    // Update the template
    template.name = name || template.name;
    template.subject = subject || template.subject;
    template.body = body || template.body;
    template.type = type || template.type;
    template.variables = variables || template.variables;
    
    // If setting this template as default, unset any other default templates of the same type
    if (isDefault && !template.isDefault) {
        await EmailTemplate.updateMany(
            { institution: institutionId, type: template.type, isDefault: true },
            { isDefault: false }
        );
        template.isDefault = true;
    } else if (isDefault === false) {
        template.isDefault = false;
    }
    
    const updatedTemplate = await template.save();
    res.status(200).json(updatedTemplate);
});

// @desc Delete an email template
// @route DELETE /api/email-templates/:id
// @access Private (Admin only)
const deleteEmailTemplate = asyncHandler(async (req, res) => {
    const institutionId = checkAuthentication(req, res);
    
    const template = await EmailTemplate.findById(req.params.id);
    
    if (!template) {
        res.status(404);
        throw new Error("Email template not found");
    }
    
    // Check if the template belongs to the authenticated user's institution
    if (template.institution.toString() !== institutionId) {
        res.status(403);
        throw new Error("You don't have permission to delete this template");
    }
    
    await template.deleteOne();
    res.status(200).json({ id: req.params.id });
});

// @desc Get default templates for each type for an institution
// @route GET /api/email-templates/defaults
// @access Private (Admin only)
const getDefaultTemplates = asyncHandler(async (req, res) => {
    // Get the institution ID from the authenticated user
    const institutionId = checkAuthentication(req, res);
    
    // Find all default templates for this institution
    const templates = await EmailTemplate.find({ 
        institution: institutionId,
        isDefault: true 
    });
    
    // Group templates by type
    const defaultTemplates = {};
    templates.forEach(template => {
        defaultTemplates[template.type] = template;
    });
    
    res.status(200).json(defaultTemplates);
});

module.exports = {
    getEmailTemplates,
    getEmailTemplate,
    createEmailTemplate,
    updateEmailTemplate,
    deleteEmailTemplate,
    getDefaultTemplates
}; 