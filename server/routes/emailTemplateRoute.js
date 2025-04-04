const express = require('express');
const router = express.Router();
const {
    getEmailTemplates,
    getEmailTemplate,
    createEmailTemplate,
    updateEmailTemplate,
    deleteEmailTemplate,
    getDefaultTemplates
} = require('../controller/emailTemplateController');
const validateToken = require('../middleware/validateTokenHandler');

// Apply validateToken middleware to all routes
router.use(validateToken);

// Routes for email template management
router.get('/', getEmailTemplates);
router.get('/defaults', getDefaultTemplates);
router.get('/:id', getEmailTemplate);
router.post('/', createEmailTemplate);
router.put('/:id', updateEmailTemplate);
router.delete('/:id', deleteEmailTemplate);

module.exports = router; 