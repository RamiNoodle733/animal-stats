/**
 * API Route: /api/rankings
 * Get power rankings leaderboard
 */

const { connectToDatabase } = require('../lib/mongodb');
const Vote = require('../lib/models/Vote');
const Comment = require('../lib/models/Comment');
const Animal = require('../lib/models/Animal');
const { notifyDiscord } = require('../lib/discord');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Handle fight notifications
    if (req.method === 'POST' && req.query.action === 'fight') {
        const { animal1, animal2, user } = req.body;
        notifyDiscord('fight', { animal1, animal2, user: user || 'Anonymous' });
        return res.status(200).json({ success: true });
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        await connectToDatabase();

        // Get all animals
        const animals = await Animal.find({}).select('name image attack defense agility stamina intelligence special').lean();
        
        // Get vote aggregations
        const voteAggregations = await Vote.aggregate([
            {
                $group: {
                    _id: '$animalName',
                    upvotes: { $sum: { $cond: [{ $eq: ['$voteType', 'up'] }, 1, 0] } },
                    downvotes: { $sum: { $cond: [{ $eq: ['$voteType', 'down'] }, 1, 0] } }
                }
            }
        ]);

        // Get comment counts
        const commentCounts = await Comment.aggregate([
            { $match: { targetType: 'animal', isHidden: false } },
            { $group: { _id: '$animalName', count: { $sum: 1 } } }
        ]);

        // Create lookup maps
        const voteMap = {};
        voteAggregations.forEach(v => {
            voteMap[v._id] = { upvotes: v.upvotes, downvotes: v.downvotes, score: v.upvotes - v.downvotes };
        });

        const commentMap = {};
        commentCounts.forEach(c => {
            commentMap[c._id] = c.count;
        });

        // Combine data
        const rankings = animals.map(animal => {
            const votes = voteMap[animal.name] || { upvotes: 0, downvotes: 0, score: 0 };
            const commentCount = commentMap[animal.name] || 0;
            
            // Calculate total stats for display
            const totalStats = (animal.attack || 0) + (animal.defense || 0) + (animal.agility || 0) + 
                              (animal.stamina || 0) + (animal.intelligence || 0) + (animal.special || 0);

            return {
                animal: {
                    _id: animal._id,
                    name: animal.name,
                    image: animal.image,
                    attack: animal.attack,
                    defense: animal.defense,
                    agility: animal.agility,
                    stamina: animal.stamina,
                    intelligence: animal.intelligence,
                    special: animal.special
                },
                upvotes: votes.upvotes,
                downvotes: votes.downvotes,
                netScore: votes.score,
                totalVotes: votes.upvotes + votes.downvotes,
                commentCount,
                totalStats
            };
        });

        // Sort by score (descending), then by upvotes, then alphabetically
        rankings.sort((a, b) => {
            if (b.netScore !== a.netScore) return b.netScore - a.netScore;
            if (b.upvotes !== a.upvotes) return b.upvotes - a.upvotes;
            return a.animal.name.localeCompare(b.animal.name);
        });

        // Add rank numbers
        rankings.forEach((r, i) => {
            r.rank = i + 1;
        });

        // Calculate agreement percentage for each
        rankings.forEach(r => {
            if (r.totalVotes > 0) {
                r.agreementPercent = Math.round((r.upvotes / r.totalVotes) * 100);
            } else {
                r.agreementPercent = null;
            }
        });

        return res.status(200).json({
            success: true,
            count: rankings.length,
            data: rankings
        });

    } catch (error) {
        console.error('Rankings API Error:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
