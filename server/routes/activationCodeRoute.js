const express = require('express');
const router = express.Router();
const {
    getActivationCodes,
    generateActivationCode,
    createCustomActivationCode,
    deleteActivationCode,
    verifyActivationCode,
    useActivationCode,
    getInstitutionCodes,
    createInstitutionActivationCode,
    deleteInstitutionCode
} = require('../controller/activationCodeController');
const validateToken = require('../middleware/validateTokenHandler');

// Apply validateToken middleware to all routes
router.use(validateToken);

// Admin routes (will need role-based authorization in a middleware)
router.get('/', getActivationCodes);
router.post('/generate', generateActivationCode);
router.post('/custom', createCustomActivationCode);
router.delete('/:id', deleteActivationCode);

// Institution-specific activation code routes
router.get('/institution', getInstitutionCodes);
router.post('/institution', createInstitutionActivationCode);
router.delete('/institution/:id', deleteInstitutionCode);

// Public routes (with token validation)
router.post('/verify', verifyActivationCode);
router.put('/:id/use', useActivationCode);

module.exports = router;