/**
 * API Route: /api/votes
 * Handles voting on animals for power rankings
 */

const { connectToDatabase } = require('../lib/mongodb');
const Vote = require('../lib/models/Vote');
const { verifyToken } = require('../lib/auth');
const { notifyDiscord } = require('../lib/discord');

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
        console.error('Vote API Error:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

// GET: Get user's vote for an animal, or all votes
async function handleGet(req, res) {
    const { animalId, userId, myVotes } = req.query;

    // If myVotes flag is set, get all votes by current user
    if (myVotes) {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const token = authHeader.split(' ')[1];
        const user = verifyToken(token);
        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid token' });
        }

        const votes = await Vote.find({ votedBy: user.id });
        const voteMap = {};
        votes.forEach(v => {
            voteMap[v.animalId.toString()] = v.voteType === 'up' ? 1 : -1;
        });

        return res.status(200).json({
            success: true,
            data: voteMap
        });
    }

    if (animalId) {
        // Get vote counts for specific animal
        const votes = await Vote.getVoteCounts(animalId);
        
        // If userId provided, also get user's vote
        let userVote = null;
        if (userId) {
            const vote = await Vote.findOne({ animalId, votedBy: userId });
            userVote = vote?.voteType || null;
        }

        return res.status(200).json({
            success: true,
            data: { ...votes, userVote }
        });
    }

    // Get all votes summary (for rankings page)
    const rankings = await Vote.getRankings();
    return res.status(200).json({
        success: true,
        data: rankings
    });
}

// POST: Cast or change a vote
async function handlePost(req, res) {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const user = verifyToken(token);
    if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const { animalId, animalName, voteType } = req.body;

    if (!animalId || !animalName || !['up', 'down'].includes(voteType)) {
        return res.status(400).json({ success: false, error: 'Invalid vote data' });
    }

    // Check for existing vote
    const existingVote = await Vote.findOne({ animalId, votedBy: user.id });

    if (existingVote) {
        if (existingVote.voteType === voteType) {
            // Same vote - remove it (toggle off)
            const removedVoteType = existingVote.voteType;
            await Vote.deleteOne({ _id: existingVote._id });
            
            // Notify Discord about vote removal
            notifyDiscord('vote_removed', {
                user: user.username,
                animal: animalName,
                voteType: removedVoteType
            });
            
            const newCounts = await Vote.getVoteCounts(animalId);
            return res.status(200).json({
                success: true,
                action: 'removed',
                data: { ...newCounts, userVote: null }
            });
        } else {
            // Different vote - change it
            const oldVoteType = existingVote.voteType;
            existingVote.voteType = voteType;
            await existingVote.save();
            
            // Notify Discord
            notifyDiscord('vote_changed', {
                user: user.username,
                animal: animalName,
                from: oldVoteType === 'up' ? '👍 Upvote' : '👎 Downvote',
                to: voteType === 'up' ? '👍 Upvote' : '👎 Downvote'
            });

            const newCounts = await Vote.getVoteCounts(animalId);
            return res.status(200).json({
                success: true,
                action: 'changed',
                data: { ...newCounts, userVote: voteType }
            });
        }
    }

    // New vote
    await Vote.create({
        animalId,
        animalName,
        votedBy: user.id,
        votedByUsername: user.username,
        voteType
    });

    // Notify Discord
    notifyDiscord('vote', {
        user: user.username,
        animal: animalName,
        voteType: voteType
    });

    const newCounts = await Vote.getVoteCounts(animalId);
    return res.status(200).json({
        success: true,
        action: 'created',
        data: { ...newCounts, userVote: voteType }
    });
}

// DELETE: Remove a vote
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

    const { animalId } = req.query;
    if (!animalId) {
        return res.status(400).json({ success: false, error: 'Animal ID required' });
    }

    await Vote.deleteOne({ animalId, votedBy: user.id });

    const newCounts = await Vote.getVoteCounts(animalId);
    return res.status(200).json({
        success: true,
        data: { ...newCounts, userVote: null }
    });
}
