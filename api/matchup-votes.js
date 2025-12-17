/**
 * API Route: /api/matchup-votes
 * Handles matchup vote statistics for the "Guess the Majority" feature
 * Tracks and returns vote distribution for specific animal vs animal matchups
 */

const { connectToDatabase } = require('../lib/mongodb');
const mongoose = require('mongoose');

// Matchup Vote Schema
const MatchupVoteSchema = new mongoose.Schema({
    matchupKey: { type: String, required: true, unique: true, index: true },
    animal1Name: { type: String, required: true },
    animal2Name: { type: String, required: true },
    animal1Votes: { type: Number, default: 0 },
    animal2Votes: { type: Number, default: 0 },
    totalVotes: { type: Number, default: 0 },
    lastVoteAt: { type: Date, default: Date.now }
}, { timestamps: true });

let MatchupVote;
try {
    MatchupVote = mongoose.model('MatchupVote');
} catch {
    MatchupVote = mongoose.model('MatchupVote', MatchupVoteSchema);
}

/**
 * Generate a consistent matchup key (alphabetically sorted)
 * so "A vs B" and "B vs A" map to the same record
 */
function generateMatchupKey(animal1, animal2) {
    const sorted = [animal1, animal2].sort();
    return `${sorted[0]}::${sorted[1]}`;
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        await connectToDatabase();

        switch (req.method) {
            case 'GET':
                return await getMatchupVotes(req, res);
            case 'POST':
                return await recordMatchupVote(req, res);
            default:
                return res.status(405).json({ success: false, error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Matchup Votes API Error:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

/**
 * Get vote distribution for a specific matchup
 * GET /api/matchup-votes?animal1=Name1&animal2=Name2
 */
async function getMatchupVotes(req, res) {
    const { animal1, animal2 } = req.query;

    if (!animal1 || !animal2) {
        return res.status(400).json({
            success: false,
            error: 'Both animal1 and animal2 query params required'
        });
    }

    try {
        const matchupKey = generateMatchupKey(animal1, animal2);
        const matchup = await MatchupVote.findOne({ matchupKey });

        if (!matchup) {
            // No votes yet for this matchup
            return res.status(200).json({
                success: true,
                data: {
                    animal1Name: animal1,
                    animal2Name: animal2,
                    animal1Votes: 0,
                    animal2Votes: 0,
                    totalVotes: 0,
                    animal1Pct: 50,
                    animal2Pct: 50,
                    hasVotes: false
                }
            });
        }

        // Determine which animal is animal1 and animal2 in the original query
        // The stored record uses alphabetically sorted names
        const sorted = [animal1, animal2].sort();
        const isOriginalOrder = sorted[0] === animal1;

        const leftVotes = isOriginalOrder ? matchup.animal1Votes : matchup.animal2Votes;
        const rightVotes = isOriginalOrder ? matchup.animal2Votes : matchup.animal1Votes;
        const total = matchup.totalVotes || (leftVotes + rightVotes);

        // Calculate percentages
        const leftPct = total > 0 ? Math.round((leftVotes / total) * 100) : 50;
        const rightPct = total > 0 ? 100 - leftPct : 50;

        return res.status(200).json({
            success: true,
            data: {
                animal1Name: animal1,
                animal2Name: animal2,
                animal1Votes: leftVotes,
                animal2Votes: rightVotes,
                totalVotes: total,
                animal1Pct: leftPct,
                animal2Pct: rightPct,
                hasVotes: total > 0
            }
        });

    } catch (error) {
        console.error('Error getting matchup votes:', error);
        return res.status(500).json({ success: false, error: 'Failed to get matchup votes' });
    }
}

/**
 * Record a vote for a specific matchup
 * POST /api/matchup-votes
 * Body: { animal1: "Name1", animal2: "Name2", votedFor: "Name1" | "Name2" }
 */
async function recordMatchupVote(req, res) {
    const { animal1, animal2, votedFor } = req.body;

    if (!animal1 || !animal2 || !votedFor) {
        return res.status(400).json({
            success: false,
            error: 'animal1, animal2, and votedFor are required'
        });
    }

    if (votedFor !== animal1 && votedFor !== animal2) {
        return res.status(400).json({
            success: false,
            error: 'votedFor must match either animal1 or animal2'
        });
    }

    try {
        const matchupKey = generateMatchupKey(animal1, animal2);
        const sorted = [animal1, animal2].sort();
        const isVotedForFirst = votedFor === sorted[0];

        // Find or create matchup record
        let matchup = await MatchupVote.findOne({ matchupKey });

        if (!matchup) {
            matchup = new MatchupVote({
                matchupKey,
                animal1Name: sorted[0],
                animal2Name: sorted[1],
                animal1Votes: 0,
                animal2Votes: 0,
                totalVotes: 0
            });
        }

        // Increment the appropriate counter
        if (isVotedForFirst) {
            matchup.animal1Votes += 1;
        } else {
            matchup.animal2Votes += 1;
        }
        matchup.totalVotes = matchup.animal1Votes + matchup.animal2Votes;
        matchup.lastVoteAt = new Date();

        await matchup.save();

        // Return updated stats in the original query order
        const isOriginalOrder = sorted[0] === animal1;
        const leftVotes = isOriginalOrder ? matchup.animal1Votes : matchup.animal2Votes;
        const rightVotes = isOriginalOrder ? matchup.animal2Votes : matchup.animal1Votes;
        const total = matchup.totalVotes;

        const leftPct = total > 0 ? Math.round((leftVotes / total) * 100) : 50;
        const rightPct = total > 0 ? 100 - leftPct : 50;

        return res.status(200).json({
            success: true,
            data: {
                animal1Name: animal1,
                animal2Name: animal2,
                animal1Votes: leftVotes,
                animal2Votes: rightVotes,
                totalVotes: total,
                animal1Pct: leftPct,
                animal2Pct: rightPct,
                votedFor: votedFor,
                majorityWinner: leftVotes > rightVotes ? animal1 : (rightVotes > leftVotes ? animal2 : null)
            }
        });

    } catch (error) {
        console.error('Error recording matchup vote:', error);
        return res.status(500).json({ success: false, error: 'Failed to record matchup vote' });
    }
}
