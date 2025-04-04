const EmailTemplate = require('../model/emailTemplateModel');
const User = require('../model/userModel');
const asyncHandler = require('express-async-handler');

const seedEmailTemplates = asyncHandler(async () => {
    console.log('Checking for default email templates...');
    
    // Check if any templates exist
    const templateCount = await EmailTemplate.countDocuments();
    
    if (templateCount === 0) {
        console.log('No email templates found, creating default templates...');
        
        // Find an admin user to associate with the default template
        const adminUser = await User.findOne({ role: 'admin' });
        
        if (!adminUser) {
            console.log('No admin user found. Default templates will be created when an admin registers.');
            return;
        }
        
        // Create default certificate issuance template
        const certificateTemplate = await EmailTemplate.create({
            name: 'Certificate Issuance Notification',
            subject: 'Your Certificate Has Been Issued',
            body: 'Hello {{ studentName }},\n\nThis is to inform you that your transcripts have been successfully uploaded to blockchain. You are requested to save the below hash(CID) for further verification purpose.\n\n{{ certificateHash }}\n\nBest Wishes,\n\n{{ institutionName }}',
            institution: adminUser._id,
            type: 'certificate-issued',
            isDefault: true,
            variables: ['studentName', 'certificateHash', 'institutionName', 'issueDate']
        });
        
        console.log('Created default certificate template:', certificateTemplate.name);
        
        // Create default welcome template
        const welcomeTemplate = await EmailTemplate.create({
            name: 'Welcome to SuperCert',
            subject: 'Welcome to SuperCert',
            body: 'Hello {{ studentName }},\n\nWelcome to SuperCert! Your account has been successfully created.\n\nYou can now access the platform and view your certificates.\n\nBest regards,\n\n{{ institutionName }}',
            institution: adminUser._id,
            type: 'welcome',
            isDefault: true,
            variables: ['studentName', 'institutionName']
        });
        
        console.log('Created default welcome template:', welcomeTemplate.name);
        
        console.log('Default email templates created successfully!');
    } else {
        console.log(`Found ${templateCount} existing email templates, skipping seed.`);
    }
});

module.exports = seedEmailTemplates; 