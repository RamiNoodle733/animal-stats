/**
 * API Route: /api/community
 * Handles community features: leaderboard, presence, site stats
 * 
 * GET /api/community?action=leaderboard - Get user leaderboard by XP/level
 * GET /api/community?action=presence - Get online users list
 * GET /api/community?action=stats - Get site statistics
 * GET /api/community?action=admin-analytics - Get owner-only detailed analytics
 * ALL /api/community?action=gone - Return 410 for removed sensitive exports
 * POST /api/community?action=ping - Update user presence (heartbeat)
 * POST /api/community?action=visit - Increment site visit counter
 */

const { connectToDatabase } = require('../lib/mongodb');
const { verifyToken, getAuthUser } = require('../lib/auth');
const { setCorsHeaders } = require('../lib/cors');
const { sanitizeEventData } = require('../lib/activity-logger');
const { waitUntil } = require('@vercel/functions');

// In-memory presence store with TTL (would use Redis in production)
// Structure: { odId: { username, displayName, profileAnimal, lastSeen, page } }
const presenceStore = new Map();
const PRESENCE_TTL = 90 * 1000; // 90 seconds
const PUBLIC_LOCATION_MINIMUM = 1;
const PUBLIC_GLOBE_SCHEMA_VERSION = 2;
const INVALID_PUBLIC_COORDINATE_SOURCES = new Set(['world-center', 'world-hash', 'country-hash', 'unresolved']);

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

function cleanActionBuckets(items, minimumCohortSize = PUBLIC_LOCATION_MINIMUM) {
    const grouped = new Map();

    (Array.isArray(items) ? items : []).forEach((item) => {
        const rawKey = String(item?.key || '').trim().toLowerCase() || 'unknown_action';
        const label = ACTION_LABELS[rawKey] || titleCase(rawKey);
        const count = Number(item?.count) || 0;

        grouped.set(label, (grouped.get(label) || 0) + count);
    });

    return Array.from(grouped.entries())
        .map(([key, count]) => ({ key, count }))
        .filter((item) => item.count >= minimumCohortSize)
        .sort((a, b) => b.count - a.count);
}

function cleanPageBuckets(items, limit = 8, minimumCohortSize = PUBLIC_LOCATION_MINIMUM) {
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
        .filter((item) => item.count >= minimumCohortSize)
        .sort((a, b) => b.count - a.count)
        .slice(0, Math.max(1, Number(limit) || 8));
}

function toPublicDay(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return null;
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString();
}

function escapeRegex(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getPublicGranularity(location = {}) {
    if (location.city) return 'city';
    if (location.region) return 'region';
    if (location.country) return 'country';
    return 'unknown';
}

function buildPublicLocationLabel(location = {}) {
    return [location.city, location.region, location.country].filter(Boolean).join(', ') || 'Unknown location';
}

function isValidPublicPoint(point = {}) {
    const lat = Number(point.lat);
    const lng = Number(point.lng);
    const source = String(point.coordinateSource || '').trim();
    const granularity = getPublicGranularity(point);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
    if (Math.abs(lat) < 0.00001 && Math.abs(lng) < 0.00001) return false;
    if (INVALID_PUBLIC_COORDINATE_SOURCES.has(source)) return false;
    if ((granularity === 'city' || granularity === 'region') && source === 'country-center') return false;
    return true;
}

function toPublicPoint(point = {}) {
    return {
        key: point.key,
        label: buildPublicLocationLabel(point),
        city: point.city || null,
        region: point.region || null,
        country: point.country || null,
        granularity: getPublicGranularity(point),
        coordinateQuality: ['geocode-city', 'verified-city-centroid'].includes(point.coordinateSource) ? 'high' : 'medium',
        lat: Number(Number(point.lat).toFixed(1)),
        lng: Number(Number(point.lng).toFixed(1)),
        totalEvents: Number(point.totalEvents) || 0,
        totalVisits: Number(point.totalVisits) || 0,
        uniqueVisitors: Number(point.uniqueVisitors) || 0,
        lastSeen: toPublicDay(point.lastSeen)
    };
}

function scheduleGeolocationRepair(limit = 5) {
    const { repairGeolocationBatch } = require('../lib/geolocation-repair');
    const work = repairGeolocationBatch({ limit }).catch((error) => {
        console.error('Background geolocation repair failed:', String(error?.message || error).slice(0, 500));
    });

    try {
        waitUntil(work);
    } catch {
        // The promise has already started and has its own error handler. This
        // fallback is used by local/test runtimes without a Vercel request context.
    }
}

function handleGone(_req, res) {
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(410).json({
        success: false,
        error: 'Gone'
    });
}

function buildOwnerEventDetails(event) {
    const safe = sanitizeEventData(event.eventType, {
        ...(event.metadata || {}),
        username: event.username,
        page: event.page,
        location: {
            city: event.city,
            region: event.region,
            country: event.country
        },
        device: event.device,
        browser: event.browser,
        os: event.os,
        screenSize: event.screenSize,
        language: event.language
    });

    const details = { ...safe };
    [
        'username',
        'user',
        'page',
        'route',
        'location',
        'device',
        'browser',
        'os',
        'screenSize',
        'language',
        'referrer',
        'sessionHash'
    ].forEach((field) => delete details[field]);

    return {
        id: String(event._id),
        occurredAt: event.occurredAt,
        eventType: event.eventType,
        username: safe.username || safe.user || 'Anonymous',
        visitorPseudonym: event.visitorHash || null,
        page: safe.page || null,
        location: safe.location || null,
        coordinates: event.coordinates || null,
        device: safe.device || null,
        browser: safe.browser || null,
        os: safe.os || null,
        referrer: safe.referrer || null,
        screenSize: safe.screenSize || null,
        language: safe.language || null,
        sessionPseudonym: safe.sessionHash || null,
        locationKey: event.locationKey || null,
        discordDelivery: event.discordDelivery ? {
            status: event.discordDelivery.status || null,
            eventId: event.discordDelivery.eventId || null,
            messageId: event.discordDelivery.messageId || null,
            attempts: Number(event.discordDelivery.attempts) || 0,
            lastAttemptAt: event.discordDelivery.lastAttemptAt || null,
            nextAttemptAt: event.discordDelivery.nextAttemptAt || null,
            sentAt: event.discordDelivery.sentAt || null,
            lastError: event.discordDelivery.lastError || null
        } : null,
        details
    };
}

async function handleAdminAnalytics(req, res) {
    const mongoose = require('mongoose');
    const User = require('../lib/models/User');
    const SiteActivity = require('../lib/models/SiteActivity');
    const defaultLimit = 50;
    const maxLimit = 100;

    setCorsHeaders(req, res, {
        methods: 'GET, OPTIONS',
        credentials: true
    });
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Vary', 'Authorization, Cookie, Origin');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET, OPTIONS');
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const authUser = getAuthUser(req);
    if (!authUser?.id) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    await connectToDatabase();

    const owner = await User.findById(authUser.id).select('role').lean();
    if (!owner || owner.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Administrator access required' });
    }

    const key = typeof req.query.key === 'string' ? req.query.key.trim().slice(0, 320) : '';
    const eventType = typeof req.query.eventType === 'string' ? req.query.eventType.trim().slice(0, 64) : '';
    const username = typeof req.query.user === 'string' ? req.query.user.trim().slice(0, 100) : '';
    const deliveryStatus = typeof req.query.deliveryStatus === 'string' ? req.query.deliveryStatus.trim().toLowerCase() : '';
    const from = typeof req.query.from === 'string' ? new Date(req.query.from) : null;
    const to = typeof req.query.to === 'string' ? new Date(req.query.to) : null;
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor.trim() : '';
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Math.min(Math.max(requestedLimit || defaultLimit, 1), maxLimit);
    const query = {};

    if (key) query.locationKey = key;
    if (eventType) query.eventType = eventType;
    if (username) query.username = { $regex: escapeRegex(username), $options: 'i' };
    if (deliveryStatus) {
        if (!['pending', 'sent', 'failed'].includes(deliveryStatus)) {
            return res.status(400).json({ success: false, error: 'Invalid Discord delivery status' });
        }
        query['discordDelivery.status'] = deliveryStatus;
    }
    if (from || to) {
        query.occurredAt = {};
        if (from) {
            if (Number.isNaN(from.getTime())) return res.status(400).json({ success: false, error: 'Invalid from date' });
            query.occurredAt.$gte = from;
        }
        if (to) {
            if (Number.isNaN(to.getTime())) return res.status(400).json({ success: false, error: 'Invalid to date' });
            query.occurredAt.$lte = to;
        }
    }
    if (cursor) {
        if (!mongoose.isValidObjectId(cursor)) {
            return res.status(400).json({ success: false, error: 'Invalid cursor' });
        }
        query._id = { $lt: cursor };
    }

    const events = await SiteActivity.find(query)
        .sort({ _id: -1 })
        .limit(limit + 1)
        .select('occurredAt eventType username visitorHash page locationKey locationRaw city region country coordinates device browser os screenSize language metadata discordDelivery')
        .lean();

    const hasMore = events.length > limit;
    const page = hasMore ? events.slice(0, limit) : events;

    return res.status(200).json({
        success: true,
        data: {
            events: page.map(buildOwnerEventDetails),
            nextCursor: hasMore ? String(page[page.length - 1]._id) : null,
            filters: {
                key: key || null,
                eventType: eventType || null,
                user: username || null,
                deliveryStatus: deliveryStatus || null,
                from: from && !Number.isNaN(from.getTime()) ? from.toISOString() : null,
                to: to && !Number.isNaN(to.getTime()) ? to.toISOString() : null
            }
        }
    });
}

async function requireAdministrator(req, res) {
    const User = require('../lib/models/User');
    const authUser = getAuthUser(req);
    if (!authUser?.id) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return null;
    }

    await connectToDatabase();
    const owner = await User.findById(authUser.id).select('role').lean();
    if (!owner || owner.role !== 'admin') {
        res.status(403).json({ success: false, error: 'Administrator access required' });
        return null;
    }
    return owner;
}

async function handleAdminRetryDiscord(req, res) {
    const mongoose = require('mongoose');
    const { retryDueDiscordDeliveries } = require('../lib/discord');
    setCorsHeaders(req, res, { methods: 'POST, OPTIONS', credentials: true });
    res.setHeader('Cache-Control', 'private, no-store');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
    if (!await requireAdministrator(req, res)) return null;

    const rawIds = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const ids = [...new Set(rawIds.map((id) => String(id || '').trim()))].slice(0, 50);
    if (!ids.length || ids.some((id) => !mongoose.isValidObjectId(id))) {
        return res.status(400).json({ success: false, error: 'One or more valid activity IDs are required' });
    }

    const result = await retryDueDiscordDeliveries({ limit: ids.length, forceIds: ids });
    return res.status(200).json({ success: true, data: result });
}

async function handleDiscordRetryCron(req, res) {
    const { retryDueDiscordDeliveries } = require('../lib/discord');
    const { repairGeolocationBatch } = require('../lib/geolocation-repair');
    const expected = String(process.env.CRON_SECRET || '');
    const authorization = String(req.headers.authorization || '');
    res.setHeader('Cache-Control', 'private, no-store');

    if (!expected || authorization !== `Bearer ${expected}`) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

    const [discord, geolocations] = await Promise.all([
        retryDueDiscordDeliveries({ limit: 50 }),
        repairGeolocationBatch({ limit: 25 })
    ]);
    return res.status(200).json({ success: true, data: { discord, geolocations } });
}

module.exports = async function handler(req, res) {
    const requestedActions = Array.isArray(req.query?.action)
        ? req.query.action
        : [req.query?.action];

    // These rewritten compatibility routes have distinct cache/auth behavior and
    // must run before the shared community headers and database connection.
    if (requestedActions.includes('gone')) {
        return handleGone(req, res);
    }
    if (requestedActions.includes('admin-analytics')) {
        return handleAdminAnalytics(req, res);
    }
    if (requestedActions.includes('admin-retry-discord')) {
        return handleAdminRetryDiscord(req, res);
    }
    if (requestedActions.includes('discord-retry-cron')) {
        return handleDiscordRetryCron(req, res);
    }

    setCorsHeaders(req, res, {
        methods: 'GET, POST, OPTIONS',
        credentials: true
    });
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        await connectToDatabase();
        const [action] = requestedActions;

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
                returnDocument: 'after',
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
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');

    const trendRange = String(req.query.range || 'all').trim().toLowerCase();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    const trendRangeDays = {
        '14d': 14,
        '30d': 30,
        '90d': 90,
        '365d': 365
    }[trendRange] || null;

    const trendDateMatch = {};
    if (Number.isFinite(trendRangeDays) && trendRangeDays > 0) {
        trendDateMatch.occurredAt = { $gte: new Date(now.getTime() - (trendRangeDays * 24 * 60 * 60 * 1000)) };
    }

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
                    lat: { $avg: '$coordinates.lat' },
                    lng: { $avg: '$coordinates.lng' },
                    coordinateSource: { $first: '$coordinates.source' },
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
                    coordinateSource: 1,
                    lat: { $round: ['$lat', 5] },
                    lng: { $round: ['$lng', 5] },
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
            {
                $group: {
                    _id: '$eventType',
                    count: { $sum: 1 },
                    visitors: { $addToSet: '$visitorHash' }
                }
            },
            {
                $project: {
                    _id: 0,
                    key: '$_id',
                    count: 1,
                    cohortSize: { $size: { $setDifference: ['$visitors', [null, '']] } }
                }
            },
            { $sort: { count: -1 } }
        ]),
        SiteActivity.aggregate([
            { $match: { page: { $ne: null } } },
            {
                $group: {
                    _id: '$page',
                    count: { $sum: 1 },
                    visitors: { $addToSet: '$visitorHash' }
                }
            },
            {
                $project: {
                    _id: 0,
                    key: '$_id',
                    count: 1,
                    cohortSize: { $size: { $setDifference: ['$visitors', [null, '']] } }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 8 }
        ]),
        SiteActivity.aggregate([
            { $match: trendDateMatch },
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
                    },
                    visitors: { $addToSet: '$visitorHash' }
                }
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    _id: 0,
                    day: '$_id',
                    events: 1,
                    visits: 1,
                    cohortSize: { $size: { $setDifference: ['$visitors', [null, '']] } }
                }
            }
        ])
    ]);

    const activityWindow = (since) => ([
        { $match: { occurredAt: { $gte: since } } },
        {
            $group: {
                _id: null,
                count: { $sum: 1 }
            }
        },
        {
            $project: {
                _id: 0,
                count: 1
            }
        }
    ]);
    const [windowAgg = {}] = await SiteActivity.aggregate([
        {
            $facet: {
                last24h: activityWindow(oneDayAgo),
                last7d: activityWindow(sevenDaysAgo),
                last30d: activityWindow(thirtyDaysAgo)
            }
        }
    ]);
    const last24h = windowAgg.last24h?.[0]?.count || 0;
    const last7d = windowAgg.last7d?.[0]?.count || 0;
    const last30d = windowAgg.last30d?.[0]?.count || 0;

    const cleanedActions = cleanActionBuckets(actionsAgg);
    const cleanedPages = cleanPageBuckets(pagesAgg, 8);
    const publicPoints = pointsAgg
        .filter(isValidPublicPoint)
        .map(toPublicPoint);
    scheduleGeolocationRepair(5);

    return res.status(200).json({
        success: true,
        schemaVersion: PUBLIC_GLOBE_SCHEMA_VERSION,
        privacy: {
            minimumLocationCount: PUBLIC_LOCATION_MINIMUM,
            detailLevel: 'anonymous-location-aggregate',
            coordinatePrecision: 'approximate-city'
        },
        data: {
            schemaVersion: PUBLIC_GLOBE_SCHEMA_VERSION,
            summary: summaryAgg[0] || { totalEvents: 0, totalVisits: 0, uniqueVisitors: 0 },
            windows: {
                last24h,
                last7d,
                last30d
            },
            points: publicPoints,
            actions: cleanedActions,
            pages: cleanedPages,
            trend: trendAgg,
            trendRange: trendRangeDays ? `${trendRangeDays}d` : 'all'
        }
    });
}

/**
 * GET /api/community?action=globe-point&key=<locationKey>
 * Returns cohort-safe aggregate analytics for a single location hotspot.
 */
async function handleGlobePoint(req, res) {
    const SiteActivity = require('../lib/models/SiteActivity');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
    const key = typeof req.query.key === 'string' ? req.query.key.trim().slice(0, 320) : '';

    if (!key) {
        return res.status(400).json({ success: false, error: 'Location key is required' });
    }

    const [summaryAgg, pagesAgg, actionsAgg, devicesAgg] = await Promise.all([
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
            },
        ]),
        SiteActivity.aggregate([
            { $match: { locationKey: key, page: { $ne: null } } },
            {
                $group: {
                    _id: '$page',
                    count: { $sum: 1 },
                    visitors: { $addToSet: '$visitorHash' }
                }
            },
            {
                $project: {
                    _id: 0,
                    key: '$_id',
                    count: 1,
                    cohortSize: { $size: { $setDifference: ['$visitors', [null, '']] } }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 15 }
        ]),
        SiteActivity.aggregate([
            { $match: { locationKey: key } },
            {
                $group: {
                    _id: '$eventType',
                    count: { $sum: 1 },
                    visitors: { $addToSet: '$visitorHash' }
                }
            },
            {
                $project: {
                    _id: 0,
                    key: '$_id',
                    count: 1,
                    cohortSize: { $size: { $setDifference: ['$visitors', [null, '']] } }
                }
            },
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
                    count: { $sum: 1 },
                    visitors: { $addToSet: '$visitorHash' }
                }
            },
            {
                $project: {
                    _id: 0,
                    device: '$_id.device',
                    browser: '$_id.browser',
                    os: '$_id.os',
                    count: 1,
                    cohortSize: { $size: { $setDifference: ['$visitors', [null, '']] } }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 12 }
        ])
    ]);

    if (!summaryAgg[0]) {
        return res.status(404).json({ success: false, error: 'Location not found' });
    }

    const cleanedActions = cleanActionBuckets(actionsAgg);
    const cleanedPages = cleanPageBuckets(pagesAgg, 15);
    const summary = summaryAgg[0];

    return res.status(200).json({
        success: true,
        schemaVersion: PUBLIC_GLOBE_SCHEMA_VERSION,
        privacy: {
            minimumLocationCount: PUBLIC_LOCATION_MINIMUM,
            detailLevel: 'anonymous-location-aggregate',
            coordinatePrecision: 'approximate-city'
        },
        data: {
            summary: {
                key: summary.key,
                label: buildPublicLocationLabel(summary),
                city: summary.city || null,
                region: summary.region || null,
                country: summary.country || null,
                granularity: getPublicGranularity(summary),
                totalEvents: Number(summary.totalEvents) || 0,
                totalVisits: Number(summary.totalVisits) || 0,
                uniqueVisitors: Number(summary.uniqueVisitors) || 0,
                firstSeen: toPublicDay(summary.firstSeen),
                lastSeen: toPublicDay(summary.lastSeen)
            },
            pages: cleanedPages,
            actions: cleanedActions,
            devices: devicesAgg
        }
    });
}

module.exports._test = {
    buildPublicLocationLabel,
    cleanActionBuckets,
    cleanPageBuckets,
    getPublicGranularity,
    isValidPublicPoint,
    toPublicPoint
};
