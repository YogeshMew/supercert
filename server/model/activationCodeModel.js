const mongoose = require('mongoose');

const activationCodeSchema = mongoose.Schema({
    code: {
        type: String,
        required: [true, "Activation code is required"],
        unique: [true, "Activation code already exists"]
    },
    type: {
        type: String,
        enum: ['admin', 'verifier', 'general'],
        default: 'general'
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    isUsed: {
        type: Boolean,
        default: false
    },
    usedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    institutionSpecific: {
        type: Boolean,
        default: false
    },
    institution: {
        name: {
            type: String,
            default: ''
        },
        email: {
            type: String,
            default: ''
        },
        address: {
            type: String,
            default: ''
        }
    }
},
{
    timestamps: true,
});

module.exports = mongoose.model('ActivationCode', activationCodeSchema);