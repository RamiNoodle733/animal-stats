/**
 * API Route: /api/comments
 * Handles comments on animals and comparisons with replies and voting
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

// Helper: Build comment tree with replies
function buildCommentTree(comments) {
    const commentMap = {};
    const rootComments = [];
    
    // First pass: create map
    comments.forEach(c => {
        const comment = c.toObject ? c.toObject() : c;
        comment.replies = [];
        comment.score = (comment.upvotes?.length || 0) - (comment.downvotes?.length || 0);
        commentMap[comment._id.toString()] = comment;
    });
    
    // Second pass: build tree
    comments.forEach(c => {
        const comment = commentMap[c._id.toString()];
        if (comment.parentId) {
            const parent = commentMap[comment.parentId.toString()];
            if (parent) {
                parent.replies.push(comment);
            }
        } else {
            rootComments.push(comment);
        }
    });
    
    // Sort replies by oldest first (ascending createdAt)
    Object.values(commentMap).forEach(comment => {
        if (comment.replies.length > 0) {
            comment.replies.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        }
    });
    
    return rootComments;
}

// GET: Get comments for an animal or comparison (with replies nested)
async function handleGet(req, res) {
    try {
        const { animalId, animalName, comparison, limit = 100 } = req.query;

        let query = { isHidden: false };
        
        if (animalId) {
            query.targetType = 'animal';
            query.animalId = animalId;
        } else if (animalName) {
            query.targetType = 'animal';
            // Escape special regex characters in animal name
            const escapedName = animalName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.animalName = { $regex: new RegExp(`^${escapedName}$`, 'i') };
        } else if (comparison) {
            query.targetType = 'comparison';
            query.comparisonKey = comparison;
        }

        const comments = await Comment.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .lean();
        
        // Try to get current user data, but don't fail if User model has issues
        let userMap = {};
        try {
            const User = require('../lib/models/User');
            const authorIds = [...new Set(comments.map(c => c.authorId?.toString()).filter(Boolean))];
            if (authorIds.length > 0) {
                const users = await User.find({ _id: { $in: authorIds } })
                    .select('_id displayName username profileAnimal')
                    .lean();
                
                users.forEach(u => {
                    userMap[u._id.toString()] = {
                        displayName: u.displayName || u.username,
                        username: u.username,
                        profileAnimal: u.profileAnimal
                    };
                });
            }
        } catch (userError) {
            console.error('Error fetching user data for comments:', userError);
            // Continue without user data - will use stored comment data
        }

        // Update comments with current user data
        const updatedComments = comments.map(c => {
            const authorId = c.authorId?.toString();
            const currentUser = authorId ? userMap[authorId] : null;
            return {
                ...c,
                // Use current user data if available, fallback to stored data
                authorUsername: currentUser?.displayName || c.authorUsername,
                profileAnimal: currentUser?.profileAnimal ?? c.profileAnimal
            };
        });
        
        const tree = buildCommentTree(updatedComments);
        // Count ALL comments (including replies) for the total
        const totalCount = await Comment.countDocuments(query);

        return res.status(200).json({
            success: true,
            count: totalCount,
            data: tree
        });
    } catch (error) {
        console.error('handleGet error:', error);
        return res.status(500).json({ success: false, error: 'Failed to load comments: ' + error.message });
    }
}

// POST: Create a new comment or reply
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

    const { targetType, animalId, animalName, comparisonKey, content, parentId, isAnonymous } = req.body;

    if (!content || content.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Comment content required' });
    }

    if (content.length > 1000) {
        return res.status(400).json({ success: false, error: 'Comment too long (max 1000 characters)' });
    }

    // Get user's profile info for display
    const User = require('../lib/models/User');
    const userDoc = await User.findById(user.id).select('displayName profileAnimal');

    const commentData = {
        content: content.trim(),
        authorId: user.id,
        authorUsername: userDoc?.displayName || user.username,
        profileAnimal: userDoc?.profileAnimal || null,
        isAnonymous: !!isAnonymous,
        upvotes: [],
        downvotes: []
    };

    // If this is a reply, get parent info
    if (parentId) {
        const parent = await Comment.findById(parentId);
        if (!parent) {
            return res.status(404).json({ success: false, error: 'Parent comment not found' });
        }
        commentData.parentId = parentId;
        commentData.targetType = parent.targetType;
        commentData.animalId = parent.animalId;
        commentData.animalName = parent.animalName;
        commentData.comparisonKey = parent.comparisonKey;
        
        // Notify Discord about reply (show actual username even for anonymous, for moderation)
        const displayName = isAnonymous ? `Anonymous (${user.username})` : user.username;
        const parentAuthor = parent.isAnonymous ? 'Anonymous' : parent.authorUsername;
        await notifyDiscord('comment_reply', {
            user: displayName,
            replyTo: parentAuthor,
            target: parent.animalName || parent.comparisonKey || 'Unknown',
            content: content.substring(0, 100) + (content.length > 100 ? '...' : '')
        }, req);
    } else {
        // New top-level comment
        if (!targetType) {
            return res.status(400).json({ success: false, error: 'Target type required' });
        }
        commentData.targetType = targetType;
        
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
        
        // Notify Discord about new comment (show actual username even for anonymous, for moderation)
        const displayName = isAnonymous ? `Anonymous (${user.username})` : user.username;
        await notifyDiscord('comment', {
            user: displayName,
            target: targetType === 'animal' ? animalName : comparisonKey,
            content: content.substring(0, 100) + (content.length > 100 ? '...' : '')
        }, req);
    }

    const comment = await Comment.create(commentData);

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
    const displayName = comment.isAnonymous ? 'Anonymous' : user.username;
    await notifyDiscord('comment_deleted', {
        user: displayName,
        target: comment.animalName || comment.comparisonKey || 'Unknown',
        content: comment.content
    }, req);

    // Also delete all replies
    await Comment.deleteMany({ parentId: targetId });
    await Comment.deleteOne({ _id: targetId });

    return res.status(200).json({
        success: true,
        message: 'Comment deleted'
    });
}

// PATCH: Upvote/downvote a comment
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

    const userId = user.id;
    const upvoteIndex = comment.upvotes.findIndex(id => id.toString() === userId);
    const downvoteIndex = comment.downvotes.findIndex(id => id.toString() === userId);

    if (action === 'upvote') {
        if (upvoteIndex > -1) {
            // Remove upvote (toggle off)
            comment.upvotes.splice(upvoteIndex, 1);
        } else {
            // Add upvote
            comment.upvotes.push(userId);
            // Remove downvote if exists
            if (downvoteIndex > -1) {
                comment.downvotes.splice(downvoteIndex, 1);
            }
            // Notify Discord
            const authorName = comment.isAnonymous ? 'Anonymous' : comment.authorUsername;
            await notifyDiscord('comment_upvote', {
                user: user.username,
                commentAuthor: authorName,
                target: comment.animalName || comment.comparisonKey || 'Unknown'
            }, req);
        }
    } else if (action === 'downvote') {
        if (downvoteIndex > -1) {
            // Remove downvote (toggle off)
            comment.downvotes.splice(downvoteIndex, 1);
        } else {
            // Add downvote
            comment.downvotes.push(userId);
            // Remove upvote if exists
            if (upvoteIndex > -1) {
                comment.upvotes.splice(upvoteIndex, 1);
            }
            // Notify Discord
            const authorName = comment.isAnonymous ? 'Anonymous' : comment.authorUsername;
            await notifyDiscord('comment_downvote', {
                user: user.username,
                commentAuthor: authorName,
                target: comment.animalName || comment.comparisonKey || 'Unknown'
            }, req);
        }
    } else {
        return res.status(400).json({ success: false, error: 'Invalid action. Use upvote or downvote' });
    }

    await comment.save();

    const score = comment.upvotes.length - comment.downvotes.length;
    const userVote = comment.upvotes.some(id => id.toString() === userId) ? 'up' : 
                     comment.downvotes.some(id => id.toString() === userId) ? 'down' : null;

    return res.status(200).json({
        success: true,
        score,
        userVote,
        upvotes: comment.upvotes.length,
        downvotes: comment.downvotes.length
    });
}
