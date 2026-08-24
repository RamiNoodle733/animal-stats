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
const mongoose = require('mongoose');
const Vote = require('../lib/models/Vote');
const XpClaim = require('../lib/models/XpClaim');
const Animal = require('../lib/models/Animal');
const { getAuthUser } = require('../lib/auth');
const { awardUserReward } = require('../lib/rewards');
const { notifyDiscord } = require('../lib/discord');
const { setCorsHeaders } = require('../lib/cors');

module.exports = async function handler(req, res) {
    setCorsHeaders(req, res, {
        methods: 'GET, POST, DELETE, OPTIONS',
        credentials: true
    });
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
    const { animalId, myVotes } = req.query;
    const today = Vote.getTodayString();

    // If myVotes flag is set, get all TODAY's votes by current user
    if (myVotes) {
        const user = getAuthUser(req);
        if (!user) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        // Get only TODAY's votes for the user
        const voteMap = await Vote.getUserTodayVotes(user.id);
        
        // Reward boundaries are server-authoritative and use UTC.
        const dayKey = today;
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
        if (!mongoose.isValidObjectId(animalId)) {
            return res.status(400).json({ success: false, error: 'Invalid animal ID' });
        }
        // Get ALL-TIME vote counts for specific animal (for power rankings)
        const votes = await Vote.getVoteCounts(animalId);
        
        // Only expose the authenticated caller's vote state.
        let userVote = null;
        let xpClaimedToday = false;
        const requestUser = getAuthUser(req);
        if (requestUser) {
            userVote = await Vote.getTodayVote(animalId, requestUser.id);
            
            xpClaimedToday = await XpClaim.hasClaimedXp(requestUser.id, animalId, today);
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
    const user = getAuthUser(req);
    if (!user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { animalId, voteType } = req.body || {};
    const today = Vote.getTodayString();

    if (!animalId) {
        return res.status(400).json({ success: false, error: 'Animal ID required' });
    }

    const animal = await Animal.findById(animalId).select('_id name').lean().catch(() => null);
    if (!animal) return res.status(404).json({ success: false, error: 'Animal not found' });
    const animalName = animal.name;

    // voteType can be 'up', 'down', or 'clear' (to remove vote)
    if (voteType && !['up', 'down', 'clear'].includes(voteType)) {
        return res.status(400).json({ success: false, error: 'Invalid vote type' });
    }

    // Reward boundaries are server-authoritative and use UTC.
    const dayKey = today;
    
    // Check for existing vote TODAY
    const existingTodayVote = await Vote.findOne({ 
        animalId, 
        votedBy: user.id, 
        voteDate: today 
    });

    let action = 'none';
    let xpAwarded = false;
    let xpAmount = 0;
    let reward = null;

    // Handle vote clear
    if (voteType === 'clear') {
        if (existingTodayVote) {
            const oldVoteType = existingTodayVote.voteType;
            await Vote.deleteOne({ _id: existingTodayVote._id });
            action = 'cleared';
            
            // Notify Discord about vote removal
            await notifyDiscord('vote_removed', {
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
                await notifyDiscord('vote_changed', {
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
            await notifyDiscord('vote', {
                user: user.username,
                animal: animalName,
                voteType: voteType
            }, req);
        }
        
        // Award XP if not already claimed today (in user's timezone)
        let claim = await XpClaim.findOne({ userId: user.id, animalId, dayKey });
        if (!claim) {
            claim = await XpClaim.recordClaim(user.id, animalId, animalName, dayKey, 5);
            if (!claim) claim = await XpClaim.findOne({ userId: user.id, animalId, dayKey });
        }

        // Legacy claims have no rewardStatus and were paid by the former client endpoint.
        // Only new/pending claims enter the server-authoritative reward transaction.
        if (claim?.rewardStatus === 'pending') {
            reward = await awardUserReward({
                userId: user.id,
                action: 'vote',
                sourceId: `${animalId}:${dayKey}`
            });
            await XpClaim.updateOne(
                { _id: claim._id },
                { $set: { rewardStatus: 'applied', rewardAppliedAt: new Date() } }
            );
            xpAwarded = reward.awarded;
            xpAmount = reward.xpAdded;
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
        reward,
        message: xpAwarded 
            ? `Vote recorded! +${xpAmount} XP earned!` 
            : (action === 'created' || action === 'updated' ? 'Vote updated!' : 'Vote cleared!')
    });
}

// DELETE: Remove TODAY's vote (legacy endpoint, now also supports POST with clear)
async function handleDelete(req, res) {
    const user = getAuthUser(req);
    if (!user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
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


