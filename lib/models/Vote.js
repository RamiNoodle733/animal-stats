/**
 * Vote Model - For Power Rankings
 * Stores user votes (upvote/downvote) for animals
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
    }
}, {
    timestamps: true,
    collection: 'votes'
});

// Ensure one vote per user per animal
VoteSchema.index({ animalId: 1, votedBy: 1 }, { unique: true });

// Static: Get vote counts for an animal
VoteSchema.statics.getVoteCounts = async function(animalId) {
    const upvotes = await this.countDocuments({ animalId, voteType: 'up' });
    const downvotes = await this.countDocuments({ animalId, voteType: 'down' });
    return { upvotes, downvotes, score: upvotes - downvotes };
};

// Static: Get all rankings
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
