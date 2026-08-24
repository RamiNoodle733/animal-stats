'use strict';

const mongoose = require('mongoose');

const MatchupVoteSchema = new mongoose.Schema({
    matchupKey: { type: String, required: true, unique: true },
    animal1Name: { type: String, required: true },
    animal2Name: { type: String, required: true },
    animal1Votes: { type: Number, default: 0, min: 0 },
    animal2Votes: { type: Number, default: 0, min: 0 },
    totalVotes: { type: Number, default: 0, min: 0 },
    lastVoteAt: { type: Date, default: Date.now }
}, { timestamps: true, collection: 'matchupvotes' });

module.exports = mongoose.models.MatchupVote || mongoose.model('MatchupVote', MatchupVoteSchema);
