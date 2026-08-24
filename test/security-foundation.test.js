'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET ||= 'test-secret-that-is-long-enough-for-hmac-verification';

const auth = require('../lib/auth');
const { buildRewardClaimKey } = require('../lib/rewards');
const { buildProgressionPayload } = require('../lib/xpSystem');
const RewardClaim = require('../lib/models/RewardClaim');
const MatchupVote = require('../lib/models/MatchupVote');
const MatchupVoteBallot = require('../lib/models/MatchupVoteBallot');
const XpClaim = require('../lib/models/XpClaim');

test('JWT verification is algorithm-restricted and secret access stays private', () => {
    const token = auth.signToken({ userId: 'user-1', username: 'Rami' }, { expiresIn: '5m' });
    assert.deepEqual(auth.verifyToken(token), { id: 'user-1', username: 'Rami' });

    const wrongAlgorithm = jwt.sign(
        { userId: 'user-1', username: 'Rami' },
        process.env.JWT_SECRET,
        { algorithm: 'HS384' }
    );
    assert.equal(auth.verifyToken(wrongAlgorithm), null);
    assert.equal(auth.JWT_SECRET, undefined);
});

test('reward claim keys are stable and require a server source identifier', () => {
    assert.equal(
        buildRewardClaimKey('507f1f77bcf86cd799439011', 'vote', 'animal-1:2026-08-24'),
        '507f1f77bcf86cd799439011:vote:animal-1:2026-08-24'
    );
    assert.throws(() => buildRewardClaimKey('user', 'vote', ''), /require user, action, and source/i);
});

test('reward and ballot indexes enforce idempotency', () => {
    const rewardIndex = RewardClaim.schema.indexes().find(([spec]) => spec.claimKey === 1);
    const matchupIndex = MatchupVote.schema.indexes().find(([spec]) => spec.matchupKey === 1);
    const ballotIndex = MatchupVoteBallot.schema.indexes().find(([spec]) => (
        spec.matchupKey === 1 && spec.userId === 1 && spec.dayKey === 1
    ));

    assert.equal(rewardIndex?.[1]?.unique, true);
    assert.equal(matchupIndex?.[1]?.unique, true);
    assert.equal(ballotIndex?.[1]?.unique, true);
    assert.equal(new XpClaim().rewardStatus, null);
});

test('level 100 progression has a finite completed percentage', () => {
    assert.equal(buildProgressionPayload({ level: 100, xp: 605 }).xpPercent, 100);
});

test('browser code cannot post direct or custom rewards', () => {
    const root = path.join(__dirname, '..');
    const clientFiles = fs.readdirSync(path.join(root, 'js'))
        .filter((name) => name.endsWith('.js'));
    const clientSource = clientFiles.map((name) => fs.readFileSync(path.join(root, 'js', name), 'utf8')).join('\n');
    const authSource = fs.readFileSync(path.join(root, 'api', 'auth.js'), 'utf8');

    assert.doesNotMatch(clientSource, /customXp|customBp/);
    assert.doesNotMatch(clientSource, /fetch\(['"]\/api\/auth\?action=rewards['"],[\s\S]{0,120}method:\s*['"]POST/);
    assert.doesNotMatch(authSource, /customXp|customBp/);
    assert.match(authSource, /Rewards are granted by verified action endpoints/);
});

test('tournament rewards are tied to completion rather than quitting', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'api', 'battles.js'), 'utf8');
    const completion = source.slice(
        source.indexOf('async function handleTournamentComplete'),
        source.indexOf('async function updateTournamentPlacement')
    );
    const quit = source.slice(
        source.indexOf('async function handleTournamentQuit'),
        source.indexOf('async function recordBattle')
    );

    assert.match(completion, /action:\s*'tournament_participate'/);
    assert.doesNotMatch(quit, /action:\s*'tournament_participate'/);
});
