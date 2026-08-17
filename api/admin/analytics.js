'use strict';

const mongoose = require('mongoose');
const { connectToDatabase } = require('../../lib/mongodb');
const { getAuthUser } = require('../../lib/auth');
const { setCorsHeaders } = require('../../lib/cors');
const { sanitizeEventData } = require('../../lib/activity-logger');
const User = require('../../lib/models/User');
const SiteActivity = require('../../lib/models/SiteActivity');

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function buildEventDetails(event) {
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
        details
    };
}

module.exports = async function adminAnalyticsHandler(req, res) {
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
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor.trim() : '';
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Math.min(Math.max(requestedLimit || DEFAULT_LIMIT, 1), MAX_LIMIT);
    const query = {};

    if (key) query.locationKey = key;
    if (cursor) {
        if (!mongoose.isValidObjectId(cursor)) {
            return res.status(400).json({ success: false, error: 'Invalid cursor' });
        }
        query._id = { $lt: cursor };
    }

    const events = await SiteActivity.find(query)
        .sort({ _id: -1 })
        .limit(limit + 1)
        .select('occurredAt eventType username visitorHash page locationRaw city region country coordinates device browser os screenSize language metadata')
        .lean();

    const hasMore = events.length > limit;
    const page = hasMore ? events.slice(0, limit) : events;

    return res.status(200).json({
        success: true,
        data: {
            events: page.map(buildEventDetails),
            nextCursor: hasMore ? String(page[page.length - 1]._id) : null
        }
    });
};
