/**
 * Discord Webhook Notifications
 * Sends notifications to Discord for site events
 */

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

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
    EXIT: '\u{1F6AA}'
};

/**
 * Extract location info from Vercel request headers
 * @param {object} req - Express/Vercel request object
 * @returns {object} Location data
 */
function getLocationFromRequest(req) {
    if (!req || !req.headers) return null;
    
    const city = req.headers['x-vercel-ip-city'] || null;
    const country = req.headers['x-vercel-ip-country'] || null;
    const region = req.headers['x-vercel-ip-country-region'] || null;
    
    // Decode URL-encoded city names (Vercel encodes them)
    const decodedCity = city ? decodeURIComponent(city) : null;
    
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
 * Send a notification to Discord
 * @param {string} eventType - Type of event
 * @param {object} data - Event data
 * @param {object} req - Optional request object for location data
 */
async function notifyDiscord(eventType, data, req = null) {
    if (!DISCORD_WEBHOOK_URL) {
        console.log('Discord webhook not configured, skipping notification');
        return;
    }

    try {
        // Extract location if request provided
        const location = req ? getLocationFromRequest(req) : (data.location || null);
        
        const embed = createEmbed(eventType, { ...data, location });
        
        await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'Animal Battle Stats',
                avatar_url: 'https://animal-battle-stats.vercel.app/favicon.svg',
                embeds: [embed]
            })
        });
    } catch (error) {
        console.error('Discord notification failed:', error.message);
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

function createEmbed(eventType, data) {
    const timestamp = new Date().toISOString();
    const location = data.location;
    
    switch (eventType) {
        case 'vote': {
            const voteEmoji = data.voteType === 'up' ? EMOJI.THUMBS_UP : EMOJI.THUMBS_DOWN;
            const fields = [
                { name: 'User', value: data.user, inline: true },
                { name: 'Animal', value: data.animal, inline: true },
                { name: 'Vote', value: voteEmoji + (data.voteType === 'up' ? ' Upvote' : ' Downvote'), inline: true }
            ];
            addLocationField(fields, location);
            return { title: voteEmoji + ' New Vote', color: data.voteType === 'up' ? 0x00ff88 : 0xff3366, fields, timestamp };
        }

        case 'vote_removed': {
            const removedEmoji = data.voteType === 'up' ? EMOJI.THUMBS_UP : EMOJI.THUMBS_DOWN;
            const fields = [
                { name: 'User', value: data.user, inline: true },
                { name: 'Animal', value: data.animal, inline: true },
                { name: 'Removed', value: removedEmoji + ' Was ' + (data.voteType === 'up' ? 'Upvote' : 'Downvote'), inline: true }
            ];
            addLocationField(fields, location);
            return { title: EMOJI.WASTEBASKET + ' Vote Removed', color: 0x888888, fields, timestamp };
        }

        case 'vote_changed': {
            const oldEmoji = data.oldVoteType === 'up' ? EMOJI.THUMBS_UP : EMOJI.THUMBS_DOWN;
            const newEmoji = data.newVoteType === 'up' ? EMOJI.THUMBS_UP : EMOJI.THUMBS_DOWN;
            const fields = [
                { name: 'User', value: data.user, inline: true },
                { name: 'Animal', value: data.animal, inline: true },
                { name: 'Changed', value: oldEmoji + ' -> ' + newEmoji, inline: true }
            ];
            addLocationField(fields, location);
            return { title: EMOJI.ARROWS_CYCLE + ' Vote Changed', color: 0xffcc00, fields, timestamp };
        }

        case 'comment': {
            const fields = [
                { name: 'User', value: data.user, inline: true },
                { name: 'Target', value: data.target, inline: true },
                { name: 'Comment', value: data.content || 'No content', inline: false }
            ];
            addLocationField(fields, location);
            return { title: EMOJI.SPEECH_BUBBLE + ' New Comment', color: 0x00d4ff, fields, timestamp };
        }

        case 'comment_reply': {
            const fields = [
                { name: 'User', value: data.user, inline: true },
                { name: 'Replying To', value: data.replyTo, inline: true },
                { name: 'Target', value: data.target, inline: true },
                { name: 'Reply', value: data.content || 'No content', inline: false }
            ];
            addLocationField(fields, location);
            return { title: EMOJI.REPLY + ' Comment Reply', color: 0x00b4d8, fields, timestamp };
        }

        case 'comment_upvote': {
            const fields = [
                { name: 'By', value: data.user, inline: true },
                { name: 'Comment Author', value: data.commentAuthor, inline: true },
                { name: 'On', value: data.target, inline: true }
            ];
            addLocationField(fields, location);
            return { title: EMOJI.THUMBS_UP + ' Comment Upvoted', color: 0x00cc88, fields, timestamp };
        }

        case 'comment_downvote': {
            const fields = [
                { name: 'By', value: data.user, inline: true },
                { name: 'Comment Author', value: data.commentAuthor, inline: true },
                { name: 'On', value: data.target, inline: true }
            ];
            addLocationField(fields, location);
            return { title: EMOJI.THUMBS_DOWN + ' Comment Downvoted', color: 0xcc3366, fields, timestamp };
        }

        case 'comment_deleted': {
            const fields = [
                { name: 'User', value: data.user, inline: true },
                { name: 'Target', value: data.target, inline: true },
                { name: 'Comment', value: (data.content || 'Unknown').substring(0, 200) + (data.content && data.content.length > 200 ? '...' : ''), inline: false }
            ];
            addLocationField(fields, location);
            return { title: EMOJI.WASTEBASKET + ' Comment Deleted', color: 0xff4444, fields, timestamp };
        }

        case 'fight': {
            const fields = [
                { name: 'Matchup', value: data.animal1 + ' vs ' + data.animal2, inline: false }
            ];
            if (data.user) fields.push({ name: 'User', value: data.user, inline: true });
            addLocationField(fields, location);
            return { title: EMOJI.CROSSED_SWORDS + ' Battle Comparison', color: 0xff6b00, fields, timestamp };
        }

        case 'signup': {
            const fields = [
                { name: 'Username', value: data.username, inline: true }
            ];
            addLocationField(fields, location);
            return { title: EMOJI.PARTY + ' New User Signup', color: 0x9966ff, fields, timestamp };
        }

        case 'login': {
            const fields = [
                { name: 'Username', value: data.username, inline: true }
            ];
            addLocationField(fields, location);
            return { title: EMOJI.UNLOCKED + ' User Login', color: 0x00cc66, fields, timestamp };
        }

        case 'site_visit': {
            const fields = [
                { name: 'Visitor', value: data.username || 'Anonymous', inline: true }
            ];
            addLocationField(fields, location);
            return { title: EMOJI.EYES + ' Site Visit', color: 0x4488ff, fields, timestamp };
        }

        case 'logout': {
            const fields = [
                { name: 'Username', value: data.username, inline: true }
            ];
            addLocationField(fields, location);
            return { title: EMOJI.LOCKED + ' User Logout', color: 0xff9900, fields, timestamp };
        }

        case 'site_leave': {
            const fields = [
                { name: 'User', value: data.username || 'Anonymous', inline: true }
            ];
            addLocationField(fields, location);
            return { title: EMOJI.WAVE + ' User Left Site', color: 0x666666, fields, timestamp };
        }

        case 'chat_message': {
            const fields = [
                { name: 'User', value: data.user, inline: true },
                { name: 'Message', value: (data.content || '').substring(0, 500), inline: false }
            ];
            addLocationField(fields, location);
            return { title: EMOJI.CHAT + ' General Chat Message', color: 0x5865F2, fields, timestamp };
        }

        case 'tournament_complete': {
            const fields = [
                { name: 'User', value: data.user || 'Anonymous', inline: true },
                { name: 'Bracket Size', value: data.bracketSize + ' animals', inline: true },
                { name: 'Total Matches', value: String(data.totalMatches), inline: true },
                { name: EMOJI.TROPHY + ' Champion', value: data.champion, inline: true },
                { name: '2nd Place', value: data.runnerUp || 'N/A', inline: true },
                { name: '3rd/4th Place', value: data.thirdFourth || 'N/A', inline: true }
            ];
            // Add match history summary
            if (data.matchHistory && data.matchHistory.length > 0) {
                const historyStr = data.matchHistory.slice(-8).map(m => 
                    `${m.winner} beat ${m.loser}`
                ).join('\n');
                fields.push({ name: 'Recent Matches', value: historyStr.substring(0, 1000), inline: false });
            }
            addLocationField(fields, location);
            return { title: EMOJI.TROPHY + ' Tournament Completed', color: 0xFFD700, fields, timestamp };
        }

        case 'tournament_quit': {
            const fields = [
                { name: 'User', value: data.user || 'Anonymous', inline: true },
                { name: 'Bracket Size', value: data.bracketSize + ' animals', inline: true },
                { name: 'Matches Completed', value: `${data.completedMatches}/${data.totalMatches}`, inline: true },
                { name: 'Progress', value: `${Math.round((data.completedMatches / data.totalMatches) * 100)}%`, inline: true }
            ];
            // Add votes made so far
            if (data.matchHistory && data.matchHistory.length > 0) {
                const historyStr = data.matchHistory.map(m => 
                    `${m.winner} beat ${m.loser}`
                ).join('\n');
                fields.push({ name: 'Votes Made', value: historyStr.substring(0, 1000), inline: false });
            }
            addLocationField(fields, location);
            return { title: EMOJI.EXIT + ' Tournament Quit', color: 0xFF6347, fields, timestamp };
        }

        default:
            return {
                title: 'Event: ' + eventType,
                color: 0x808080,
                description: JSON.stringify(data),
                timestamp
            };
    }
}

module.exports = { notifyDiscord, getLocationFromRequest };