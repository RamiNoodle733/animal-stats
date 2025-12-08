/**
 * Comment Model - For animal discussions
 * Stores comments on animals and comparisons with voting and replies
 */

const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
    // What the comment is on
    targetType: {
        type: String,
        enum: ['animal', 'comparison'],
        required: true,
        index: true
    },
    // For animal comments
    animalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Animal',
        index: true
    },
    animalName: {
        type: String,
        index: true
    },
    // For comparison comments (stores both animal names)
    comparisonKey: {
        type: String,
        index: true
    },
    // Comment content
    content: {
        type: String,
        required: true,
        maxlength: 1000,
        trim: true
    },
    // Author info
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    authorUsername: {
        type: String,
        required: true
    },
    // Profile animal for avatar display
    profileAnimal: {
        type: String,
        default: null
    },
    // Anonymous posting
    isAnonymous: {
        type: Boolean,
        default: false
    },
    // Upvotes/Downvotes on comment
    upvotes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    downvotes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    voteScore: {
        type: Number,
        default: 0
    },
    // For threaded replies
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
        default: null,
        index: true
    },
    // Store parent author for reply notifications
    parentAuthorUsername: {
        type: String,
        default: null
    },
    // Moderation
    isHidden: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    collection: 'comments'
});

// Indexes
CommentSchema.index({ targetType: 1, animalId: 1, createdAt: -1 });
CommentSchema.index({ targetType: 1, comparisonKey: 1, createdAt: -1 });
CommentSchema.index({ parentId: 1, createdAt: 1 });

// Virtual for display name
CommentSchema.virtual('displayName').get(function() {
    return this.isAnonymous ? 'Anonymous' : this.authorUsername;
});

// Static: Get top-level comments for an animal
CommentSchema.statics.getAnimalComments = function(animalId, limit = 50) {
    return this.find({ 
        targetType: 'animal', 
        animalId, 
        isHidden: false,
        parentId: null 
    })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static: Get replies for a comment
CommentSchema.statics.getReplies = function(parentId) {
    return this.find({ 
        parentId, 
        isHidden: false 
    })
    .sort({ createdAt: 1 });
};

// Static: Get comment count for an animal
CommentSchema.statics.getAnimalCommentCount = function(animalId) {
    return this.countDocuments({ 
        targetType: 'animal', 
        animalId, 
        isHidden: false 
    });
};

// Static: Create comparison key (alphabetically sorted)
CommentSchema.statics.createComparisonKey = function(animal1, animal2) {
    return [animal1, animal2].sort().join(' vs ');
};

// Method: Update vote score
CommentSchema.methods.updateVoteScore = function() {
    this.voteScore = this.upvotes.length - this.downvotes.length;
    return this.save();
};

module.exports = mongoose.models.Comment || mongoose.model('Comment', CommentSchema);