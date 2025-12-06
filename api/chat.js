/**
 * API Route: /api/chat
 * Handles community general chat messages AND community feed
 * 
 * GET /api/chat - Get chat messages
 * GET /api/chat?feed=true - Get all comments feed
 * POST /api/chat - Send chat message
 * DELETE /api/chat - Delete chat message
 */

const { connectToDatabase } = require('../lib/mongodb');
const ChatMessage = require('../lib/models/ChatMessage');
const Comment = require('../lib/models/Comment');
const Animal = require('../lib/models/Animal');
const { verifyToken } = require('../lib/auth');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        await connectToDatabase();

        // Check if this is a feed request
        if (req.query.feed === 'true' && req.method === 'GET') {
            return await handleGetFeed(req, res);
        }

        switch (req.method) {
            case 'GET':
                return await handleGet(req, res);
            case 'POST':
                return await handlePost(req, res);
            case 'DELETE':
                return await handleDelete(req, res);
            default:
                return res.status(405).json({ success: false, error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Chat API Error:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

// GET: Get community feed (all comments)
async function handleGetFeed(req, res) {
    const { limit = 50, skip = 0 } = req.query;

    // Get all root comments (not replies) sorted by newest first
    const comments = await Comment.find({
        isHidden: false,
        parentId: null
    })
        .sort({ createdAt: -1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .lean();

    // Get reply counts and latest replies for each comment
    const commentsWithReplies = await Promise.all(comments.map(async (comment) => {
        const replyCount = await Comment.countDocuments({
            parentId: comment._id,
            isHidden: false
        });

        const replies = await Comment.find({
            parentId: comment._id,
            isHidden: false
        })
            .sort({ createdAt: 1 })
            .lean();

        const score = (comment.upvotes?.length || 0) - (comment.downvotes?.length || 0);

        let animalImage = null;
        if (comment.targetType === 'animal' && comment.animalName) {
            const animal = await Animal.findOne({ name: comment.animalName }).select('image').lean();
            animalImage = animal?.image || null;
        }

        return {
            ...comment,
            score,
            replyCount,
            replies: replies.map(r => ({
                ...r,
                score: (r.upvotes?.length || 0) - (r.downvotes?.length || 0)
            })),
            animalImage
        };
    }));

    const totalCount = await Comment.countDocuments({
        isHidden: false,
        parentId: null
    });

    return res.status(200).json({
        success: true,
        count: commentsWithReplies.length,
        total: totalCount,
        hasMore: parseInt(skip) + commentsWithReplies.length < totalCount,
        data: commentsWithReplies
    });
}

// GET: Get recent chat messages
async function handleGet(req, res) {
    const { limit = 50, before } = req.query;

    let query = {};
    
    // For pagination - get messages before a certain timestamp
    if (before) {
        query.createdAt = { $lt: new Date(before) };
    }

    const messages = await ChatMessage.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .lean();

    // Reverse to get chronological order (oldest first)
    messages.reverse();

    return res.status(200).json({
        success: true,
        count: messages.length,
        data: messages
    });
}

// POST: Send a new chat message
async function handlePost(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const user = verifyToken(token);
    if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const { content } = req.body;

    if (!content || content.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Message content required' });
    }

    if (content.length > 500) {
        return res.status(400).json({ success: false, error: 'Message too long (max 500 characters)' });
    }

    const message = await ChatMessage.create({
        content: content.trim(),
        authorId: user.id,
        authorUsername: user.username
    });

    return res.status(201).json({
        success: true,
        data: {
            _id: message._id,
            content: message.content,
            authorId: message.authorId,
            authorUsername: message.authorUsername,
            createdAt: message.createdAt
        }
    });
}

// DELETE: Delete a message (admin/mod only or own message)
async function handleDelete(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const user = verifyToken(token);
    if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const { messageId } = req.query;

    if (!messageId) {
        return res.status(400).json({ success: false, error: 'Message ID required' });
    }

    const message = await ChatMessage.findById(messageId);
    if (!message) {
        return res.status(404).json({ success: false, error: 'Message not found' });
    }

    // Check if user owns the message or is admin/mod
    const isOwner = message.authorId.toString() === user.id;
    const isAdminOrMod = user.role === 'admin' || user.role === 'moderator';

    if (!isOwner && !isAdminOrMod) {
        return res.status(403).json({ success: false, error: 'Not authorized to delete this message' });
    }

    message.isDeleted = true;
    message.deletedBy = user.id;
    await message.save();

    return res.status(200).json({
        success: true,
        message: 'Message deleted'
    });
}
