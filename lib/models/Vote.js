/**
 * Vote Model - For Power Rankings (Daily Voting System)
 * Users can vote once per animal PER DAY
 * All votes accumulate over time for power rankings
 */

const mongoose = require('mongoose');

const VoteSchema = new mongoose.Schema({
    animalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Animal',
        required: true,
        index: true
    },
    animalName: {
        type: String,
        required: true,
        index: true
    },
    votedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    votedByUsername: {
        type: String,
        required: true
    },
    voteType: {
        type: String,
        enum: ['up', 'down'],
        required: true
    },
    // Date string for daily voting (YYYY-MM-DD format)
    voteDate: {
        type: String,
        required: true,
        index: true
    }
}, {
    timestamps: true,
    collection: 'votes'
});

// Ensure one vote per user per animal PER DAY
VoteSchema.index({ animalId: 1, votedBy: 1, voteDate: 1 }, { unique: true });

// Static: Get today's date string (UTC)
VoteSchema.statics.getTodayString = function() {
    return new Date().toISOString().split('T')[0];
};

// Static: Get vote counts for an animal (ALL time - for power rankings)
VoteSchema.statics.getVoteCounts = async function(animalId) {
    const upvotes = await this.countDocuments({ animalId, voteType: 'up' });
    const downvotes = await this.countDocuments({ animalId, voteType: 'down' });
    return { upvotes, downvotes, score: upvotes - downvotes };
};

// Static: Get user's vote for TODAY
VoteSchema.statics.getTodayVote = async function(animalId, userId) {
    const today = this.getTodayString();
    const vote = await this.findOne({ animalId, votedBy: userId, voteDate: today });
    return vote?.voteType || null;
};

// Static: Get all of user's votes for TODAY
VoteSchema.statics.getUserTodayVotes = async function(userId) {
    const today = this.getTodayString();
    const votes = await this.find({ votedBy: userId, voteDate: today });
    const voteMap = {};
    votes.forEach(v => {
        voteMap[v.animalId.toString()] = v.voteType === 'up' ? 1 : -1;
    });
    return voteMap;
};

// Static: Get all rankings (aggregates ALL votes, not just today)
VoteSchema.statics.getRankings = async function() {
    return this.aggregate([
        {
            $group: {
                _id: '$animalId',
                animalName: { $first: '$animalName' },
                upvotes: { $sum: { $cond: [{ $eq: ['$voteType', 'up'] }, 1, 0] } },
                downvotes: { $sum: { $cond: [{ $eq: ['$voteType', 'down'] }, 1, 0] } }
            }
        },
        {
            $addFields: {
                score: { $subtract: ['$upvotes', '$downvotes'] },
                totalVotes: { $add: ['$upvotes', '$downvotes'] }
            }
        },
        { $sort: { score: -1, upvotes: -1 } }
    ]);
};

module.exports = mongoose.models.Vote || mongoose.model('Vote', VoteSchema);
