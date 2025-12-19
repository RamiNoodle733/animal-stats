/**
 * XP Claim Model - Tracks XP awards for voting (once per animal per day per user)
 * Separated from votes so users can change their vote without losing XP
 * dayKey is computed using the user's local timezone
 */

const mongoose = require('mongoose');

const XpClaimSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    animalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Animal',
        required: true,
        index: true
    },
    animalName: {
        type: String,
        required: true
    },
    // Date string in user's local timezone (YYYY-MM-DD format)
    dayKey: {
        type: String,
        required: true,
        index: true
    },
    // Amount of XP awarded
    xpAmount: {
        type: Number,
        default: 5
    },
    // Timestamp when XP was awarded
    awardedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    collection: 'xpclaims'
});

// Ensure one XP claim per user per animal per day (user's local day)
XpClaimSchema.index({ userId: 1, animalId: 1, dayKey: 1 }, { unique: true });

/**
 * Static: Get the day key (YYYY-MM-DD) for a given timezone
 * @param {string} timeZone - IANA timezone string (e.g., 'America/New_York')
 * @returns {string} Date string in YYYY-MM-DD format
 */
XpClaimSchema.statics.getDayKey = function(timeZone) {
    try {
        const now = new Date();
        // Format date in the user's timezone
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        return formatter.format(now); // Returns YYYY-MM-DD format
    } catch (error) {
        // Fallback to UTC if invalid timezone
        console.warn(`Invalid timezone "${timeZone}", falling back to UTC`);
        return new Date().toISOString().split('T')[0];
    }
};

/**
 * Static: Check if XP has been claimed for this user/animal/day
 * @param {ObjectId} userId 
 * @param {ObjectId} animalId 
 * @param {string} dayKey - YYYY-MM-DD in user's timezone
 * @returns {boolean}
 */
XpClaimSchema.statics.hasClaimedXp = async function(userId, animalId, dayKey) {
    const claim = await this.findOne({ userId, animalId, dayKey });
    return !!claim;
};

/**
 * Static: Record an XP claim
 * @param {ObjectId} userId 
 * @param {ObjectId} animalId 
 * @param {string} animalName
 * @param {string} dayKey - YYYY-MM-DD in user's timezone
 * @param {number} xpAmount - Amount of XP to award (default 5)
 * @returns {Object} The created claim document
 */
XpClaimSchema.statics.recordClaim = async function(userId, animalId, animalName, dayKey, xpAmount = 5) {
    try {
        const claim = await this.create({
            userId,
            animalId,
            animalName,
            dayKey,
            xpAmount,
            awardedAt: new Date()
        });
        return claim;
    } catch (error) {
        // If duplicate key error, claim already exists
        if (error.code === 11000) {
            return null;
        }
        throw error;
    }
};

/**
 * Static: Get all XP claims for a user on a specific day
 * @param {ObjectId} userId 
 * @param {string} dayKey - YYYY-MM-DD
 * @returns {Array} Array of claim documents
 */
XpClaimSchema.statics.getUserDayClaims = async function(userId, dayKey) {
    return this.find({ userId, dayKey });
};

// Check if model already exists to prevent OverwriteModelError during hot reload
module.exports = mongoose.models.XpClaim || mongoose.model('XpClaim', XpClaimSchema);
