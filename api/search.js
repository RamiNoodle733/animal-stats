/**
 * API Route: /api/search
 * 
 * Advanced search endpoint with filtering and sorting
 */

const { connectToDatabase } = require('../lib/mongodb');
const Animal = require('../lib/models/Animal');

module.exports = async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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

        // Stat range filters (use explicit undefined check since 0 is a valid value)
        function addRangeFilter(field, min, max) {
            if (min !== undefined && min !== '' || max !== undefined && max !== '') {
                query[field] = {};
                if (min !== undefined && min !== '') query[field].$gte = parseFloat(min);
                if (max !== undefined && max !== '') query[field].$lte = parseFloat(max);
            }
        }
        addRangeFilter('attack', minAttack, maxAttack);
        addRangeFilter('defense', minDefense, maxDefense);
        addRangeFilter('agility', minAgility, maxAgility);
        addRangeFilter('stamina', minStamina, maxStamina);
        addRangeFilter('intelligence', minIntelligence, maxIntelligence);

        // Boolean filters
        if (nocturnal !== undefined) {
            query.isNocturnal = nocturnal === 'true' || nocturnal === true;
        }

        if (social !== undefined) {
            query.isSocial = social === 'true' || social === true;
        }

        // Build sort with field allowlist
        const validSortFields = ['name', 'attack', 'defense', 'agility', 'stamina', 'intelligence', 'special_attack', 'type', 'class', 'size', 'createdAt'];
        const sortObj = {};
        const sortField = sort === 'special' ? 'special_attack' : sort;
        sortObj[validSortFields.includes(sortField) ? sortField : 'name'] = order === 'desc' ? -1 : 1;

        // Pagination with validation
        const parsedPage = Math.max(1, parseInt(page) || 1);
        const parsedLimit = Math.max(1, Math.min(parseInt(limit) || 50, 200));
        const skip = (parsedPage - 1) * parsedLimit;

        const [animals, total] = await Promise.all([
            Animal.find(query)
                .sort(sortObj)
                .skip(skip)
                .limit(parsedLimit)
                .lean(),
            Animal.countDocuments(query)
        ]);

        return res.status(200).json({
            success: true,
            data: animals,
            pagination: {
                page: parsedPage,
                limit: parsedLimit,
                total,
                pages: Math.ceil(total / parsedLimit)
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
