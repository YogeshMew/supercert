const mongoose = require('mongoose');

const VerificationLogSchema = new mongoose.Schema({
  documentInfo: {
    filename: String,
    filesize: Number,
    filetype: String
  },
  template: {
    type: String,
    required: true
  },
  result: {
    type: String,
    enum: ['VERIFIED', 'REJECTED'],
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  studentInfo: {
    name: String,
    batch: String,
    program: String,
    email: String
  },
  ipAddress: String,
  userAgent: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Create indexes for faster retrieval and filtering
VerificationLogSchema.index({ result: 1, timestamp: -1 });
VerificationLogSchema.index({ template: 1 });
VerificationLogSchema.index({ 'studentInfo.name': 1 });
VerificationLogSchema.index({ 'studentInfo.email': 1 });

const VerificationLog = mongoose.model('VerificationLog', VerificationLogSchema);

module.exports = VerificationLog; 