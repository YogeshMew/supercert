const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');

// Protect routes - verify JWT token
const protect = asyncHandler(async (req, res, next) => {
    // For development/testing, bypass authentication
    if (process.env.NODE_ENV === 'development') {
        req.user = { role: 'admin' }; // Mock admin user for development
        return next();
    }
    
    let token;
    
    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];
            
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretdevkey');
            
            // Add user from payload to request
            req.user = decoded;
            
            next();
        } catch (error) {
            console.error('Token verification failed:', error);
            res.status(401);
            throw new Error('Not authorized, token failed');
        }
    }
    
    if (!token) {
        res.status(401);
        throw new Error('Not authorized, no token');
    }
});

// Admin middleware - check if user is admin
const admin = (req, res, next) => {
    // For development/testing, bypass admin check
    if (process.env.NODE_ENV === 'development') {
        return next();
    }
    
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403);
        throw new Error('Not authorized as admin');
    }
};

module.exports = { protect, admin }; 