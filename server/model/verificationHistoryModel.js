const mongoose = require('mongoose');

const verificationHistorySchema = mongoose.Schema({
    certificateId: {
        type: String,
        required: [true, "Certificate ID is required"]
    },
    verifierName: {
        type: String,
        required: [true, "Verifier name is required"]
    },
    verifierEmail: {
        type: String,
        required: [true, "Verifier email is required"]
    },
    verifierOrganization: {
        type: String,
        default: ''
    },
    studentEmail: {
        type: String,
        default: ''
    },
    result: {
        type: String,
        enum: ['success', 'failed', 'invalid_certificate', 'invalid_institution'],
        required: [true, "Verification result is required"]
    },
    ipAddress: {
        type: String,
        default: ''
    },
    userAgent: {
        type: String,
        default: ''
    },
    verifierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    metadata: {
        type: Object,
        default: {}
    }
},
{
    timestamps: true,
});

// Index for efficient lookups
verificationHistorySchema.index({ certificateId: 1 });
verificationHistorySchema.index({ verifierEmail: 1 });
verificationHistorySchema.index({ createdAt: -1 });

module.exports = mongoose.model('VerificationHistory', verificationHistorySchema); 