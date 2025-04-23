const mongoose = require('mongoose');

const accreditedInstitutionSchema = mongoose.Schema({
    name: {
        type: String,
        required: [true, "Institution name is required"],
        unique: [true, "Institution name already exists"]
    },
    domain: {
        type: String,
        required: [true, "Email domain is required"],
        unique: [true, "Domain already exists"]
    },
    country: {
        type: String,
        required: [true, "Country is required"]
    },
    type: {
        type: String,
        enum: ['university', 'college', 'school', 'certificate_provider', 'other'],
        required: [true, "Institution type is required"],
    },
    accreditedBy: {
        type: String,
        required: [true, "Accreditation body is required"]
    },
    website: {
        type: String,
        default: ''
    },
    logo: {
        type: String,
        default: ''
    },
    address: {
        type: String,
        default: ''
    },
    contactEmail: {
        type: String,
        default: ''
    },
    contactPhone: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
},
{
    timestamps: true,
});

module.exports = mongoose.model('AccreditedInstitution', accreditedInstitutionSchema); 