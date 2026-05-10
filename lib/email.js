/**
 * Email provider integration and notification email helpers.
 *
 * The default provider is webhook-based so production can point to SendGrid,
 * Resend, Postmark, or another service without adding vendor-specific code to
 * API routes. In local development, messages are logged instead of sent.
 */

const crypto = require('crypto');
const Animal = require('./models/Animal');
const BattleStats = require('./models/BattleStats');
const Comment = require('./models/Comment');
const RankHistory = require('./models/RankHistory');

const EMAIL_WEBHOOK_URL = process.env.EMAIL_WEBHOOK_URL || process.env.AUTH_EMAIL_WEBHOOK_URL;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Animal Battle Stats <no-reply@animalbattlestats.com>';
const UNSUBSCRIBE_SECRET = process.env.UNSUBSCRIBE_SECRET || process.env.JWT_SECRET;
const DIGEST_LOOKBACK_DAYS = 7;

function getDefaultNotificationPreferences() {
    return {
        enabled: false,
        weeklyDigest: false,
        newFeatures: false,
        commentReplies: false,
        tournamentUpdates: false,
        unsubscribedAt: null
    };
}

function normalizeNotificationPreferences(raw = {}) {
    const defaults = getDefaultNotificationPreferences();
    return {
        enabled: Boolean(raw.enabled),
        weeklyDigest: Boolean(raw.weeklyDigest),
        newFeatures: Boolean(raw.newFeatures),
        commentReplies: Boolean(raw.commentReplies),
        tournamentUpdates: Boolean(raw.tournamentUpdates),
        unsubscribedAt: raw.unsubscribedAt || defaults.unsubscribedAt
    };
}

function preferencesAllowEmail(user, preferenceKey) {
    const preferences = normalizeNotificationPreferences(user.emailNotifications || {});
    return Boolean(preferences.enabled && preferences[preferenceKey] && !preferences.unsubscribedAt);
}

async function sendEmail({ to, subject, text, html, headers = {} }) {
    const payload = {
        from: EMAIL_FROM,
        to,
        subject,
        text,
        html,
        headers
    };

    if (EMAIL_WEBHOOK_URL) {
        const response = await fetch(EMAIL_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Email webhook failed with status ${response.status}`);
        }
        return { queued: true, provider: 'webhook' };
    }

    console.info('Email queued (configure EMAIL_WEBHOOK_URL to send):', {
        to,
        subject,
        text
    });
    return { queued: false, provider: 'console' };
}

function getSigningSecret() {
    if (!UNSUBSCRIBE_SECRET) {
        throw new Error('UNSUBSCRIBE_SECRET or JWT_SECRET is required for unsubscribe tokens');
    }
    return UNSUBSCRIBE_SECRET;
}

function signPayload(payload) {
    return crypto.createHmac('sha256', getSigningSecret()).update(payload).digest('base64url');
}

function createUnsubscribeToken(user, scope = 'all') {
    const payload = Buffer.from(JSON.stringify({
        userId: String(user._id || user.id),
        email: String(user.email || '').toLowerCase(),
        scope,
        version: 1
    })).toString('base64url');
    return `${payload}.${signPayload(payload)}`;
}

function verifyUnsubscribeToken(token) {
    const [payload, signature] = String(token || '').split('.');
    if (!payload || !signature) return null;

    const expected = signPayload(payload);
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
        return null;
    }

    try {
        return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    } catch (_err) {
        return null;
    }
}

function buildUnsubscribeUrl(baseUrl, user, scope = 'all') {
    const url = new URL('/api/auth', baseUrl);
    url.searchParams.set('action', 'unsubscribe');
    url.searchParams.set('token', createUnsubscribeToken(user, scope));
    return url.toString();
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function listText(title, items, emptyText) {
    if (!items.length) return `${title}: ${emptyText}`;
    return `${title}:\n${items.map((item) => `- ${item}`).join('\n')}`;
}

function listHtml(title, items, emptyText) {
    if (!items.length) return `<h3>${escapeHtml(title)}</h3><p>${escapeHtml(emptyText)}</p>`;
    return `<h3>${escapeHtml(title)}</h3><ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

async function getLatestRankChanges() {
    const snapshots = await RankHistory.find({}).sort({ date: -1 }).limit(2).lean();
    if (snapshots.length < 2) return [];

    const [latest, previous] = snapshots;
    const previousByAnimal = new Map((previous.rankings || []).map((ranking) => [ranking.animalName, ranking]));
    return (latest.rankings || [])
        .map((ranking) => {
            const oldRanking = previousByAnimal.get(ranking.animalName);
            if (!oldRanking) return null;
            const delta = oldRanking.rank - ranking.rank;
            if (!delta) return null;
            return `${ranking.animalName} moved ${delta > 0 ? 'up' : 'down'} ${Math.abs(delta)} spot${Math.abs(delta) === 1 ? '' : 's'} to #${ranking.rank}`;
        })
        .filter(Boolean)
        .slice(0, 5);
}

async function buildWeeklyDigest(user, { baseUrl } = {}) {
    const since = new Date(Date.now() - DIGEST_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const [newAnimals, topBattles, replies, rankChanges, recentCommunity] = await Promise.all([
        Animal.find({ createdAt: { $gte: since } }).sort({ createdAt: -1 }).limit(5).lean(),
        BattleStats.find({}).sort({ battleRating: -1, tournamentWins: -1 }).limit(5).lean(),
        Comment.find({ parentAuthorUsername: user.username, authorId: { $ne: user._id }, createdAt: { $gte: since }, isHidden: false })
            .sort({ createdAt: -1 })
            .limit(5)
            .lean(),
        getLatestRankChanges(),
        Comment.find({ createdAt: { $gte: since }, isHidden: false }).sort({ voteScore: -1, createdAt: -1 }).limit(5).lean()
    ]);

    const newAnimalItems = newAnimals.map((animal) => `${animal.name} joined the roster`);
    const battleItems = topBattles.map((battle, index) => `#${index + 1} ${battle.animalName}: ${battle.battleRating} rating, ${battle.tournamentWins} tournament wins`);
    const replyItems = replies.map((reply) => `${reply.authorUsername} replied on ${reply.animalName || reply.comparisonKey || 'a discussion'}: "${String(reply.content || '').slice(0, 90)}${String(reply.content || '').length > 90 ? '…' : ''}"`);
    const xpSummary = `Level ${user.level || 1}, ${user.xp || 0} current XP, ${user.lifetimeXp || 0} lifetime XP, and ${user.battlePoints || 0} Battle Points.`;
    const communityItems = recentCommunity.map((comment) => `${comment.authorUsername} posted on ${comment.animalName || comment.comparisonKey || 'the community'} (${comment.voteScore || 0} votes)`);

    const sections = [
        ['New animals', newAnimalItems, 'No new animals were added this week.'],
        ['Top battles and ranking changes', [...battleItems, ...rankChanges].slice(0, 8), 'Battle rankings were steady this week.'],
        ['Replies to you', replyItems, 'No new replies this week.'],
        ['Featured tournament and community activity', communityItems, 'No featured community activity yet.']
    ];

    const unsubscribeUrl = baseUrl ? buildUnsubscribeUrl(baseUrl, user, 'all') : null;
    const text = [
        `Your Animal Battle Stats weekly digest, ${user.displayName || user.username}!`,
        '',
        ...sections.flatMap(([title, items, empty]) => [listText(title, items, empty), '']),
        `XP/Battle Points summary: ${xpSummary}`,
        unsubscribeUrl ? `Unsubscribe: ${unsubscribeUrl}` : ''
    ].filter(Boolean).join('\n');

    const html = `
        <h2>Your Animal Battle Stats weekly digest</h2>
        <p>Hi ${escapeHtml(user.displayName || user.username)}, here is what happened this week.</p>
        ${sections.map(([title, items, empty]) => listHtml(title, items, empty)).join('')}
        <h3>XP/Battle Points summary</h3>
        <p>${escapeHtml(xpSummary)}</p>
        ${unsubscribeUrl ? `<p><a href="${escapeHtml(unsubscribeUrl)}">Unsubscribe from notification emails</a></p>` : ''}
    `;

    return {
        subject: 'Your weekly Animal Battle Stats digest',
        text,
        html,
        summary: {
            newAnimals: newAnimalItems.length,
            topBattles: battleItems.length,
            rankingChanges: rankChanges.length,
            replies: replyItems.length,
            communityActivity: communityItems.length
        }
    };
}

async function sendWeeklyDigest(user, options = {}) {
    if (!preferencesAllowEmail(user, 'weeklyDigest')) {
        return { skipped: true, reason: 'weeklyDigest disabled' };
    }

    const digest = await buildWeeklyDigest(user, options);
    const unsubscribeUrl = options.baseUrl ? buildUnsubscribeUrl(options.baseUrl, user, 'all') : null;
    return sendEmail({
        to: user.email,
        subject: digest.subject,
        text: digest.text,
        html: digest.html,
        headers: unsubscribeUrl ? { 'List-Unsubscribe': `<${unsubscribeUrl}>` } : {}
    });
}

module.exports = {
    buildUnsubscribeUrl,
    buildWeeklyDigest,
    createUnsubscribeToken,
    getDefaultNotificationPreferences,
    normalizeNotificationPreferences,
    preferencesAllowEmail,
    sendEmail,
    sendWeeklyDigest,
    verifyUnsubscribeToken
};
