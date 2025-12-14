/**
 * BattleStats Model - Tracks tournament battle statistics per animal
 * Used for ELO-style battle ratings and win rate calculations
 */

const mongoose = require('mongoose');

const BattleStatsSchema = new mongoose.Schema({
    // Animal identifier (by name for simplicity)
    animalName: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    
    // ELO-style battle rating (starts at 1000)
    battleRating: {
        type: Number,
        default: 1000
    },
    
    // Tournament statistics
    tournamentWins: {
        type: Number,
        default: 0
    },
    
    tournamentBattles: {
        type: Number,
        default: 0
    },
    
    // Tournament placements
    tournamentsPlayed: {
        type: Number,
        default: 0
    },
    
    tournamentsFirst: {
        type: Number,
        default: 0
    },
    
    tournamentsSecond: {
        type: Number,
        default: 0
    },
    
    tournamentsThird: {
        type: Number,
        default: 0
    },
    
    // Fight comparison count (how many times used in Compare feature)
    comparisonCount: {
        type: Number,
        default: 0
    },
    
    // Last updated timestamp
    lastBattleAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Calculate win rate
BattleStatsSchema.virtual('winRate').get(function() {
    if (this.tournamentBattles === 0) return 50;
    return Math.round((this.tournamentWins / this.tournamentBattles) * 100);
});

// Ensure virtuals are included in JSON
BattleStatsSchema.set('toJSON', { virtuals: true });
BattleStatsSchema.set('toObject', { virtuals: true });

module.exports = mongoose.models.BattleStats || mongoose.model('BattleStats', BattleStatsSchema);
