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
    EYES: '\u{1F440}'
};

/**
 * Send a notification to Discord
 * @param {string} eventType - Type of event
 * @param {object} data - Event data
 */
async function notifyDiscord(eventType, data) {
    if (!DISCORD_WEBHOOK_URL) {
        console.log('Discord webhook not configured, skipping notification');
        return;
    }

    try {
        const embed = createEmbed(eventType, data);
        
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

function createEmbed(eventType, data) {
    const timestamp = new Date().toISOString();
    
    switch (eventType) {
        case 'vote':
            const voteEmoji = data.voteType === 'up' ? EMOJI.THUMBS_UP : EMOJI.THUMBS_DOWN;
            return {
                title: voteEmoji + ' New Vote',
                color: data.voteType === 'up' ? 0x00ff88 : 0xff3366,
                fields: [
                    { name: 'User', value: data.user, inline: true },
                    { name: 'Animal', value: data.animal, inline: true },
                    { name: 'Vote', value: voteEmoji + (data.voteType === 'up' ? ' Upvote' : ' Downvote'), inline: true }
                ],
                timestamp
            };

        case 'vote_removed':
            const removedEmoji = data.voteType === 'up' ? EMOJI.THUMBS_UP : EMOJI.THUMBS_DOWN;
            return {
                title: EMOJI.WASTEBASKET + ' Vote Removed',
                color: 0x888888,
                fields: [
                    { name: 'User', value: data.user, inline: true },
                    { name: 'Animal', value: data.animal, inline: true },
                    { name: 'Removed', value: removedEmoji + ' Was ' + (data.voteType === 'up' ? 'Upvote' : 'Downvote'), inline: true }
                ],
                timestamp
            };

        case 'vote_changed':
            const oldEmoji = data.oldVoteType === 'up' ? EMOJI.THUMBS_UP : EMOJI.THUMBS_DOWN;
            const newEmoji = data.newVoteType === 'up' ? EMOJI.THUMBS_UP : EMOJI.THUMBS_DOWN;
            return {
                title: EMOJI.ARROWS_CYCLE + ' Vote Changed',
                color: 0xffcc00,
                fields: [
                    { name: 'User', value: data.user, inline: true },
                    { name: 'Animal', value: data.animal, inline: true },
                    { name: 'Changed', value: oldEmoji + ' -> ' + newEmoji, inline: true }
                ],
                timestamp
            };

        case 'comment':
            return {
                title: EMOJI.SPEECH_BUBBLE + ' New Comment',
                color: 0x00d4ff,
                fields: [
                    { name: 'User', value: data.user, inline: true },
                    { name: 'Target', value: data.target, inline: true },
                    { name: 'Comment', value: data.content || 'No content', inline: false }
                ],
                timestamp
            };

        case 'comment_deleted':
            return {
                title: EMOJI.WASTEBASKET + ' Comment Deleted',
                color: 0xff4444,
                fields: [
                    { name: 'User', value: data.user, inline: true },
                    { name: 'Target', value: data.target, inline: true }
                ],
                timestamp
            };

        case 'fight':
            return {
                title: EMOJI.CROSSED_SWORDS + ' Battle Comparison',
                color: 0xff6b00,
                fields: [
                    { name: 'Matchup', value: data.animal1 + ' vs ' + data.animal2, inline: false }
                ],
                timestamp
            };

        case 'signup':
            return {
                title: EMOJI.PARTY + ' New User Signup',
                color: 0x9966ff,
                fields: [
                    { name: 'Username', value: data.username, inline: true }
                ],
                timestamp
            };

        case 'login':
            return {
                title: EMOJI.UNLOCKED + ' User Login',
                color: 0x00cc66,
                fields: [
                    { name: 'Username', value: data.username, inline: true }
                ],
                timestamp
            };

        case 'site_visit':
            return {
                title: EMOJI.EYES + ' Site Visit',
                color: 0x4488ff,
                fields: [
                    { name: 'Visitor', value: data.username || 'Anonymous', inline: true }
                ],
                timestamp
            };

        default:
            return {
                title: 'Event: ' + eventType,
                color: 0x808080,
                description: JSON.stringify(data),
                timestamp
            };
    }
}

module.exports = { notifyDiscord };