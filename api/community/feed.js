/**
 * API Route: /api/community/feed
 * Returns all comments across all animals for the community feed
 */

const { connectToDatabase } = require('../../lib/mongodb');
const Comment = require('../../lib/models/Comment');
const Animal = require('../../lib/models/Animal');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        await connectToDatabase();

        const { limit = 50, skip = 0 } = req.query;

        // Get all root comments (not replies) sorted by newest first
        const comments = await Comment.find({
            isHidden: false,
            parentId: null // Only root comments
        })
            .sort({ createdAt: -1 })
            .skip(parseInt(skip))
            .limit(parseInt(limit))
            .lean();

        // Get reply counts and latest replies for each comment
        const commentsWithReplies = await Promise.all(comments.map(async (comment) => {
            // Get reply count
            const replyCount = await Comment.countDocuments({
                parentId: comment._id,
                isHidden: false
            });

            // Get all replies for threading
            const replies = await Comment.find({
                parentId: comment._id,
                isHidden: false
            })
                .sort({ createdAt: 1 })
                .lean();

            // Calculate score
            const score = (comment.upvotes?.length || 0) - (comment.downvotes?.length || 0);

            // Get animal image if it's an animal comment
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

        // Get total count for pagination
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

    } catch (error) {
        console.error('Community Feed API Error:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
