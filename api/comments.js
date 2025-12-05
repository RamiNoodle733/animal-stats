/**
 * API Route: /api/comments
 * Handles comments on animals and comparisons
 */

const { connectToDatabase } = require('../lib/mongodb');
const Comment = require('../lib/models/Comment');
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
        console.error('Comment API Error:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

// GET: Get comments for an animal or comparison
async function handleGet(req, res) {
    const { animalId, animalName, comparison, limit = 50 } = req.query;

    let comments;
    let count;

    if (animalId) {
        comments = await Comment.find({
            targetType: 'animal',
            animalId,
            isHidden: false
        })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));
        
        count = await Comment.countDocuments({
            targetType: 'animal',
            animalId,
            isHidden: false
        });
    } else if (animalName) {
        comments = await Comment.find({
            targetType: 'animal',
            animalName,
            isHidden: false
        })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));
        
        count = await Comment.countDocuments({
            targetType: 'animal',
            animalName,
            isHidden: false
        });
    } else if (comparison) {
        const comparisonKey = comparison;
        comments = await Comment.find({
            targetType: 'comparison',
            comparisonKey,
            isHidden: false
        })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));
        
        count = await Comment.countDocuments({
            targetType: 'comparison',
            comparisonKey,
            isHidden: false
        });
    } else {
        // Get recent comments across all
        comments = await Comment.find({ isHidden: false })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));
        count = comments.length;
    }

    return res.status(200).json({
        success: true,
        count,
        data: comments
    });
}

// POST: Create a new comment
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

    const { targetType, animalId, animalName, comparisonKey, content } = req.body;

    if (!targetType || !content || content.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Invalid comment data' });
    }

    if (content.length > 1000) {
        return res.status(400).json({ success: false, error: 'Comment too long (max 1000 characters)' });
    }

    const commentData = {
        targetType,
        content: content.trim(),
        authorId: user.id,
        authorUsername: user.username
    };

    if (targetType === 'animal') {
        if (!animalId && !animalName) {
            return res.status(400).json({ success: false, error: 'Animal ID or name required' });
        }
        if (animalId) commentData.animalId = animalId;
        if (animalName) commentData.animalName = animalName;
    } else if (targetType === 'comparison') {
        if (!comparisonKey) {
            return res.status(400).json({ success: false, error: 'Comparison key required' });
        }
        commentData.comparisonKey = comparisonKey;
    }

    const comment = await Comment.create(commentData);

    // Notify Discord
    notifyDiscord('comment', {
        user: user.username,
        target: targetType === 'animal' ? animalName : comparisonKey,
        content: content.substring(0, 100) + (content.length > 100 ? '...' : '')
    });

    return res.status(201).json({
        success: true,
        data: comment
    });
}

// DELETE: Delete a comment (only by author)
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

    const { commentId, id } = req.query;
    const targetId = commentId || id;
    if (!targetId) {
        return res.status(400).json({ success: false, error: 'Comment ID required' });
    }

    const comment = await Comment.findById(targetId);
    if (!comment) {
        return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    if (comment.authorId.toString() !== user.id) {
        return res.status(403).json({ success: false, error: 'Not authorized to delete this comment' });
    }

    // Notify Discord about deletion
    notifyDiscord('comment_deleted', {
        user: user.username,
        target: comment.animalName || comment.comparisonKey || 'Unknown',
        content: comment.content
    });

    await Comment.deleteOne({ _id: targetId });

    return res.status(200).json({
        success: true,
        message: 'Comment deleted'
    });
}

// PATCH: Like/unlike a comment
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

    const { id } = req.query;
    const { action } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, error: 'Comment ID required' });
    }

    const comment = await Comment.findById(id);
    if (!comment) {
        return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    if (action === 'like') {
        // Toggle like
        const likeIndex = comment.likes.indexOf(user.id);
        if (likeIndex > -1) {
            // Unlike
            comment.likes.splice(likeIndex, 1);
        } else {
            // Like
            comment.likes.push(user.id);
        }
        comment.likeCount = comment.likes.length;
        await comment.save();

        return res.status(200).json({
            success: true,
            liked: likeIndex === -1,
            likeCount: comment.likeCount
        });
    }

    return res.status(400).json({ success: false, error: 'Invalid action' });
}


