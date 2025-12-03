/**
 * API Route: /api/health
 * 
 * Health check endpoint for monitoring
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

    const startTime = Date.now();

    try {
        await connectToDatabase();
        
        // Quick database check
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
        console.error('Health Check Error:', error);
        
        return res.status(503).json({
            success: false,
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            database: {
                connected: false,
                error: error.message
            },
            environment: process.env.NODE_ENV || 'development'
        });
    }
};
