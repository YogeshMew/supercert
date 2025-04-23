const mongoose = require('mongoose');

const emailTemplateSchema = mongoose.Schema({
    name: {
        type: String,
        required: [true, "Template name is required"],
    },
    subject: {
        type: String,
        required: [true, "Email subject is required"],
    },
    body: {
        type: String,
        required: [true, "Email body is required"],
    },
    institution: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, "Institution is required"]
    },
    type: {
        type: String,
        enum: ['certificate-issued', 'verification-success', 'welcome', 'custom'],
        required: [true, "Template type is required"],
        default: 'custom'
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    variables: [{
        type: String
    }]
},
{
    timestamps: true,
});

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema); 