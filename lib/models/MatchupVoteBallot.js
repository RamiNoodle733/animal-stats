'use strict';

const mongoose = require('mongoose');

const MatchupVoteBallotSchema = new mongoose.Schema({
    matchupKey: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dayKey: { type: String, required: true, index: true },
    votedFor: { type: String, required: true },
    votedAt: { type: Date, default: Date.now }
}, { timestamps: true, collection: 'matchupvoteballots' });

MatchupVoteBallotSchema.index({ matchupKey: 1, userId: 1, dayKey: 1 }, { unique: true });

module.exports = mongoose.models.MatchupVoteBallot || mongoose.model('MatchupVoteBallot', MatchupVoteBallotSchema);
