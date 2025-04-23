const axios = require("axios");
require('dotenv').config({ path: __dirname + '../../.env' });
const FormData = require("form-data");
const fs = require("fs");
const JWT = process.env.PINATA_JWT;
const files = require('../model/ipfsModel')
const asyncHandler = require('express-async-handler')
const docArray = [] //for generating id
console.log(JWT)
console.log(process.env.NODE_ENV)
const nodemailer = require('nodemailer')
const { Web3Storage, File } = require('web3.storage')
const path = require('path')
const TransactionInfo = require('../model/transactionInfoModel')
const StudentInfo = require('../model/studentInfoModel')
const EmailTemplate = require('../model/emailTemplateModel')
const User = require('../model/userModel')


const createFile = (Name, FileData) => {
  const id = docArray.length + 1
  const newFile = new files(id, Name, FileData)
  docArray.push(newFile)
  return newFile
}

const IpfsPinataApi = async (Name, FileData) => {
  try {
    console.log("JWT being used:", JWT);
    console.log("File path being used:", FileData);
    
    // Check if file exists
    if (!fs.existsSync(FileData)) {
      console.error(`File does not exist at path: ${FileData}`);
      throw new Error(`File does not exist at path: ${FileData}`);
    }
    
    const formData = new FormData();
    const file1 = fs.createReadStream(FileData);
    formData.append("file", file1);
    
    const pinataMetadata = JSON.stringify({
      name: Name,
    });

    formData.append("pinataMetadata", pinataMetadata);

    const pinataOptions = JSON.stringify({
      cidVersion: 1,
    });
    formData.append("pinataOptions", pinataOptions);

    console.log("Sending request to Pinata...");
    const res = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      formData,
      {
        headers: {
          Authorization: `Bearer ${JWT}`,
        },
      }
    );
    
    console.log("Pinata response:", res.data);
    const vari = res.data.IpfsHash;
    return vari;
  } catch (error) {
    console.error("Error in Pinata API call:", error.message);
    if (error.response) {
      console.error("Pinata API response error:", error.response.data);
      console.error("Pinata API status code:", error.response.status);
    }
    throw error; // Re-throw to be handled by the caller
  }
}

const createFileMain = asyncHandler(async (req, res) => {
  try {
    console.log("the requested body is", req.body);
    console.log("file info:", req.file);
    
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    const Name = req.body.name || req.file.originalname;
    // Use absolute path instead of relative path
    const filepath = `${process.cwd()}/uploads/${req.file.filename}`;
    
    console.log("File path to be used:", filepath);
    
    // Check if file exists
    if (!fs.existsSync(filepath)) {
      console.error(`File does not exist at path: ${filepath}`);
      return res.status(400).json({ error: `File does not exist at path: ${filepath}` });
    }
    
    const instance1 = await createFile(Name, filepath);
    let vari;
    
    try {
      vari = await IpfsPinataApi(instance1.Name, instance1.FileData);
      console.log("Successfully uploaded to Pinata, CID:", vari);
      return res.status(201).json({ success: true, cid: vari });
    } catch (error) {
      console.error("Failed to upload to Pinata:", error.message);
      return res.status(500).json({ 
        error: "Failed to upload to Pinata", 
        message: error.message,
        details: error.response?.data || "No additional details available"
      });
    }
  } catch (error) {
    console.error("Error in createFileMain:", error.message);
    return res.status(500).json({ error: "Server error", message: error.message });
  }
})

const sendemail = asyncHandler(async (req, res) => {
  try {
    // Use environment variables or fallback to config values
    const EMAIL_USER = process.env.EMAIL_USER || 'yrmewara@student.sfit.ac.in';
    const EMAIL_PASS = process.env.EMAIL_PASS || 'app-password-here'; 
    
    // Log what we're using (without showing the actual password)
    console.log(`Attempting to send email using: ${EMAIL_USER}`);
    
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // use SSL
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
      }
    });
  
    const userEmail = req.body.email;
    const verificationToken = req.body.hash;    
    const studentName = req.body.name || 'Student';
    const institutionName = req.body.institution || 'Supercert';
    
    // Validate required fields
    if (!userEmail || !verificationToken) {
      console.error('Missing required email data:', { userEmail, verificationToken });
      return res.status(400).json({
        success: false,
        message: 'Email and hash are required'
      });
    }
    
    console.log('Sending email with data:', {
      email: userEmail,
      hash: verificationToken,
      studentName: studentName,
      institutionName: institutionName
    });
    
    // Find the institution's user object by name
    const institutionUser = await User.findOne({ 
      "institution.name": institutionName,
      role: "admin" 
    });
    
    let template;
    
    if (institutionUser) {
      console.log('Found institution user:', institutionUser._id);
      
      // First try to find this institution's default template
      template = await EmailTemplate.findOne({ 
        institution: institutionUser._id,
        type: 'certificate-issued',
        isDefault: true
      });
      
      // If no default template, try any certificate template from this institution
      if (!template) {
        template = await EmailTemplate.findOne({
          institution: institutionUser._id,
          type: 'certificate-issued'
        });
      }
    }
    
    // Still no template found, try to find any default template
    if (!template) {
      template = await EmailTemplate.findOne({ 
        type: 'certificate-issued', 
        isDefault: true 
      });
    }
    
    // Still nothing, use any certificate template
    if (!template) {
      template = await EmailTemplate.findOne({ 
        type: 'certificate-issued'
      });
    }
    
    // Log which template was found
    if (template) {
      console.log('Using email template:', template.name);
    } else {
      console.log('No email template found, using default fallback');
    }
    
    let subject = 'Your Certificate Has Been Added to Blockchain';
    let emailText = `Hello ${studentName},

This is to inform you that your document has been successfully uploaded to blockchain. You are requested to save the below hash(CID) for verification purposes.

${verificationToken}

Best Wishes,

${institutionName}`;
    
    let htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <h2 style="color: #4285f4; margin-bottom: 20px;">Document Added to Blockchain</h2>
        <p>Hello ${studentName},</p>
        <p>This is to inform you that your document has been successfully uploaded to blockchain. You are requested to save the below hash(CID) for verification purposes.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0; word-break: break-all;">
          <code>${verificationToken}</code>
        </div>
        <p>Best Wishes,</p>
        <p><strong>${institutionName}</strong></p>
      </div>
    `;
    
    // If a template was found, use it
    if (template) {
      subject = template.subject;
      
      // Replace variables in the body
      let body = template.body;
      body = body.replace(/\{\{\s*studentName\s*\}\}/g, studentName);
      body = body.replace(/\{\{\s*certificateHash\s*\}\}/g, verificationToken);
      body = body.replace(/\{\{\s*institutionName\s*\}\}/g, institutionName);
      body = body.replace(/\{\{\s*issueDate\s*\}\}/g, new Date().toLocaleDateString());
      
      // Set the plain text version
      emailText = body;
      
      // Create a nicely formatted HTML version with proper styling
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h2 style="color: #4285f4; margin-bottom: 20px;">${subject}</h2>
          ${body.split('\n\n').map(paragraph => {
            // Special handling for the hash to make it stand out
            if (paragraph.includes(verificationToken)) {
              return `<div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0; word-break: break-all;">
                <code>${paragraph}</code>
              </div>`;
            }
            return `<p>${paragraph}</p>`;
          }).join('')}
        </div>
      `;
    }

    // If we don't have credentials, simulate success but log a warning
    if (!EMAIL_PASS || EMAIL_PASS === 'app-password-here') {
      console.warn('Email credentials not configured. Simulating email success.');
      return res.status(200).json({
        success: true,
        message: 'Email notification simulated (no credentials configured)',
        emailData: {
          to: userEmail,
          subject: subject
        }
      });
    }

    // Attempt to send the email
    try {
      // Send email with both text and HTML versions
      const info = await transporter.sendMail({
        from: `"${institutionName}" <${EMAIL_USER}>`,
        to: userEmail,
        subject: subject,
        text: emailText, // Plain text fallback
        html: htmlContent // HTML version with styling
      });
      
      console.log('Verification email sent:', info.response);
      res.status(200).json({
        success: true,
        message: 'Verification email sent successfully'
      });
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Return 200 status with error info, so client doesn't retry
      res.status(200).json({
        success: false,
        message: 'Failed to send email, but document was stored successfully',
        error: emailError.message
      });
    }
  } catch (error) {
    console.error('Server error in sendemail:', error);
    res.status(500).json({
      success: false,
      message: 'Server error processing email request',
      error: error.message
    });
  }
});

module.exports = { createFileMain , sendemail }



