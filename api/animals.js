/**
 * API Route: /api/animals
 * 
 * Handles all animal-related API requests:
 * - GET: Fetch all animals (with optional filters)
 * - POST: Create a new animal
 * 
 * Also handles health check and site notifications (consolidated from health.js):
 * - GET ?action=health - Health check endpoint
 * - POST ?action=notify - Site visit/leave/logout notifications
 */

const { connectToDatabase } = require('../lib/mongodb');
const Animal = require('../lib/models/Animal');
const { notifyDiscord } = require('../lib/discord');

module.exports = async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Prevent caching - always fetch fresh data from MongoDB
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { action } = req.query;

        // Health check action (consolidated from health.js)
        if (action === 'health') {
            return await handleHealthCheck(req, res);
        }

        // Notification action (site_visit, logout, site_leave)
        if (action === 'notify' && req.method === 'POST') {
            return await handleNotification(req, res);
        }

        await connectToDatabase();

        switch (req.method) {
            case 'GET':
                return await handleGet(req, res);
            case 'POST':
                return await handlePost(req, res);
            default:
                res.setHeader('Allow', ['GET', 'POST']);
                return res.status(405).json({ 
                    success: false, 
                    error: `Method ${req.method} Not Allowed` 
                });
        }
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Internal Server Error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ============================================
// HEALTH CHECK (consolidated from health.js)
// ============================================

async function handleHealthCheck(req, res) {
    const startTime = Date.now();
    try {
        await connectToDatabase();
        const count = await Animal.countDocuments();
        const dbLatency = Date.now() - startTime;
        return res.status(200).json({
            success: true,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: { connected: true, latencyMs: dbLatency, animalCount: count },
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
}

async function handleNotification(req, res) {
    try {
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
            notifyDiscord('site_visit', { username: username || 'Anonymous' }, req);
        }
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Notification error:', error);
        return res.status(200).json({ success: true }); // Silent fail
    }
}

/**
 * GET /api/animals
 * Query params:
 * - search: text search
 * - type: filter by animal type
 * - class: filter by combat class
 * - size: filter by size category
 * - sort: sort field (attack, defense, agility, stamina, intelligence, special_attack, name, total)
 * - order: sort order (asc, desc)
 * - limit: number of results
 * - skip: pagination offset
 */
async function handleGet(req, res) {
    const { 
        search, 
        type, 
        class: animalClass, 
        size,
        diet,
        biome,
        sort = 'name', 
        order = 'asc',
        limit = 500,
        skip = 0 
    } = req.query;

    // Build query
    const query = {};

    // Text search
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { scientific_name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
        ];
    }

    // Filters
    if (type && type !== 'all') {
        query.type = type;
    }

    if (animalClass && animalClass !== 'all') {
        query.class = animalClass;
    }

    if (size && size !== 'all') {
        query.size = size;
    }

    if (biome && biome !== 'all') {
        query.habitat = { $regex: biome, $options: 'i' };
    }

    // Build sort object
    const sortObj = {};
    const sortOrder = order === 'desc' ? -1 : 1;
    
    if (sort === 'total') {
        // Sort by total stats (need to use aggregation for this)
        const animals = await Animal.aggregate([
            { $match: query },
            {
                $addFields: {
                    totalStats: {
                        $add: ['$attack', '$defense', '$agility', '$stamina', '$intelligence', '$special_attack']
                    }
                }
            },
            { $sort: { totalStats: -sortOrder } },
            { $skip: parseInt(skip) },
            { $limit: parseInt(limit) }
        ]);
        
        return res.status(200).json({
            success: true,
            count: animals.length,
            data: animals
        });
    }

    // Regular sort
    const sortField = sort === 'special' ? 'special_attack' : sort;
    sortObj[sortField] = sortOrder;

    const animals = await Animal
        .find(query)
        .sort(sortObj)
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .lean();

    const total = await Animal.countDocuments(query);

    return res.status(200).json({
        success: true,
        count: animals.length,
        total,
        data: animals
    });
}

/**
 * POST /api/animals
 * Create a new animal
 */
async function handlePost(req, res) {
    const animalData = req.body;

    // Validate required fields
    if (!animalData.name) {
        return res.status(400).json({
            success: false,
            error: 'Name is required'
        });
    }

    // Check for duplicate
    const existing = await Animal.findByName(animalData.name);
    if (existing) {
        return res.status(409).json({
            success: false,
            error: 'Animal with this name already exists'
        });
    }

    // Create animal
    const animal = await Animal.create(animalData);

    return res.status(201).json({
        success: true,
        data: animal
    });
}
