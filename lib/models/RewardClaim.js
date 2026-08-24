'use strict';

const mongoose = require('mongoose');

const RewardClaimSchema = new mongoose.Schema({
    claimKey: {
        type: String,
        required: true,
        unique: true,
        maxlength: 240
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    action: {
        type: String,
        required: true,
        maxlength: 64
    },
    sourceId: {
        type: String,
        default: null,
        maxlength: 160
    },
    xpAwarded: {
        type: Number,
        required: true,
        min: 0
    },
    bpAwarded: {
        type: Number,
        required: true,
        min: 0
    },
    appliedAt: {
        type: Date,
        required: true,
        default: Date.now
    }
}, {
    timestamps: true,
    collection: 'rewardclaims'
});

RewardClaimSchema.index({ userId: 1, action: 1, createdAt: -1 });

module.exports = mongoose.models.RewardClaim || mongoose.model('RewardClaim', RewardClaimSchema);
