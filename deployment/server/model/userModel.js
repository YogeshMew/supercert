const mongoose = require('mongoose')

const userSchema = mongoose.Schema({
    username: {
        type: String,
        required: [true, "Please input username"],
    },
    email: {
        type: String,
        required: [true, "Please input email"],
        unique: [true, "Email already exists"],
    },
    password: {
        type: String, 
        required: [true, "Add Password"],
    },
    role: {
        type: String,
        enum: ['admin', 'verifier'],
        required: [true, "User role is required"],
        default: 'verifier'
    },
    institution: {
        name: {
            type: String,
            default: ''
        },
        logo: {
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
        },
        isVerified: {
            type: Boolean,
            default: false
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    activationCode: {
        type: String,
        default: ''
    }
},
{
    timestamps: true,
})

module.exports = mongoose.model("User", userSchema)