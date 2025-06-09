const asyncHandler = require('express-async-handler');
const ActivationCode = require('../model/activationCodeModel');
const crypto = require('crypto');

// @desc Get all activation codes
// @route GET /api/activation-codes
// @access Private (Admin only)
const getActivationCodes = asyncHandler(async (req, res) => {
    const activationCodes = await ActivationCode.find().sort({ createdAt: -1 });
    res.status(200).json(activationCodes);
});

// @desc Generate a new random activation code
// @route POST /api/activation-codes/generate
// @access Private (Admin only)
const generateActivationCode = asyncHandler(async (req, res) => {
    // Generate a random code (8 characters alphanumeric)
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    
    // Create the activation code in the database
    const activationCode = await ActivationCode.create({
        code,
        createdBy: req.user.id
    });
    
    if (activationCode) {
        res.status(201).json(activationCode);
    } else {
        res.status(400);
        throw new Error("Failed to generate activation code");
    }
});

// @desc Create a custom activation code
// @route POST /api/activation-codes/custom
// @access Private (Admin only)
const createCustomActivationCode = asyncHandler(async (req, res) => {
    const { code } = req.body;
    
    if (!code) {
        res.status(400);
        throw new Error("Please provide an activation code");
    }
    
    // Check if code already exists
    const existingCode = await ActivationCode.findOne({ code });
    if (existingCode) {
        res.status(400);
        throw new Error("Activation code already exists");
    }
    
    // Create the custom activation code
    const activationCode = await ActivationCode.create({
        code,
        createdBy: req.user.id
    });
    
    if (activationCode) {
        res.status(201).json(activationCode);
    } else {
        res.status(400);
        throw new Error("Failed to create custom activation code");
    }
});

// @desc Delete an activation code
// @route DELETE /api/activation-codes/:id
// @access Private (Admin only)
const deleteActivationCode = asyncHandler(async (req, res) => {
    const activationCode = await ActivationCode.findById(req.params.id);
    
    if (!activationCode) {
        res.status(404);
        throw new Error("Activation code not found");
    }
    
    // Check if code is already used
    if (activationCode.isUsed) {
        res.status(400);
        throw new Error("Cannot delete an activation code that has already been used");
    }
    
    await activationCode.deleteOne();
    res.status(200).json({ id: req.params.id });
});

// @desc Verify an activation code
// @route POST /api/activation-codes/verify
// @access Public
const verifyActivationCode = asyncHandler(async (req, res) => {
    const { code } = req.body;
    
    if (!code) {
        res.status(400);
        throw new Error("Please provide an activation code");
    }
    
    const activationCode = await ActivationCode.findOne({ code });
    
    if (!activationCode) {
        res.status(404);
        throw new Error("Invalid activation code");
    }
    
    if (activationCode.isUsed) {
        res.status(400);
        throw new Error("Activation code has already been used");
    }
    
    res.status(200).json({ valid: true });
});

// @desc Mark an activation code as used
// @route PUT /api/activation-codes/:id/use
// @access Private
const useActivationCode = asyncHandler(async (req, res) => {
    const activationCode = await ActivationCode.findById(req.params.id);
    
    if (!activationCode) {
        res.status(404);
        throw new Error("Activation code not found");
    }
    
    if (activationCode.isUsed) {
        res.status(400);
        throw new Error("Activation code has already been used");
    }
    
    activationCode.isUsed = true;
    activationCode.usedBy = req.user.id;
    
    const updatedActivationCode = await activationCode.save();
    
    res.status(200).json(updatedActivationCode);
});

// @desc Get all institution-specific activation codes
// @route GET /api/activation-codes/institution
// @access Private (Admin only)
const getInstitutionCodes = asyncHandler(async (req, res) => {
    const institutionCodes = await ActivationCode.find({ institutionSpecific: true }).sort({ createdAt: -1 });
    res.status(200).json(institutionCodes);
});

// @desc Generate a new institution-specific activation code
// @route POST /api/activation-codes/institution
// @access Private (Admin only)
const createInstitutionActivationCode = asyncHandler(async (req, res) => {
    const { institution } = req.body;
    
    if (!institution || !institution.name) {
        res.status(400);
        throw new Error("Please provide institution information with at least a name");
    }
    
    // Generate a random code (8 characters alphanumeric)
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    
    // Create the institution-specific activation code
    const activationCode = await ActivationCode.create({
        code,
        institutionSpecific: true,
        institution: {
            name: institution.name,
            email: institution.email || '',
            address: institution.address || ''
        },
        createdBy: req.user.id
    });
    
    if (activationCode) {
        res.status(201).json(activationCode);
    } else {
        res.status(400);
        throw new Error("Failed to create institution activation code");
    }
});

// @desc Delete an institution-specific activation code
// @route DELETE /api/activation-codes/institution/:id
// @access Private (Admin only)
const deleteInstitutionCode = asyncHandler(async (req, res) => {
    const activationCode = await ActivationCode.findById(req.params.id);
    
    if (!activationCode) {
        res.status(404);
        throw new Error("Activation code not found");
    }
    
    // Verify it's an institution-specific code
    if (!activationCode.institutionSpecific) {
        res.status(400);
        throw new Error("This is not an institution-specific activation code");
    }
    
    // Check if code is already used
    if (activationCode.isUsed) {
        res.status(400);
        throw new Error("Cannot delete an activation code that has already been used");
    }
    
    await activationCode.deleteOne();
    res.status(200).json({ id: req.params.id });
});

module.exports = {
    getActivationCodes,
    generateActivationCode,
    createCustomActivationCode,
    deleteActivationCode,
    verifyActivationCode,
    useActivationCode,
    getInstitutionCodes,
    createInstitutionActivationCode,
    deleteInstitutionCode
};