/**
 * XP & Leveling System Configuration
 * 
 * Centralized config for the leveling system.
 * Server-authoritative - frontend mirrors these values for display.
 * 
 * XP Curve: 25 + 3*x + 0.03*x^2 (rounded to nearest 5)
 * where x = level - 1
 * 
 * Level 1->2: 25 XP
 * Level 10->11: 55 XP
 * Level 50->51: 245 XP
 * Level 99->100: 605 XP
 * Total to 100: ~26,575 XP
 */

// ==================== XP REWARDS CONFIG ====================
const XP_REWARDS = {
    // Voting actions
    vote: { xp: 5, bp: 0, description: 'Vote on power rankings' },
    daily_matchup_vote: { xp: 10, bp: 2, description: 'Vote on daily matchup' },
    
    // Comment actions
    comment: { xp: 10, bp: 0, description: 'Post a comment' },
    reply: { xp: 5, bp: 0, description: 'Reply to a comment' },
    
    // Tournament actions
    tournament_participate: { xp: 25, bp: 5, description: 'Complete a tournament' },
    tournament_win: { xp: 50, bp: 10, description: 'Win a tournament' },
    battle_won: { xp: 15, bp: 3, description: 'Win a battle' },
    
    // Daily bonuses
    daily_login: { xp: 20, bp: 2, description: 'Daily login bonus' },
    first_vote_of_day: { xp: 10, bp: 1, description: 'First vote of the day' }
};

// BP rewards for leveling up (by level reached)
const LEVEL_UP_BP_REWARDS = {
    default: 5,      // Base BP for leveling up
    milestone_10: 25,  // Every 10 levels
    milestone_25: 50,  // Every 25 levels
    milestone_50: 100, // Level 50
    milestone_100: 500 // Level 100 (pre-prestige)
};

// ==================== XP CURVE FUNCTIONS ====================

/**
 * Calculate XP needed to go from `level` to `level + 1`
 * Formula: 25 + 3*x + 0.03*x^2 rounded to nearest 5
 * where x = level - 1
 */
function xpToNext(level) {
    if (level >= 100) return Infinity; // Can't level past 100
    if (level < 1) return 25;
    
    const x = level - 1;
    const raw = 25 + 3 * x + 0.03 * x * x;
    // Round to nearest 5
    return Math.max(25, Math.round(raw / 5) * 5);
}

/**
 * Calculate total XP needed to reach a level from level 1
 */
function totalXpForLevel(targetLevel) {
    if (targetLevel <= 1) return 0;
    
    let total = 0;
    for (let lvl = 1; lvl < targetLevel; lvl++) {
        total += xpToNext(lvl);
    }
    return total;
}

/**
 * Calculate level and remaining XP from total XP
 * Returns { level, xp, xpToNext, isPrestigeReady }
 */
function calculateLevelFromTotalXp(totalXp) {
    let level = 1;
    let remainingXp = totalXp;
    
    while (level < 100) {
        const needed = xpToNext(level);
        if (remainingXp < needed) break;
        remainingXp -= needed;
        level++;
    }
    
    return {
        level,
        xp: remainingXp,
        xpToNext: xpToNext(level),
        isPrestigeReady: level >= 100
    };
}

/**
 * Process XP award and calculate level ups
 * Returns the new state and any level ups that occurred
 */
function processXpAward(currentLevel, currentXp, xpAwarded) {
    let level = currentLevel;
    let xp = currentXp + xpAwarded;
    const levelsGained = [];
    let totalBpEarned = 0;
    
    // Process level ups
    while (level < 100) {
        const needed = xpToNext(level);
        if (xp < needed) break;
        
        xp -= needed;
        level++;
        levelsGained.push(level);
        
        // Calculate BP reward for this level
        totalBpEarned += getBpForLevelUp(level);
    }
    
    // At level 100, keep any overflow XP (shows full bar)
    if (level >= 100) {
        // Clamp XP to show full bar at level 100
        xp = Math.min(xp, xpToNext(99)); // Show as "full" bar
    }
    
    return {
        level,
        xp,
        xpToNext: xpToNext(level),
        levelsGained,
        totalBpEarned,
        isPrestigeReady: level >= 100
    };
}

/**
 * Get BP reward for reaching a specific level
 */
function getBpForLevelUp(level) {
    if (level === 100) return LEVEL_UP_BP_REWARDS.milestone_100;
    if (level === 50) return LEVEL_UP_BP_REWARDS.milestone_50;
    if (level % 25 === 0) return LEVEL_UP_BP_REWARDS.milestone_25;
    if (level % 10 === 0) return LEVEL_UP_BP_REWARDS.milestone_10;
    return LEVEL_UP_BP_REWARDS.default;
}

/**
 * Process prestige - reset level and XP, increment prestige
 */
function processPrestige(currentLevel, currentPrestige) {
    if (currentLevel < 100) {
        return { success: false, error: 'Must be level 100 to prestige' };
    }
    
    return {
        success: true,
        newLevel: 1,
        newXp: 0,
        newPrestige: currentPrestige + 1,
        prestigeReward: {
            bp: 1000, // Prestige BP reward
            token: 1  // Prestige token (for future use)
        }
    };
}

/**
 * Get XP reward config for an action
 */
function getRewardConfig(action) {
    return XP_REWARDS[action] || null;
}

/**
 * Build the progression object for API responses
 */
function buildProgressionPayload(user) {
    const xpNeeded = xpToNext(user.level);
    return {
        level: user.level,
        xp: user.xp,
        xpToNext: xpNeeded,
        xpPercent: Math.min(100, Math.round((user.xp / xpNeeded) * 100)),
        prestige: user.prestige || 0,
        lifetimeXp: user.lifetimeXp || 0,
        battlePoints: user.battlePoints || 0,
        isPrestigeReady: user.level >= 100
    };
}

module.exports = {
    XP_REWARDS,
    LEVEL_UP_BP_REWARDS,
    xpToNext,
    totalXpForLevel,
    calculateLevelFromTotalXp,
    processXpAward,
    getBpForLevelUp,
    processPrestige,
    getRewardConfig,
    buildProgressionPayload
};
