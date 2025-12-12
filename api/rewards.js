/**
 * API Route: /api/rewards
 * Handles XP and BP rewards for user actions
 */

const { connectToDatabase } = require('../lib/mongodb');
const User = require('../models/User');
const { verifyToken } = require('../lib/auth');

// Reward amounts for different actions
const REWARD_CONFIG = {
    vote: { xp: 5, bp: 0 },
    comment: { xp: 10, bp: 0 },
    reply: { xp: 5, bp: 0 },
    tournament_win: { xp: 50, bp: 10 },
    tournament_participate: { xp: 25, bp: 5 },
    battle_won: { xp: 15, bp: 3 },
    daily_login: { xp: 20, bp: 2 },
    first_vote_of_day: { xp: 10, bp: 1 }
};

// XP required for each level (exponential growth)
function xpForLevel(level) {
    return Math.floor(100 * Math.pow(1.5, level - 1));
}

// Calculate level from total XP
function calculateLevel(totalXp) {
    let level = 1;
    let xpNeeded = xpForLevel(level);
    let xpAccumulated = 0;
    
    while (xpAccumulated + xpNeeded <= totalXp) {
        xpAccumulated += xpNeeded;
        level++;
        xpNeeded = xpForLevel(level);
    }
    
    return {
        level,
        currentXp: totalXp - xpAccumulated,
        xpForNextLevel: xpNeeded,
        totalXp
    };
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

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

    try {
        await connectToDatabase();

        switch (req.method) {
            case 'GET':
                return await handleGet(req, res, user);
            case 'POST':
                return await handlePost(req, res, user);
            default:
                return res.status(405).json({ success: false, error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Rewards API Error:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

// GET: Get user's current XP, level, and BP
async function handleGet(req, res, user) {
    const dbUser = await User.findById(user.id);
    
    if (!dbUser) {
        return res.status(404).json({ success: false, error: 'User not found' });
    }

    const levelInfo = calculateLevel(dbUser.xp || 0);

    return res.status(200).json({
        success: true,
        data: {
            xp: dbUser.xp || 0,
            level: levelInfo.level,
            currentLevelXp: levelInfo.currentXp,
            xpForNextLevel: levelInfo.xpForNextLevel,
            battlePoints: dbUser.battlePoints || 0,
            username: dbUser.username
        }
    });
}

// POST: Add rewards for an action
async function handlePost(req, res, user) {
    const { action, customXp, customBp } = req.body;

    // Get reward amounts
    let xpToAdd = 0;
    let bpToAdd = 0;

    if (action && REWARD_CONFIG[action]) {
        xpToAdd = REWARD_CONFIG[action].xp;
        bpToAdd = REWARD_CONFIG[action].bp;
    } else if (customXp !== undefined || customBp !== undefined) {
        // Allow custom amounts for special cases
        xpToAdd = parseInt(customXp) || 0;
        bpToAdd = parseInt(customBp) || 0;
    } else {
        return res.status(400).json({ 
            success: false, 
            error: 'Invalid action or reward amount',
            validActions: Object.keys(REWARD_CONFIG)
        });
    }

    // Cap rewards to prevent abuse
    xpToAdd = Math.min(Math.max(xpToAdd, 0), 500);
    bpToAdd = Math.min(Math.max(bpToAdd, 0), 100);

    // Update user in database
    const dbUser = await User.findByIdAndUpdate(
        user.id,
        {
            $inc: {
                xp: xpToAdd,
                battlePoints: bpToAdd
            }
        },
        { new: true }
    );

    if (!dbUser) {
        return res.status(404).json({ success: false, error: 'User not found' });
    }

    const levelInfo = calculateLevel(dbUser.xp || 0);
    const oldLevelInfo = calculateLevel((dbUser.xp || 0) - xpToAdd);
    const leveledUp = levelInfo.level > oldLevelInfo.level;

    return res.status(200).json({
        success: true,
        data: {
            xpAdded: xpToAdd,
            bpAdded: bpToAdd,
            totalXp: dbUser.xp,
            totalBp: dbUser.battlePoints,
            level: levelInfo.level,
            currentLevelXp: levelInfo.currentXp,
            xpForNextLevel: levelInfo.xpForNextLevel,
            leveledUp,
            newLevel: leveledUp ? levelInfo.level : null
        },
        message: leveledUp 
            ? `🎉 Level Up! You are now level ${levelInfo.level}!` 
            : `+${xpToAdd} XP${bpToAdd > 0 ? `, +${bpToAdd} BP` : ''}`
    });
}
