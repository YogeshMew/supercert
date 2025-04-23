const asyncHandler = require('express-async-handler')
const jwt = require('jsonwebtoken')
require('dotenv').config({ path: __dirname + '../../.env' });

const validateToken = asyncHandler(async (req, res, next) => {
    let token;
    
    // Check for token in Authorization header (primary method)
    let authHeader = req.headers.Authorization || req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
    }
    
    // If no token in header, check cookies as backup
    if (!token && req.cookies && req.cookies.jwt) {
        token = req.cookies.jwt;
    } else if (!token && req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    // If no token found
    if (!token) {
        res.status(401);
        throw new Error("User is not authorized - No token provided");
    }

    // Verify token
    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        
        // For debugging purposes
        console.log("Decoded token:", JSON.stringify(decoded, null, 2));
        
        // Handle different token structures - some tokens have user object, others have direct properties
        if (decoded.user && decoded.user.id) {
            // Token has user object
            req.user = decoded.user;
        } else if (decoded.id) {
            // Token has direct properties
            req.user = {
                id: decoded.id,
                username: decoded.username,
                role: decoded.role
            };
        } else if (decoded.username && decoded.role) {
            // Handle the alternative token structure seen in the error log
            req.user = {
                username: decoded.username,
                id: decoded.id, // Use the ID from the token
                role: decoded.role
            };
        } else {
            console.error("Invalid token structure:", decoded);
            res.status(401);
            throw new Error("User is not authorized - Invalid token structure");
        }
        
        next();
    } catch (error) {
        console.error("Token verification error:", error.message);
        
        // If token is expired
        if (error.name === 'TokenExpiredError') {
            res.status(401);
            throw new Error("Token expired - Please login again");
        }
        
        res.status(401);
        throw new Error("User is not authorized - Invalid token");
    }
});

module.exports = validateToken;