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

    // Try to add IP to today's existing entry atomically.
    const result = await this.findOneAndUpdate(
        { key: 'global', 'dailyVisits.date': today },
        {
            $addToSet: { 'dailyVisits.$.uniqueIps': ipHash },
            $set: { lastUpdated: new Date() }
        },
        { new: true }
    );

    if (!result) {
        // Today's entry doesn't exist. Use a filter that prevents a second
        // concurrent request from also pushing a duplicate date entry.
        const pushed = await this.findOneAndUpdate(
            { key: 'global', 'dailyVisits.date': { $ne: today } },
            {
                $push: { dailyVisits: { date: today, count: 1, uniqueIps: [ipHash] } },
                $inc: { totalVisits: 1 },
                $set: { lastUpdated: new Date() }
            },
            { upsert: true, new: true }
        );

        if (!pushed) {
            // Another request already created today's entry — retry the $addToSet path
            return this.recordVisit(ipHash);
        }

        // Clean up entries older than 7 days
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 7);
        const cutoffStr = cutoffDate.toISOString().split('T')[0];
        await this.updateOne(
            { key: 'global' },
            { $pull: { dailyVisits: { date: { $lt: cutoffStr } } } }
        );
        return true;
    }

    // Check whether $addToSet actually added the IP (i.e., it was new)
    const todayEntry = result.dailyVisits.find(d => d.date === today);
    if (!todayEntry) return false;

    const ipAlreadyExisted = todayEntry.uniqueIps.filter(ip => ip === ipHash).length > 1;
    if (ipAlreadyExisted) {
        return false;
    }

    // New unique visit — atomically increment counters
    await this.updateOne(
        { key: 'global', 'dailyVisits.date': today },
        {
            $inc: { totalVisits: 1, 'dailyVisits.$.count': 1 }
        }
    );
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
