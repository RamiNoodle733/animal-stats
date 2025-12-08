/**
 * RankHistory Model - Stores daily rank snapshots for trend calculation
 */

const mongoose = require('mongoose');

const RankHistorySchema = new mongoose.Schema({
    // Date of the snapshot (stored as YYYY-MM-DD string for easy querying)
    date: {
        type: String,
        required: true,
        index: true
    },
    
    // Array of animal rankings for that day
    rankings: [{
        animalName: String,
        rank: Number,
        powerScore: Number
    }],
    
    // Timestamp
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index for efficient lookups
RankHistorySchema.index({ date: 1 }, { unique: true });

module.exports = mongoose.models.RankHistory || mongoose.model('RankHistory', RankHistorySchema);
