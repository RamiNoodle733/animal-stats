/**
 * API Route: /api/votes
 * Handles voting on animals for power rankings
 * DAILY VOTING: Users can vote once per animal per day
 * All votes accumulate over time for power rankings
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

// GET: Get user's votes for TODAY, or vote counts for an animal
async function handleGet(req, res) {
    const { animalId, userId, myVotes } = req.query;
    const today = Vote.getTodayString();

    // If myVotes flag is set, get all TODAY's votes by current user
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

        // Get only TODAY's votes for the user
        const voteMap = await Vote.getUserTodayVotes(user.id);

        return res.status(200).json({
            success: true,
            data: voteMap,
            today: today
        });
    }

    if (animalId) {
        // Get ALL-TIME vote counts for specific animal (for power rankings)
        const votes = await Vote.getVoteCounts(animalId);
        
        // If userId provided, get user's vote for TODAY
        let userVote = null;
        let canVoteToday = true;
        if (userId) {
            userVote = await Vote.getTodayVote(animalId, userId);
            canVoteToday = !userVote; // Can vote if no vote today
        }

        return res.status(200).json({
            success: true,
            data: { ...votes, userVote, canVoteToday },
            today: today
        });
    }

    // Get all votes summary (for rankings page - ALL TIME)
    const rankings = await Vote.getRankings();
    return res.status(200).json({
        success: true,
        data: rankings
    });
}

// POST: Cast a vote (once per day per animal)
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
    const today = Vote.getTodayString();

    if (!animalId || !animalName || !['up', 'down'].includes(voteType)) {
        return res.status(400).json({ success: false, error: 'Invalid vote data' });
    }

    // Check for existing vote TODAY
    const existingTodayVote = await Vote.findOne({ 
        animalId, 
        votedBy: user.id, 
        voteDate: today 
    });

    if (existingTodayVote) {
        // User already voted on this animal today
        return res.status(400).json({ 
            success: false, 
            error: 'You already voted on this animal today! Come back tomorrow.',
            alreadyVotedToday: true,
            votedType: existingTodayVote.voteType
        });
    }

    // Create new vote for today
    await Vote.create({
        animalId,
        animalName,
        votedBy: user.id,
        votedByUsername: user.username,
        voteType,
        voteDate: today
    });

    // Notify Discord
    notifyDiscord('vote', {
        user: user.username,
        animal: animalName,
        voteType: voteType
    }, req);

    // Get ALL-TIME vote counts (for power rankings)
    const newCounts = await Vote.getVoteCounts(animalId);
    
    return res.status(200).json({
        success: true,
        action: 'created',
        data: { ...newCounts, userVote: voteType, canVoteToday: false },
        message: `Vote recorded! You can vote on ${animalName} again tomorrow.`,
        xpEarned: 5 // XP reward for voting
    });
}

// DELETE: Remove TODAY's vote (allow changing vote within the day)
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
    const today = Vote.getTodayString();
    
    if (!animalId) {
        return res.status(400).json({ success: false, error: 'Animal ID required' });
    }

    // Only delete TODAY's vote
    await Vote.deleteOne({ animalId, votedBy: user.id, voteDate: today });

    const newCounts = await Vote.getVoteCounts(animalId);
    return res.status(200).json({
        success: true,
        data: { ...newCounts, userVote: null, canVoteToday: true }
    });
}


