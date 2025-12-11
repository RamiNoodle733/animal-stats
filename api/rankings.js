/**
 * API Route: /api/rankings
 * Get power rankings leaderboard
 * 
 * Power Score Algorithm:
 * - TournamentScore (60%): ELO-based battle rating from tournaments
 * - VoteScore (25%): Community upvotes/downvotes
 * - AttackScore (15%): Base attack stat as fallback
 */

const { connectToDatabase } = require('../lib/mongodb');
const Vote = require('../lib/models/Vote');
const Comment = require('../lib/models/Comment');
const Animal = require('../lib/models/Animal');
const BattleStats = require('../lib/models/BattleStats');
const RankHistory = require('../lib/models/RankHistory');
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
        await notifyDiscord('fight', { animal1, animal2, user: user || 'Anonymous' }, req);
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
        
        // Get battle stats for all animals
        const battleStats = await BattleStats.find({}).lean();
        
        // Get yesterday's rankings for trend calculation
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const yesterdayRanks = await RankHistory.findOne({ date: yesterdayStr });
        
        // Create lookup maps
        const voteMap = {};
        voteAggregations.forEach(v => {
            voteMap[v._id] = { upvotes: v.upvotes, downvotes: v.downvotes, score: v.upvotes - v.downvotes };
        });

        const commentMap = {};
        commentCounts.forEach(c => {
            commentMap[c._id] = c.count;
        });
        
        const battleMap = {};
        battleStats.forEach(b => {
            battleMap[b.animalName] = {
                battleRating: b.battleRating,
                tournamentWins: b.tournamentWins,
                tournamentBattles: b.tournamentBattles,
                tournamentsPlayed: b.tournamentsPlayed || 0,
                tournamentsFirst: b.tournamentsFirst || 0,
                tournamentsSecond: b.tournamentsSecond || 0,
                tournamentsThird: b.tournamentsThird || 0
            };
        });
        
        const yesterdayRankMap = {};
        if (yesterdayRanks?.rankings) {
            yesterdayRanks.rankings.forEach(r => {
                yesterdayRankMap[r.animalName] = r.rank;
            });
        }

        // Helper: clamp value between min and max
        const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

        // Combine data and calculate power rankings using new algorithm
        const rankings = animals.map(animal => {
            const votes = voteMap[animal.name] || { upvotes: 0, downvotes: 0, score: 0 };
            const battle = battleMap[animal.name] || { 
                battleRating: 1000, 
                tournamentWins: 0, 
                tournamentBattles: 0,
                tournamentsPlayed: 0,
                tournamentsFirst: 0,
                tournamentsSecond: 0,
                tournamentsThird: 0
            };
            const commentCount = commentMap[animal.name] || 0;
            
            // Calculate total stats for display
            const totalStats = (animal.attack || 0) + (animal.defense || 0) + (animal.agility || 0) + 
                              (animal.stamina || 0) + (animal.intelligence || 0) + (animal.special || 0);

            // ============================================
            // NEW POWER SCORE ALGORITHM
            // ============================================
            
            // 1. AttackScore (0-100): raw attack stat
            const attackScore = animal.attack || 0;
            
            // 2. VoteScore (0-100): based on net votes
            // Formula: clamp(50 + 2 * netVotes, 0, 100)
            const voteScore = clamp(50 + 2 * votes.score, 0, 100);
            
            // 3. TournamentScore (0-100): based on ELO battle rating
            // Rating starts at 1000, so (rating - 800) / 4 maps 800-1200 to 0-100
            const tournamentScore = clamp((battle.battleRating - 800) / 4, 0, 100);
            
            // 4. Final PowerScore: weighted combination
            // 60% tournament + 25% votes + 15% attack
            const powerScore = Math.round(
                0.60 * tournamentScore +
                0.25 * voteScore +
                0.15 * attackScore
            );

            // ============================================
            // WIN RATE (from actual tournament data)
            // ============================================
            const winRate = battle.tournamentBattles > 0 
                ? Math.round((battle.tournamentWins / battle.tournamentBattles) * 100)
                : 50; // Default 50% if no battles
            
            const totalFights = battle.tournamentBattles;

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
                // Battle stats
                battleRating: battle.battleRating,
                tournamentWins: battle.tournamentWins,
                tournamentBattles: battle.tournamentBattles,
                // Tournament placements
                tournamentsPlayed: battle.tournamentsPlayed,
                tournamentsFirst: battle.tournamentsFirst,
                tournamentsSecond: battle.tournamentsSecond,
                tournamentsThird: battle.tournamentsThird,
                // Power ranking fields
                powerScore,
                attackScore,
                voteScore,
                tournamentScore,
                winRate,
                totalFights,
                trend: 0 // Will be calculated after sorting
            };
        });

        // Sort by power score (descending), then by attack, then alphabetically
        rankings.sort((a, b) => {
            // First by power score
            if (b.powerScore !== a.powerScore) return b.powerScore - a.powerScore;
            // Then by attack (base stat tiebreaker)
            if (b.animal.attack !== a.animal.attack) return b.animal.attack - a.animal.attack;
            // Finally alphabetically
            return a.animal.name.localeCompare(b.animal.name);
        });

        // Add rank numbers and calculate trends
        rankings.forEach((r, i) => {
            r.rank = i + 1;
            
            // Calculate trend from yesterday's rank
            const yesterdayRank = yesterdayRankMap[r.animal.name];
            if (yesterdayRank !== undefined) {
                const trendChange = yesterdayRank - r.rank; // positive = moved up
                if (trendChange >= 2) {
                    r.trend = trendChange; // Rising
                } else if (trendChange <= -2) {
                    r.trend = trendChange; // Falling
                } else {
                    r.trend = 0; // Stable
                }
            } else {
                r.trend = 0; // No historical data
            }
        });
        
        // Store today's rankings for tomorrow's trend calculation (async, don't wait)
        const todayStr = new Date().toISOString().split('T')[0];
        RankHistory.findOneAndUpdate(
            { date: todayStr },
            { 
                date: todayStr,
                rankings: rankings.map(r => ({
                    animalName: r.animal.name,
                    rank: r.rank,
                    powerScore: r.powerScore
                }))
            },
            { upsert: true, new: true }
        ).catch(err => console.error('Error saving rank history:', err));

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
