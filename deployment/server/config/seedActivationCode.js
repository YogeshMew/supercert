const mongoose = require('mongoose');
const ActivationCode = require('../model/activationCodeModel');
const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
require('dotenv').config({ path: __dirname + '../../.env' });

/**
 * Seed initial activation code if none exists
 * This ensures there's at least one activation code to register the first admin
 */
const seedActivationCode = asyncHandler(async () => {
    console.log('Checking for default activation codes...');
    
    // Check if default admin activation code exists
    const adminActivationCode = process.env.ADMIN_ACTIVATION_CODE || 'SUPERCERT-ADMIN-2025';
    const existingAdminCode = await ActivationCode.findOne({ code: adminActivationCode });
    
    if (!existingAdminCode) {
        console.log('Creating default admin activation code...');
        await ActivationCode.create({
            code: adminActivationCode,
            type: 'admin',
            isDefault: true
        });
        console.log('Default admin activation code created successfully!');
    } else {
        console.log('Default admin activation code already exists.');
    }
    
    // Check if default verifier activation code exists
    const verifierActivationCode = process.env.VERIFIER_ACTIVATION_CODE || 'SUPERCERT-VERIFIER-2025';
    const existingVerifierCode = await ActivationCode.findOne({ code: verifierActivationCode });
    
    if (!existingVerifierCode) {
        console.log('Creating default verifier activation code...');
        await ActivationCode.create({
            code: verifierActivationCode,
            type: 'verifier',
            isDefault: true
        });
        console.log('Default verifier activation code created successfully!');
    } else {
        console.log('Default verifier activation code already exists.');
    }
});

module.exports = seedActivationCode; 