# SuperCert - Quick Deployment Guide

## GitHub Deployment Steps

Now that you have Git installed, follow these steps to deploy your SuperCert project to GitHub:

1. Create a new repository on GitHub:
   - Go to [github.com/new](https://github.com/new)
   - Name your repository "supercert"
   - Choose visibility (public or private)
   - Click "Create repository"

2. Open Command Prompt or PowerShell in your project directory (D:\supercert) and run:

```bash
# Initialize git repository
git init

# Add all files to staging
git add .

# Commit the changes
git commit -m "Initial commit"

# Connect to your GitHub repository (replace YOUR-USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR-USERNAME/supercert.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Quick Start Guide

### Starting the Services

1. Start the Python verification service:
```bash
cd pythonService
python app.py
```

2. Start the Node.js API server:
```bash
cd server
node index.js
```

3. Start the React client:
```bash
cd client
npm run dev
```

### Working with the Application

1. Access the client at http://localhost:5173
2. Login with admin credentials or register a new account
3. Use the Admin panel to upload and verify documents
4. Use the verification page to check document authenticity

## Troubleshooting

If you encounter verification issues:
1. Ensure both Python service and Node.js server are running
2. Check that your template images are in the pythonService/templates directory
3. Check the console logs for any error messages

For GitHub deployment issues:
1. If you see "Authentication failed", try using a personal access token:
   ```
   git remote set-url origin https://YOUR-USERNAME:YOUR-TOKEN@github.com/YOUR-USERNAME/supercert.git
   ```

2. If you can't push due to conflicts:
   ```
   git pull origin main --rebase
   git push origin main
   ``` 