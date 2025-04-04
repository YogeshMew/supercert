/**
 * Script to start the Python verification service
 * Run this with: node start_verification_service.js
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const PYTHON_SERVICE_PATH = path.join(__dirname, 'pythonService');
const APP_PATH = path.join(PYTHON_SERVICE_PATH, 'app.py');

// Check if directories exist
const checkDirs = () => {
  // Create directories if they don't exist
  const dirs = [
    path.join(PYTHON_SERVICE_PATH, 'templates'),
    path.join(PYTHON_SERVICE_PATH, 'temp'),
    path.join(PYTHON_SERVICE_PATH, 'uploads')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      console.log(`Creating directory: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Start the Python service
const startPythonService = () => {
  console.log('Starting Python verification service...');
  
  // Check if Python app exists
  if (!fs.existsSync(APP_PATH)) {
    console.error(`Error: Python application not found at: ${APP_PATH}`);
    console.log('Please make sure the Python verification service is properly set up.');
    process.exit(1);
  }
  
  // Create required directories
  checkDirs();
  
  // Determine Python command based on OS
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  
  // Start the Python service
  const pythonProcess = spawn(pythonCmd, [APP_PATH], {
    cwd: PYTHON_SERVICE_PATH,
    stdio: 'inherit'
  });
  
  // Log events
  pythonProcess.on('error', (err) => {
    console.error('Failed to start Python service:', err);
  });
  
  pythonProcess.on('exit', (code, signal) => {
    if (code !== 0) {
      console.log(`Python service exited with code ${code} and signal ${signal}`);
    }
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('Stopping Python service...');
    pythonProcess.kill();
    process.exit();
  });
  
  process.on('SIGTERM', () => {
    console.log('Stopping Python service...');
    pythonProcess.kill();
    process.exit();
  });
  
  console.log('Python verification service started successfully');
};

// Run the service
startPythonService(); 