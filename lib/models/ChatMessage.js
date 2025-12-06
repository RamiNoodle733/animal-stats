/**
 * ChatMessage Model - For general community chat
 * Stores real-time chat messages in the community tab
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

// Only return non-deleted messages
ChatMessageSchema.pre('find', function() {
    this.where({ isDeleted: { $ne: true } });
});

module.exports = mongoose.models.ChatMessage || mongoose.model('ChatMessage', ChatMessageSchema);
