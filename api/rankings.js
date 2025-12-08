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
        await notifyDiscord('fight', { animal1, animal2, user: user || 'Anonymous' });
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

        // Combine data and calculate power rankings
        const rankings = animals.map(animal => {
            const votes = voteMap[animal.name] || { upvotes: 0, downvotes: 0, score: 0 };
            const commentCount = commentMap[animal.name] || 0;
            
            // Calculate total stats for display
            const totalStats = (animal.attack || 0) + (animal.defense || 0) + (animal.agility || 0) + 
                              (animal.stamina || 0) + (animal.intelligence || 0) + (animal.special || 0);

            // Calculate power score (base stats + community votes weighted)
            // Base: average of all stats (0-100 scale)
            // Community: net votes add/subtract points
            const avgStats = totalStats / 6;
            const voteBonus = votes.score * 2; // Each net vote = 2 power points
            const powerScore = Math.max(0, Math.min(100, Math.round(avgStats + voteBonus)));

            // Win rate - for now, estimate based on attack/defense ratio and votes
            // In future, this will come from actual tournament/matchup data
            const baseWinRate = 50;
            const statBonus = ((animal.attack || 50) - 50) / 5; // +/- based on attack
            const voteWinBonus = votes.score > 0 ? Math.min(votes.score, 10) : Math.max(votes.score, -10);
            const winRate = Math.max(10, Math.min(90, Math.round(baseWinRate + statBonus + voteWinBonus)));
            
            // Total fights (from votes for now, will be actual battles later)
            const totalFights = votes.upvotes + votes.downvotes;

            // Trend - for now randomize slightly, will be calculated from historical data later
            // Positive score = more likely rising, negative = more likely falling
            let trend = 0;
            if (votes.score > 5) trend = Math.floor(Math.random() * 3) + 1; // +1 to +3
            else if (votes.score < -3) trend = -Math.floor(Math.random() * 3) - 1; // -1 to -3
            else trend = Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0;

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
                totalStats,
                // New power ranking fields
                powerScore,
                winRate,
                totalFights,
                trend
            };
        });

        // Sort by power score (descending), then by stats, then alphabetically
        rankings.sort((a, b) => {
            // First by power score
            if (b.powerScore !== a.powerScore) return b.powerScore - a.powerScore;
            // Then by net votes
            if (b.netScore !== a.netScore) return b.netScore - a.netScore;
            // Then by total stats
            if (b.totalStats !== a.totalStats) return b.totalStats - a.totalStats;
            // Finally alphabetically
            return a.animal.name.localeCompare(b.animal.name);
        });

        // Add rank numbers
        rankings.forEach((r, i) => {
            r.rank = i + 1;
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
