/**
 * API Route: /api/health
 * Health check endpoint for monitoring
 * Also handles site visit, logout, and site leave tracking via POST
 */

const { connectToDatabase } = require('../lib/mongodb');
const Animal = require('../lib/models/Animal');
const { notifyDiscord } = require('../lib/discord');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Handle notifications via POST (site_visit, logout, site_leave)
    if (req.method === 'POST') {
        try {
            // Parse body - handle both JSON and text/plain from sendBeacon
            let body = req.body;
            if (typeof body === 'string') {
                try { body = JSON.parse(body); } catch (e) { body = {}; }
            }
            
            const { type, username } = body || {};
            
            if (type === 'logout') {
                notifyDiscord('logout', { username: username || 'Unknown' }, req);
            } else if (type === 'site_leave') {
                notifyDiscord('site_leave', { username: username || 'Anonymous' }, req);
            } else {
                // Default: site_visit
                notifyDiscord('site_visit', { username: username || 'Anonymous' }, req);
            }
            
            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('Notification error:', error);
            return res.status(200).json({ success: true }); // Silent fail
        }
    }

    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({
            success: false,
            error: 'Method ' + req.method + ' Not Allowed'
        });
    }

    const startTime = Date.now();

    try {
        await connectToDatabase();
        const count = await Animal.countDocuments();
        const dbLatency = Date.now() - startTime;

        return res.status(200).json({
            success: true,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: {
                connected: true,
                latencyMs: dbLatency,
                animalCount: count
            },
            environment: process.env.NODE_ENV || 'development'
        });

    } catch (error) {
        console.error('Health check failed:', error);
        return res.status(503).json({
            success: false,
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Database connection failed'
        });
    }
};