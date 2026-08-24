/**
 * API Route: /api/search
 * 
 * Advanced search endpoint with filtering and sorting
 */

const { connectToDatabase } = require('../lib/mongodb');
const Animal = require('../lib/models/Animal');
const { applyCanonicalAnimalImages } = require('../lib/animal-images');
const { setCorsHeaders } = require('../lib/cors');

module.exports = async function handler(req, res) {
    // Public animal search is read-only and returns no auth/user data, so it intentionally stays open.
    setCorsHeaders(req, res, {
        methods: 'GET, POST, OPTIONS',
        headers: 'Content-Type',
        open: true
    });

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET' && req.method !== 'POST') {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({
            success: false,
            error: `Method ${req.method} Not Allowed`
        });
    }

    try {
        await connectToDatabase();

        // Get params from query (GET) or body (POST)
        const params = req.method === 'POST' ? req.body : req.query;

        const {
            q,              // Search query
            type,           // Animal type filter
            class: cls,     // Combat class filter
            size,           // Size filter
            minAttack,
            maxAttack,
            minDefense,
            maxDefense,
            minAgility,
            maxAgility,
            minStamina,
            maxStamina,
            minIntelligence,
            maxIntelligence,
            nocturnal,
            social,
            sort = 'name',
            order = 'asc',
            page = 1,
            limit = 50
        } = params;

        // Build query
        const query = {};

        // Text search (escape regex metacharacters to prevent ReDoS)
        if (q) {
            const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.$or = [
                { name: { $regex: escaped, $options: 'i' } },
                { scientific_name: { $regex: escaped, $options: 'i' } },
                { habitat: { $regex: escaped, $options: 'i' } },
                { description: { $regex: escaped, $options: 'i' } }
            ];
        }

        // Type filter
        if (type && type !== 'all') {
            query.type = type;
        }

        // Class filter
        if (cls && cls !== 'all') {
            query.class = cls;
        }

        // Size filter
        if (size && size !== 'all') {
            query.size = size;
        }

        // Stat range filters
        if (minAttack || maxAttack) {
            query.attack = {};
            if (minAttack) query.attack.$gte = parseFloat(minAttack);
            if (maxAttack) query.attack.$lte = parseFloat(maxAttack);
        }

        if (minDefense || maxDefense) {
            query.defense = {};
            if (minDefense) query.defense.$gte = parseFloat(minDefense);
            if (maxDefense) query.defense.$lte = parseFloat(maxDefense);
        }

        if (minAgility || maxAgility) {
            query.agility = {};
            if (minAgility) query.agility.$gte = parseFloat(minAgility);
            if (maxAgility) query.agility.$lte = parseFloat(maxAgility);
        }

        if (minStamina || maxStamina) {
            query.stamina = {};
            if (minStamina) query.stamina.$gte = parseFloat(minStamina);
            if (maxStamina) query.stamina.$lte = parseFloat(maxStamina);
        }

        if (minIntelligence || maxIntelligence) {
            query.intelligence = {};
            if (minIntelligence) query.intelligence.$gte = parseFloat(minIntelligence);
            if (maxIntelligence) query.intelligence.$lte = parseFloat(maxIntelligence);
        }

        // Boolean filters
        if (nocturnal !== undefined) {
            query.isNocturnal = nocturnal === 'true' || nocturnal === true;
        }

        if (social !== undefined) {
            query.isSocial = social === 'true' || social === true;
        }

        // Build sort
        const sortObj = {};
        const sortField = sort === 'special' ? 'special_attack' : sort;
        sortObj[sortField] = order === 'desc' ? -1 : 1;

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Execute query
        const [animals, total] = await Promise.all([
            Animal.find(query)
                .sort(sortObj)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Animal.countDocuments(query)
        ]);

        return res.status(200).json({
            success: true,
            data: applyCanonicalAnimalImages(animals),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Search API Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
