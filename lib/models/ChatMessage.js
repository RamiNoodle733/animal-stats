/**
 * ChatMessage Model - For general community chat
 * Stores real-time chat messages in the community tab
 * Supports replies and voting like Comments
 */

const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
    // Message content
    content: {
        type: String,
        required: true,
        maxlength: 500,
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
    // Reply support - parent message ID
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatMessage',
        default: null,
        index: true
    },
    // Voting support
    upvotes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    downvotes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // Timestamp
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    // Moderation
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Index for efficient querying of recent messages
ChatMessageSchema.index({ createdAt: -1 });

// Index for finding replies
ChatMessageSchema.index({ parentId: 1, createdAt: 1 });

// Virtual for score calculation
ChatMessageSchema.virtual('score').get(function() {
    return (this.upvotes?.length || 0) - (this.downvotes?.length || 0);
});

// Only return non-deleted messages
ChatMessageSchema.pre('find', function() {
    this.where({ isDeleted: { $ne: true } });
});

ChatMessageSchema.pre('findOne', function() {
    this.where({ isDeleted: { $ne: true } });
});

// Ensure virtuals are included in JSON output
ChatMessageSchema.set('toJSON', { virtuals: true });
ChatMessageSchema.set('toObject', { virtuals: true });

module.exports = mongoose.models.ChatMessage || mongoose.model('ChatMessage', ChatMessageSchema);
