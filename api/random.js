/**
 * API Route: /api/random
 * 
 * Returns random animals from the database
 */

const { connectToDatabase } = require('../lib/mongodb');
const Animal = require('../lib/models/Animal');

module.exports = async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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

        const { count = 1, type, exclude } = req.query;
        const numAnimals = Math.min(parseInt(count), 10); // Max 10 random animals

        const matchStage = {};
        
        if (type && type !== 'all') {
            matchStage.type = type;
        }

        // Exclude specific animal names (comma-separated)
        if (exclude) {
            const excludeNames = exclude.split(',').map(n => n.trim());
            matchStage.name = { $nin: excludeNames };
        }

        const animals = await Animal.aggregate([
            { $match: matchStage },
            { $sample: { size: numAnimals } }
        ]);

        return res.status(200).json({
            success: true,
            count: animals.length,
            data: numAnimals === 1 ? animals[0] : animals
        });

    } catch (error) {
        console.error('Random API Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
