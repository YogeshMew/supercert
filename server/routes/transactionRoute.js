const express = require('express');
const router = express.Router();
const {createInfo, getInfo} = require('../controller/transactionInfoController')

// Add error handling middleware
router.use((err, req, res, next) => {
    console.error('Transaction route error:', err);
    res.status(500).json({
        success: false,
        message: err.message || 'Internal server error in transaction processing'
    });
});

// Get all transaction records
router.get('/', async (req, res, next) => {
    try {
        await getInfo(req, res);
    } catch (error) {
        next(error);
    }
});

// Create new transaction record
router.post('/', async (req, res, next) => {
    try {
        console.log('Transaction data received:', req.body);
        await createInfo(req, res);
    } catch (error) {
        next(error);
    }
});

module.exports = router;