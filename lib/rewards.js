'use strict';

const mongoose = require('mongoose');
const User = require('./models/User');
const RewardClaim = require('./models/RewardClaim');
const {
    XP_REWARDS,
    processXpAward,
    buildProgressionPayload
} = require('./xpSystem');

function normalizeClaimPart(value, maxLength = 120) {
    return String(value || '')
        .trim()
        .replace(/[^a-zA-Z0-9:_|.-]/g, '-')
        .slice(0, maxLength);
}

function buildRewardClaimKey(userId, action, sourceId) {
    const normalizedUserId = normalizeClaimPart(userId, 64);
    const normalizedAction = normalizeClaimPart(action, 64);
    const normalizedSource = normalizeClaimPart(sourceId, 120);
    if (!normalizedUserId || !normalizedAction || !normalizedSource) {
        throw new Error('Reward claims require user, action, and source identifiers');
    }
    return `${normalizedUserId}:${normalizedAction}:${normalizedSource}`;
}

async function loadDuplicateResult(userId, action, claimKey) {
    const user = await User.findById(userId);
    if (!user) throw new Error('Reward user not found');
    return {
        awarded: false,
        duplicate: true,
        action,
        claimKey,
        xpAdded: 0,
        bpAdded: 0,
        leveledUp: false,
        levelsGained: [],
        progression: buildProgressionPayload(user)
    };
}

async function awardUserReward({ userId, action, sourceId }) {
    const reward = XP_REWARDS[action];
    if (!reward) throw new Error(`Unsupported reward action: ${action}`);

    const claimKey = buildRewardClaimKey(userId, action, sourceId);
    const session = await mongoose.startSession();
    let result;

    try {
        await session.withTransaction(async () => {
            const user = await User.findById(userId).session(session);
            if (!user) throw new Error('Reward user not found');

            const xpResult = processXpAward(user.level || 1, user.xp || 0, reward.xp);
            const totalBpEarned = reward.bp + xpResult.totalBpEarned;

            await RewardClaim.create([{
                claimKey,
                userId: user._id,
                action,
                sourceId: normalizeClaimPart(sourceId, 160),
                xpAwarded: reward.xp,
                bpAwarded: totalBpEarned,
                appliedAt: new Date()
            }], { session });

            user.level = xpResult.level;
            user.xp = xpResult.xp;
            user.lifetimeXp = (user.lifetimeXp || 0) + reward.xp;
            user.battlePoints = (user.battlePoints || 0) + totalBpEarned;
            await user.save({ session, validateModifiedOnly: true });

            result = {
                awarded: true,
                duplicate: false,
                action,
                claimKey,
                xpAdded: reward.xp,
                bpAdded: totalBpEarned,
                leveledUp: xpResult.levelsGained.length > 0,
                levelsGained: xpResult.levelsGained,
                newLevel: xpResult.levelsGained.length > 0 ? xpResult.level : null,
                levelUpBpReward: xpResult.totalBpEarned,
                progression: buildProgressionPayload(user)
            };
        });
        return result;
    } catch (error) {
        if (error?.code === 11000) {
            return loadDuplicateResult(userId, action, claimKey);
        }
        throw error;
    } finally {
        await session.endSession();
    }
}

module.exports = {
    awardUserReward,
    buildRewardClaimKey,
    normalizeClaimPart
};
