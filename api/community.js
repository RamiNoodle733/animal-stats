/**
 * API Route: /api/community
 * Handles community features: leaderboard, presence, site stats
 * 
 * GET /api/community?action=leaderboard - Get user leaderboard by XP/level
 * GET /api/community?action=presence - Get online users list
 * GET /api/community?action=stats - Get site statistics
 * POST /api/community?action=ping - Update user presence (heartbeat)
 * POST /api/community?action=visit - Increment site visit counter
 */

const { connectToDatabase } = require('../lib/mongodb');
const { verifyToken } = require('../lib/auth');

// In-memory presence store with TTL (would use Redis in production)
// Structure: { odId: { username, displayName, profileAnimal, lastSeen, page } }
const presenceStore = new Map();
const PRESENCE_TTL = 90 * 1000; // 90 seconds

const ACTION_LABELS = Object.freeze({
    site_visit: 'Site Visits',
    site_leave: 'Site Exits',
    fight: 'Animal Fights',
    vote: 'Votes Cast',
    vote_removed: 'Votes Removed',
    tournament_complete: 'Tournaments Completed',
    tournament_start: 'Tournaments Started',
    chat_message: 'Chat Messages',
    chat_reply: 'Chat Replies',
    comment: 'Comments',
    comment_reply: 'Comment Replies',
    profile_view: 'Profile Views',
    profile_update: 'Profile Updates'
});

const PAGE_LABELS = Object.freeze({
    '/': 'Home',
    '/stats': 'Stats Landing',
    '/stats/:animal': 'Animal Profiles',
    '/compare': 'Compare',
    '/rankings': 'Rankings',
    '/community': 'Community',
    '/community/:tab': 'Community Tabs',
    '/tournament': 'Tournament',
    '/battlepoints': 'Battle Points Shop',
    '/about': 'About',
    '/profile': 'Profile',
    '/profile/:user': 'Public Profiles',
    '/login': 'Login',
    '/signup': 'Signup'
});

// Clean up stale presence entries
function cleanupPresence() {
    const now = Date.now();
    for (const [userId, data] of presenceStore.entries()) {
        if (now - data.lastSeen > PRESENCE_TTL) {
            presenceStore.delete(userId);
        }
    }
}

function titleCase(rawValue) {
    const text = String(rawValue || '').trim();
    if (!text) return 'Unknown';

    return text
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizePagePath(rawPath) {
    const input = String(rawPath || '').trim();
    if (!input) return null;

    let path = input;
    try {
        path = new URL(input, 'https://animalbattlestats.com').pathname;
    } catch {
        path = input.split('?')[0].split('#')[0];
    }

    if (!path.startsWith('/')) {
        path = `/${path}`;
    }

    path = path.replace(/\/+/g, '/');
    if (path.length > 1) {
        path = path.replace(/\/+$/, '');
    }

    if (path.startsWith('/stats/')) return '/stats/:animal';
    if (path.startsWith('/profile/')) return '/profile/:user';
    if (path.startsWith('/community/')) return '/community/:tab';

    return path;
}

function cleanActionBuckets(items) {
    const grouped = new Map();

    (Array.isArray(items) ? items : []).forEach((item) => {
        const rawKey = String(item?.key || '').trim().toLowerCase() || 'unknown_action';
        const label = ACTION_LABELS[rawKey] || titleCase(rawKey);
        const count = Number(item?.count) || 0;

        grouped.set(label, (grouped.get(label) || 0) + count);
    });

    return Array.from(grouped.entries())
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count);
}

function cleanPageBuckets(items, limit = 8) {
    const grouped = new Map();

    (Array.isArray(items) ? items : []).forEach((item) => {
        const normalizedPath = normalizePagePath(item?.key);
        if (!normalizedPath) return;

        const label = PAGE_LABELS[normalizedPath] || titleCase(normalizedPath.replace(/^\//, ''));
        const count = Number(item?.count) || 0;

        grouped.set(label, (grouped.get(label) || 0) + count);
    });

    return Array.from(grouped.entries())
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, Math.max(1, Number(limit) || 8));
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
            case 'globe':
                if (req.method !== 'GET') {
                    return res.status(405).json({ success: false, error: 'Method not allowed' });
                }
                return await handleGlobe(req, res);
            case 'globe-point':
                if (req.method !== 'GET') {
                    return res.status(405).json({ success: false, error: 'Method not allowed' });
                }
                return await handleGlobePoint(req, res);
            case 'ping':
                if (req.method !== 'POST') {
                    return res.status(405).json({ success: false, error: 'Method not allowed' });
                }
                return await handlePing(req, res);
            case 'visit':
                if (req.method !== 'POST') {
                    return res.status(405).json({ success: false, error: 'Method not allowed' });
                }
                return await handleVisit(req, res);
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
    const User = require('../lib/models/User');

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
    const User = require('../lib/models/User');

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
    const User = require('../lib/models/User');
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
        battleStatsAgg,
        tournamentStatsAgg
    ] = await Promise.all([
        User.countDocuments({}),
        Vote.countDocuments({}),
        Comment.countDocuments({ isHidden: false }),
        ChatMessage.countDocuments({ isDeleted: { $ne: true } }),
        // Sum up all tournament battles (matches)
        BattleStats.aggregate([
            { $group: { _id: null, totalMatches: { $sum: '$tournamentBattles' } } }
        ]).then(r => r[0]?.totalMatches || 0),
        // Sum up all tournaments played (each animal's tournaments count / 8 for bracket size avg)
        BattleStats.aggregate([
            { $group: { _id: null, totalTournaments: { $sum: '$tournamentsPlayed' } } }
        ]).then(r => r[0]?.totalTournaments || 0)
    ]);

    // Clean up presence to get accurate count
    cleanupPresence();
    
    // Total matches is sum of all tournamentBattles
    const totalMatches = battleStatsAgg;
    // Total tournaments is sum of tournamentsPlayed divided by avg participants (8)
    // Each tournament has 8 animals, so total tournamentsPlayed / 8 = actual tournaments
    const totalTournaments = Math.floor(tournamentStatsAgg / 8) || siteStats.totalTournaments || 0;

    return res.status(200).json({
        success: true,
        data: {
            totalUsers,
            totalVotes,
            totalComments: totalComments + totalChatMessages,
            totalMatches,
            totalComparisons: siteStats.totalComparisons || totalMatches,
            totalTournaments,
            totalVisits: siteStats.totalVisits || Math.floor(totalUsers * 5), // Estimate if not tracked
            onlineNow: presenceStore.size
        }
    });
}

/**
 * POST /api/community?action=visit
 * Increment site visit counter (rate limited on client side)
 * Returns the new total visits count
 */
async function handleVisit(req, res) {
    const SiteStats = require('../lib/models/SiteStats');
    
    try {
        // Atomically increment the visit counter
        const result = await SiteStats.findOneAndUpdate(
            { key: 'global' },
            { 
                $inc: { totalVisits: 1 },
                $setOnInsert: { 
                    totalComparisons: 0,
                    totalTournaments: 0
                }
            },
            { 
                upsert: true, 
                new: true,
                setDefaultsOnInsert: true
            }
        );
        
        return res.status(200).json({
            success: true,
            totalVisits: result.totalVisits || 1
        });
    } catch (error) {
        console.error('Error incrementing visit count:', error);
        // Return success anyway - visit counting is not critical
        return res.status(200).json({
            success: true,
            totalVisits: null // Indicate we couldn't get the count
        });
    }
}

/**
 * GET /api/community?action=globe
 * Returns all-time cumulative analytics summary + weighted location points.
 */
async function handleGlobe(req, res) {
    const SiteActivity = require('../lib/models/SiteActivity');

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const fourteenDaysAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));

    const [summaryAgg, pointsAgg, actionsAgg, pagesAgg, trendAgg] = await Promise.all([
        SiteActivity.aggregate([
            {
                $group: {
                    _id: null,
                    totalEvents: { $sum: 1 },
                    totalVisits: {
                        $sum: {
                            $cond: [{ $eq: ['$eventType', 'site_visit'] }, 1, 0]
                        }
                    },
                    uniqueVisitors: { $addToSet: '$visitorHash' }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalEvents: 1,
                    totalVisits: 1,
                    uniqueVisitors: {
                        $size: {
                            $setDifference: ['$uniqueVisitors', [null, '']]
                        }
                    }
                }
            }
        ]),
        SiteActivity.aggregate([
            {
                $match: {
                    locationKey: { $ne: null },
                    'coordinates.lat': { $ne: null },
                    'coordinates.lng': { $ne: null }
                }
            },
            {
                $group: {
                    _id: '$locationKey',
                    city: { $first: '$city' },
                    region: { $first: '$region' },
                    country: { $first: '$country' },
                    locationRaw: { $first: '$locationRaw' },
                    lat: { $first: '$coordinates.lat' },
                    lng: { $first: '$coordinates.lng' },
                    totalEvents: { $sum: 1 },
                    totalVisits: {
                        $sum: {
                            $cond: [{ $eq: ['$eventType', 'site_visit'] }, 1, 0]
                        }
                    },
                    uniqueVisitors: { $addToSet: '$visitorHash' },
                    lastSeen: { $max: '$occurredAt' }
                }
            },
            {
                $project: {
                    _id: 0,
                    key: '$_id',
                    city: 1,
                    region: 1,
                    country: 1,
                    locationRaw: 1,
                    lat: 1,
                    lng: 1,
                    totalEvents: 1,
                    totalVisits: 1,
                    uniqueVisitors: {
                        $size: {
                            $setDifference: ['$uniqueVisitors', [null, '']]
                        }
                    },
                    lastSeen: 1
                }
            },
            { $sort: { totalEvents: -1 } },
            { $limit: 1000 }
        ]),
        SiteActivity.aggregate([
            { $group: { _id: '$eventType', count: { $sum: 1 } } },
            { $project: { _id: 0, key: '$_id', count: 1 } },
            { $sort: { count: -1 } }
        ]),
        SiteActivity.aggregate([
            { $match: { page: { $ne: null } } },
            { $group: { _id: '$page', count: { $sum: 1 } } },
            { $project: { _id: 0, key: '$_id', count: 1 } },
            { $sort: { count: -1 } },
            { $limit: 8 }
        ]),
        SiteActivity.aggregate([
            { $match: { occurredAt: { $gte: fourteenDaysAgo } } },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$occurredAt'
                        }
                    },
                    events: { $sum: 1 },
                    visits: {
                        $sum: {
                            $cond: [{ $eq: ['$eventType', 'site_visit'] }, 1, 0]
                        }
                    }
                }
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    _id: 0,
                    day: '$_id',
                    events: 1,
                    visits: 1
                }
            }
        ])
    ]);

    const [last24h, last7d, last30d] = await Promise.all([
        SiteActivity.countDocuments({ occurredAt: { $gte: oneDayAgo } }),
        SiteActivity.countDocuments({ occurredAt: { $gte: sevenDaysAgo } }),
        SiteActivity.countDocuments({ occurredAt: { $gte: thirtyDaysAgo } })
    ]);

    const cleanedActions = cleanActionBuckets(actionsAgg);
    const cleanedPages = cleanPageBuckets(pagesAgg, 8);

    return res.status(200).json({
        success: true,
        data: {
            summary: summaryAgg[0] || { totalEvents: 0, totalVisits: 0, uniqueVisitors: 0 },
            windows: {
                last24h,
                last7d,
                last30d
            },
            points: pointsAgg,
            actions: cleanedActions,
            pages: cleanedPages,
            trend: trendAgg
        }
    });
}

/**
 * GET /api/community?action=globe-point&key=<locationKey>
 * Returns drilldown analytics for a single location hotspot.
 */
async function handleGlobePoint(req, res) {
    const SiteActivity = require('../lib/models/SiteActivity');
    const key = typeof req.query.key === 'string' ? req.query.key.trim() : '';

    if (!key) {
        return res.status(400).json({ success: false, error: 'Location key is required' });
    }

    const [summaryAgg, pagesAgg, actionsAgg, devicesAgg, usersAgg, recentAgg] = await Promise.all([
        SiteActivity.aggregate([
            { $match: { locationKey: key } },
            {
                $group: {
                    _id: '$locationKey',
                    city: { $first: '$city' },
                    region: { $first: '$region' },
                    country: { $first: '$country' },
                    locationRaw: { $first: '$locationRaw' },
                    totalEvents: { $sum: 1 },
                    totalVisits: {
                        $sum: {
                            $cond: [{ $eq: ['$eventType', 'site_visit'] }, 1, 0]
                        }
                    },
                    uniqueVisitors: { $addToSet: '$visitorHash' },
                    firstSeen: { $min: '$occurredAt' },
                    lastSeen: { $max: '$occurredAt' }
                }
            },
            {
                $project: {
                    _id: 0,
                    key: key,
                    city: 1,
                    region: 1,
                    country: 1,
                    locationRaw: 1,
                    totalEvents: 1,
                    totalVisits: 1,
                    uniqueVisitors: {
                        $size: {
                            $setDifference: ['$uniqueVisitors', [null, '']]
                        }
                    },
                    firstSeen: 1,
                    lastSeen: 1
                }
            }
        ]),
        SiteActivity.aggregate([
            { $match: { locationKey: key, page: { $ne: null } } },
            { $group: { _id: '$page', count: { $sum: 1 } } },
            { $project: { _id: 0, key: '$_id', count: 1 } },
            { $sort: { count: -1 } },
            { $limit: 15 }
        ]),
        SiteActivity.aggregate([
            { $match: { locationKey: key } },
            { $group: { _id: '$eventType', count: { $sum: 1 } } },
            { $project: { _id: 0, key: '$_id', count: 1 } },
            { $sort: { count: -1 } }
        ]),
        SiteActivity.aggregate([
            { $match: { locationKey: key, device: { $ne: null } } },
            {
                $group: {
                    _id: {
                        device: '$device',
                        browser: '$browser',
                        os: '$os'
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    device: '$_id.device',
                    browser: '$_id.browser',
                    os: '$_id.os',
                    count: 1
                }
            },
            { $sort: { count: -1 } },
            { $limit: 12 }
        ]),
        SiteActivity.aggregate([
            { $match: { locationKey: key, username: { $ne: null } } },
            { $group: { _id: '$username', count: { $sum: 1 } } },
            { $project: { _id: 0, key: '$_id', count: 1 } },
            { $sort: { count: -1 } },
            { $limit: 12 }
        ]),
        SiteActivity.find({ locationKey: key })
            .sort({ occurredAt: -1 })
            .limit(25)
            .select('occurredAt eventType username page device browser os metadata')
            .lean()
    ]);

    if (!summaryAgg[0]) {
        return res.status(404).json({ success: false, error: 'Location not found' });
    }

    const cleanedActions = cleanActionBuckets(actionsAgg);
    const cleanedPages = cleanPageBuckets(pagesAgg, 15);

    return res.status(200).json({
        success: true,
        data: {
            summary: summaryAgg[0],
            pages: cleanedPages,
            actions: cleanedActions,
            devices: devicesAgg,
            users: usersAgg,
            recent: recentAgg
        }
    });
}
