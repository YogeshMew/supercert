const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');

// This file is kept as a placeholder after removing template management functionality
// The actual template verification has been replaced with an alternative method

router.get('/', (req, res) => {
    res.status(200).json({
        message: 'Template routes have been deprecated and replaced with an alternative verification method'
    });
});

module.exports = router; 