const mongoose = require('mongoose')

const transactionInfoSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true
    },
    emailOfStudent: {
        type: String,
        required: true
    },
    batch: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: () => Date.now(),
        immutable: true,
        required: true
    },
    CID: {
        type: String,
        required: true
    },
    organizationName:{
        type: String,
        required: true
    },
    transactionHash: {
        type: String,
        required: false,
        default: 'No transaction hash provided'
    }
},{
    timestamps:true,
});

module.exports = mongoose.model('transactionInfo', transactionInfoSchema);