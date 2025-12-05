/**
 * Discord Webhook Notifications
 * Sends notifications to Discord for site events
 */

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

/**
 * Send a notification to Discord
 * @param {string} eventType - Type of event: 'vote', 'comment', 'fight', 'signup'
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
            return {
                title: ' New Vote',
                color: data.voteType === 'up' ? 0x00ff88 : 0xff3366,
                fields: [
                    { name: 'User', value: data.user, inline: true },
                    { name: 'Animal', value: data.animal, inline: true },
                    { name: 'Vote', value: data.voteType === 'up' ? ' Upvote' : ' Downvote', inline: true }
                ],
                timestamp
            };

        case 'vote_removed':
            return {
                title: ' Vote Removed',
                color: 0x888888,
                fields: [
                    { name: 'User', value: data.user, inline: true },
                    { name: 'Animal', value: data.animal, inline: true },
                    { name: 'Removed', value: data.voteType === 'up' ? ' Was Upvote' : ' Was Downvote', inline: true }
                ],
                timestamp
            };

        case 'vote_changed':
            return {
                title: ' Vote Changed',
                color: 0xffcc00,
                fields: [
                    { name: 'User', value: data.user, inline: true },
                    { name: 'Animal', value: data.animal, inline: true },
                    { name: 'Changed', value: data.from + '  ' + data.to, inline: true }
                ],
                timestamp
            };

        case 'comment':
            return {
                title: ' New Comment',
                color: 0x00d4ff,
                fields: [
                    { name: 'User', value: data.user, inline: true },
                    { name: 'On', value: data.target, inline: true },
                    { name: 'Comment', value: data.content.length > 200 ? data.content.substring(0, 200) + '...' : data.content, inline: false }
                ],
                timestamp
            };

        case 'comment_deleted':
            return {
                title: ' Comment Deleted',
                color: 0xff4444,
                fields: [
                    { name: 'User', value: data.user, inline: true },
                    { name: 'On', value: data.target, inline: true }
                ],
                timestamp
            };

        case 'fight':
            return {
                title: ' Battle Comparison',
                color: 0xff6b00,
                fields: [
                    { name: 'User', value: data.user || 'Anonymous', inline: true },
                    { name: 'Matchup', value: data.animal1 + ' vs ' + data.animal2, inline: false }
                ],
                timestamp
            };

        case 'signup':
            return {
                title: ' New User Signup',
                color: 0x9966ff,
                fields: [
                    { name: 'Username', value: data.username, inline: true },
                    { name: 'Email', value: data.email ? data.email.replace(/(.{2}).*(@.*)/, '$1***$2') : 'N/A', inline: true }
                ],
                timestamp
            };

        case 'login':
            return {
                title: ' User Login',
                color: 0x00cc66,
                fields: [
                    { name: 'Username', value: data.username, inline: true }
                ],
                timestamp
            };

        case 'site_visit':
            return {
                title: ' Site Visit',
                color: 0x4488ff,
                fields: [
                    { name: 'Visitor', value: data.username || 'Anonymous', inline: true }
                ],
                timestamp
            };

        default:
            return {
                title: ' Site Event',
                color: 0x888888,
                description: JSON.stringify(data),
                timestamp
            };
    }
}

module.exports = { notifyDiscord };
