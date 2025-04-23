const transactionInfo = require('../model/transactionInfoModel');
const asyncHandler = require('express-async-handler');

const getInfo = asyncHandler(async (req, res) => {
    try {
        const info = await transactionInfo.find().sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            data: info
        });
    } catch (error) {
        console.error('Error retrieving transaction info:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to retrieve transaction information'
        });
    }
});

const createInfo = asyncHandler(async (req, res) => {
    try {
        console.log('Creating transaction record with data:', req.body);
        
        if (!req.body.CID || !req.body.name) {
            return res.status(400).json({
                success: false,
                message: 'Required fields missing'
            });
        }
        
        const info = await transactionInfo.create({
            Name: req.body.name,
            email: req.body.email,
            emailOfStudent: req.body.emailOfStudent,
            batch: req.body.batch,
            CID: req.body.CID,
            organizationName: req.body.organizationName,
            transactionHash: req.body.transactionHash || 'No transaction hash provided'
        });
        
        res.status(201).json({
            success: true,
            message: 'Transaction record created successfully',
            data: info
        });
    } catch (error) {
        console.error('Error creating transaction info:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create transaction record'
        });
    }
});

module.exports = { getInfo, createInfo }