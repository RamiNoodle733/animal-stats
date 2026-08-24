/**
 * API Route: /api/stats
 * 
 * Provides aggregate statistics about the animal database:
 * - Total count
 * - Breakdown by type, class, size
 * - Top animals by various stats
 */

const { connectToDatabase } = require('../lib/mongodb');
const Animal = require('../lib/models/Animal');
const { applyCanonicalAnimalImages } = require('../lib/animal-images');
const { setCorsHeaders } = require('../lib/cors');

module.exports = async function handler(req, res) {
    // Public aggregate stats are read-only and return no auth/user data, so they intentionally stay open.
    setCorsHeaders(req, res, {
        methods: 'GET, OPTIONS',
        headers: 'Content-Type',
        open: true
    });

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({
            success: false,
            error: `Method ${req.method} Not Allowed`
        });
    }

    try {
        await connectToDatabase();

        const [
            totalCount,
            typeBreakdown,
            classBreakdown,
            sizeBreakdown,
            topAttack,
            topDefense,
            topAgility,
            topIntelligence,
            topOverall
        ] = await Promise.all([
            // Total count
            Animal.countDocuments(),
            
            // Type breakdown
            Animal.aggregate([
                { $group: { _id: '$type', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            
            // Class breakdown
            Animal.aggregate([
                { $group: { _id: '$class', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            
            // Size breakdown
            Animal.aggregate([
                { $group: { _id: '$size', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            
            // Top 5 by attack
            Animal.find().sort({ attack: -1 }).limit(5).select('name attack image').lean(),
            
            // Top 5 by defense
            Animal.find().sort({ defense: -1 }).limit(5).select('name defense image').lean(),
            
            // Top 5 by agility
            Animal.find().sort({ agility: -1 }).limit(5).select('name agility image').lean(),
            
            // Top 5 by intelligence
            Animal.find().sort({ intelligence: -1 }).limit(5).select('name intelligence image').lean(),
            
            // Top 5 overall
            Animal.aggregate([
                {
                    $addFields: {
                        totalStats: {
                            $add: ['$attack', '$defense', '$agility', '$stamina', '$intelligence', '$special_attack']
                        }
                    }
                },
                { $sort: { totalStats: -1 } },
                { $limit: 5 },
                { $project: { name: 1, totalStats: 1, image: 1 } }
            ])
        ]);

        return res.status(200).json({
            success: true,
            data: {
                total: totalCount,
                byType: typeBreakdown.reduce((acc, t) => ({ ...acc, [t._id]: t.count }), {}),
                byClass: classBreakdown.reduce((acc, c) => ({ ...acc, [c._id]: c.count }), {}),
                bySize: sizeBreakdown.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
                leaderboards: {
                    attack: applyCanonicalAnimalImages(topAttack),
                    defense: applyCanonicalAnimalImages(topDefense),
                    agility: applyCanonicalAnimalImages(topAgility),
                    intelligence: applyCanonicalAnimalImages(topIntelligence),
                    overall: applyCanonicalAnimalImages(topOverall)
                }
            }
        });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
