/**
 * SiteStats Model - Tracks global site statistics
 * Stores aggregate counts for visits, comparisons, tournaments, etc.
 */

const mongoose = require('mongoose');

const SiteStatsSchema = new mongoose.Schema({
    // Unique key for this stats document (e.g., 'global')
    key: {
        type: String,
        required: true,
        unique: true,
        default: 'global'
    },
    // Total site visits (unique sessions per day)
    totalVisits: {
        type: Number,
        default: 0
    },
    // Total comparisons made (Compare page + tournaments)
    totalComparisons: {
        type: Number,
        default: 0
    },
    // Total tournaments completed
    totalTournaments: {
        type: Number,
        default: 0
    },
    // Daily visit tracking to prevent inflation
    dailyVisits: [{
        date: { type: String }, // YYYY-MM-DD
        count: { type: Number, default: 0 },
        uniqueIps: [{ type: String }] // Track unique IPs per day
    }],
    // Last updated timestamp
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    collection: 'sitestats'
});

/**
 * Static: Increment a stat counter
 * @param {string} statName - Name of the stat to increment
 * @param {number} amount - Amount to increment by (default 1)
 */
SiteStatsSchema.statics.incrementStat = async function(statName, amount = 1) {
    const validStats = ['totalVisits', 'totalComparisons', 'totalTournaments'];
    if (!validStats.includes(statName)) {
        throw new Error(`Invalid stat name: ${statName}`);
    }

    const update = {
        $inc: { [statName]: amount },
        $set: { lastUpdated: new Date() }
    };

    await this.findOneAndUpdate(
        { key: 'global' },
        update,
        { upsert: true, new: true }
    );
};

/**
 * Static: Record a daily visit
 * @param {string} ipHash - Hashed IP address for uniqueness
 * @returns {boolean} Whether this was a new unique visit today
 */
SiteStatsSchema.statics.recordVisit = async function(ipHash) {
    const today = new Date().toISOString().split('T')[0];
    
    // Find or create the stats document
    let stats = await this.findOne({ key: 'global' });
    if (!stats) {
        stats = await this.create({ key: 'global' });
    }

    // Find today's entry
    let todayEntry = stats.dailyVisits.find(d => d.date === today);
    
    if (!todayEntry) {
        // New day, create entry
        stats.dailyVisits.push({
            date: today,
            count: 1,
            uniqueIps: [ipHash]
        });
        stats.totalVisits += 1;
        await stats.save();
        return true;
    }

    // Check if this IP already visited today
    if (todayEntry.uniqueIps.includes(ipHash)) {
        return false; // Not a unique visit
    }

    // New unique visit today
    todayEntry.uniqueIps.push(ipHash);
    todayEntry.count += 1;
    stats.totalVisits += 1;
    
    // Clean up old daily entries (keep last 7 days)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];
    stats.dailyVisits = stats.dailyVisits.filter(d => d.date >= cutoffStr);
    
    await stats.save();
    return true;
};

/**
 * Static: Get current stats
 */
SiteStatsSchema.statics.getStats = async function() {
    const stats = await this.findOne({ key: 'global' });
    if (!stats) {
        return {
            totalVisits: 0,
            totalComparisons: 0,
            totalTournaments: 0
        };
    }
    return {
        totalVisits: stats.totalVisits,
        totalComparisons: stats.totalComparisons,
        totalTournaments: stats.totalTournaments
    };
};

module.exports = mongoose.models.SiteStats || mongoose.model('SiteStats', SiteStatsSchema);
