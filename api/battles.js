/**
 * API Route: /api/battles
 * Records tournament battle results and updates ELO ratings
 * Also handles tournament completion/quit notifications
 * AND matchup vote tracking (consolidated from matchup-votes.js)
 * 
 * Actions via query param:
 * - ?action=tournament_complete - Record tournament finish
 * - ?action=tournament_quit - Record tournament quit  
 * - ?action=matchup_votes - Get/record matchup vote stats (GET/POST)
 */

const { connectToDatabase } = require('../lib/mongodb');
const BattleStats = require('../lib/models/BattleStats');
const Animal = require('../lib/models/Animal');
const MatchupVote = require('../lib/models/MatchupVote');
const MatchupVoteBallot = require('../lib/models/MatchupVoteBallot');
const { getAuthUser } = require('../lib/auth');
const { awardUserReward } = require('../lib/rewards');
const { notifyDiscord } = require('../lib/discord');
const { setCorsHeaders } = require('../lib/cors');

// ELO K-factor (how much ratings change per battle)
const K_FACTOR = 20;

function generateMatchupKey(animal1, animal2) {
    const sorted = [animal1, animal2].sort();
    return `${sorted[0]}::${sorted[1]}`;
}

module.exports = async function handler(req, res) {
    setCorsHeaders(req, res, {
        methods: 'GET, POST, OPTIONS',
        credentials: true
    });
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        await connectToDatabase();

        const { action } = req.query;

        // Route by action
        if (action === 'tournament_complete' && req.method === 'POST') {
            return await handleTournamentComplete(req, res);
        }
        if (action === 'tournament_quit' && req.method === 'POST') {
            return await handleTournamentQuit(req, res);
        }
        if (action === 'matchup_votes') {
            if (req.method === 'GET') return await getMatchupVotes(req, res);
            if (req.method === 'POST') return await recordMatchupVote(req, res);
        }

        switch (req.method) {
            case 'POST':
                return await recordBattle(req, res);
            case 'GET':
                return await getBattleStats(req, res);
            default:
                return res.status(405).json({ success: false, error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Battles API Error:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

// ============================================
// MATCHUP VOTES (consolidated from matchup-votes.js)
// ============================================

async function getMatchupVotes(req, res) {
    const { animal1, animal2 } = req.query;
    if (!animal1 || !animal2) {
        return res.status(400).json({ success: false, error: 'Both animal1 and animal2 required' });
    }
    try {
        const matchupKey = generateMatchupKey(animal1, animal2);
        const matchup = await MatchupVote.findOne({ matchupKey });
        if (!matchup) {
            return res.status(200).json({
                success: true,
                data: { animal1Name: animal1, animal2Name: animal2, animal1Votes: 0, animal2Votes: 0, totalVotes: 0, animal1Percentage: 50, animal2Percentage: 50, hasVotes: false }
            });
        }
        const sorted = [animal1, animal2].sort();
        const isOriginalOrder = sorted[0] === animal1;
        const leftVotes = isOriginalOrder ? matchup.animal1Votes : matchup.animal2Votes;
        const rightVotes = isOriginalOrder ? matchup.animal2Votes : matchup.animal1Votes;
        const total = matchup.totalVotes || (leftVotes + rightVotes);
        const leftPct = total > 0 ? Math.round((leftVotes / total) * 100) : 50;
        return res.status(200).json({
            success: true,
            data: { animal1Name: animal1, animal2Name: animal2, animal1Votes: leftVotes, animal2Votes: rightVotes, totalVotes: total, animal1Percentage: leftPct, animal2Percentage: 100 - leftPct, hasVotes: total > 0 }
        });
    } catch (error) {
        console.error('Error getting matchup votes:', error);
        return res.status(500).json({ success: false, error: 'Failed to get matchup votes' });
    }
}

async function recordMatchupVote(req, res) {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentication required' });

    const { animal1, animal2, votedFor } = req.body || {};
    if (!animal1 || !animal2 || !votedFor) {
        return res.status(400).json({ success: false, error: 'animal1, animal2, and votedFor required' });
    }
    if ([animal1, animal2, votedFor].some((value) => typeof value !== 'string' || value.length > 100)) {
        return res.status(400).json({ success: false, error: 'Invalid animal name' });
    }
    if (animal1 === animal2) {
        return res.status(400).json({ success: false, error: 'A matchup requires two different animals' });
    }
    if (votedFor !== animal1 && votedFor !== animal2) {
        return res.status(400).json({ success: false, error: 'votedFor must match animal1 or animal2' });
    }

    try {
        const matchupKey = generateMatchupKey(animal1, animal2);
        const sorted = [animal1, animal2].sort();
        const isVotedForFirst = votedFor === sorted[0];

        const validAnimals = await Animal.countDocuments({ name: { $in: sorted } });
        if (validAnimals !== 2) {
            return res.status(400).json({ success: false, error: 'Both matchup animals must exist' });
        }

        const dayKey = new Date().toISOString().split('T')[0];
        try {
            await MatchupVoteBallot.create({
                matchupKey,
                userId: user.id,
                dayKey,
                votedFor,
                votedAt: new Date()
            });
        } catch (error) {
            if (error?.code !== 11000) throw error;
            const existing = await MatchupVote.findOne({ matchupKey });
            return res.status(200).json({
                success: true,
                duplicate: true,
                data: formatMatchupVote(existing, animal1, animal2, votedFor),
                reward: null,
                message: 'You already voted on this matchup today.'
            });
        }

        const increments = isVotedForFirst
            ? { animal1Votes: 1, totalVotes: 1 }
            : { animal2Votes: 1, totalVotes: 1 };
        const matchup = await MatchupVote.findOneAndUpdate(
            { matchupKey },
            {
                $setOnInsert: { animal1Name: sorted[0], animal2Name: sorted[1] },
                $set: { lastVoteAt: new Date() },
                $inc: increments
            },
            { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        );

        let reward = null;
        try {
            reward = await awardUserReward({
                userId: user.id,
                action: 'daily_matchup_vote',
                sourceId: dayKey
            });
        } catch (rewardError) {
            console.error('Matchup reward failed:', rewardError.message);
        }

        await notifyDiscord('vote', {
            user: user.username,
            animal: `${animal1} vs ${animal2}`,
            voteType: votedFor
        }, req);

        return res.status(200).json({
            success: true,
            duplicate: false,
            data: formatMatchupVote(matchup, animal1, animal2, votedFor),
            reward
        });
    } catch (error) {
        console.error('Error recording matchup vote:', error);
        return res.status(500).json({ success: false, error: 'Failed to record matchup vote' });
    }
}

function formatMatchupVote(matchup, animal1, animal2, votedFor = null) {
    if (!matchup) {
        return {
            animal1Name: animal1,
            animal2Name: animal2,
            animal1Votes: 0,
            animal2Votes: 0,
            totalVotes: 0,
            animal1Percentage: 50,
            animal2Percentage: 50,
            votedFor,
            majorityWinner: null
        };
    }

    const sorted = [animal1, animal2].sort();
    const isOriginalOrder = sorted[0] === animal1;
    const leftVotes = isOriginalOrder ? matchup.animal1Votes : matchup.animal2Votes;
    const rightVotes = isOriginalOrder ? matchup.animal2Votes : matchup.animal1Votes;
    const leftPct = matchup.totalVotes > 0 ? Math.round((leftVotes / matchup.totalVotes) * 100) : 50;
    return {
        animal1Name: animal1,
        animal2Name: animal2,
        animal1Votes: leftVotes,
        animal2Votes: rightVotes,
        totalVotes: matchup.totalVotes,
        animal1Percentage: leftPct,
        animal2Percentage: 100 - leftPct,
        votedFor,
        majorityWinner: leftVotes > rightVotes ? animal1 : (rightVotes > leftVotes ? animal2 : null)
    };
}

/**
 * Handle tournament completion notification
 * Also saves tournament placements (1st, 2nd, 3rd, 4th)
 */
async function handleTournamentComplete(req, res) {
    const authenticatedUser = getAuthUser(req);
    if (!authenticatedUser) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    // Parse body - handle both JSON and text/plain from sendBeacon
    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (_e) { body = {}; }
    }
    
    const { bracketSize, totalMatches, champion, runnerUp, thirdFourth, matchHistory } = body || {};

    const parsedBracketSize = Number(bracketSize);
    const parsedTotalMatches = Number(totalMatches);
    const validBracket = Number.isInteger(parsedBracketSize)
        && parsedBracketSize >= 4
        && parsedBracketSize <= 64
        && (parsedBracketSize & (parsedBracketSize - 1)) === 0;
    if (!validBracket || parsedTotalMatches !== parsedBracketSize - 1) {
        return res.status(400).json({ success: false, error: 'Invalid tournament structure' });
    }
    if (!Array.isArray(matchHistory) || matchHistory.length !== parsedTotalMatches) {
        return res.status(400).json({ success: false, error: 'Complete match history required' });
    }
    if (typeof champion !== 'string' || !champion || champion.length > 100) {
        return res.status(400).json({ success: false, error: 'Valid champion required' });
    }

    const tournamentNames = [...new Set(matchHistory.flatMap((match) => [match?.winner, match?.loser])
        .filter((name) => typeof name === 'string' && name.length > 0 && name.length <= 100))];
    if (tournamentNames.length < parsedBracketSize || !tournamentNames.includes(champion)) {
        return res.status(400).json({ success: false, error: 'Tournament participants are incomplete' });
    }
    const existingAnimals = await Animal.countDocuments({ name: { $in: tournamentNames } });
    if (existingAnimals !== tournamentNames.length) {
        return res.status(400).json({ success: false, error: 'Tournament contains an unknown animal' });
    }
    
    // Save tournament placements to database
    try {
        // Champion gets 1st place
        if (champion) {
            await updateTournamentPlacement(champion, 1);
        }
        
        // Runner-up gets 2nd place
        if (runnerUp && runnerUp !== 'N/A') {
            await updateTournamentPlacement(runnerUp, 2);
        }
        
        // Third/Fourth place finishers
        if (thirdFourth && thirdFourth !== 'N/A') {
            const thirdFourthAnimals = thirdFourth.split(',').map(s => s.trim()).filter(Boolean);
            for (const animalName of thirdFourthAnimals) {
                await updateTournamentPlacement(animalName, 3);
            }
        }
        
        // Mark all animals in the tournament as having played
        const allAnimals = new Set([champion]);
        if (runnerUp && runnerUp !== 'N/A') allAnimals.add(runnerUp);
        if (thirdFourth && thirdFourth !== 'N/A') {
            thirdFourth.split(',').map(s => s.trim()).filter(Boolean).forEach(a => allAnimals.add(a));
        }
        // Also add all participants from match history
        if (matchHistory && Array.isArray(matchHistory)) {
            matchHistory.forEach(match => {
                if (match.winner) allAnimals.add(match.winner);
                if (match.loser) allAnimals.add(match.loser);
            });
        }
        
        // Increment tournamentsPlayed for all participants
        for (const animalName of allAnimals) {
            await incrementTournamentsPlayed(animalName);
        }
        
    } catch (err) {
        console.error('Error saving tournament placements:', err);
        // Don't fail the request - still notify Discord
    }
    
    await notifyDiscord('tournament_complete', {
        user: authenticatedUser.username,
        bracketSize: bracketSize || 0,
        totalMatches: totalMatches || 0,
        champion: champion || 'Unknown',
        runnerUp: runnerUp || 'N/A',
        thirdFourth: thirdFourth || 'N/A',
        matchHistory: matchHistory || []
    }, req);

    let reward = null;
    try {
        reward = await awardUserReward({
            userId: authenticatedUser.id,
            action: 'tournament_participate',
            sourceId: new Date().toISOString().split('T')[0]
        });
    } catch (rewardError) {
        console.error('Tournament reward failed:', rewardError.message);
    }

    return res.status(200).json({ success: true, reward });
}

/**
 * Update tournament placement for an animal
 * @param {string} animalName - Name of the animal
 * @param {number} place - 1, 2, or 3 (3rd and 4th both count as 3rd)
 */
async function updateTournamentPlacement(animalName, place) {
    let stats = await BattleStats.findOne({ animalName });
    if (!stats) {
        stats = new BattleStats({ animalName });
    }
    
    if (place === 1) {
        stats.tournamentsFirst = (stats.tournamentsFirst || 0) + 1;
    } else if (place === 2) {
        stats.tournamentsSecond = (stats.tournamentsSecond || 0) + 1;
    } else if (place === 3) {
        stats.tournamentsThird = (stats.tournamentsThird || 0) + 1;
    }
    
    await stats.save();
}

/**
 * Increment tournaments played count for an animal
 */
async function incrementTournamentsPlayed(animalName) {
    let stats = await BattleStats.findOne({ animalName });
    if (!stats) {
        stats = new BattleStats({ animalName });
    }
    stats.tournamentsPlayed = (stats.tournamentsPlayed || 0) + 1;
    await stats.save();
}

/**
 * Handle tournament quit notification
 */
async function handleTournamentQuit(req, res) {
    const authenticatedUser = getAuthUser(req);
    if (!authenticatedUser) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Parse body - handle both JSON and text/plain from sendBeacon
    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (_e) { body = {}; }
    }
    
    const { bracketSize, totalMatches, completedMatches, matchHistory } = body || {};
    
    await notifyDiscord('tournament_quit', {
        user: authenticatedUser.username,
        bracketSize: bracketSize || 0,
        totalMatches: totalMatches || 0,
        completedMatches: completedMatches || 0,
        matchHistory: matchHistory || []
    }, req);
    
    return res.status(200).json({ success: true });
}

/**
 * Record a tournament battle result
 * POST /api/battles
 * Body: { winner: "Animal Name", loser: "Animal Name" }
 */
async function recordBattle(req, res) {
    const authenticatedUser = getAuthUser(req);
    if (!authenticatedUser) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { winner, loser } = req.body || {};

    if (!winner || !loser) {
        return res.status(400).json({ 
            success: false, 
            error: 'Winner and loser animal names required' 
        });
    }

    if (winner === loser) {
        return res.status(400).json({ 
            success: false, 
            error: 'Winner and loser cannot be the same animal' 
        });
    }

    if ([winner, loser].some((name) => typeof name !== 'string' || name.length > 100)) {
        return res.status(400).json({ success: false, error: 'Invalid animal name' });
    }

    const knownAnimals = await Animal.countDocuments({ name: { $in: [winner, loser] } });
    if (knownAnimals !== 2) {
        return res.status(400).json({ success: false, error: 'Both battle animals must exist' });
    }

    try {
        // Get or create battle stats for both animals
        let winnerStats = await BattleStats.findOne({ animalName: winner });
        let loserStats = await BattleStats.findOne({ animalName: loser });

        if (!winnerStats) {
            winnerStats = new BattleStats({ animalName: winner });
        }
        if (!loserStats) {
            loserStats = new BattleStats({ animalName: loser });
        }

        // Current ratings
        const ratingA = winnerStats.battleRating;
        const ratingB = loserStats.battleRating;

        // Calculate expected scores (ELO formula)
        const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
        const expectedB = 1 - expectedA;

        // Update ratings
        // Winner gets points (actual score = 1)
        // Loser loses points (actual score = 0)
        const newRatingA = Math.round(ratingA + K_FACTOR * (1 - expectedA));
        const newRatingB = Math.round(ratingB + K_FACTOR * (0 - expectedB));

        // Update winner stats
        winnerStats.battleRating = newRatingA;
        winnerStats.tournamentWins += 1;
        winnerStats.tournamentBattles += 1;
        winnerStats.lastBattleAt = new Date();

        // Update loser stats
        loserStats.battleRating = newRatingB;
        loserStats.tournamentBattles += 1;
        loserStats.lastBattleAt = new Date();

        // Save both
        await Promise.all([winnerStats.save(), loserStats.save()]);

        // Calculate rating changes for response
        const winnerChange = newRatingA - ratingA;
        const loserChange = newRatingB - ratingB;

        return res.status(200).json({
            success: true,
            data: {
                winner: {
                    name: winner,
                    oldRating: ratingA,
                    newRating: newRatingA,
                    change: winnerChange,
                    wins: winnerStats.tournamentWins,
                    battles: winnerStats.tournamentBattles
                },
                loser: {
                    name: loser,
                    oldRating: ratingB,
                    newRating: newRatingB,
                    change: loserChange,
                    battles: loserStats.tournamentBattles
                }
            }
        });

    } catch (error) {
        console.error('Error recording battle:', error);
        return res.status(500).json({ success: false, error: 'Failed to record battle' });
    }
}

/**
 * Get battle stats for one or all animals
 * GET /api/battles?animal=AnimalName (optional)
 */
async function getBattleStats(req, res) {
    const { animal } = req.query;

    try {
        if (animal) {
            // Get stats for specific animal
            const stats = await BattleStats.findOne({ animalName: animal });
            if (!stats) {
                return res.status(200).json({
                    success: true,
                    data: {
                        animalName: animal,
                        battleRating: 1000,
                        tournamentWins: 0,
                        tournamentBattles: 0,
                        winRate: 50
                    }
                });
            }
            return res.status(200).json({ success: true, data: stats });
        }

        // Get all battle stats
        const allStats = await BattleStats.find({}).lean();
        
        // Convert to map for easy lookup
        const statsMap = {};
        allStats.forEach(s => {
            statsMap[s.animalName] = {
                battleRating: s.battleRating,
                tournamentWins: s.tournamentWins,
                tournamentBattles: s.tournamentBattles,
                winRate: s.tournamentBattles > 0 
                    ? Math.round((s.tournamentWins / s.tournamentBattles) * 100)
                    : 50
            };
        });

        return res.status(200).json({ success: true, data: statsMap });

    } catch (error) {
        console.error('Error getting battle stats:', error);
        return res.status(500).json({ success: false, error: 'Failed to get battle stats' });
    }
}
