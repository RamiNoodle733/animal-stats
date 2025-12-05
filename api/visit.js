/**
 * API Route: /api/visit
 * Track site visits and notify Discord
 */

const { notifyDiscord } = require('../lib/discord');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { username, page } = req.body;
        
        // Notify Discord about the visit
        notifyDiscord('site_visit', {
            username: username || 'Anonymous',
            page: page || 'Home'
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Visit tracking error:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
