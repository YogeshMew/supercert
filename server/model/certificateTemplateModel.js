const mongoose = require('mongoose');

const certificateTemplateSchema = mongoose.Schema({
    name: {
        type: String,
        required: [true, "Template name is required"]
    },
    institution: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, "Institution is required"]
    },
    logoPosition: {
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
        width: { type: Number, default: 0 },
        height: { type: Number, default: 0 }
    },
    signaturePosition: {
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
        width: { type: Number, default: 0 },
        height: { type: Number, default: 0 }
    },
    logo: {
        type: String,
        default: ''
    },
    signature: {
        type: String,
        default: ''
    },
    headerText: {
        type: String,
        default: ''
    },
    footerText: {
        type: String,
        default: ''
    },
    backgroundColor: {
        type: String,
        default: '#FFFFFF'
    },
    borderColor: {
        type: String,
        default: '#000000'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    metadata: {
        type: Object,
        default: {}
    }
},
{
    timestamps: true,
});

module.exports = mongoose.model('CertificateTemplate', certificateTemplateSchema); 