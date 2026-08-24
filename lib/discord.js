/**
 * Discord Webhook Notifications
 * Sends notifications to Discord for site events
 */

const crypto = require('crypto');
const { waitUntil } = require('@vercel/functions');
const SITE_LOGO = 'https://animalbattlestats.com/images/icons/icon-192.png';
const { logSiteActivity, sanitizeEventData, sanitizeReferrer } = require('./activity-logger');
const { connectToDatabase } = require('./mongodb');
const SiteActivity = require('./models/SiteActivity');

const DISCORD_LEASE_MS = 45 * 1000;
const DISCORD_MAX_RETRY_DELAY_MS = 24 * 60 * 60 * 1000;

// Emoji constants for cross-platform compatibility
const EMOJI = {
    THUMBS_UP: '\u{1F44D}',
    THUMBS_DOWN: '\u{1F44E}',
    WASTEBASKET: '\u{1F5D1}\u{FE0F}',
    ARROWS_CYCLE: '\u{1F504}',
    SPEECH_BUBBLE: '\u{1F4AC}',
    CROSSED_SWORDS: '\u{2694}\u{FE0F}',
    PARTY: '\u{1F389}',
    UNLOCKED: '\u{1F513}',
    LOCKED: '\u{1F512}',
    EYES: '\u{1F440}',
    WAVE: '\u{1F44B}',
    REPLY: '\u{21A9}\u{FE0F}',
    GLOBE: '\u{1F310}',
    TROPHY: '\u{1F3C6}',
    CHAT: '\u{1F4AC}',
    EXIT: '\u{1F6AA}',
    STAR: '\u{2B50}',
    SPARKLES: '\u{2728}',
    DESKTOP: '\u{1F5A5}\u{FE0F}',
    MOBILE: '\u{1F4F1}',
    LINK: '\u{1F517}',
    CLOCK: '\u{1F550}'
};

/**
 * Parse user agent to get device/browser info
 */
function parseUserAgent(ua) {
    if (!ua) return { device: 'Unknown', browser: 'Unknown', os: 'Unknown' };
    
    // Detect device type
    let device = 'Desktop';
    if (/Mobile|Android|iPhone|iPad|iPod/i.test(ua)) {
        device = /iPad/i.test(ua) ? 'Tablet' : 'Mobile';
    }
    
    // Detect browser
    let browser = 'Unknown';
    if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome';
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
    else if (/Firefox/i.test(ua)) browser = 'Firefox';
    else if (/Edg/i.test(ua)) browser = 'Edge';
    else if (/Opera|OPR/i.test(ua)) browser = 'Opera';
    
    // Detect OS
    let os = 'Unknown';
    if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Mac OS/i.test(ua)) os = 'macOS';
    else if (/Linux/i.test(ua)) os = 'Linux';
    else if (/Android/i.test(ua)) os = 'Android';
    else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
    
    return { device, browser, os };
}

/**
 * Extract location info from Vercel request headers
 */
function getLocationFromRequest(req) {
    if (!req || !req.headers) return null;
    
    const city = req.headers['x-vercel-ip-city'] || null;
    const country = req.headers['x-vercel-ip-country'] || null;
    const region = req.headers['x-vercel-ip-country-region'] || null;
    
    let decodedCity = null;
    if (city) {
        try {
            decodedCity = decodeURIComponent(city);
        } catch (_error) {
            decodedCity = city;
        }
    }
    
    if (!decodedCity && !country) return null;
    
    let locationStr = '';
    if (decodedCity) locationStr += decodedCity;
    if (region) locationStr += (locationStr ? ', ' : '') + region;
    if (country) locationStr += (locationStr ? ', ' : '') + country;
    
    return {
        city: decodedCity,
        region,
        country,
        formatted: locationStr || 'Unknown'
    };
}

/**
 * Extract detailed request info
 */
function getRequestDetails(req) {
    if (!req || !req.headers) return {};
    
    const ua = req.headers['user-agent'] || '';
    const parsed = parseUserAgent(ua);
    const referer = sanitizeReferrer(req.headers['referer'] || req.headers['referrer'] || null);
    return {
        device: parsed.device,
        browser: parsed.browser,
        os: parsed.os,
        referer
    };
}

/**
 * Send a notification to Discord
 */
function getDiscordWebhookUrl() {
    const raw = String(process.env.DISCORD_WEBHOOK_URL || '').trim();
    if (!raw) return null;

    try {
        const url = new URL(raw);
        if (url.protocol !== 'https:') return null;
        url.searchParams.set('wait', 'true');
        return url.toString();
    } catch {
        return null;
    }
}

function sanitizeDeliveryError(error) {
    return String(error?.message || error || 'Unknown Discord delivery error')
        .replace(/https:\/\/discord(?:app)?\.com\/api\/webhooks\/[^\s]+/gi, '[redacted-webhook]')
        .slice(0, 500);
}

function getRetryDelayMs(attempts, retryAfterSeconds = null) {
    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
        return Math.min(Math.ceil(retryAfterSeconds * 1000), DISCORD_MAX_RETRY_DELAY_MS);
    }

    const exponent = Math.max(0, Math.min(Number(attempts || 1) - 1, 10));
    return Math.min(30 * 1000 * (2 ** exponent), DISCORD_MAX_RETRY_DELAY_MS);
}

function activityToDiscordData(activity) {
    return sanitizeEventData(activity.eventType, {
        ...(activity.metadata || {}),
        username: activity.username,
        user: activity.username,
        page: activity.page,
        location: {
            city: activity.city,
            region: activity.region,
            country: activity.country
        },
        device: activity.device,
        browser: activity.browser,
        os: activity.os,
        screenSize: activity.screenSize,
        language: activity.language
    });
}

async function claimDiscordActivity(activityId, { force = false } = {}) {
    const now = new Date();
    const dueConditions = [
        { 'discordDelivery.leaseExpiresAt': null },
        { 'discordDelivery.leaseExpiresAt': { $exists: false } },
        { 'discordDelivery.leaseExpiresAt': { $lte: now } }
    ];
    const query = {
        _id: activityId,
        'discordDelivery.status': { $in: ['pending', 'failed'] },
        $or: dueConditions
    };

    if (!force) {
        query.$and = [{
            $or: [
                { 'discordDelivery.nextAttemptAt': null },
                { 'discordDelivery.nextAttemptAt': { $exists: false } },
                { 'discordDelivery.nextAttemptAt': { $lte: now } }
            ]
        }];
    }

    const leaseToken = crypto.randomUUID();
    const activity = await SiteActivity.findOneAndUpdate(
        query,
        {
            $set: {
                'discordDelivery.leaseToken': leaseToken,
                'discordDelivery.leaseExpiresAt': new Date(now.getTime() + DISCORD_LEASE_MS),
                'discordDelivery.lastAttemptAt': now
            },
            $inc: { 'discordDelivery.attempts': 1 }
        },
        { returnDocument: 'after' }
    ).lean();

    return activity ? { activity, leaseToken } : null;
}

async function deliverDiscordActivity(activityId, options = {}) {
    await connectToDatabase();
    const claim = await claimDiscordActivity(activityId, options);
    if (!claim) return { success: false, skipped: true, reason: 'not-due-or-already-claimed' };

    const { activity, leaseToken } = claim;
    const webhookUrl = getDiscordWebhookUrl();

    try {
        if (!webhookUrl) throw new Error('Discord webhook is not configured');

        const embed = createEmbed(activity.eventType, activityToDiscordData(activity));
        embed.footer = {
            text: `Animal Battle Stats event ${activity.discordDelivery.eventId}`
        };

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'Animal Battle Stats',
                avatar_url: SITE_LOGO,
                embeds: [embed],
                allowed_mentions: { parse: [] }
            })
        });

        if (!response.ok) {
            const retryAfter = Number(response.headers.get('retry-after'));
            const error = new Error(`Discord webhook returned HTTP ${response.status}`);
            error.retryAfterSeconds = Number.isFinite(retryAfter) ? retryAfter : null;
            throw error;
        }

        const responseBody = await response.json().catch(() => ({}));
        const sentAt = new Date();
        await SiteActivity.updateOne(
            { _id: activity._id, 'discordDelivery.leaseToken': leaseToken },
            {
                $set: {
                    'discordDelivery.status': 'sent',
                    'discordDelivery.messageId': String(responseBody?.id || '') || null,
                    'discordDelivery.sentAt': sentAt,
                    'discordDelivery.nextAttemptAt': null,
                    'discordDelivery.lastError': null,
                    'discordDelivery.leaseToken': null,
                    'discordDelivery.leaseExpiresAt': null
                }
            }
        );

        return { success: true, messageId: responseBody?.id || null };
    } catch (error) {
        const delayMs = getRetryDelayMs(activity.discordDelivery.attempts, error.retryAfterSeconds);
        await SiteActivity.updateOne(
            { _id: activity._id, 'discordDelivery.leaseToken': leaseToken },
            {
                $set: {
                    'discordDelivery.status': 'failed',
                    'discordDelivery.nextAttemptAt': new Date(Date.now() + delayMs),
                    'discordDelivery.lastError': sanitizeDeliveryError(error),
                    'discordDelivery.leaseToken': null,
                    'discordDelivery.leaseExpiresAt': null
                }
            }
        );

        console.error('Discord notification failed:', sanitizeDeliveryError(error));
        return { success: false, error: sanitizeDeliveryError(error) };
    }
}

async function retryDueDiscordDeliveries({ limit = 10, forceIds = [] } = {}) {
    await connectToDatabase();
    const boundedLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
    const now = new Date();
    const query = forceIds.length
        ? { _id: { $in: forceIds }, 'discordDelivery.status': { $in: ['pending', 'failed'] } }
        : {
            'discordDelivery.status': { $in: ['pending', 'failed'] },
            $or: [
                { 'discordDelivery.nextAttemptAt': null },
                { 'discordDelivery.nextAttemptAt': { $exists: false } },
                { 'discordDelivery.nextAttemptAt': { $lte: now } }
            ]
        };
    const due = await SiteActivity.find(query)
        .sort({ 'discordDelivery.nextAttemptAt': 1, occurredAt: 1 })
        .limit(boundedLimit)
        .select('_id')
        .lean();
    const results = [];

    for (const item of due) {
        results.push(await deliverDiscordActivity(item._id, { force: forceIds.length > 0 }));
    }

    return {
        requested: due.length,
        sent: results.filter((result) => result.success).length,
        failed: results.filter((result) => !result.success && !result.skipped).length,
        skipped: results.filter((result) => result.skipped).length
    };
}

function scheduleDiscordDelivery(activityId) {
    const work = (async () => {
        await deliverDiscordActivity(activityId);
        await retryDueDiscordDeliveries({ limit: 2 });
    })();

    try {
        waitUntil(work);
        return Promise.resolve();
    } catch {
        return work;
    }
}

async function notifyDiscord(eventType, data, req = null) {
    try {
        const location = req ? getLocationFromRequest(req) : (data.location || null);
        const requestDetails = req ? getRequestDetails(req) : {};
        const safeData = sanitizeEventData(eventType, { ...data, location, ...requestDetails });

        // Persist every tracked event so community analytics can stay cumulative.
        const discordEventId = crypto.randomUUID();
        const activity = await logSiteActivity({
            eventType,
            data: safeData,
            req,
            source: 'live',
            discordEventId
        });

        if (!activity?.inserted || !activity.id) {
            return activity;
        }

        await scheduleDiscordDelivery(activity.id);
        return { ...activity, discordEventId };
    } catch (error) {
        console.error('Discord notification failed:', error.message);
        return { success: false, error: sanitizeDeliveryError(error) };
    }
}

/**
 * Add location field to embed if available
 */
function addLocationField(fields, location) {
    if (location && location.formatted) {
        fields.push({ 
            name: EMOJI.GLOBE + ' Location', 
            value: location.formatted, 
            inline: true 
        });
    }
    return fields;
}

/**
 * Add device info field
 */
function addDeviceField(fields, data) {
    if (data.device || data.browser || data.os) {
        const deviceEmoji = data.device === 'Mobile' ? EMOJI.MOBILE : EMOJI.DESKTOP;
        fields.push({
            name: deviceEmoji + ' Device',
            value: `${data.browser || 'Unknown'} on ${data.os || 'Unknown'}`,
            inline: true
        });
    }
    return fields;
}

/**
 * Add page/route field
 */
function addPageField(fields, data) {
    if (data.page) {
        fields.push({
            name: EMOJI.LINK + ' Page',
            value: data.page,
            inline: true
        });
    }
    return fields;
}

function createEmbed(eventType, data) {
    const timestamp = new Date().toISOString();
    const location = data.location;
    
    // Default thumbnail for all embeds (shows logo in notification)
    const thumbnail = { url: SITE_LOGO };
    
    switch (eventType) {
        case 'vote': {
            const voteEmoji = data.voteType === 'up' ? EMOJI.THUMBS_UP : EMOJI.THUMBS_DOWN;
            const fields = [
                { name: 'User', value: data.user || 'Anonymous', inline: true },
                { name: 'Animal', value: data.animal || 'Unknown', inline: true },
                { name: 'Vote', value: voteEmoji + (data.voteType === 'up' ? ' Upvote' : ' Downvote'), inline: true }
            ];
            addLocationField(fields, location);
            addDeviceField(fields, data);
            return { title: voteEmoji + ' New Vote', color: data.voteType === 'up' ? 0x00ff88 : 0xff3366, fields, timestamp, thumbnail };
        }

        case 'vote_removed': {
            const removedEmoji = data.oldVoteType === 'up' ? EMOJI.THUMBS_UP : EMOJI.THUMBS_DOWN;
            const fields = [
                { name: 'User', value: data.user || 'Anonymous', inline: true },
                { name: 'Animal', value: data.animal || 'Unknown', inline: true },
                { name: 'Removed', value: removedEmoji + ' Was ' + (data.oldVoteType === 'up' ? 'Upvote' : 'Downvote'), inline: true }
            ];
            addLocationField(fields, location);
            addDeviceField(fields, data);
            return { title: EMOJI.WASTEBASKET + ' Vote Removed', color: 0x888888, fields, timestamp, thumbnail };
        }

        case 'vote_changed': {
            const oldEmoji = data.oldVoteType === 'up' ? EMOJI.THUMBS_UP : EMOJI.THUMBS_DOWN;
            const newEmoji = data.newVoteType === 'up' ? EMOJI.THUMBS_UP : EMOJI.THUMBS_DOWN;
            const fields = [
                { name: 'User', value: data.user || 'Anonymous', inline: true },
                { name: 'Animal', value: data.animal || 'Unknown', inline: true },
                { name: 'Changed', value: oldEmoji + ' → ' + newEmoji, inline: true }
            ];
            addLocationField(fields, location);
            addDeviceField(fields, data);
            return { title: EMOJI.ARROWS_CYCLE + ' Vote Changed', color: 0xffcc00, fields, timestamp, thumbnail };
        }

        case 'comment': {
            const fields = [
                { name: 'User', value: data.user || 'Anonymous', inline: true },
                { name: 'Target', value: data.target || 'Unknown', inline: true },
                { name: 'Comment', value: (data.content || 'No content').substring(0, 500), inline: false }
            ];
            addLocationField(fields, location);
            addDeviceField(fields, data);
            return { title: EMOJI.SPEECH_BUBBLE + ' New Comment', color: 0x00d4ff, fields, timestamp, thumbnail };
        }

        case 'comment_reply': {
            const fields = [
                { name: 'User', value: data.user || 'Anonymous', inline: true },
                { name: 'Replying To', value: data.replyTo || 'Unknown', inline: true },
                { name: 'Target', value: data.target || 'Unknown', inline: true },
                { name: 'Reply', value: (data.content || 'No content').substring(0, 500), inline: false }
            ];
            addLocationField(fields, location);
            addDeviceField(fields, data);
            return { title: EMOJI.REPLY + ' Comment Reply', color: 0x00b4d8, fields, timestamp, thumbnail };
        }

        case 'comment_upvote': {
            const fields = [
                { name: 'By', value: data.user || 'Anonymous', inline: true },
                { name: 'Comment Author', value: data.commentAuthor || 'Unknown', inline: true },
                { name: 'On', value: data.target || 'Unknown', inline: true }
            ];
            addLocationField(fields, location);
            addDeviceField(fields, data);
            return { title: EMOJI.THUMBS_UP + ' Comment Upvoted', color: 0x00cc88, fields, timestamp, thumbnail };
        }

        case 'comment_downvote': {
            const fields = [
                { name: 'By', value: data.user || 'Anonymous', inline: true },
                { name: 'Comment Author', value: data.commentAuthor || 'Unknown', inline: true },
                { name: 'On', value: data.target || 'Unknown', inline: true }
            ];
            addLocationField(fields, location);
            addDeviceField(fields, data);
            return { title: EMOJI.THUMBS_DOWN + ' Comment Downvoted', color: 0xcc3366, fields, timestamp, thumbnail };
        }

        case 'comment_deleted': {
            const fields = [
                { name: 'User', value: data.user || 'Anonymous', inline: true },
                { name: 'Target', value: data.target || 'Unknown', inline: true },
                { name: 'Comment', value: (data.content || 'Unknown').substring(0, 200) + (data.content && data.content.length > 200 ? '...' : ''), inline: false }
            ];
            addLocationField(fields, location);
            addDeviceField(fields, data);
            return { title: EMOJI.WASTEBASKET + ' Comment Deleted', color: 0xff4444, fields, timestamp, thumbnail };
        }

        case 'fight': {
            const fields = [
                { name: 'Matchup', value: `**${data.animal1 || 'Unknown'}** vs **${data.animal2 || 'Unknown'}**`, inline: false },
                { name: 'User', value: data.user || 'Anonymous', inline: true }
            ];
            addPageField(fields, data);
            addLocationField(fields, location);
            addDeviceField(fields, data);
            return { title: EMOJI.CROSSED_SWORDS + ' Battle Comparison', color: 0xff6b00, fields, timestamp, thumbnail };
        }

        case 'signup': {
            const fields = [
                { name: 'Username', value: data.username || 'Unknown', inline: true }
            ];
            addLocationField(fields, location);
            addDeviceField(fields, data);
            if (data.referrer) {
                fields.push({ name: EMOJI.LINK + ' Referrer', value: data.referrer.substring(0, 100), inline: true });
            }
            return { title: EMOJI.PARTY + ' New User Signup!', color: 0x9966ff, fields, timestamp, thumbnail };
        }

        case 'login': {
            const fields = [
                { name: 'Username', value: data.username || 'Unknown', inline: true }
            ];
            addLocationField(fields, location);
            addDeviceField(fields, data);
            return { title: EMOJI.UNLOCKED + ' User Login', color: 0x00cc66, fields, timestamp, thumbnail };
        }

        case 'site_visit': {
            const fields = [
                { name: 'Visitor', value: data.username || 'Anonymous', inline: true }
            ];
            addPageField(fields, data);
            addLocationField(fields, location);
            addDeviceField(fields, data);
            if (data.screenSize) {
                fields.push({ name: '📐 Screen', value: data.screenSize, inline: true });
            }
            if (data.language) {
                fields.push({ name: '🌐 Language', value: data.language, inline: true });
            }
            if (data.referrer && data.referrer !== 'Direct' && !data.referrer.includes('animalbattlestats.com')) {
                fields.push({ name: EMOJI.LINK + ' Came From', value: data.referrer.substring(0, 100), inline: false });
            }
            return { 
                title: EMOJI.EYES + ' Site Visit', 
                color: 0x4488ff, 
                fields, 
                timestamp, 
                thumbnail
            };
        }

        case 'logout': {
            const fields = [
                { name: 'Username', value: data.username || 'Unknown', inline: true }
            ];
            addLocationField(fields, location);
            addDeviceField(fields, data);
            return { title: EMOJI.LOCKED + ' User Logout', color: 0xff9900, fields, timestamp, thumbnail };
        }

        case 'site_leave': {
            const fields = [
                { name: 'User', value: data.username || 'Anonymous', inline: true }
            ];
            addPageField(fields, data);
            addLocationField(fields, location);
            if (data.duration) {
                fields.push({ name: EMOJI.CLOCK + ' Session Duration', value: data.duration, inline: true });
            }
            return { title: EMOJI.WAVE + ' User Left Site', color: 0x666666, fields, timestamp, thumbnail };
        }

        case 'chat_message': {
            const fields = [
                { name: 'User', value: data.user || 'Anonymous', inline: true },
                { name: 'Message', value: (data.content || '').substring(0, 500) || 'Empty', inline: false }
            ];
            addLocationField(fields, location);
            addDeviceField(fields, data);
            return { title: EMOJI.CHAT + ' Community Chat', color: 0x5865F2, fields, timestamp, thumbnail };
        }

        case 'chat_reply': {
            const fields = [
                { name: 'User', value: data.user || 'Anonymous', inline: true },
                { name: 'Reply', value: (data.content || '').substring(0, 500) || 'Empty', inline: false }
            ];
            addLocationField(fields, location);
            addDeviceField(fields, data);
            return { title: EMOJI.REPLY + ' Chat Reply', color: 0x5865F2, fields, timestamp, thumbnail };
        }

        case 'tournament_complete': {
            const fields = [
                { name: 'User', value: data.user || 'Anonymous', inline: true },
                { name: 'Bracket Size', value: (data.bracketSize || 0) + ' animals', inline: true },
                { name: 'Total Matches', value: String(data.totalMatches || 0), inline: true },
                { name: EMOJI.TROPHY + ' Champion', value: '**' + (data.champion || 'Unknown') + '**', inline: true },
                { name: '🥈 2nd Place', value: data.runnerUp || 'N/A', inline: true },
                { name: '🥉 3rd/4th', value: data.thirdFourth || 'N/A', inline: true }
            ];
            if (data.matchHistory && data.matchHistory.length > 0) {
                const historyStr = data.matchHistory.slice(-8).map(m => 
                    `✓ ${m.winner} beat ${m.loser}`
                ).join('\n');
                fields.push({ name: 'Final Matches', value: historyStr.substring(0, 1000), inline: false });
            }
            addLocationField(fields, location);
            addDeviceField(fields, data);
            return { title: EMOJI.TROPHY + ' Tournament Completed!', color: 0xFFD700, fields, timestamp, thumbnail };
        }

        case 'tournament_quit': {
            const fields = [
                { name: 'User', value: data.user || 'Anonymous', inline: true },
                { name: 'Bracket Size', value: (data.bracketSize || 0) + ' animals', inline: true },
                { name: 'Progress', value: `${data.completedMatches || 0}/${data.totalMatches || 0} (${Math.round(((data.completedMatches || 0) / (data.totalMatches || 1)) * 100)}%)`, inline: true }
            ];
            if (data.matchHistory && data.matchHistory.length > 0) {
                const historyStr = data.matchHistory.slice(-5).map(m => 
                    `${m.winner} beat ${m.loser}`
                ).join('\n');
                fields.push({ name: 'Last Votes', value: historyStr.substring(0, 500), inline: false });
            }
            addLocationField(fields, location);
            return { title: EMOJI.EXIT + ' Tournament Quit', color: 0xFF6347, fields, timestamp, thumbnail };
        }

        case 'prestige': {
            const prestigeStars = '⭐'.repeat(Math.min(data.prestige || 1, 10));
            const fields = [
                { name: 'User', value: data.username || 'Unknown', inline: true },
                { name: 'Prestige Level', value: prestigeStars + ' **' + (data.prestige || 1) + '**', inline: true }
            ];
            addLocationField(fields, location);
            addDeviceField(fields, data);
            return { title: EMOJI.SPARKLES + ' User Prestiged!', color: 0xFFD700, fields, timestamp, thumbnail };
        }

        case 'level_up': {
            const fields = [
                { name: 'User', value: data.username || 'Unknown', inline: true },
                { name: 'New Level', value: '**' + (data.level || 1) + '**', inline: true }
            ];
            addLocationField(fields, location);
            return { title: EMOJI.STAR + ' Level Up!', color: 0x00ff88, fields, timestamp, thumbnail };
        }

        default:
            return {
                title: 'Event: ' + eventType,
                color: 0x808080,
                description: JSON.stringify(data).substring(0, 500),
                timestamp,
                thumbnail
            };
    }
}

module.exports = {
    notifyDiscord,
    deliverDiscordActivity,
    retryDueDiscordDeliveries,
    getLocationFromRequest,
    getRequestDetails,
    createEmbed,
    getRetryDelayMs,
    sanitizeDeliveryError
};
