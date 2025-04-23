const express = require('express')
const cors = require('cors')
const dotenv = require("dotenv").config()
const connectDb = require("./config/dbConnection")
const seedActivationCode = require("./config/seedActivationCode")
const seedEmailTemplates = require("./config/seedEmailTemplates")
const docIpfs = require('./routes/ipfsRoute')
const studentInfo = require('./routes/studentInfoRoute')
const transactionInfo = require('./routes/transactionRoute')
const userRoute = require('./routes/userRoute')
const activationCodeRoute = require('./routes/activationCodeRoute')
const emailTemplateRoute = require('./routes/emailTemplateRoute')
const imageExtractorRoutes = require('./routes/imageExtractorRoutes')
const templateRoutes = require('./routes/templateRoutes')
const verifyRoutes = require('./routes/verifyRoutes')
const multer = require('multer');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const verificationRoutes = require('./routes/verificationRoutes');
const fs = require('fs');
const path = require('path');
const morgan = require('morgan');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const pythonVerifier = require('./services/pythonVerifier');
const { spawn } = require('child_process');

// Import routes
let documentRoutes, extractionRoutes, templateVerifierRoutes, authRoutes;

// Safely load routes
try {
  documentRoutes = require('./routes/documentRoutes');
} catch (error) {
  console.warn('documentRoutes not available:', error.message);
}

try {
  extractionRoutes = require('./routes/extractionRoutes');
} catch (error) {
  console.warn('extractionRoutes not available:', error.message);
}

try {
  templateVerifierRoutes = require('./routes/templateVerifierRoutes');
} catch (error) {
  console.warn('templateVerifierRoutes not available:', error.message);
}

try {
  authRoutes = require('./routes/authRoutes');
} catch (error) {
  console.warn('authRoutes not available:', error.message);
}

// Define the storage configuration for Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Destination folder for uploaded files
  },
  filename: function (req, file, cb) {
    // Use the provided name if available, otherwise use the original filename
    const providedName = req.body.name;
    const filename = providedName ? providedName : file.originalname;
    cb(null, filename);
  }
});

// Initialize Multer with storage configuration
const upload = multer({ storage: storage });

// Create necessary directories if they don't exist
const ensureDirectories = () => {
  const dirs = [
    path.join(__dirname, 'uploads'), 
    path.join(__dirname, 'uploads/temp'), 
    path.join(__dirname, 'uploads/transcripts'), 
    path.join(__dirname, 'assets'), 
    path.join(__dirname, 'uploads/templates'), 
    path.join(__dirname, 'data/features'),
    path.join(__dirname, 'uploads/documents')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
  console.log('All directories created or verified');
};

// Function to start Python service
const startPythonService = () => {
  const pythonServicePath = path.join(__dirname, '..', 'pythonService', 'app.py');
  
  if (fs.existsSync(pythonServicePath)) {
    console.log('Starting Python document verification service...');
    
    // Check if python is available
    const pythonProcess = spawn('python', ['--version']);
    
    pythonProcess.on('error', (err) => {
      console.log('Python not found, trying python3 instead');
      
      // Try python3 if python is not available
      const python3Process = spawn('python3', [pythonServicePath]);
      
      python3Process.stdout.on('data', (data) => {
        console.log(`Python service: ${data}`);
      });
      
      python3Process.stderr.on('data', (data) => {
        console.error(`Python service error: ${data}`);
      });
      
      python3Process.on('error', (err) => {
        console.error('Failed to start Python service:', err);
        console.log('Document verification will use legacy methods');
      });
    });
    
    pythonProcess.on('exit', (code) => {
      if (code === 0) {
        // Python is available, use it
        const pyProcess = spawn('python', [pythonServicePath]);
        
        pyProcess.stdout.on('data', (data) => {
          console.log(`Python service: ${data}`);
        });
        
        pyProcess.stderr.on('data', (data) => {
          console.error(`Python service error: ${data}`);
        });
        
        pyProcess.on('error', (err) => {
          console.error('Failed to start Python service:', err);
          console.log('Document verification will use legacy methods');
        });
      }
    });
  } else {
    console.log('Python service not found at:', pythonServicePath);
    console.log('Document verification will use legacy methods');
  }
};

// Connect to database and seed initial data
const initializeServer = async () => {
  await connectDb();
  
  // Seed initial activation code if none exists
  await seedActivationCode();
  
  // Seed default email templates if none exist
  await seedEmailTemplates();
  
  // Check if Python service is available
  try {
    console.log('Checking Python verification service status...');
    const isHealthy = await pythonVerifier.checkHealth();
    
    if (isHealthy) {
      console.log('Python verification service is running and healthy');
    } else {
      console.log('Python verification service is not available, starting it...');
      startPythonService();
      
      // Check health again after a short delay
      setTimeout(async () => {
        const isRunning = await pythonVerifier.checkHealth();
        console.log('Python service health check:', isRunning ? 'Running' : 'Not available');
      }, 5000);
    }
  } catch (error) {
    console.log('Python service health check failed, starting service...');
    startPythonService();
  }
  
  // Start the server
  app.listen(port, () => {
    console.log(`SuperCert server running on port ${port}`)
  });
};

const app = express()

// Create required directories
ensureDirectories();

// Increase JSON body size limit for large payloads (images)
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))
app.use(cookieParser())
app.use(cors({
  origin: 'http://localhost:5173', // Allow requests from this origin
  credentials: true // Allow credentials (cookies)
}))
const port = 5001

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Increase body parser limits for large payloads
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(bodyParser.json({ limit: '50mb' }));

// Set static folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount routes
app.use('/ipfsDocs', upload.single("file"), docIpfs)
app.use('/studentInfo', studentInfo)
app.use('/transactionInfo', transactionInfo)
app.use('/user', userRoute)
app.use('/api/activation-codes', activationCodeRoute)
app.use('/api/email-templates', emailTemplateRoute)
app.use('/api/extract', imageExtractorRoutes)
app.use('/api/templates', templateRoutes)
app.use('/api/verify', verifyRoutes)
app.use('/verify', verificationRoutes)

// Mount new routes if available
if (documentRoutes) app.use('/api/documents', documentRoutes);
if (extractionRoutes) app.use('/api/extract', extractionRoutes);
if (templateVerifierRoutes) app.use('/api/template-verifier', templateVerifierRoutes);
if (authRoutes) app.use('/api/auth', authRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Initialize the server
initializeServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  // server.close(() => process.exit(1));
});



