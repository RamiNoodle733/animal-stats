/**
 * API Route: /api/community
 * Handles community features: leaderboard, presence, site stats
 * 
 * GET /api/community?action=leaderboard - Get user leaderboard by XP/level
 * GET /api/community?action=presence - Get online users list
 * GET /api/community?action=stats - Get site statistics
 * POST /api/community?action=ping - Update user presence (heartbeat)
 */

const { connectToDatabase } = require('../lib/mongodb');
const { verifyToken } = require('../lib/auth');

// In-memory presence store with TTL (would use Redis in production)
// Structure: { odId: { username, displayName, profileAnimal, lastSeen, page } }
const presenceStore = new Map();
const PRESENCE_TTL = 90 * 1000; // 90 seconds

// Clean up stale presence entries
function cleanupPresence() {
    const now = Date.now();
    for (const [userId, data] of presenceStore.entries()) {
        if (now - data.lastSeen > PRESENCE_TTL) {
            presenceStore.delete(userId);
        }
    }
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        await connectToDatabase();
        const { action } = req.query;

        switch (action) {
            case 'leaderboard':
                return await handleLeaderboard(req, res);
            case 'presence':
                return await handleGetPresence(req, res);
            case 'stats':
                return await handleStats(req, res);
            case 'ping':
                if (req.method !== 'POST') {
                    return res.status(405).json({ success: false, error: 'Method not allowed' });
                }
                return await handlePing(req, res);
            default:
                return res.status(400).json({ success: false, error: 'Invalid action' });
        }
    } catch (error) {
        console.error('Community API Error:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

/**
 * GET /api/community?action=leaderboard
 * Returns top users ranked by level and XP
 */
async function handleLeaderboard(req, res) {
    const { limit = 10, full = false } = req.query;
    const User = require('../models/User');

    const maxLimit = full === 'true' ? 100 : Math.min(parseInt(limit), 50);

    const users = await User.find({})
        .select('username displayName profileAnimal level xp battlePoints lifetimeXp createdAt')
        .sort({ level: -1, xp: -1, lifetimeXp: -1 })
        .limit(maxLimit)
        .lean();

    // Calculate XP needed for next level for each user
    const leaderboard = users.map((user, index) => {
        const xpForNextLevel = calculateXpForLevel(user.level + 1);
        const xpProgress = user.xp;
        const xpNeeded = xpForNextLevel;
        
        return {
            rank: index + 1,
            odId: user._id,
            username: user.displayName || user.username,
            profileAnimal: user.profileAnimal,
            level: user.level || 1,
            xp: user.xp || 0,
            xpForNextLevel: xpNeeded,
            xpProgress: Math.min(100, Math.round((xpProgress / xpNeeded) * 100)),
            battlePoints: user.battlePoints || 0,
            lifetimeXp: user.lifetimeXp || 0,
            joinedAt: user.createdAt
        };
    });

    return res.status(200).json({
        success: true,
        count: leaderboard.length,
        data: leaderboard
    });
}

/**
 * Calculate XP required for a given level
 * Uses same formula as xpSystem.js
 */
function calculateXpForLevel(level) {
    // Base: 100 XP for level 2, increases by 50 per level
    return 100 + (level - 2) * 50;
}

/**
 * GET /api/community?action=presence
 * Returns list of currently online users
 */
async function handleGetPresence(req, res) {
    // Clean up stale entries first
    cleanupPresence();

    const onlineUsers = [];
    for (const [userId, data] of presenceStore.entries()) {
        onlineUsers.push({
            odId: userId,
            username: data.displayName || data.username,
            profileAnimal: data.profileAnimal,
            page: data.page || null
        });
    }

    return res.status(200).json({
        success: true,
        count: onlineUsers.length,
        data: onlineUsers
    });
}

/**
 * POST /api/community?action=ping
 * Updates user's presence (heartbeat)
 */
async function handlePing(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Anonymous ping - just count as visitor, don't track
        return res.status(200).json({ success: true, tracked: false });
    }

    const token = authHeader.split(' ')[1];
    const user = verifyToken(token);
    if (!user) {
        return res.status(200).json({ success: true, tracked: false });
    }

    const { page } = req.body;
    const User = require('../models/User');

    // Get current user data
    const userDoc = await User.findById(user.id).select('displayName username profileAnimal');
    if (!userDoc) {
        return res.status(200).json({ success: true, tracked: false });
    }

    // Update presence
    presenceStore.set(user.id, {
        username: userDoc.username,
        displayName: userDoc.displayName || userDoc.username,
        profileAnimal: userDoc.profileAnimal,
        lastSeen: Date.now(),
        page: page || null
    });

    return res.status(200).json({
        success: true,
        tracked: true,
        onlineCount: presenceStore.size
    });
}

/**
 * GET /api/community?action=stats
 * Returns site-wide statistics
 */
async function handleStats(req, res) {
    const User = require('../models/User');
    const Vote = require('../lib/models/Vote');
    const Comment = require('../lib/models/Comment');
    const ChatMessage = require('../lib/models/ChatMessage');
    const BattleStats = require('../lib/models/BattleStats');
    const SiteStats = require('../lib/models/SiteStats');

    // Get or create site stats document
    let siteStats = await SiteStats.findOne({ key: 'global' });
    if (!siteStats) {
        siteStats = await SiteStats.create({ 
            key: 'global',
            totalVisits: 0,
            totalComparisons: 0,
            totalTournaments: 0
        });
    }

    // Count various stats from existing collections
    const [
        totalUsers,
        totalVotes,
        totalComments,
        totalChatMessages,
        totalBattles
    ] = await Promise.all([
        User.countDocuments({}),
        Vote.countDocuments({}),
        Comment.countDocuments({ isHidden: false }),
        ChatMessage.countDocuments({ isDeleted: { $ne: true } }),
        BattleStats.aggregate([
            { $group: { _id: null, total: { $sum: '$totalBattles' } } }
        ]).then(r => r[0]?.total || 0)
    ]);

    // Clean up presence to get accurate count
    cleanupPresence();

    return res.status(200).json({
        success: true,
        data: {
            totalUsers,
            totalVotes,
            totalComments: totalComments + totalChatMessages,
            totalBattles,
            totalComparisons: siteStats.totalComparisons || totalBattles,
            totalTournaments: siteStats.totalTournaments || 0,
            totalVisits: siteStats.totalVisits || 0,
            onlineNow: presenceStore.size
        }
    });
}
