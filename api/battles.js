/**
 * API Route: /api/battles
 * Records tournament battle results and updates ELO ratings
 * Also handles tournament completion/quit notifications
 */

const { connectToDatabase } = require('../lib/mongodb');
const BattleStats = require('../lib/models/BattleStats');
const { verifyToken } = require('../lib/auth');
const { notifyDiscord } = require('../lib/discord');

// ELO K-factor (how much ratings change per battle)
const K_FACTOR = 20;

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

        // Handle tournament notifications via query param
        if (req.method === 'POST' && req.query.action === 'tournament_complete') {
            return await handleTournamentComplete(req, res);
        }
        if (req.method === 'POST' && req.query.action === 'tournament_quit') {
            return await handleTournamentQuit(req, res);
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

/**
 * Handle tournament completion notification
 * Also saves tournament placements (1st, 2nd, 3rd, 4th)
 */
async function handleTournamentComplete(req, res) {
    // Parse body - handle both JSON and text/plain from sendBeacon
    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    
    const { user, bracketSize, totalMatches, champion, runnerUp, thirdFourth, matchHistory } = body || {};
    
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
    
    notifyDiscord('tournament_complete', {
        user: user || 'Anonymous',
        bracketSize: bracketSize || 0,
        totalMatches: totalMatches || 0,
        champion: champion || 'Unknown',
        runnerUp: runnerUp || 'N/A',
        thirdFourth: thirdFourth || 'N/A',
        matchHistory: matchHistory || []
    }, req);
    
    return res.status(200).json({ success: true });
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
    // Parse body - handle both JSON and text/plain from sendBeacon
    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    
    const { user, bracketSize, totalMatches, completedMatches, matchHistory } = body || {};
    
    notifyDiscord('tournament_quit', {
        user: user || 'Anonymous',
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
    const { winner, loser } = req.body;

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
