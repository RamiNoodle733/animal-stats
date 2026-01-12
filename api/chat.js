/**
 * API Route: /api/chat
 * Handles community general chat messages AND community feed
 * Now supports replies, voting, and proper threading like comments
 * 
 * GET /api/chat - Get chat messages (with replies nested)
 * GET /api/chat?feed=true - Get all comments feed
 * POST /api/chat - Send chat message or reply
 * PATCH /api/chat - Vote on a message (up/down)
 * DELETE /api/chat - Delete chat message
 */

const { connectToDatabase } = require('../lib/mongodb');
const ChatMessage = require('../lib/models/ChatMessage');
const Comment = require('../lib/models/Comment');
const Animal = require('../lib/models/Animal');
const { verifyToken } = require('../lib/auth');
const { notifyDiscord } = require('../lib/discord');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
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
            case 'PATCH':
                return await handlePatch(req, res);
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

// Helper: Build message tree with replies
function buildMessageTree(messages, userMap) {
    const messageMap = {};
    const rootMessages = [];
    
    // First pass: create map and update user data
    messages.forEach(m => {
        const message = m.toObject ? m.toObject() : { ...m };
        message.replies = [];
        message.score = (message.upvotes?.length || 0) - (message.downvotes?.length || 0);
        
        // Update with current user data
        const authorId = message.authorId?.toString();
        const currentUser = authorId ? userMap[authorId] : null;
        if (currentUser) {
            message.authorUsername = currentUser.displayName || message.authorUsername;
            message.profileAnimal = currentUser.profileAnimal ?? message.profileAnimal;
        }
        
        messageMap[message._id.toString()] = message;
    });
    
    // Second pass: build tree
    messages.forEach(m => {
        const message = messageMap[m._id.toString()];
        if (message.parentId) {
            const parent = messageMap[message.parentId.toString()];
            if (parent) {
                parent.replies.push(message);
            }
        } else {
            rootMessages.push(message);
        }
    });
    
    // Sort replies by createdAt ascending
    Object.values(messageMap).forEach(msg => {
        if (msg.replies.length > 0) {
            msg.replies.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        }
    });
    
    return rootMessages;
}

// GET: Get community feed (all comments)
async function handleGetFeed(req, res) {
    const { limit = 50, skip = 0 } = req.query;
    const User = require('../lib/models/User');

    // Get all root comments (not replies) sorted by newest first
    const comments = await Comment.find({
        isHidden: false,
        parentId: null
    })
        .sort({ createdAt: -1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .lean();

    // Collect all author IDs (including replies we'll fetch later)
    const allAuthorIds = new Set(comments.map(c => c.authorId?.toString()).filter(Boolean));

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

        // Add reply author IDs
        replies.forEach(r => {
            if (r.authorId) allAuthorIds.add(r.authorId.toString());
        });

        const score = (comment.upvotes?.length || 0) - (comment.downvotes?.length || 0);

        let animalImage = null;
        if (comment.targetType === 'animal' && comment.animalName) {
            const animal = await Animal.findOne({ name: comment.animalName }).select('image').lean();
            animalImage = animal?.image || null;
        }

        return {
            comment,
            score,
            replyCount,
            replies,
            animalImage
        };
    }));

    // Fetch current user data for all authors
    const users = await User.find({ _id: { $in: [...allAuthorIds] } })
        .select('_id displayName username profileAnimal')
        .lean();
    
    const userMap = {};
    users.forEach(u => {
        userMap[u._id.toString()] = {
            displayName: u.displayName || u.username,
            username: u.username,
            profileAnimal: u.profileAnimal
        };
    });

    // Update comments and replies with current user data
    const finalComments = commentsWithReplies.map(({ comment, score, replyCount, replies, animalImage }) => {
        const authorId = comment.authorId?.toString();
        const currentUser = authorId ? userMap[authorId] : null;
        
        return {
            ...comment,
            authorUsername: currentUser?.displayName || comment.authorUsername,
            profileAnimal: currentUser?.profileAnimal ?? comment.profileAnimal,
            score,
            replyCount,
            replies: replies.map(r => {
                const replyAuthorId = r.authorId?.toString();
                const replyUser = replyAuthorId ? userMap[replyAuthorId] : null;
                return {
                    ...r,
                    authorUsername: replyUser?.displayName || r.authorUsername,
                    profileAnimal: replyUser?.profileAnimal ?? r.profileAnimal,
                    score: (r.upvotes?.length || 0) - (r.downvotes?.length || 0)
                };
            }),
            animalImage
        };
    });

    const totalCount = await Comment.countDocuments({
        isHidden: false,
        parentId: null
    });

    return res.status(200).json({
        success: true,
        count: finalComments.length,
        total: totalCount,
        hasMore: parseInt(skip) + finalComments.length < totalCount,
        data: finalComments
    });
}

// GET: Get recent chat messages with nested replies
async function handleGet(req, res) {
    const { limit = 50, before } = req.query;
    const User = require('../lib/models/User');

    let query = { parentId: null }; // Only get root messages
    
    // For pagination - get messages before a certain timestamp
    if (before) {
        query.createdAt = { $lt: new Date(before) };
    }

    // Get root messages
    const rootMessages = await ChatMessage.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .lean();

    // Get all message IDs to fetch replies
    const rootIds = rootMessages.map(m => m._id);
    
    // Fetch all replies for these root messages
    const replies = await ChatMessage.find({
        parentId: { $in: rootIds }
    })
        .sort({ createdAt: 1 })
        .lean();

    // Combine all messages
    const allMessages = [...rootMessages, ...replies];

    // Fetch current user data for all message authors
    const authorIds = [...new Set(allMessages.map(m => m.authorId?.toString()).filter(Boolean))];
    const users = await User.find({ _id: { $in: authorIds } })
        .select('_id displayName username profileAnimal')
        .lean();
    
    const userMap = {};
    users.forEach(u => {
        userMap[u._id.toString()] = {
            displayName: u.displayName || u.username,
            username: u.username,
            profileAnimal: u.profileAnimal
        };
    });

    // Build tree structure
    const tree = buildMessageTree(allMessages, userMap);

    // Keep newest first (reverse chronological)
    // tree.reverse(); // Removed - newest messages should be at top

    return res.status(200).json({
        success: true,
        count: tree.length,
        data: tree
    });
}

// POST: Send a new chat message or reply
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

    const { content, parentId } = req.body;

    if (!content || content.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Message content required' });
    }

    if (content.length > 500) {
        return res.status(400).json({ success: false, error: 'Message too long (max 500 characters)' });
    }

    // Get user's profile info for display
    const User = require('../lib/models/User');
    const userDoc = await User.findById(user.id).select('displayName profileAnimal');

    // If this is a reply, verify parent exists
    if (parentId) {
        const parent = await ChatMessage.findById(parentId);
        if (!parent) {
            return res.status(404).json({ success: false, error: 'Parent message not found' });
        }
    }

    const message = await ChatMessage.create({
        content: content.trim(),
        authorId: user.id,
        authorUsername: userDoc?.displayName || user.username,
        profileAnimal: userDoc?.profileAnimal || null,
        parentId: parentId || null,
        upvotes: [],
        downvotes: []
    });

    // Notify Discord about the chat message
    const msgType = parentId ? 'chat_reply' : 'chat_message';
    notifyDiscord(msgType, {
        user: userDoc?.displayName || user.username,
        content: content.trim()
    }, req);

    return res.status(201).json({
        success: true,
        data: {
            _id: message._id,
            content: message.content,
            authorId: message.authorId,
            authorUsername: message.authorUsername,
            profileAnimal: message.profileAnimal,
            parentId: message.parentId,
            upvotes: [],
            downvotes: [],
            score: 0,
            replies: [],
            createdAt: message.createdAt
        }
    });
}

// PATCH: Vote on a message (up/down)
async function handlePatch(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const user = verifyToken(token);
    if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const { messageId, voteType } = req.body;

    if (!messageId) {
        return res.status(400).json({ success: false, error: 'Message ID required' });
    }

    if (!['up', 'down', 'clear'].includes(voteType)) {
        return res.status(400).json({ success: false, error: 'Invalid vote type' });
    }

    const message = await ChatMessage.findById(messageId);
    if (!message) {
        return res.status(404).json({ success: false, error: 'Message not found' });
    }

    const userId = user.id;

    // Remove existing votes
    message.upvotes = message.upvotes.filter(id => id.toString() !== userId);
    message.downvotes = message.downvotes.filter(id => id.toString() !== userId);

    // Add new vote
    if (voteType === 'up') {
        message.upvotes.push(userId);
    } else if (voteType === 'down') {
        message.downvotes.push(userId);
    }
    // 'clear' just removes existing vote

    await message.save();

    const score = message.upvotes.length - message.downvotes.length;

    return res.status(200).json({
        success: true,
        data: {
            _id: message._id,
            upvotes: message.upvotes.length,
            downvotes: message.downvotes.length,
            score,
            userVote: voteType === 'clear' ? null : voteType
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
