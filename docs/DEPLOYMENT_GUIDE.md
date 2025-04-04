# Deployment Guide for SuperCert

This guide explains how to deploy the SuperCert application to GitHub and potentially to production environments.

## GitHub Deployment

1. Create a GitHub repository at github.com/new
2. Initialize your local repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```
3. Connect your local repository to GitHub:
   ```bash
   git remote add origin https://github.com/yourusername/supercert.git
   git branch -M main
   git push -u origin main
   ```

## Production Deployment

### Backend Deployment

#### Option 1: Deploy to a VPS (Digital Ocean, AWS EC2, etc.)

1. Set up a Ubuntu server
2. Install dependencies:
   ```bash
   sudo apt update
   sudo apt install nodejs npm python3 python3-pip mongodb
   ```
3. Clone your repository:
   ```bash
   git clone https://github.com/yourusername/supercert.git
   cd supercert
   ```
4. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```
5. Install application dependencies:
   ```bash
   # Server
   cd server
   npm install
   
   # Python Service
   cd ../pythonService
   pip3 install -r requirements.txt
   
   # Tesseract OCR
   sudo apt-get install tesseract-ocr
   ```
6. Set up PM2 for process management:
   ```bash
   npm install -g pm2
   pm2 start server/index.js --name supercert-server
   pm2 start pythonService/app.py --name supercert-python --interpreter python3
   pm2 startup
   pm2 save
   ```

#### Option 2: Deploy to Heroku

1. Create Procfile in the root directory:
   ```
   web: cd server && npm start
   worker: cd pythonService && python app.py
   ```
2. Set up MongoDB Atlas for database
3. Configure environment variables in Heroku dashboard
4. Deploy using Heroku CLI:
   ```bash
   heroku create supercert
   git push heroku main
   ```

### Frontend Deployment

#### Option 1: Deploy to Vercel or Netlify

1. Build the frontend:
   ```bash
   cd client
   npm run build
   ```
2. Set up a new project on Vercel/Netlify
3. Configure the build settings:
   - Build command: `cd client && npm run build`
   - Publish directory: `client/dist`
4. Set environment variables in the dashboard
5. Deploy using the platform's CLI or GitHub integration

#### Option 2: Serve from the same server

1. Build the frontend:
   ```bash
   cd client
   npm run build
   ```
2. Configure the server to serve static files:
   ```javascript
   // In server/index.js
   app.use(express.static(path.join(__dirname, '../client/dist')));
   app.get('*', (req, res) => {
     res.sendFile(path.join(__dirname, '../client/dist/index.html'));
   });
   ```

## Smart Contract Deployment

1. Configure your Ethereum wallet and network in hardhat.config.js
2. Deploy the contract to the Ethereum network:
   ```bash
   npx hardhat run scripts/deploy.js --network mainnet
   ```
3. Update the contract address in the .env file

## Configuration Notes

1. Update API endpoints in the frontend to point to your production server
2. Set up HTTPS with Let's Encrypt for security
3. Configure CORS to allow only trusted origins
4. Set up database backups for MongoDB

## Troubleshooting

1. If the Python service isn't working, check that Tesseract OCR is installed correctly
2. For MongoDB connection issues, verify the connection string in the .env file
3. For Ethereum contract issues, ensure your wallet has sufficient funds for gas

## Monitoring

1. Set up monitoring with PM2:
   ```bash
   pm2 monitor
   ```
2. Consider adding application monitoring with services like New Relic or Sentry

Remember to keep your environment variables secure and never commit them to the repository.