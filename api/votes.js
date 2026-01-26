/**
 * API Route: /api/votes
 * Handles voting on animals for power rankings
 * 
 * NEW BEHAVIOR:
 * - Users can change their vote (up/down/clear) multiple times per day
 * - XP is awarded ONLY ONCE per animal per day per user
 * - dayKey is computed using the user's local timezone
 */

const { connectToDatabase } = require('../lib/mongodb');
const Vote = require('../lib/models/Vote');
const XpClaim = require('../lib/models/XpClaim');
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
    const { animalId, userId, myVotes, timeZone } = req.query;
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
        
        // Also get XP claims for today (in user's timezone)
        const dayKey = timeZone ? XpClaim.getDayKey(timeZone) : today;
        const xpClaims = await XpClaim.getUserDayClaims(user.id, dayKey);
        const xpClaimedMap = {};
        xpClaims.forEach(claim => {
            xpClaimedMap[claim.animalId.toString()] = true;
        });

        return res.status(200).json({
            success: true,
            data: voteMap,
            xpClaimed: xpClaimedMap,
            today: today,
            dayKey: dayKey
        });
    }

    if (animalId) {
        // Get ALL-TIME vote counts for specific animal (for power rankings)
        const votes = await Vote.getVoteCounts(animalId);
        
        // If userId provided, get user's vote for TODAY
        let userVote = null;
        let xpClaimedToday = false;
        if (userId) {
            userVote = await Vote.getTodayVote(animalId, userId);
            
            // Check if XP was claimed today (in user's timezone)
            const dayKey = timeZone ? XpClaim.getDayKey(timeZone) : today;
            xpClaimedToday = await XpClaim.hasClaimedXp(userId, animalId, dayKey);
        }

        return res.status(200).json({
            success: true,
            data: { ...votes, userVote, xpClaimedToday },
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

// POST: Cast or update a vote (can change anytime, XP only once per day)
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

    const { animalId, animalName, voteType, timeZone } = req.body;
    const today = Vote.getTodayString();

    if (!animalId || !animalName) {
        return res.status(400).json({ success: false, error: 'Animal ID and name required' });
    }

    // voteType can be 'up', 'down', or 'clear' (to remove vote)
    if (voteType && !['up', 'down', 'clear'].includes(voteType)) {
        return res.status(400).json({ success: false, error: 'Invalid vote type' });
    }

    // Compute dayKey using user's timezone
    const dayKey = timeZone ? XpClaim.getDayKey(timeZone) : today;
    
    // Check for existing vote TODAY
    const existingTodayVote = await Vote.findOne({ 
        animalId, 
        votedBy: user.id, 
        voteDate: today 
    });

    let action = 'none';
    let xpAwarded = false;
    let xpAmount = 0;

    // Handle vote clear
    if (voteType === 'clear') {
        if (existingTodayVote) {
            const oldVoteType = existingTodayVote.voteType;
            await Vote.deleteOne({ _id: existingTodayVote._id });
            action = 'cleared';
            
            // Notify Discord about vote removal
            notifyDiscord('vote_removed', {
                user: user.username,
                animal: animalName,
                oldVoteType: oldVoteType
            }, req);
        }
    } else if (voteType) {
        // Handle vote create or update
        if (existingTodayVote) {
            // Update existing vote if different
            if (existingTodayVote.voteType !== voteType) {
                const oldVoteType = existingTodayVote.voteType;
                existingTodayVote.voteType = voteType;
                await existingTodayVote.save();
                action = 'updated';
                
                // Notify Discord about vote change
                notifyDiscord('vote_changed', {
                    user: user.username,
                    animal: animalName,
                    oldVoteType: oldVoteType,
                    newVoteType: voteType
                }, req);
            } else {
                action = 'unchanged';
            }
        } else {
            // Create new vote
            await Vote.create({
                animalId,
                animalName,
                votedBy: user.id,
                votedByUsername: user.username,
                voteType,
                voteDate: today
            });
            action = 'created';
            
            // Notify Discord about new vote
            notifyDiscord('vote', {
                user: user.username,
                animal: animalName,
                voteType: voteType
            }, req);
        }
        
        // Award XP if not already claimed today (in user's timezone)
        const alreadyClaimedXp = await XpClaim.hasClaimedXp(user.id, animalId, dayKey);
        if (!alreadyClaimedXp) {
            const claim = await XpClaim.recordClaim(user.id, animalId, animalName, dayKey, 5);
            if (claim) {
                xpAwarded = true;
                xpAmount = 5;
            }
        }
    }

    // Get ALL-TIME vote counts (for power rankings)
    const newCounts = await Vote.getVoteCounts(animalId);
    const newUserVote = voteType === 'clear' ? null : voteType;
    
    return res.status(200).json({
        success: true,
        action: action,
        data: { 
            ...newCounts, 
            userVote: newUserVote
        },
        xpAwarded: xpAwarded,
        xpAmount: xpAmount,
        message: xpAwarded 
            ? `Vote recorded! +${xpAmount} XP earned!` 
            : (action === 'created' || action === 'updated' ? 'Vote updated!' : 'Vote cleared!')
    });
}

// DELETE: Remove TODAY's vote (legacy endpoint, now also supports POST with clear)
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
        data: { ...newCounts, userVote: null }
    });
}


