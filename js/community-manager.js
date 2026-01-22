/**
 * ============================================
 * COMMUNITY PAGE - community.js (Manager)
 * ============================================
 * Handles: Community page, chat, activity feed, daily matchup
 * DOM Container: #community-view
 */

'use strict';

// SECTION: COMMUNITY MANAGER
// ========================================
// Handles: Community page, chat, activity feed, daily matchup
// DOM Container: #community-view
// Enhancements: js/community.js (heartbeat, online users)
// ========================================

/**
 * Community Manager - Handles general chat and comments feed
 */
class CommunityManager {
    constructor(app) {
        this.app = app;
        this.chatMessages = [];
        this.feedComments = [];
        this.feedSkip = 0;
        this.feedHasMore = true;
        this.chatPollingInterval = null;
        this.lastChatTime = null;
        this.currentTab = 'chat';
        
        // Daily Matchup
        this.dailyMatchup = null;
        this.userMatchupVote = null;
        
        // Hub features
        this.presenceInterval = null;
        this.hubRefreshInterval = null;
        this.replyingTo = null; // For chat replies
    }

    init() {
        this.setupEventListeners();
        this.updateLoginState();
        this.loadDailyMatchup();
        this.startMatchupCountdown();
        
        // Load hub data
        this.loadLeaderboard();
        this.loadSiteStats();
        this.loadOnlineCount();
        
        // Listen for auth changes
        window.addEventListener('authChange', () => this.updateLoginState());
        
        // Visibility change for presence tracking
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.sendPresencePing();
            }
        });
    }

    setupEventListeners() {
        // Tab switching - new unified tabs
        document.querySelectorAll('.community-tab-btn').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.currentTarget.dataset.tab));
        });

        // Compose input (new structure)
        const composeInput = document.getElementById('compose-input');
        const composeSendBtn = document.getElementById('compose-send-btn');
        
        if (composeInput) {
            composeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendChatMessage();
                }
            });
        }
        
        if (composeSendBtn) {
            composeSendBtn.addEventListener('click', () => this.sendChatMessage());
        }

        // Cancel reply button
        document.getElementById('compose-cancel-reply')?.addEventListener('click', () => this.cancelReply());

        // Compose login link
        const composeLoginLink = document.getElementById('compose-login-link');
        if (composeLoginLink) {
            composeLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                Auth.showModal('login');
            });
        }

        // Load more button
        const loadMoreBtn = document.getElementById('feed-load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => this.loadMoreFeed());
        }
        
        // Daily Matchup vote buttons
        document.getElementById('matchup-vote-1')?.addEventListener('click', () => this.voteMatchup(1));
        document.getElementById('matchup-vote-2')?.addEventListener('click', () => this.voteMatchup(2));
        
        // Mobile sidebar toggle
        const mobileSidebarToggle = document.getElementById('mobile-sidebar-toggle');
        if (mobileSidebarToggle) {
            mobileSidebarToggle.addEventListener('click', () => this.toggleMobileSidebar());
        }
    }
    
    toggleMobileSidebar() {
        const sidebar = document.querySelector('.community-sidebar-column');
        if (sidebar) {
            sidebar.classList.toggle('mobile-visible');
        }
    }

    // ==================== DAILY MATCHUP ====================
    
    async loadDailyMatchup() {
        // Generate daily matchup based on date (deterministic)
        const animals = this.app?.state?.animals || [];
        if (animals.length < 2) {
            setTimeout(() => this.loadDailyMatchup(), 500);
            return;
        }
        
        // Use date as seed for consistent daily matchup
        const today = new Date().toISOString().split('T')[0];
        const seed = this.hashCode(today);
        const shuffled = [...animals].sort((a, b) => {
            return this.seededRandom(seed + this.hashCode(a.name)) - 
                   this.seededRandom(seed + this.hashCode(b.name));
        });
        
        this.dailyMatchup = {
            fighter1: shuffled[0],
            fighter2: shuffled[1],
            votes1: Math.floor(Math.random() * 50) + 20,
            votes2: Math.floor(Math.random() * 50) + 20
        };
        
        this.renderDailyMatchup();
    }
    
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }
    
    seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }
    
    renderDailyMatchup() {
        if (!this.dailyMatchup) return;
        
        const { fighter1, fighter2, votes1, votes2 } = this.dailyMatchup;
        const total = votes1 + votes2;
        const percent1 = total > 0 ? Math.round((votes1 / total) * 100) : 50;
        const percent2 = 100 - percent1;
        
        // Fighter 1 - new IDs
        const img1 = document.getElementById('matchup-img-1');
        const name1 = document.getElementById('matchup-name-1');
        const bar1 = document.getElementById('matchup-bar-1');
        const pct1 = document.getElementById('matchup-pct-1');
        
        if (img1) {
            img1.src = fighter1.image;
            img1.alt = fighter1.name;
        }
        if (name1) name1.textContent = fighter1.name;
        if (bar1) bar1.style.width = `${percent1}%`;
        if (pct1) pct1.textContent = `${percent1}%`;
        
        // Fighter 2 - new IDs
        const img2 = document.getElementById('matchup-img-2');
        const name2 = document.getElementById('matchup-name-2');
        const bar2 = document.getElementById('matchup-bar-2');
        const pct2 = document.getElementById('matchup-pct-2');
        
        if (img2) {
            img2.src = fighter2.image;
            img2.alt = fighter2.name;
        }
        if (name2) name2.textContent = fighter2.name;
        if (bar2) bar2.style.width = `${percent2}%`;
        if (pct2) pct2.textContent = `${percent2}%`;
        
        // Update vote button states
        this.updateMatchupVoteButtons();
    }
    
    updateMatchupVoteButtons() {
        const btn1 = document.getElementById('matchup-vote-1');
        const btn2 = document.getElementById('matchup-vote-2');
        
        if (!Auth.isLoggedIn()) {
            btn1?.setAttribute('disabled', 'true');
            btn2?.setAttribute('disabled', 'true');
            return;
        }
        
        btn1?.removeAttribute('disabled');
        btn2?.removeAttribute('disabled');
        
        if (this.userMatchupVote === 1) {
            btn1?.classList.add('voted');
            btn2?.classList.remove('voted');
        } else if (this.userMatchupVote === 2) {
            btn1?.classList.remove('voted');
            btn2?.classList.add('voted');
        }
    }
    
    voteMatchup(fighter) {
        if (!Auth.isLoggedIn()) {
            Auth.showToast('Log in to vote!');
            Auth.showModal('login');
            return;
        }
        
        if (this.userMatchupVote === fighter) {
            return; // Already voted for this
        }
        
        this.userMatchupVote = fighter;
        
        // Update vote counts
        if (fighter === 1) {
            this.dailyMatchup.votes1++;
        } else {
            this.dailyMatchup.votes2++;
        }
        
        this.renderDailyMatchup();
        
        // Award XP for daily matchup voting
        this.awardMatchupReward();
        Auth.showToast('Vote recorded!');
    }
    
    async awardMatchupReward() {
        if (!Auth.isLoggedIn()) return;
        
        try {
            const response = await fetch('/api/auth?action=rewards', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.getToken()}`
                },
                body: JSON.stringify({ customXp: 10, customBp: 2 })
            });

            const result = await response.json();

            if (result.success) {
                this.showXpPopup(result.data.xpAdded, result.data.bpAdded);
                
                if (result.data.leveledUp) {
                    this.showLevelUpPopup(result.data.newLevel, result.data.levelUpBpReward || 0);
                }
                
                Auth.refreshUserStats();
            }
        } catch (error) {
            console.error('Error awarding matchup reward:', error);
        }
    }
    
    startMatchupCountdown() {
        const updateCountdown = () => {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            
            const diff = tomorrow - now;
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            const countdown = document.getElementById('matchup-timer');
            if (countdown) {
                countdown.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        };
        
        updateCountdown();
        setInterval(updateCountdown, 1000);
    }
    
    // ==================== HUB LEADERBOARD ====================
    
    async loadLeaderboard() {
        const container = document.getElementById('leaderboard-list');
        if (!container) return;
        
        try {
            const response = await fetch('/api/community?action=leaderboard&limit=10');
            if (!response.ok) throw new Error('Failed to load leaderboard');
            
            const result = await response.json();
            const users = result.data || [];
            
            if (users.length === 0) {
                container.innerHTML = '<div class="module-loading">No users yet</div>';
                return;
            }
            
            container.innerHTML = users.map((user, index) => {
                const rank = index + 1;
                const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : 'default';
                const avatarHtml = this.getHubAvatarHtml(user.profileAnimal, user.displayName?.charAt(0) || '?');
                
                return `
                    <div class="leaderboard-item">
                        <span class="leaderboard-rank ${rankClass}">${rank}</span>
                        <div class="leaderboard-avatar">${avatarHtml}</div>
                        <div class="leaderboard-info">
                            <div class="leaderboard-name">${this.escapeHtml(user.displayName || user.username)}</div>
                            <div class="leaderboard-xp"><i class="fas fa-star"></i> ${this.formatNumber(user.xp || 0)} XP</div>
                        </div>
                    </div>
                `;
            }).join('');
            
        } catch (error) {
            console.error('Error loading leaderboard:', error);
            container.innerHTML = '<div class="module-loading">Failed to load</div>';
        }
    }
    
    getHubAvatarHtml(profileAnimal, fallback) {
        if (profileAnimal && this.app?.state?.animals) {
            const animal = this.app.state.animals.find(a => 
                a.name.toLowerCase() === profileAnimal.toLowerCase()
            );
            if (animal?.image) {
                return `<img src="${animal.image}" alt="${profileAnimal}">`;
            }
        }
        return fallback;
    }
    
    // ==================== HUD SITE STATS ====================
    
    async loadSiteStats() {
        try {
            const response = await fetch('/api/community?action=stats');
            if (!response.ok) throw new Error('Failed to load stats');
            
            const result = await response.json();
            const stats = result.data || {};
            
            // Update HUD stat chips (new IDs)
            const membersEl = document.getElementById('hud-stat-members');
            const votesEl = document.getElementById('hud-stat-votes');
            const commentsEl = document.getElementById('hud-stat-comments');
            const tournamentsEl = document.getElementById('hud-stat-tournaments');
            const matchesEl = document.getElementById('hud-stat-matches');
            const visitsEl = document.getElementById('hud-total-visits');
            
            if (membersEl) membersEl.textContent = this.formatNumber(stats.totalUsers || 0);
            if (votesEl) votesEl.textContent = this.formatNumber(stats.totalVotes || 0);
            if (commentsEl) commentsEl.textContent = this.formatNumber(stats.totalComments || 0);
            if (tournamentsEl) tournamentsEl.textContent = this.formatNumber(stats.totalTournaments || 0);
            if (matchesEl) matchesEl.textContent = this.formatNumber(stats.totalMatches || 0);
            if (visitsEl) visitsEl.textContent = this.formatNumber(stats.totalVisits || 0);
            
        } catch (error) {
            console.error('Error loading site stats:', error);
        }
    }
    
    // ==================== HUD ONLINE COUNT ====================
    
    async loadOnlineCount() {
        const countEl = document.getElementById('hud-online-count');
        if (!countEl) return;
        
        try {
            const response = await fetch('/api/community?action=presence');
            if (!response.ok) throw new Error('Failed to load presence');
            
            const result = await response.json();
            const users = result.data || [];
            
            countEl.textContent = users.length;
            
        } catch (error) {
            console.error('Error loading online count:', error);
            countEl.textContent = '0';
        }
    }
    
    // Send presence ping
    async sendPresencePing() {
        if (!Auth.isLoggedIn()) return;
        
        try {
            await fetch('/api/community?action=ping', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.getToken()}`
                }
            });
        } catch (error) {
            // Silent fail for presence
        }
    }
    
    startPresencePing() {
        this.stopPresencePing();
        
        // Send initial ping
        this.sendPresencePing();
        
        // Ping every 25 seconds
        this.presenceInterval = setInterval(() => this.sendPresencePing(), 25000);
        
        // Refresh online count every 30 seconds
        this.hubRefreshInterval = setInterval(() => {
            this.loadOnlineCount();
        }, 30000);
    }
    
    stopPresencePing() {
        if (this.presenceInterval) {
            clearInterval(this.presenceInterval);
            this.presenceInterval = null;
        }
        if (this.hubRefreshInterval) {
            clearInterval(this.hubRefreshInterval);
            this.hubRefreshInterval = null;
        }
    }
    
    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }
    
    showXpPopup(xp, bp) {
        const popup = document.createElement('div');
        popup.className = 'xp-popup';
        popup.innerHTML = `<i class="fas fa-star"></i> +${xp} XP, +${bp} BP`;
        document.body.appendChild(popup);
        
        setTimeout(() => popup.remove(), 2000);
    }
    
    showLevelUpPopup(newLevel, bpReward = 0) {
        const popup = document.createElement('div');
        popup.className = 'level-up-popup';
        popup.innerHTML = `
            <div class="level-up-content">
                <i class="fas fa-crown"></i>
                <h3>LEVEL UP!</h3>
                <div class="new-level">Level ${newLevel}</div>
                ${bpReward > 0 ? `<div class="bp-reward">+${bpReward} BP Bonus!</div>` : ''}
            </div>
        `;
        document.body.appendChild(popup);
        
        setTimeout(() => popup.remove(), 3000);
    }

    updateLoginState() {
        const isLoggedIn = Auth.isLoggedIn();
        const composeLoginPrompt = document.getElementById('compose-login-prompt');
        const composeInputRow = document.querySelector('.compose-input-row');
        const composeAvatar = document.getElementById('compose-avatar');
        
        if (composeLoginPrompt) composeLoginPrompt.style.display = isLoggedIn ? 'none' : 'flex';
        if (composeInputRow) composeInputRow.style.display = isLoggedIn ? 'flex' : 'none';
        
        // Update avatar if logged in
        if (isLoggedIn && composeAvatar && Auth.user) {
            composeAvatar.textContent = Auth.user.displayName?.charAt(0)?.toUpperCase() || Auth.user.username?.charAt(0)?.toUpperCase() || '?';
        }
        
        // Show/hide compose box based on current tab
        const composeBox = document.getElementById('feed-compose-box');
        if (composeBox) {
            composeBox.style.display = this.currentTab === 'chat' ? 'block' : 'none';
        }
    }

    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Update tab buttons (new unified tabs)
        document.querySelectorAll('.community-tab-btn').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        // Show/hide compose box (only for chat)
        const composeBox = document.getElementById('feed-compose-box');
        if (composeBox) {
            composeBox.style.display = tabName === 'chat' ? 'block' : 'none';
        }
        
        // Load content for the tab
        if (tabName === 'chat') {
            this.loadChat();
            this.startChatPolling();
        } else {
            this.stopChatPolling();
            this.loadFeed();
        }
    }

    onViewEnter() {
        // Called when entering community view
        this.updateLoginState();
        this.startPresencePing();
        
        // Refresh hub data
        this.loadLeaderboard();
        this.loadSiteStats();
        this.loadOnlineCount();
        
        if (this.currentTab === 'chat') {
            this.loadChat();
            this.startChatPolling();
        } else {
            this.loadFeed();
        }
    }

    onViewLeave() {
        this.stopChatPolling();
        this.stopPresencePing();
    }

    // ==================== CHAT ====================

    async loadChat() {
        const container = document.getElementById('feed-posts-container');
        if (!container) return;

        // Show skeleton loading state
        container.innerHTML = this.renderSkeletonCards(3);

        try {
            const response = await fetch('/api/chat?limit=50');
            if (!response.ok) throw new Error('Failed to load chat');
            
            const result = await response.json();
            this.chatMessages = result.data || [];
            
            // Track newest message time for polling (first message is now newest)
            if (this.chatMessages.length > 0) {
                this.lastChatTime = this.chatMessages[0].createdAt;
            }
            
            this.renderChat();
            
        } catch (error) {
            console.error('Error loading chat:', error);
            container.innerHTML = `
                <div class="feed-empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>FAILED TO LOAD CHAT</h3>
                    <p>Please check your connection and try again.</p>
                </div>
            `;
        }
    }

    renderSkeletonCards(count = 3) {
        return Array(count).fill('').map(() => `
            <div class="feed-skeleton-card">
                <div class="feed-skeleton-header">
                    <div class="feed-skeleton-avatar"></div>
                    <div class="feed-skeleton-meta">
                        <div class="feed-skeleton-name"></div>
                        <div class="feed-skeleton-time"></div>
                    </div>
                </div>
                <div class="feed-skeleton-content"></div>
                <div class="feed-skeleton-actions">
                    <div class="feed-skeleton-action"></div>
                    <div class="feed-skeleton-action"></div>
                    <div class="feed-skeleton-action"></div>
                </div>
            </div>
        `).join('');
    }

    renderChat() {
        const container = document.getElementById('feed-posts-container');
        if (!container) return;

        if (this.chatMessages.length === 0) {
            container.innerHTML = `
                <div class="feed-empty-state">
                    <i class="fas fa-comments"></i>
                    <h3>NO MESSAGES YET</h3>
                    <p>Be the first to say hello to the community!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.chatMessages.map(msg => this.renderFeedPostCard(msg, 'chat')).join('');
        
        // Add event listeners for post actions
        this.setupPostActionListeners(container);
    }
    
    setupPostActionListeners(container) {
        // Reply buttons
        container.querySelectorAll('.feed-action-btn.reply-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const msgId = e.currentTarget.dataset.msgId;
                const username = e.currentTarget.dataset.username;
                this.startReply(msgId, username);
            });
        });
        
        // Vote buttons
        container.querySelectorAll('.feed-action-btn.vote-up').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const msgId = e.currentTarget.dataset.msgId;
                this.voteChatMessage(msgId, 'up');
            });
        });
        
        container.querySelectorAll('.feed-action-btn.vote-down').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const msgId = e.currentTarget.dataset.msgId;
                this.voteChatMessage(msgId, 'down');
            });
        });
        
        // Delete buttons
        container.querySelectorAll('.feed-action-btn.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const msgId = e.currentTarget.dataset.msgId;
                this.deleteChatMessage(msgId);
            });
        });
        
        // Animal context clicks
        container.querySelectorAll('.feed-animal-context').forEach(el => {
            el.addEventListener('click', (e) => {
                const animalName = e.currentTarget.dataset.animal;
                if (animalName && this.app) {
                    this.app.selectAnimalByName(animalName);
                }
            });
        });
        
        // Clickable avatars and author names (navigate to profile)
        container.querySelectorAll('.clickable-avatar, .clickable-author').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const username = e.currentTarget.dataset.username;
                if (username && window.app?.goToUserProfile) {
                    window.app.goToUserProfile(username);
                }
            });
        });
    }
    
    // Unified post card renderer for both chat and comments
    renderFeedPostCard(item, type = 'chat') {
        const isChat = type === 'chat';
        const username = item.authorUsername || item.author?.username || 'Anonymous';
        const authorUsername = item.author?.username || item.authorUsername || null;
        const initial = username.charAt(0).toUpperCase();
        const time = this.formatTime(item.createdAt);
        const profileAnimal = item.author?.profileAnimal || item.profileAnimal;
        const avatarHtml = this.getUserAvatarHtml(profileAnimal, initial);
        const authorId = item.authorId || item.author?._id;
        
        // Clickable author
        const isClickable = authorUsername && username !== 'Anonymous';
        const avatarClass = isClickable ? 'feed-post-avatar clickable-avatar' : 'feed-post-avatar';
        const usernameClass = isClickable ? 'feed-post-username clickable-author' : 'feed-post-username';
        const usernameAttr = isClickable ? `data-username="${authorUsername}"` : '';
        
        // Score calculation
        const score = item.score || 0;
        const scoreClass = score > 0 ? 'positive' : score < 0 ? 'negative' : '';
        
        // Check if user has voted
        const userId = Auth.user?.id;
        const hasUpvoted = userId && item.upvotes?.some(id => id.toString() === userId);
        const hasDownvoted = userId && item.downvotes?.some(id => id.toString() === userId);
        
        // Can delete if owner or admin
        const isOwner = userId && authorId === userId;
        const isAdmin = Auth.user?.role === 'admin' || Auth.user?.role === 'moderator';
        const canDelete = isOwner || isAdmin;
        
        // Animal context for comments
        let animalContextHtml = '';
        if (!isChat && item.animal) {
            const animal = this.app?.state?.animals?.find(a => a.name.toLowerCase() === item.animal.toLowerCase());
            const animalImg = animal?.image || '';
            animalContextHtml = `
                <div class="feed-animal-context" data-animal="${this.escapeHtml(item.animal)}">
                    <img src="${animalImg}" alt="${this.escapeHtml(item.animal)}">
                    <span>on ${this.escapeHtml(item.animal)}</span>
                </div>
            `;
        }
        
        // Reply context
        let replyContextHtml = '';
        if (item.parentId && item.parentContent) {
            replyContextHtml = `
                <div class="feed-reply-context">
                    <div class="feed-reply-context-author">â†³ Replying to ${this.escapeHtml(item.parentUsername || 'someone')}</div>
                    <div class="feed-reply-context-text">${this.escapeHtml(item.parentContent.substring(0, 100))}${item.parentContent.length > 100 ? '...' : ''}</div>
                </div>
            `;
        }
        
        const hasAnimalContext = !isChat && item.animal;
        
        // Render nested replies for chat messages (Reddit-style threading)
        let repliesHtml = '';
        if (isChat && item.replies && item.replies.length > 0) {
            repliesHtml = `
                <div class="thread-replies">
                    ${item.replies.map(reply => this.renderThreadReply(reply)).join('')}
                </div>
            `;
        }
        
        // Reply count for display
        const replyCount = item.replies?.length || 0;
        const hasReplies = replyCount > 0;
        
        return `
            <div class="feed-post-card thread-comment ${hasAnimalContext ? 'has-animal-context' : ''} ${hasReplies ? 'has-replies' : ''}" data-id="${item._id}">
                <div class="thread-content">
                    <div class="feed-post-header">
                        <div class="${avatarClass}" ${usernameAttr}>${avatarHtml}</div>
                        <div class="feed-post-meta">
                            <div class="feed-post-author">
                                <span class="${usernameClass}" ${usernameAttr}>${this.escapeHtml(username)}</span>
                                ${item.author?.role === 'admin' ? '<span class="feed-post-badge admin">Admin</span>' : ''}
                                ${item.author?.role === 'moderator' ? '<span class="feed-post-badge mod">Mod</span>' : ''}
                            </div>
                            <span class="feed-post-dot">•</span>
                            <div class="feed-post-time">${time}</div>
                        </div>
                    </div>
                    ${replyContextHtml}
                    <div class="feed-post-content">${this.escapeHtml(item.content)}</div>
                    <div class="feed-post-actions">
                        <button class="feed-action-btn vote-up ${hasUpvoted ? 'voted' : ''}" data-msg-id="${item._id}" title="Upvote">
                            <span class="vote-icon"><svg viewBox="0 0 3000 3000" fill="currentColor"><path d="m1500 233l-1267 1364 377-97 106.15-167.32 103.54 189.82 396.91-22.5 43.14-301.06 90.6 204.06 52.66 97-16.31 97-27.01 248.64-69.05 167.36-56.03 754h542.33l-57.64-754-74.55-173.01-32.94-242.99-14.8-97 51.02-97 43.14-182.49 60.4 279.49 399.76 26.47 79.11-154.97 159.57 128.5 194 97h272z"/></svg></span>
                        </button>
                        <span class="feed-action-score ${scoreClass}">${score}</span>
                        <button class="feed-action-btn vote-down ${hasDownvoted ? 'voted' : ''}" data-msg-id="${item._id}" title="Downvote">
                            <span class="vote-icon"><svg viewBox="0 0 3000 3000" fill="currentColor"><path d="m1500 233l-1267 1364 377-97 106.15-167.32 103.54 189.82 396.91-22.5 43.14-301.06 90.6 204.06 52.66 97-16.31 97-27.01 248.64-69.05 167.36-56.03 754h542.33l-57.64-754-74.55-173.01-32.94-242.99-14.8-97 51.02-97 43.14-182.49 60.4 279.49 399.76 26.47 79.11-154.97 159.57 128.5 194 97h272z"/></svg></span>
                        </button>
                        ${isChat ? `
                            <button class="feed-action-btn reply-btn" data-msg-id="${item._id}" data-username="${this.escapeHtml(username)}" title="Reply">
                                <i class="fas fa-reply"></i> Reply${replyCount > 0 ? ` (${replyCount})` : ''}
                            </button>
                        ` : ''}
                        ${canDelete ? `
                            <button class="feed-action-btn delete-btn" data-msg-id="${item._id}" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                    ${repliesHtml}
                </div>
            </div>
        `;
    }
    
    // Render a threaded reply (Reddit-style)
    renderThreadReply(reply) {
        const username = reply.authorUsername || reply.author?.username || 'Anonymous';
        const authorUsername = reply.author?.username || reply.authorUsername || null;
        const initial = username.charAt(0).toUpperCase();
        const time = this.formatTime(reply.createdAt);
        const profileAnimal = reply.author?.profileAnimal || reply.profileAnimal;
        const avatarHtml = this.getUserAvatarHtml(profileAnimal, initial);
        
        // Clickable author
        const isClickable = authorUsername && username !== 'Anonymous';
        const avatarClass = isClickable ? 'thread-reply-avatar clickable-avatar' : 'thread-reply-avatar';
        const usernameClass = isClickable ? 'thread-reply-username clickable-author' : 'thread-reply-username';
        const usernameAttr = isClickable ? `data-username="${authorUsername}"` : '';
        
        // Score calculation
        const score = reply.score || 0;
        const scoreClass = score > 0 ? 'positive' : score < 0 ? 'negative' : '';
        
        // Check if user has voted
        const userId = Auth.user?.id;
        const hasUpvoted = userId && reply.upvotes?.some(id => id.toString() === userId);
        const hasDownvoted = userId && reply.downvotes?.some(id => id.toString() === userId);
        
        // Can delete if owner or admin
        const authorId = reply.authorId || reply.author?._id;
        const isOwner = userId && authorId === userId;
        const isAdmin = Auth.user?.role === 'admin' || Auth.user?.role === 'moderator';
        const canDelete = isOwner || isAdmin;
        
        // Nested replies (if any)
        let nestedRepliesHtml = '';
        if (reply.replies && reply.replies.length > 0) {
            nestedRepliesHtml = `
                <div class="thread-replies">
                    ${reply.replies.map(r => this.renderThreadReply(r)).join('')}
                </div>
            `;
        }
        
        return `
            <div class="thread-reply" data-id="${reply._id}">
                <div class="thread-line"></div>
                <div class="thread-content">
                    <div class="thread-reply-header">
                        <div class="${avatarClass}" ${usernameAttr}>${avatarHtml}</div>
                        <span class="${usernameClass}" ${usernameAttr}>${this.escapeHtml(username)}</span>
                        ${reply.author?.role === 'admin' ? '<span class="feed-post-badge admin">Admin</span>' : ''}
                        ${reply.author?.role === 'moderator' ? '<span class="feed-post-badge mod">Mod</span>' : ''}
                        <span class="thread-reply-dot">•</span>
                        <span class="thread-reply-time">${time}</span>
                    </div>
                    <div class="thread-reply-content">${this.escapeHtml(reply.content)}</div>
                    <div class="thread-reply-actions">
                        <button class="feed-action-btn vote-up ${hasUpvoted ? 'voted' : ''}" data-msg-id="${reply._id}" title="Upvote">
                            <span class="vote-icon"><svg viewBox="0 0 3000 3000" fill="currentColor"><path d="m1500 233l-1267 1364 377-97 106.15-167.32 103.54 189.82 396.91-22.5 43.14-301.06 90.6 204.06 52.66 97-16.31 97-27.01 248.64-69.05 167.36-56.03 754h542.33l-57.64-754-74.55-173.01-32.94-242.99-14.8-97 51.02-97 43.14-182.49 60.4 279.49 399.76 26.47 79.11-154.97 159.57 128.5 194 97h272z"/></svg></span>
                        </button>
                        <span class="feed-action-score ${scoreClass}">${score}</span>
                        <button class="feed-action-btn vote-down ${hasDownvoted ? 'voted' : ''}" data-msg-id="${reply._id}" title="Downvote">
                            <span class="vote-icon"><svg viewBox="0 0 3000 3000" fill="currentColor"><path d="m1500 233l-1267 1364 377-97 106.15-167.32 103.54 189.82 396.91-22.5 43.14-301.06 90.6 204.06 52.66 97-16.31 97-27.01 248.64-69.05 167.36-56.03 754h542.33l-57.64-754-74.55-173.01-32.94-242.99-14.8-97 51.02-97 43.14-182.49 60.4 279.49 399.76 26.47 79.11-154.97 159.57 128.5 194 97h272z"/></svg></span>
                        </button>
                        <button class="feed-action-btn reply-btn" data-msg-id="${reply._id}" data-username="${this.escapeHtml(username)}" title="Reply">
                            <i class="fas fa-reply"></i> Reply
                        </button>
                        ${canDelete ? `
                            <button class="feed-action-btn delete-btn" data-msg-id="${reply._id}" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                    ${nestedRepliesHtml}
                </div>
            </div>
        `;
    }
    
    startReply(messageId, username) {
        if (!Auth.isLoggedIn()) {
            Auth.showToast('Please log in to reply');
            Auth.showModal('login');
            return;
        }
        
        this.replyingTo = messageId;
        
        const replyPreview = document.getElementById('compose-reply-preview');
        const replyUsername = document.getElementById('compose-reply-username');
        
        if (replyPreview && replyUsername) {
            replyUsername.textContent = username;
            replyPreview.style.display = 'flex';
        }
        
        document.getElementById('compose-input')?.focus();
    }
    
    cancelReply() {
        this.replyingTo = null;
        
        const replyPreview = document.getElementById('compose-reply-preview');
        if (replyPreview) {
            replyPreview.style.display = 'none';
        }
    }
    
    async voteChatMessage(messageId, voteType) {
        if (!Auth.isLoggedIn()) {
            Auth.showToast('Please log in to vote');
            Auth.showModal('login');
            return;
        }
        
        try {
            const response = await fetch('/api/chat', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.getToken()}`
                },
                body: JSON.stringify({ messageId, voteType })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to vote');
            }
            
            // Reload chat to reflect new vote
            await this.loadChat();
            
        } catch (error) {
            console.error('Vote error:', error);
            Auth.showToast(error.message || 'Failed to vote');
        }
    }
    
    async deleteChatMessage(messageId) {
        if (!confirm('Delete this message?')) return;
        
        try {
            const response = await fetch(`/api/chat?messageId=${messageId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${Auth.getToken()}`
                }
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete');
            }
            
            // Remove from local array and re-render
            this.chatMessages = this.chatMessages.filter(m => m._id !== messageId);
            this.renderChat();
            Auth.showToast('Message deleted');
            
        } catch (error) {
            console.error('Delete error:', error);
            Auth.showToast(error.message || 'Failed to delete');
        }
    }

    async sendChatMessage() {
        const input = document.getElementById('compose-input');
        if (!input) return;

        const content = input.value.trim();
        if (!content) return;

        const token = Auth.getToken();
        if (!token) {
            Auth.showToast('Please log in to send messages');
            return;
        }

        try {
            const body = { content };
            
            // Include parentId if replying
            if (this.replyingTo) {
                body.parentId = this.replyingTo;
            }
            
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to send message');
            }

            // Clear input and cancel reply
            input.value = '';
            this.cancelReply();
            
            // Reload chat to show new message
            await this.loadChat();

        } catch (error) {
            console.error('Error sending message:', error);
            Auth.showToast(error.message || 'Failed to send message');
        }
    }

    startChatPolling() {
        this.stopChatPolling(); // Clear any existing
        
        // Poll for new messages every 5 seconds
        this.chatPollingInterval = setInterval(() => this.pollNewMessages(), 5000);
    }

    stopChatPolling() {
        if (this.chatPollingInterval) {
            clearInterval(this.chatPollingInterval);
            this.chatPollingInterval = null;
        }
    }

    async pollNewMessages() {
        if (this.currentTab !== 'chat') return;
        
        try {
            const response = await fetch('/api/chat?limit=20');
            if (!response.ok) return;
            
            const result = await response.json();
            const newMessages = result.data || [];
            
            // Check for new messages (newer messages are at start of array now)
            if (newMessages.length > 0) {
                const existingIds = new Set(this.chatMessages.map(m => m._id));
                const trulyNew = newMessages.filter(m => !existingIds.has(m._id));
                
                if (trulyNew.length > 0) {
                    // Add new messages at the beginning (newest first)
                    this.chatMessages.unshift(...trulyNew);
                    this.renderChat();
                }
            }
        } catch (error) {
            console.error('Error polling messages:', error);
        }
    }

    // ==================== FEED (All Comments) ====================

    async loadFeed(reset = true) {
        if (reset) {
            this.feedSkip = 0;
            this.feedComments = [];
            this.feedHasMore = true;
        }

        const container = document.getElementById('feed-posts-container');
        const loadMoreBtn = document.getElementById('feed-load-more-btn');
        if (!container) return;

        if (reset) {
            container.innerHTML = this.renderSkeletonCards(3);
        }

        try {
            const response = await fetch(`/api/chat?feed=true&limit=20&skip=${this.feedSkip}`);
            if (!response.ok) throw new Error('Failed to load feed');
            
            const result = await response.json();
            const newComments = result.data || [];
            
            this.feedComments.push(...newComments);
            this.feedHasMore = result.hasMore;
            this.feedSkip += newComments.length;
            
            this.renderFeed();
            
            if (loadMoreBtn) {
                loadMoreBtn.style.display = this.feedHasMore ? 'flex' : 'none';
            }

        } catch (error) {
            console.error('Error loading feed:', error);
            container.innerHTML = `
                <div class="feed-empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>FAILED TO LOAD COMMENTS</h3>
                    <p>Please check your connection and try again.</p>
                </div>
            `;
        }
    }

    loadMoreFeed() {
        this.loadFeed(false);
    }

    renderFeed() {
        const container = document.getElementById('feed-posts-container');
        if (!container) return;

        if (this.feedComments.length === 0) {
            container.innerHTML = `
                <div class="feed-empty-state">
                    <i class="fas fa-comments"></i>
                    <h3>NO COMMENTS YET</h3>
                    <p>Be the first to comment on an animal!</p>
                </div>
            `;
            return;
        }

        // Use the ORIGINAL feed item format (with animal header, not unified cards)
        container.innerHTML = this.feedComments.map(comment => this.renderFeedItem(comment)).join('');
        
        // Add click handlers for animal names
        container.querySelectorAll('.feed-animal-name').forEach(el => {
            el.addEventListener('click', (e) => {
                const animalName = e.target.dataset.animal;
                if (animalName && this.app) {
                    this.app.selectAnimalByName(animalName);
                }
            });
        });

        // Add click handlers for view comment button
        container.querySelectorAll('.feed-view-btn').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const animalName = e.currentTarget.dataset.animal;
                const animalId = e.currentTarget.dataset.animalId;
                const animalImage = e.currentTarget.dataset.animalImage;
                this.openAnimalComments(animalName, animalId, animalImage);
            });
        });

        // Add click handlers for upvote
        container.querySelectorAll('.feed-upvote-btn').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const commentId = e.currentTarget.dataset.commentId;
                this.voteComment(commentId, 'up');
            });
        });

        // Add click handlers for downvote
        container.querySelectorAll('.feed-downvote-btn').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const commentId = e.currentTarget.dataset.commentId;
                this.voteComment(commentId, 'down');
            });
        });

        // Add click handlers for reply
        container.querySelectorAll('.feed-reply-btn').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const commentId = e.currentTarget.dataset.commentId;
                const animalName = e.currentTarget.dataset.animal;
                const animalId = e.currentTarget.dataset.animalId;
                const animalImage = e.currentTarget.dataset.animalImage;
                this.openAnimalComments(animalName, animalId, animalImage, commentId);
            });
        });
        
        // Add click handlers for clickable avatars and author names
        container.querySelectorAll('.clickable-avatar, .clickable-author').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const username = e.currentTarget.dataset.username;
                if (username && window.app?.goToUserProfile) {
                    window.app.goToUserProfile(username);
                }
            });
        });
    }

    renderFeedItem(comment) {
        const initial = comment.isAnonymous ? '?' : (comment.authorUsername?.charAt(0).toUpperCase() || '?');
        const authorName = comment.isAnonymous ? 'Anonymous' : comment.authorUsername;
        const authorUsername = comment.author?.username || comment.authorUsername || null;
        const time = this.formatTime(comment.createdAt);
        const animalImage = comment.animalImage || FALLBACK_IMAGE;
        const animalId = comment.animalId || '';
        
        // Profile animal for avatar
        const profileAnimal = comment.author?.profileAnimal || comment.profileAnimal;
        const avatarHtml = this.getUserAvatarHtml(profileAnimal, initial, comment.isAnonymous);
        const authorId = comment.authorId || comment.author?._id;
        const userIdAttr = authorId ? `data-user-id="${authorId}"` : '';
        
        // Clickable author (if not anonymous)
        const isClickable = !comment.isAnonymous && authorUsername;
        const avatarClass = isClickable ? 'feed-comment-avatar clickable-avatar' : 'feed-comment-avatar';
        const nameClass = isClickable ? 'feed-comment-author-name clickable-author' : 'feed-comment-author-name';
        const usernameAttr = isClickable ? `data-username="${authorUsername}"` : '';
        
        // Score display
        const score = comment.score || 0;
        const scoreClass = score > 0 ? 'positive' : (score < 0 ? 'negative' : '');
        
        // Check if user has voted
        const userId = Auth.user?.id;
        const hasUpvoted = userId && comment.upvotes?.includes(userId);
        const hasDownvoted = userId && comment.downvotes?.includes(userId);
        
        // Render replies (show first 2, with option to see more)
        let repliesHtml = '';
        if (comment.replies && comment.replies.length > 0) {
            const displayReplies = comment.replies.slice(0, 2);
            repliesHtml = `
                <div class="feed-replies">
                    ${displayReplies.map(reply => this.renderFeedReply(reply)).join('')}
                    ${comment.replies.length > 2 ? `
                        <div class="feed-more-replies feed-view-btn" data-animal="${this.escapeHtml(comment.animalName)}" data-animal-id="${animalId}" data-animal-image="${animalImage}">
                            <i class="fas fa-comments"></i> View all ${comment.replies.length} replies
                        </div>
                    ` : ''}
                </div>
            `;
        }

        return `
            <div class="feed-item" data-id="${comment._id}">
                <div class="feed-item-header">
                    <img src="${animalImage}" alt="${comment.animalName}" class="feed-animal-image" onerror="this.onerror=null;this.src=FALLBACK_IMAGE">
                    <div class="feed-animal-info">
                        <div class="feed-animal-name" data-animal="${this.escapeHtml(comment.animalName)}">${this.escapeHtml(comment.animalName)}</div>
                        <div class="feed-comment-type">${comment.targetType === 'comparison' ? 'Comparison' : 'Animal Discussion'}</div>
                    </div>
                    <button class="feed-view-btn" data-animal="${this.escapeHtml(comment.animalName)}" data-animal-id="${animalId}" data-animal-image="${animalImage}" title="View in animal comments">
                        <i class="fas fa-external-link-alt"></i>
                    </button>
                </div>
                <div class="feed-comment-main" ${userIdAttr}>
                    <div class="${avatarClass}" ${usernameAttr}>${avatarHtml}</div>
                    <div class="feed-comment-body">
                        <div class="feed-comment-author">
                            <span class="${nameClass}" ${usernameAttr}>${this.escapeHtml(authorName)}</span>
                            <span class="feed-comment-time">${time}</span>
                        </div>
                        <div class="feed-comment-content">${this.escapeHtml(comment.content)}</div>
                        <div class="feed-comment-actions">
                            <button class="feed-upvote-btn ${hasUpvoted ? 'active' : ''}" data-comment-id="${comment._id}" title="Upvote">
                                <span class="vote-icon"><svg viewBox="0 0 3000 3000" fill="currentColor"><path d="m1500 233l-1267 1364 377-97 106.15-167.32 103.54 189.82 396.91-22.5 43.14-301.06 90.6 204.06 52.66 97-16.31 97-27.01 248.64-69.05 167.36-56.03 754h542.33l-57.64-754-74.55-173.01-32.94-242.99-14.8-97 51.02-97 43.14-182.49 60.4 279.49 399.76 26.47 79.11-154.97 159.57 128.5 194 97h272z"/></svg></span>
                            </button>
                            <span class="feed-vote-score ${scoreClass}">${score}</span>
                            <button class="feed-downvote-btn ${hasDownvoted ? 'active' : ''}" data-comment-id="${comment._id}" title="Downvote">
                                <span class="vote-icon"><svg viewBox="0 0 3000 3000" fill="currentColor"><path d="m1500 233l-1267 1364 377-97 106.15-167.32 103.54 189.82 396.91-22.5 43.14-301.06 90.6 204.06 52.66 97-16.31 97-27.01 248.64-69.05 167.36-56.03 754h542.33l-57.64-754-74.55-173.01-32.94-242.99-14.8-97 51.02-97 43.14-182.49 60.4 279.49 399.76 26.47 79.11-154.97 159.57 128.5 194 97h272z"/></svg></span>
                            </button>
                            <button class="feed-reply-btn" data-comment-id="${comment._id}" data-animal="${this.escapeHtml(comment.animalName)}" data-animal-id="${animalId}" data-animal-image="${animalImage}" title="Reply">
                                <i class="fas fa-reply"></i> ${comment.replyCount || 0}
                            </button>
                        </div>
                    </div>
                </div>
                ${repliesHtml}
            </div>
        `;
    }

    renderFeedReply(reply) {
        const initial = reply.isAnonymous ? '?' : (reply.authorUsername?.charAt(0).toUpperCase() || '?');
        const authorName = reply.isAnonymous ? 'Anonymous' : reply.authorUsername;
        const authorUsername = reply.author?.username || reply.authorUsername || null;
        const time = this.formatTime(reply.createdAt);
        
        // Profile animal for avatar
        const profileAnimal = reply.author?.profileAnimal || reply.profileAnimal;
        const avatarHtml = this.getUserAvatarHtml(profileAnimal, initial, reply.isAnonymous);
        const authorId = reply.authorId || reply.author?._id;
        const userIdAttr = authorId ? `data-user-id="${authorId}"` : '';
        
        // Clickable author (if not anonymous)
        const isClickable = !reply.isAnonymous && authorUsername;
        const avatarClass = isClickable ? 'feed-reply-avatar clickable-avatar' : 'feed-reply-avatar';
        const nameClass = isClickable ? 'feed-reply-author clickable-author' : 'feed-reply-author';
        const usernameAttr = isClickable ? `data-username="${authorUsername}"` : '';
        
        return `
            <div class="feed-reply" ${userIdAttr}>
                <div class="feed-reply-header">
                    <div class="${avatarClass}" ${usernameAttr}>${avatarHtml}</div>
                    <span class="${nameClass}" ${usernameAttr}>${this.escapeHtml(authorName)}</span>
                    <span class="feed-reply-time">${time}</span>
                </div>
                <div class="feed-reply-content">${this.escapeHtml(reply.content)}</div>
            </div>
        `;
    }

    /**
     * Get avatar HTML for user (shared helper, uses app instance)
     */
    getUserAvatarHtml(profileAnimal, fallbackInitial, isAnonymous = false) {
        if (isAnonymous) {
            return '<i class="fas fa-mask"></i>';
        }

        if (profileAnimal && this.app?.state?.animals) {
            const animal = this.app.state.animals.find(a => 
                a.name.toLowerCase() === profileAnimal.toLowerCase()
            );
            if (animal?.image) {
                return `<img src="${animal.image}" alt="${profileAnimal}" class="user-avatar-img" onerror="this.parentElement.innerHTML='${fallbackInitial}'">`;
            }
        }

        return fallbackInitial;
    }

    goToAnimal(animalName) {
        // Switch to stats view and select the animal
        const animal = this.app.state.animals.find(a => a.name.toLowerCase() === animalName.toLowerCase());
        if (animal) {
            this.app.switchView('stats');
            this.app.selectAnimal(animal);
        }
    }

    // Open the animal's comments modal
    openAnimalComments(animalName, animalId, animalImage, focusReplyTo = null) {
        if (window.rankingsManager) {
            const fakeEvent = {
                currentTarget: {
                    dataset: {
                        animalId: animalId,
                        animalName: animalName,
                        animalImage: animalImage
                    }
                }
            };
            window.rankingsManager.openCommentsModal(fakeEvent);
            
            // If replying to a specific comment, scroll to it after modal opens
            if (focusReplyTo) {
                setTimeout(() => {
                    const replyBtn = document.querySelector(`.comment-item[data-id="${focusReplyTo}"] .reply-btn`);
                    if (replyBtn) {
                        replyBtn.click();
                    }
                }, 500);
            }
        }
    }

    // Vote on a comment from the feed
    async voteComment(commentId, voteType) {
        if (!Auth.isLoggedIn()) {
            Auth.showToast('Please log in to vote');
            Auth.showModal('login');
            return;
        }

        const token = Auth.getToken();
        const action = voteType === 'up' ? 'upvote' : 'downvote';
        
        try {
            const response = await fetch(`/api/comments?id=${commentId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ action })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to vote');
            }

            const result = await response.json();
            
            // Update the comment in our local data
            const comment = this.feedComments.find(c => c._id === commentId);
            if (comment && result.success) {
                // API returns score directly, not arrays
                comment.score = result.score;
                // Update user vote state for UI
                const userId = Auth.user?.id;
                if (result.userVote === 'up') {
                    comment.upvotes = [userId];
                    comment.downvotes = [];
                } else if (result.userVote === 'down') {
                    comment.upvotes = [];
                    comment.downvotes = [userId];
                } else {
                    comment.upvotes = [];
                    comment.downvotes = [];
                }
            }
            
            // Re-render the feed
            this.renderFeed();
            
        } catch (error) {
            console.error('Vote error:', error);
            Auth.showToast(error.message || 'Failed to vote');
        }
    }

    // ==================== HELPERS ====================

    formatTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        
        return date.toLocaleDateString();
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

