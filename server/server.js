const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Create upload directories if they don't exist
const uploadsDir = path.join(__dirname, 'uploads');
const documentsDir = path.join(__dirname, 'uploads/documents');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

if (!fs.existsSync(documentsDir)) {
    fs.mkdirSync(documentsDir);
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import routes
const userRoutes = require('./routes/userRoutes');
const templateRoutes = require('./routes/templateRoutes');
const documentRoutes = require('./routes/documentRoutes');
const ipfsRoutes = require('./routes/ipfsRoutes');
const emailTemplateRoutes = require('./routes/emailTemplateRoutes');
const activationCodeRoutes = require('./routes/activationCodeRoutes');
const verifyRoutes = require('./routes/verifyRoutes');
const verificationLogRoutes = require('./routes/verificationLogRoutes');

// Use routes
app.use('/api/users', userRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/ipfs', ipfsRoutes);
app.use('/api/email-templates', emailTemplateRoutes);
app.use('/api/activation-codes', activationCodeRoutes);
app.use('/api/verify', verifyRoutes);
app.use('/api/verification-logs', verificationLogRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Set up server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
}); 