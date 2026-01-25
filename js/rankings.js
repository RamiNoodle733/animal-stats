/**
 * ============================================
 * RANKINGS PAGE - rankings.js
 * ============================================
 * Handles: Power Rankings page, voting, comments
 * DOM Container: #rankings-view
 */

'use strict';

// SECTION: RANKINGS MANAGER
// ========================================
// Handles: Power Rankings page, voting, comments
// DOM Container: #rankings-view
// ========================================

/**
 * Rankings Module
 * Handles Power Rankings voting and comments
 */
class RankingsManager {
    constructor(app) {
        this.app = app;
        this.rankings = [];
        this.userVotes = {};
        this.currentAnimal = null;
        this.selectedRankIndex = -1;
        this.comments = [];
        
        // DOM Elements
        this.dom = {
            rankingsList: document.getElementById('rankings-list'),
            rankingsSearch: document.getElementById('rankings-search'),
            loginPrompt: document.getElementById('rankings-login-prompt'),
            
            // Detail Panel Elements (use rankings- prefix to avoid ID conflicts with stats page)
            detailPanel: document.getElementById('rankings-detail-panel'),
            detailEmpty: document.getElementById('detail-panel-empty'),
            detailContent: document.getElementById('detail-panel-content'),
            detailRankBadge: document.getElementById('rankings-detail-rank'),
            detailAnimalName: document.getElementById('rankings-detail-name'),
            detailScientific: document.getElementById('rankings-detail-scientific'),
            detailGradeBadge: document.getElementById('rankings-detail-grade'),
            detailPortrait: document.getElementById('rankings-detail-portrait'),
            detailAtkBar: document.getElementById('detail-atk-bar'),
            detailDefBar: document.getElementById('detail-def-bar'),
            detailAgiBar: document.getElementById('detail-agi-bar'),
            detailStaBar: document.getElementById('detail-sta-bar'),
            detailIntBar: document.getElementById('detail-int-bar'),
            detailSpeBar: document.getElementById('detail-spe-bar'),
            detailAtkVal: document.getElementById('detail-atk-val'),
            detailDefVal: document.getElementById('detail-def-val'),
            detailAgiVal: document.getElementById('detail-agi-val'),
            detailStaVal: document.getElementById('detail-sta-val'),
            detailIntVal: document.getElementById('detail-int-val'),
            detailSpeVal: document.getElementById('detail-spe-val'),
            detailWeight: document.getElementById('rankings-detail-weight'),
            detailSpeed: document.getElementById('rankings-detail-speed'),
            detailBite: document.getElementById('rankings-detail-bite'),
            detailAbilities: document.getElementById('rankings-detail-abilities'),
            detailTraits: document.getElementById('rankings-detail-traits'),
            detailWinrate: document.getElementById('detail-winrate'),
            detailBattles: document.getElementById('detail-battles'),
            detailScore: document.getElementById('detail-score'),
            detailUpvotes: document.getElementById('detail-upvotes'),
            detailDownvotes: document.getElementById('detail-downvotes'),
            detailUpvoteBtn: document.getElementById('detail-upvote'),
            detailDownvoteBtn: document.getElementById('detail-downvote'),
            detailViewStats: document.getElementById('detail-view-stats'),
            detailViewAllComments: document.getElementById('detail-view-all-comments'),
            detailMoreDetails: document.getElementById('detail-more-details'),
            
            // Inline Comments in Detail Panel
            detailCommentsSection: document.getElementById('detail-comments-section'),
            detailCommentsList: document.getElementById('detail-comments-list'),
            detailCommentsTotal: document.getElementById('detail-comments-total'),
            detailCommentInput: document.getElementById('detail-comment-input'),
            detailCommentSend: document.getElementById('detail-comment-send'),
            detailCommentsLogin: document.getElementById('detail-comments-login'),
            detailCommentInputArea: document.getElementById('detail-comment-input-area'),
            
            // Comments Modal
            commentsModal: document.getElementById('comments-modal'),
            commentsModalClose: document.getElementById('comments-modal-close'),
            commentsAnimalName: document.getElementById('comments-animal-name'),
            commentsAnimalImage: document.getElementById('comments-animal-image'),
            commentsCount: document.getElementById('comments-count'),
            commentsList: document.getElementById('comments-list'),
            commentInput: document.getElementById('comment-input'),
            charCount: document.getElementById('char-count'),
            commentSubmit: document.getElementById('comment-submit'),
            addCommentForm: document.getElementById('add-comment-form'),
            commentsLoginPrompt: document.getElementById('comments-login-prompt'),
            commentsLoginBtn: document.getElementById('comments-login-btn'),
            replyIndicator: document.getElementById('reply-indicator'),
            cancelReply: document.getElementById('cancel-reply'),
            anonymousCheckbox: document.getElementById('anonymous-checkbox')
        };
        
        this.replyingToComment = null;
    }

    init() {
        this.bindEvents();
        this.bindDetailPanelEvents();
        this.setHeroBannerCompact(); // Always compact, no scroll behavior
        this.setupMobileDetailClose(); // Setup mobile close handlers
    }
    
    setHeroBannerCompact() {
        // Make hero banner always compact - no scroll behavior
        const heroBanner = document.getElementById('rankings-hero-banner');
        if (heroBanner) {
            heroBanner.classList.add('compact');
        }
    }
    
    setupMobileDetailClose() {
        // Add close button dynamically for mobile bottom sheet
        const rightColumn = document.querySelector('.rankings-right-column');
        if (rightColumn && !rightColumn.querySelector('.mobile-sheet-close')) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'mobile-sheet-close';
            closeBtn.innerHTML = '<i class="fas fa-times"></i>';
            closeBtn.setAttribute('aria-label', 'Close panel');
            closeBtn.addEventListener('click', () => this.closeMobileDetailPanel());
            rightColumn.insertBefore(closeBtn, rightColumn.firstChild);
        }
        
        // Click on drag handle area to close
        const rightColumnElement = document.querySelector('.rankings-right-column');
        if (rightColumnElement) {
            rightColumnElement.addEventListener('click', (e) => {
                // Close when clicking on the pseudo-element area (top part with drag handle)
                if (e.target === rightColumnElement && e.offsetY < 20) {
                    this.closeMobileDetailPanel();
                }
            });
        }
    }
    
    closeMobileDetailPanel() {
        const rightColumn = document.querySelector('.rankings-right-column');
        if (rightColumn) {
            rightColumn.classList.remove('mobile-visible');
        }
        // Clear selection on mobile
        this.dom.rankingsList.querySelectorAll('.ranking-row').forEach(r => r.classList.remove('selected'));
        this.selectedRankIndex = -1;
    }

    bindEvents() {
        // Rankings search - Desktop
        this.dom.rankingsSearch?.addEventListener('input', (e) => {
            this.filterRankings(e.target.value);
            // Sync mobile search
            const mobileSearch = document.getElementById('rankings-search-mobile');
            if (mobileSearch && mobileSearch.value !== e.target.value) {
                mobileSearch.value = e.target.value;
            }
        });
        
        // Rankings search - Mobile
        const mobileSearchInput = document.getElementById('rankings-search-mobile');
        mobileSearchInput?.addEventListener('input', (e) => {
            this.filterRankings(e.target.value);
            // Sync desktop search
            if (this.dom.rankingsSearch && this.dom.rankingsSearch.value !== e.target.value) {
                this.dom.rankingsSearch.value = e.target.value;
            }
        });

        // Comments modal close
        this.dom.commentsModalClose?.addEventListener('click', () => this.hideCommentsModal());
        this.dom.commentsModal?.addEventListener('click', (e) => {
            if (e.target === this.dom.commentsModal) this.hideCommentsModal();
        });

        // Character counter for comment input
        this.dom.commentInput?.addEventListener('input', () => {
            const length = this.dom.commentInput.value.length;
            this.dom.charCount.textContent = length;
        });

        // Submit comment
        this.dom.commentSubmit?.addEventListener('click', () => this.submitComment());
        this.dom.commentInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) this.submitComment();
        });

        // Comments login button
        this.dom.commentsLoginBtn?.addEventListener('click', () => {
            this.hideCommentsModal();
            Auth.showModal('login');
        });

        // Cancel reply button
        this.dom.cancelReply?.addEventListener('click', () => this.cancelReply());

        // Escape key closes modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.hideCommentsModal();
        });
    }
    
    bindDetailPanelEvents() {
        // Detail panel vote buttons
        this.dom.detailUpvoteBtn?.addEventListener('click', () => this.handleDetailVote(1));
        this.dom.detailDownvoteBtn?.addEventListener('click', () => this.handleDetailVote(-1));
        
        // View full stats button
        this.dom.detailViewStats?.addEventListener('click', () => {
            if (this.currentAnimal) {
                // Find the full animal object from app.state.animals (has all fields like traits, abilities, etc.)
                const fullAnimal = this.app.state.animals.find(a => a.name === this.currentAnimal.name);
                if (fullAnimal) {
                    this.app.selectAnimal(fullAnimal);
                    this.app.switchView('stats');
                }
            }
        });
        
        // View all comments button - opens the full modal
        this.dom.detailViewAllComments?.addEventListener('click', () => {
            if (this.currentAnimal) {
                const rankItem = this.rankings.find(r => r.animal?.name === this.currentAnimal.name);
                if (rankItem) {
                    this.openCommentsModal({
                        currentTarget: {
                            dataset: {
                                animalId: rankItem.animal._id || rankItem.animal.id,
                                animalName: this.currentAnimal.name,
                                animalImage: this.currentAnimal.image
                            }
                        }
                    });
                }
            }
        });
        
        // More details button - opens full stats with More Details expanded
        this.dom.detailMoreDetails?.addEventListener('click', () => {
            if (this.currentAnimal) {
                const fullAnimal = this.app.state.animals.find(a => a.name === this.currentAnimal.name);
                if (fullAnimal) {
                    this.app.selectAnimal(fullAnimal);
                    this.app.switchView('stats');
                    // Auto-open more details panel after a brief delay
                    setTimeout(() => {
                        const detailsBtn = document.getElementById('more-details-btn');
                        if (detailsBtn && !document.querySelector('.full-details-panel.visible')) {
                            detailsBtn.click();
                        }
                    }, 300);
                }
            }
        });
        
        // Inline comment send button
        this.dom.detailCommentSend?.addEventListener('click', () => this.submitInlineComment());
        this.dom.detailCommentInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.submitInlineComment();
        });
    }
    
    /**
     * Submit a comment from the inline input in detail panel
     */
    async submitInlineComment() {
        const content = this.dom.detailCommentInput?.value?.trim();
        
        if (!content) {
            Auth.showToast('Please write something!');
            return;
        }
        
        if (!Auth.isLoggedIn()) {
            Auth.showToast('Please log in to comment!');
            Auth.showModal('login');
            return;
        }
        
        if (!this.currentAnimal) return;
        
        const rankItem = this.rankings.find(r => r.animal?.name === this.currentAnimal.name);
        const animalId = rankItem?.animal?._id || rankItem?.animal?.id;
        
        try {
            this.dom.detailCommentSend.disabled = true;
            
            const response = await fetch('/api/comments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.getToken()}`
                },
                body: JSON.stringify({
                    targetType: 'animal',
                    animalId: animalId,
                    animalName: this.currentAnimal.name,
                    content,
                    isAnonymous: false
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.dom.detailCommentInput.value = '';
                Auth.showToast('Comment posted!');
            } else {
                Auth.showToast(result.error || 'Failed to post comment');
            }
        } catch (error) {
            console.error('Error posting comment:', error);
            Auth.showToast('Error posting comment');
        } finally {
            if (this.dom.detailCommentSend) this.dom.detailCommentSend.disabled = false;
        }
    }
    
    /**
     * Load comments for the inline section in detail panel
     */
    async loadInlineComments(animalName) {
        if (!this.dom.detailCommentsList) return;
        
        // Show/hide input based on login
        if (this.dom.detailCommentInputArea) {
            this.dom.detailCommentInputArea.style.display = Auth.isLoggedIn() ? 'flex' : 'none';
        }
        if (this.dom.detailCommentsLogin) {
            this.dom.detailCommentsLogin.style.display = Auth.isLoggedIn() ? 'none' : 'flex';
        }
        
        this.dom.detailCommentsList.innerHTML = '<div class="inline-comments-loading"><i class="fas fa-spinner fa-spin"></i></div>';
        
        try {
            const response = await fetch(`/api/comments?animalName=${encodeURIComponent(animalName)}`);
            const result = await response.json();
            
            if (result.success && result.data) {
                const allComments = result.data;
                this.dom.detailCommentsTotal.textContent = allComments.length;
                
                if (allComments.length === 0) {
                    this.dom.detailCommentsList.innerHTML = `
                        <div class="inline-no-comments">
                            <i class="fas fa-comment-slash"></i>
                            <span>No comments yet</span>
                        </div>
                    `;
                } else {
                    // Show recent comments with replies
                    const html = allComments.slice(0, 5).map(c => this.createDetailCommentHTML(c)).join('');
                    this.dom.detailCommentsList.innerHTML = html;
                    
                    if (allComments.length > 5) {
                        this.dom.detailCommentsList.innerHTML += `
                            <div class="inline-more-comments">+ ${allComments.length - 5} more</div>
                        `;
                    }
                }
            }
        } catch (error) {
            console.error('Error loading inline comments:', error);
            this.dom.detailCommentsList.innerHTML = '<div class="inline-no-comments"><i class="fas fa-exclamation-triangle"></i> Error</div>';
        }
    }
    
    /**
     * Create HTML for a comment in the detail panel (with avatar and replies)
     */
    createDetailCommentHTML(comment, isReply = false) {
        const displayName = comment.isAnonymous ? 'Anonymous' : 
            (comment.authorUsername || comment.author?.displayName || 'Unknown');
        const timeAgo = this.getTimeAgo(new Date(comment.createdAt));
        const profileAnimal = comment.author?.profileAnimal || comment.profileAnimal;
        
        // Avatar HTML - profile animal or initial
        let avatarHtml;
        if (comment.isAnonymous) {
            avatarHtml = '<i class="fas fa-user-secret"></i>';
        } else if (profileAnimal?.image) {
            avatarHtml = `<img src="${profileAnimal.image}" alt="" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'"><span style="display:none">${displayName[0].toUpperCase()}</span>`;
        } else {
            avatarHtml = `<span>${displayName[0].toUpperCase()}</span>`;
        }
        
        // Replies HTML
        let repliesHtml = '';
        if (comment.replies && comment.replies.length > 0) {
            repliesHtml = `<div class="detail-comment-replies">
                ${comment.replies.map(r => this.createDetailCommentHTML(r, true)).join('')}
            </div>`;
        }
        
        return `
            <div class="detail-comment-item ${isReply ? 'is-reply' : ''} ${comment.isAnonymous ? 'anonymous' : ''}">
                <div class="detail-comment-avatar">${avatarHtml}</div>
                <div class="detail-comment-body">
                    <div class="detail-comment-meta">
                        <span class="detail-comment-author">${displayName}</span>
                        <span class="detail-comment-time">${timeAgo}</span>
                    </div>
                    <p class="detail-comment-text">${this.escapeHtml(comment.content)}</p>
                </div>
            </div>
            ${repliesHtml}
        `;
    }
    
    cancelReply() {
        this.replyingToComment = null;
        if (this.dom.replyIndicator) this.dom.replyIndicator.style.display = 'none';
        if (this.dom.commentInput) this.dom.commentInput.placeholder = 'Share your thoughts about this animal...';
    }

    async fetchRankings() {
        try {
            this.showLoading();
            
            const response = await fetch('/api/rankings', {
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) throw new Error('Failed to fetch rankings');

            const result = await response.json();
            if (result.success) {
                this.rankings = result.data;
                
                // Update app animals with power ranks for sorting
                this.updateAnimalPowerRanks();
                
                // Fetch user's votes if logged in
                if (Auth.isLoggedIn()) {
                    await this.fetchUserVotes();
                }
                
                this.renderRankings();
            }
        } catch (error) {
            console.error('Error fetching rankings:', error);
            this.dom.rankingsList.innerHTML = `
                <div class="rankings-loading">
                    <i class="fas fa-exclamation-triangle"></i>
                    Failed to load rankings. Please try again.
                </div>
            `;
        }
    }

    /**
     * Update the main app's animals with community data for sorting
     */
    updateAnimalPowerRanks() {
        if (!this.app || !this.app.state.animals) return;
        
        // Create a lookup map: name -> community data
        const communityMap = {};
        this.rankings.forEach((item, index) => {
            communityMap[item.animal.name] = {
                netVotes: item.netScore || 0,
                comparisonCount: item.comparisonCount || 0
            };
        });
        
        // Update each animal with community data
        this.app.state.animals.forEach(animal => {
            const data = communityMap[animal.name] || { netVotes: 0, comparisonCount: 0 };
            animal.netVotes = data.netVotes;
            animal.comparisonCount = data.comparisonCount;
        });
        
        // Trigger re-render if current sort is 'rank' or 'community'
        if (this.app.state.filters.sort === 'rank' || this.app.state.filters.sort === 'community') {
            this.app.applyFilters();
        }
    }

    async fetchUserVotes() {
        try {
            const response = await fetch('/api/votes?myVotes=true', {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${Auth.getToken()}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    // Direct object mapping from API
                    this.userVotes = result.data;
                }
            }
        } catch (error) {
            console.error('Error fetching user votes:', error);
        }
    }

    showLoading() {
        this.dom.rankingsList.innerHTML = `
            <div class="rankings-loading">
                <i class="fas fa-spinner fa-spin"></i>
                Loading rankings...
            </div>
        `;
    }

    renderRankings() {
        if (!this.rankings.length) {
            this.dom.rankingsList.innerHTML = `
                <div class="rankings-loading">
                    <i class="fas fa-trophy"></i>
                    No rankings yet. Be the first to vote!
                </div>
            `;
            return;
        }

        // Update login prompt
        if (this.dom.loginPrompt) {
            this.dom.loginPrompt.style.display = Auth.isLoggedIn() ? 'none' : 'block';
        }

        const fragment = document.createDocumentFragment();

        this.rankings.forEach((item, index) => {
            const row = this.createRankingRow(item, index + 1, index);
            fragment.appendChild(row);
        });

        this.dom.rankingsList.innerHTML = '';
        this.dom.rankingsList.appendChild(fragment);
        
        // Auto-select first animal on desktop only (not on mobile)
        if (this.rankings.length > 0 && !window.matchMedia('(max-width: 480px)').matches) {
            this.selectRankingRow(0);
        }
    }

    createRankingRow(item, rank, index) {
        const row = document.createElement('div');
        row.className = 'ranking-row';
        row.dataset.index = index;
        
        if (rank <= 3) {
            row.classList.add('top-3', `rank-${rank}`);
        }

        const animal = item.animal || item;
        const animalId = animal._id || animal.id;
        const winRate = item.winRate || 0;
        const winRateClass = winRate >= 60 ? '' : winRate >= 40 ? 'low' : 'poor';
        const totalFights = item.totalFights || 0;
        const upvotes = item.upvotes || 0;
        const downvotes = item.downvotes || 0;
        const commentCount = item.commentCount || 0;
        const battleRating = item.battleRating || 1000;
        
        // ELO tier coloring
        const eloTier = battleRating >= 1200 ? 'elite' : battleRating >= 1100 ? 'high' : battleRating >= 1000 ? 'mid' : 'low';
        
        // Check user's current vote on this animal
        const userVote = this.userVotes[animalId] || 0;
        const upActiveClass = userVote === 1 ? 'active' : '';
        const downActiveClass = userVote === -1 ? 'active' : '';
        const votedTodayClass = userVote !== 0 ? 'voted-today' : '';
        
        // Win streak calculation (consecutive wins based on recent battles)
        const winStreak = item.winStreak || 0;
        const lossStreak = item.lossStreak || 0;
        
        // Streak badge logic
        let streakBadge = '';
        if (winStreak >= 3) {
            streakBadge = `<span class="row-streak-badge hot"><i class="fas fa-fire"></i>${winStreak}W</span>`;
        } else if (lossStreak >= 3) {
            streakBadge = `<span class="row-streak-badge cold"><i class="fas fa-snowflake"></i>${lossStreak}L</span>`;
        }
        
        // Diagonal corner ribbon badge based on status
        let diagonalBadge = '';
        let statusBadge = ''; // Keep inline badge as fallback
        if (totalFights >= 5 && winRate >= 80) {
            diagonalBadge = '<div class="row-diagonal-badge"><div class="ribbon hot"><i class="fas fa-fire"></i>HOT</div></div>';
            statusBadge = '<span class="row-status-badge hot"><i class="fas fa-fire"></i>HOT</span>';
        } else if (totalFights >= 10 && winRate >= 70) {
            diagonalBadge = '<div class="row-diagonal-badge"><div class="ribbon mvp"><i class="fas fa-star"></i>MVP</div></div>';
            statusBadge = '<span class="row-status-badge mvp"><i class="fas fa-star"></i>MVP</span>';
        } else if (totalFights > 0 && totalFights <= 3) {
            diagonalBadge = '<div class="row-diagonal-badge"><div class="ribbon rookie"><i class="fas fa-seedling"></i>NEW</div></div>';
            statusBadge = '<span class="row-status-badge rookie"><i class="fas fa-seedling"></i>NEW</span>';
        } else if (rank === 1) {
            diagonalBadge = '<div class="row-diagonal-badge"><div class="ribbon champion"><i class="fas fa-crown"></i>#1</div></div>';
            statusBadge = '<span class="row-status-badge champion"><i class="fas fa-crown"></i>#1</span>';
        }
        
        // Win rate class for bar color
        const winRateTier = winRate >= 70 ? 'excellent' : winRate >= 50 ? 'good' : winRate >= 30 ? 'average' : 'poor';
        const winBarWidth = totalFights > 0 ? Math.min(winRate, 100) : 0;
        
        // Tournament placement stats (optional fields - graceful degradation)
        const tournamentsFirst = animal.tournamentsFirst || item.tournamentsFirst || 0;
        const tournamentsSecond = animal.tournamentsSecond || item.tournamentsSecond || 0;
        const tournamentsThird = animal.tournamentsThird || item.tournamentsThird || 0;
        const hasTournamentData = tournamentsFirst > 0 || tournamentsSecond > 0 || tournamentsThird > 0;
        
        // Always show tournament chips (0 if no data)
        let tournamentBadges = `
            <div class="row-tournament-chips">
                <span class="tournament-chip gold" title="1st Place"><i class="fas fa-trophy"></i><span>${tournamentsFirst}</span></span>
                <span class="tournament-chip silver" title="2nd Place"><i class="fas fa-medal"></i><span>${tournamentsSecond}</span></span>
                <span class="tournament-chip bronze" title="3rd Place"><i class="fas fa-medal"></i><span>${tournamentsThird}</span></span>
            </div>`;

        row.innerHTML = `
            ${diagonalBadge}
            <div class="row-rank">
                <span class="row-rank-num">#${rank}</span>
                ${rank === 1 ? '<i class="fas fa-trophy row-rank-icon gold"></i>' : ''}
                ${rank === 2 ? '<i class="fas fa-medal row-rank-icon silver"></i>' : ''}
                ${rank === 3 ? '<i class="fas fa-medal row-rank-icon bronze"></i>' : ''}
                ${streakBadge}
            </div>
            <div class="row-animal">
                <img src="${animal.image}" alt="${animal.name}" class="row-animal-img" 
                    onerror="this.src=FALLBACK_IMAGE">
                <div class="row-animal-info">
                    <div class="row-animal-name-line">
                        <span class="row-animal-name">${animal.name}</span>
                        <span class="row-elo-badge ${eloTier}" title="Battle Rating">${battleRating}</span>
                        ${statusBadge}
                    </div>
                    ${tournamentBadges}
                </div>
            </div>
            <div class="row-winrate">
                <div class="winrate-display">
                    ${totalFights > 0 
                        ? `<span class="row-winrate-value ${winRateClass}">${winRate}%</span><span class="row-battles">(${totalFights})</span>`
                        : '<span class="row-winrate-value dim">--</span>'}
                </div>
                ${totalFights > 0 ? `<div class="winrate-bar"><div class="winrate-fill ${winRateTier}" style="width: ${winBarWidth}%"></div></div>` : ''}
            </div>
            <div class="row-votes control-pad">
                <div class="vote-pad-cluster">
                    <button class="row-vote-btn row-vote-up ${upActiveClass} ${votedTodayClass}" data-animal-id="${animalId}" data-animal-name="${animal.name}" data-vote="up" title="Underrated">
                        <span class="vote-icon"><svg viewBox="0 0 3000 3000" fill="currentColor"><path d="m1500 233l-1267 1364 377-97 106.15-167.32 103.54 189.82 396.91-22.5 43.14-301.06 90.6 204.06 52.66 97-16.31 97-27.01 248.64-69.05 167.36-56.03 754h542.33l-57.64-754-74.55-173.01-32.94-242.99-14.8-97 51.02-97 43.14-182.49 60.4 279.49 399.76 26.47 79.11-154.97 159.57 128.5 194 97h272z"/></svg></span>
                        <span class="vote-count">${upvotes}</span>
                    </button>
                    <button class="row-vote-btn row-vote-down ${downActiveClass} ${votedTodayClass}" data-animal-id="${animalId}" data-animal-name="${animal.name}" data-vote="down" title="Overrated">
                        <span class="vote-icon"><svg viewBox="0 0 3000 3000" fill="currentColor"><path d="m1500 233l-1267 1364 377-97 106.15-167.32 103.54 189.82 396.91-22.5 43.14-301.06 90.6 204.06 52.66 97-16.31 97-27.01 248.64-69.05 167.36-56.03 754h542.33l-57.64-754-74.55-173.01-32.94-242.99-14.8-97 51.02-97 43.14-182.49 60.4 279.49 399.76 26.47 79.11-154.97 159.57 128.5 194 97h272z"/></svg></span>
                        <span class="vote-count">${downvotes}</span>
                    </button>
                </div>
                <button class="row-comments-btn" data-animal-id="${animalId}" data-animal-name="${animal.name}" data-animal-image="${animal.image}" title="Comments">
                    <i class="fas fa-comment"></i>
                    <span class="comment-count">${commentCount}</span>
                </button>
            </div>
        `;

        // Click on row body (not buttons) to select AND auto-open comments
        row.addEventListener('click', (e) => {
            if (!e.target.closest('.row-vote-btn') && !e.target.closest('.row-comments-btn')) {
                this.selectRankingRow(index);
                // Auto-open comments when clicking on a row
                this.toggleInlineComments(row, {
                    id: animalId,
                    name: animal.name,
                    image: animal.image
                });
            }
        });
        
        // Inline vote buttons
        row.querySelectorAll('.row-vote-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleRowVote(e, index);
            });
        });
        
        // Inline comments button
        const commentsBtn = row.querySelector('.row-comments-btn');
        if (commentsBtn) {
            commentsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleInlineComments(row, {
                    id: animalId,
                    name: animal.name,
                    image: animal.image
                });
            });
        }

        return row;
    }
    
    // Toggle inline comments panel under a row
    async toggleInlineComments(row, animal) {
        // Check if there's already an inline comments panel for this row
        const existingPanel = row.nextElementSibling;
        if (existingPanel && existingPanel.classList.contains('inline-comments-panel')) {
            // Close it
            existingPanel.remove();
            row.classList.remove('comments-expanded');
            return;
        }
        
        // Find any open panels ABOVE this row and calculate height offset
        const rankingsList = this.dom.rankingsList;
        const rowRect = row.getBoundingClientRect();
        let heightToRemove = 0;
        
        document.querySelectorAll('.inline-comments-panel').forEach(panel => {
            const panelRect = panel.getBoundingClientRect();
            // If this panel is above the clicked row
            if (panelRect.bottom < rowRect.top) {
                heightToRemove += panel.offsetHeight;
            }
            panel.remove();
        });
        document.querySelectorAll('.ranking-row.comments-expanded').forEach(r => r.classList.remove('comments-expanded'));
        
        // Adjust scroll position to keep clicked row in same visual position
        if (heightToRemove > 0 && rankingsList) {
            rankingsList.scrollTop -= heightToRemove;
        }
        
        // Mark this row as expanded
        row.classList.add('comments-expanded');
        
        // Create inline comments panel
        const panel = document.createElement('div');
        panel.className = 'inline-comments-panel';
        const isLoggedIn = Auth.isLoggedIn();
        panel.innerHTML = `
            <div class="inline-comments-header">
                <div class="inline-comments-title">
                    <i class="fas fa-comments"></i>
                    <span>Discussion</span>
                </div>
                <div class="inline-comments-actions">
                    <button class="inline-view-all-btn" data-animal-name="${animal.name}" data-animal-id="${animal.id || animal._id}" data-animal-image="${animal.image}">
                        <i class="fas fa-external-link-alt"></i> View All
                    </button>
                    <button class="inline-comments-close"><i class="fas fa-times"></i></button>
                </div>
            </div>
            <div class="inline-comments-list">
                <div class="inline-comments-loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>
            </div>
            ${isLoggedIn ? `
                <div class="inline-comment-input-row">
                    <input type="text" class="inline-panel-comment-input" placeholder="Add a comment..." maxlength="300">
                    <button class="inline-panel-send-btn"><i class="fas fa-paper-plane"></i></button>
                </div>
            ` : `
                <div class="inline-panel-login-prompt">
                    <i class="fas fa-lock"></i> Log in to comment
                </div>
            `}
        `;
        
        // Insert after the row
        row.insertAdjacentElement('afterend', panel);
        
        // Bind close button
        panel.querySelector('.inline-comments-close').addEventListener('click', () => {
            panel.remove();
            row.classList.remove('comments-expanded');
        });
        
        // Bind view all button - opens the full modal
        panel.querySelector('.inline-view-all-btn').addEventListener('click', (e) => {
            panel.remove();
            row.classList.remove('comments-expanded');
            this.openCommentsModal({ currentTarget: e.currentTarget });
        });
        
        // Bind comment input if logged in
        const inputEl = panel.querySelector('.inline-panel-comment-input');
        const sendBtn = panel.querySelector('.inline-panel-send-btn');
        if (inputEl && sendBtn) {
            const submitComment = async () => {
                const content = inputEl.value.trim();
                if (!content) return;
                
                sendBtn.disabled = true;
                try {
                    const response = await fetch('/api/comments', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${Auth.getToken()}`
                        },
                        body: JSON.stringify({
                            targetType: 'animal',
                            animalId: animal.id || animal._id,
                            animalName: animal.name,
                            content,
                            isAnonymous: false
                        })
                    });
                    const result = await response.json();
                    if (result.success) {
                        inputEl.value = '';
                        // Award XP for commenting
                        await this.awardReward('comment');
                        Auth.showToast('Comment posted!');
                        // Refresh the inline panel
                        this.toggleInlineComments(row, animal);
                        this.toggleInlineComments(row, animal);
                    } else {
                        Auth.showToast(result.error || 'Failed to post');
                    }
                } catch (err) {
                    Auth.showToast('Error posting comment');
                } finally {
                    sendBtn.disabled = false;
                }
            };
            sendBtn.addEventListener('click', submitComment);
            inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitComment(); });
        }
        
        // Fetch comments
        try {
            const response = await fetch(`/api/comments?animalName=${encodeURIComponent(animal.name)}`);
            const result = await response.json();
            
            if (result.success && result.data) {
                const comments = result.data.slice(0, 3); // Show max 3 inline
                const listEl = panel.querySelector('.inline-comments-list');
                
                if (comments.length === 0) {
                    listEl.innerHTML = `
                        <div class="inline-no-comments">
                            <i class="fas fa-comment-slash"></i>
                            <span>No comments yet</span>
                        </div>
                    `;
                } else {
                    listEl.innerHTML = comments.map(c => this.createInlineCommentHTML(c)).join('');
                    
                    // If there are more comments, show count
                    if (result.data.length > 3) {
                        listEl.innerHTML += `<div class="inline-more-comments">+ ${result.data.length - 3} more comments</div>`;
                    }
                    
                    // Add click handlers for clickable avatars/authors
                    listEl.querySelectorAll('.clickable-avatar, .clickable-author').forEach(el => {
                        el.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const username = el.dataset.username;
                            if (username && window.app?.goToUserProfile) {
                                window.app.goToUserProfile(username);
                            }
                        });
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching inline comments:', error);
            panel.querySelector('.inline-comments-list').innerHTML = `
                <div class="inline-no-comments">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Failed to load</span>
                </div>
            `;
        }
    }
    
    createInlineCommentHTML(comment) {
        const displayName = comment.isAnonymous ? 'Anonymous' : 
            (comment.authorUsername || comment.author?.displayName || 'Unknown');
        const authorUsername = comment.author?.username || comment.authorUsername || null;
        const timeAgo = this.getTimeAgo(new Date(comment.createdAt));
        const profileAnimal = comment.author?.profileAnimal || comment.profileAnimal;
        
        // Avatar HTML - profile animal image or initial
        let avatarHtml;
        if (comment.isAnonymous) {
            avatarHtml = '<i class="fas fa-user-secret"></i>';
        } else if (profileAnimal?.image) {
            avatarHtml = `<img src="${profileAnimal.image}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span style="display:none">${displayName[0].toUpperCase()}</span>`;
        } else {
            avatarHtml = `<span>${displayName[0].toUpperCase()}</span>`;
        }
        
        // Clickable author
        const isClickable = !comment.isAnonymous && authorUsername;
        const avatarClass = isClickable ? 'inline-comment-avatar clickable-avatar' : 'inline-comment-avatar';
        const nameClass = isClickable ? 'inline-comment-author clickable-author' : 'inline-comment-author';
        const usernameAttr = isClickable ? `data-username="${authorUsername}"` : '';
        
        // Replies HTML
        let repliesHtml = '';
        if (comment.replies && comment.replies.length > 0) {
            repliesHtml = `<div class="inline-comment-replies">
                ${comment.replies.slice(0, 2).map(r => {
                    const rName = r.isAnonymous ? 'Anonymous' : (r.authorUsername || 'Unknown');
                    const rUsername = r.author?.username || r.authorUsername || null;
                    const rTime = this.getTimeAgo(new Date(r.createdAt));
                    const rProfile = r.author?.profileAnimal || r.profileAnimal;
                    let rAvatar = r.isAnonymous ? '<i class="fas fa-user-secret"></i>' : 
                        (rProfile?.image ? `<img src="${rProfile.image}" alt="">` : `<span>${rName[0].toUpperCase()}</span>`);
                    const rIsClickable = !r.isAnonymous && rUsername;
                    const rAvatarClass = rIsClickable ? 'inline-comment-avatar small clickable-avatar' : 'inline-comment-avatar small';
                    const rNameClass = rIsClickable ? 'inline-comment-author clickable-author' : 'inline-comment-author';
                    const rUsernameAttr = rIsClickable ? `data-username="${rUsername}"` : '';
                    return `
                        <div class="inline-reply-item">
                            <div class="${rAvatarClass}" ${rUsernameAttr}>${rAvatar}</div>
                            <div class="inline-reply-content">
                                <span class="${rNameClass}" ${rUsernameAttr}>${rName}</span>
                                <span class="inline-comment-time">${rTime}</span>
                                <p class="inline-comment-text">${this.escapeHtml(r.content)}</p>
                            </div>
                        </div>
                    `;
                }).join('')}
                ${comment.replies.length > 2 ? `<div class="inline-more-replies">+${comment.replies.length - 2} more replies</div>` : ''}
            </div>`;
        }
        
        return `
            <div class="inline-comment-item ${comment.isAnonymous ? 'anonymous' : ''}">
                <div class="${avatarClass}" ${usernameAttr}>${avatarHtml}</div>
                <div class="inline-comment-content">
                    <div class="inline-comment-meta">
                        <span class="${nameClass}" ${usernameAttr}>${displayName}</span>
                        <span class="inline-comment-time">${timeAgo}</span>
                    </div>
                    <p class="inline-comment-text">${this.escapeHtml(comment.content)}</p>
                    ${repliesHtml}
                </div>
            </div>
        `;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    }
    
    selectRankingRow(index) {
        console.log('[Rankings] selectRankingRow called, index:', index);
        
        // Play select sound
        if (window.AudioManager) {
            AudioManager.select();
        }
        
        // Remove previous selection
        this.dom.rankingsList.querySelectorAll('.ranking-row').forEach(r => r.classList.remove('selected'));
        
        // Select new row
        const row = this.dom.rankingsList.querySelector(`.ranking-row[data-index="${index}"]`);
        if (row) row.classList.add('selected');
        
        this.selectedRankIndex = index;
        const item = this.rankings[index];
        if (item) {
            this.updateDetailPanel(item, index + 1);
        }
    }
    
    updateDetailPanel(item, rank) {
        const animal = item.animal || item;
        this.currentAnimal = animal;
        
        // Look up full animal data from app.state.animals (has scientific_name, etc.)
        const fullAnimal = this.app.state.animals.find(a => a.name === animal.name) || animal;
        
        // Show content, hide empty state
        if (this.dom.detailEmpty) this.dom.detailEmpty.style.display = 'none';
        if (this.dom.detailContent) this.dom.detailContent.style.display = 'flex';
        
        // Header
        if (this.dom.detailRankBadge) this.dom.detailRankBadge.textContent = `#${rank}`;
        if (this.dom.detailAnimalName) this.dom.detailAnimalName.textContent = animal.name;
        if (this.dom.detailScientific) {
            // Use scientific_name from full animal data (same as stats page)
            this.dom.detailScientific.textContent = fullAnimal.scientific_name || 'Unknown Species';
        }
        
        // Grade badge
        if (this.dom.detailGradeBadge) {
            const grade = this.calculateGrade(animal);
            this.dom.detailGradeBadge.textContent = grade;
            this.dom.detailGradeBadge.className = 'detail-grade-badge tier-' + grade.toLowerCase().replace('+', 'plus').replace('-', 'minus');
        }
        
        // Portrait with animation
        if (this.dom.detailPortrait) {
            this.dom.detailPortrait.style.opacity = '0';
            this.dom.detailPortrait.src = animal.image;
            this.dom.detailPortrait.onerror = () => { this.dom.detailPortrait.src = FALLBACK_IMAGE; };
            setTimeout(() => {
                this.dom.detailPortrait.style.opacity = '1';
                this.dom.detailPortrait.style.transition = 'opacity 0.3s ease';
            }, 50);
        }
        
        // Stats with animation
        const stats = [
            { key: 'attack', bar: this.dom.detailAtkBar, val: this.dom.detailAtkVal },
            { key: 'defense', bar: this.dom.detailDefBar, val: this.dom.detailDefVal },
            { key: 'agility', bar: this.dom.detailAgiBar, val: this.dom.detailAgiVal },
            { key: 'stamina', bar: this.dom.detailStaBar, val: this.dom.detailStaVal },
            { key: 'intelligence', bar: this.dom.detailIntBar, val: this.dom.detailIntVal },
            { key: 'special', bar: this.dom.detailSpeBar, val: this.dom.detailSpeVal }
        ];
        
        stats.forEach(({ key, bar, val }) => {
            const value = Math.round(animal[key] || 0);
            if (bar) {
                bar.style.width = '0%';
                setTimeout(() => { bar.style.width = `${value}%`; }, 50);
            }
            if (val) val.textContent = value;
        });
        
        // Physical stats (weight, speed, bite force)
        if (this.dom.detailWeight) {
            const weight = fullAnimal.weight_kg || 0;
            this.dom.detailWeight.textContent = weight >= 1000 ? `${(weight / 1000).toFixed(1)}t` : `${weight.toLocaleString()} kg`;
        }
        if (this.dom.detailSpeed) {
            const speedMps = fullAnimal.speed_mps || 0;
            const speedMph = (speedMps * 2.237).toFixed(1);
            this.dom.detailSpeed.textContent = `${speedMph} mph`;
        }
        if (this.dom.detailBite) {
            const bite = fullAnimal.bite_force_psi || 0;
            this.dom.detailBite.textContent = bite > 0 ? `${bite.toLocaleString()} PSI` : 'N/A';
        }
        
        // Abilities
        if (this.dom.detailAbilities) {
            const abilities = fullAnimal.special_abilities || [];
            if (abilities.length > 0) {
                this.dom.detailAbilities.innerHTML = abilities.slice(0, 3).map(a => 
                    `<span class="ability-tag-sm"><i class="fas fa-bolt"></i> ${a}</span>`
                ).join('');
            } else {
                this.dom.detailAbilities.innerHTML = '<span class="ability-tag-sm dim">None</span>';
            }
        }
        
        // Traits
        if (this.dom.detailTraits) {
            const traits = fullAnimal.unique_traits || [];
            if (traits.length > 0) {
                this.dom.detailTraits.innerHTML = traits.slice(0, 3).map(t => 
                    `<span class="trait-tag-sm"><i class="fas fa-star"></i> ${t}</span>`
                ).join('');
            } else {
                this.dom.detailTraits.innerHTML = '<span class="trait-tag-sm dim">None</span>';
            }
        }
        
        // Battle stats
        if (this.dom.detailWinrate) {
            const winRate = item.winRate || 0;
            const totalFights = item.totalFights || 0;
            this.dom.detailWinrate.textContent = totalFights > 0 ? `${winRate}%` : '--';
        }
        if (this.dom.detailBattles) this.dom.detailBattles.textContent = item.totalFights || 0;
        if (this.dom.detailScore) this.dom.detailScore.textContent = item.netScore || 0;
        
        // Votes
        const animalId = animal._id || animal.id;
        const userVote = this.userVotes[animalId] || 0;
        
        if (this.dom.detailUpvotes) this.dom.detailUpvotes.textContent = item.upvotes || 0;
        if (this.dom.detailDownvotes) this.dom.detailDownvotes.textContent = item.downvotes || 0;
        
        if (this.dom.detailUpvoteBtn) {
            this.dom.detailUpvoteBtn.classList.toggle('active', userVote === 1);
            this.dom.detailUpvoteBtn.classList.toggle('voted-today', userVote !== 0);
            this.dom.detailUpvoteBtn.disabled = !Auth.isLoggedIn();
            this.dom.detailUpvoteBtn.dataset.animalId = animalId;
            this.dom.detailUpvoteBtn.dataset.animalName = animal.name;
        }
        if (this.dom.detailDownvoteBtn) {
            this.dom.detailDownvoteBtn.classList.toggle('active', userVote === -1);
            this.dom.detailDownvoteBtn.classList.toggle('voted-today', userVote !== 0);
            this.dom.detailDownvoteBtn.disabled = !Auth.isLoggedIn();
            this.dom.detailDownvoteBtn.dataset.animalId = animalId;
            this.dom.detailDownvoteBtn.dataset.animalName = animal.name;
        }
        
        // Comment count
        if (this.dom.detailCommentCount) this.dom.detailCommentCount.textContent = item.commentCount || 0;
        
        // Show mobile bottom sheet on small screens
        const rightColumn = document.querySelector('.rankings-right-column');
        if (rightColumn && window.matchMedia('(max-width: 480px)').matches) {
            rightColumn.classList.add('mobile-visible');
            // Show close button
            const closeBtn = rightColumn.querySelector('.mobile-sheet-close');
            if (closeBtn) closeBtn.style.display = 'block';
        }
        
        // Tournament History (optional fields - graceful degradation)
        this.updateTournamentHistory(animal, item);
    }
    
    updateTournamentHistory(animal, item) {
        const tournamentsPlayed = animal.tournamentsPlayed || item.tournamentsPlayed || 0;
        const tournamentsFirst = animal.tournamentsFirst || item.tournamentsFirst || 0;
        const tournamentsSecond = animal.tournamentsSecond || item.tournamentsSecond || 0;
        const tournamentsThird = animal.tournamentsThird || item.tournamentsThird || 0;
        
        const hasTournamentData = tournamentsPlayed > 0 || tournamentsFirst > 0 || tournamentsSecond > 0 || tournamentsThird > 0;
        
        const historyContent = document.getElementById('tournament-history-content');
        const historyEmpty = document.getElementById('tournament-history-empty');
        const goldCount = document.getElementById('detail-gold-count');
        const silverCount = document.getElementById('detail-silver-count');
        const bronzeCount = document.getElementById('detail-bronze-count');
        const playedDisplay = document.getElementById('detail-tournaments-played');
        
        // Always show the dashboard (even with 0s for new comic panel style)
        if (historyContent) historyContent.style.display = 'flex';
        if (historyEmpty) historyEmpty.style.display = 'none';
        if (goldCount) goldCount.textContent = tournamentsFirst;
        if (silverCount) silverCount.textContent = tournamentsSecond;
        if (bronzeCount) bronzeCount.textContent = tournamentsThird;
        
        // Update tournaments played display (new dashboard style)
        if (playedDisplay) {
            const totalCount = playedDisplay.querySelector('.total-count');
            if (totalCount) {
                totalCount.textContent = tournamentsPlayed;
            } else {
                // Legacy format fallback
                playedDisplay.innerHTML = `<span class="played-count">${tournamentsPlayed}</span> tournaments played`;
            }
        }
    }
    
    calculateGrade(animal) {
        const total = (animal.attack || 0) + (animal.defense || 0) + (animal.agility || 0) + 
                      (animal.stamina || 0) + (animal.intelligence || 0) + (animal.special || 0);
        const avg = total / 6;
        
        if (avg >= 90) return 'S';
        if (avg >= 80) return 'A';
        if (avg >= 70) return 'B';
        if (avg >= 60) return 'C';
        if (avg >= 50) return 'D';
        return 'F';
    }
    
    async handleDetailVote(value) {
        const animalId = this.dom.detailUpvoteBtn?.dataset.animalId;
        const animalName = this.dom.detailUpvoteBtn?.dataset.animalName;
        const voteType = value === 1 ? 'up' : 'down';

        if (!Auth.isLoggedIn()) {
            Auth.showToast('Please log in to vote!');
            Auth.showModal('login');
            return;
        }
        
        // Play vote sound
        if (window.AudioManager) {
            AudioManager.click();
        }
        
        // Check if clicking same vote to clear it
        const currentVote = this.userVotes[animalId];
        const isToggle = (value === 1 && currentVote === 1) || (value === -1 && currentVote === -1);
        const finalVoteType = isToggle ? 'clear' : voteType;
        
        // Get user's timezone
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        try {
            const response = await fetch('/api/votes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.getToken()}`
                },
                body: JSON.stringify({ animalId, animalName, voteType: finalVoteType, timeZone })
            });

            const result = await response.json();

            if (result.success) {
                // Update local state
                if (result.data.userVote === 'up') {
                    this.userVotes[animalId] = 1;
                } else if (result.data.userVote === 'down') {
                    this.userVotes[animalId] = -1;
                } else {
                    delete this.userVotes[animalId];
                }

                // Update detail panel buttons
                const userVote = this.userVotes[animalId] || 0;
                this.dom.detailUpvoteBtn?.classList.toggle('active', userVote === 1);
                this.dom.detailDownvoteBtn?.classList.toggle('active', userVote === -1);
                
                // Update counts
                if (this.dom.detailUpvotes && result.data.upvotes !== undefined) {
                    this.dom.detailUpvotes.textContent = result.data.upvotes;
                }
                if (this.dom.detailDownvotes && result.data.downvotes !== undefined) {
                    this.dom.detailDownvotes.textContent = result.data.downvotes;
                }
                
                // Update the row in the list (including active states)
                this.updateRowVotes(this.selectedRankIndex, result.data.upvotes, result.data.downvotes, animalId, false);

                // Award XP only if xpAwarded is true (first vote of the day for this animal)
                if (result.xpAwarded) {
                    await this.awardReward('vote');
                }
                Auth.showToast(result.message || 'Vote recorded!');
            } else {
                Auth.showToast(result.error || 'Failed to vote');
            }
        } catch (error) {
            console.error('Vote error:', error);
            Auth.showToast('Error voting. Please try again.');
        }
    }
    
    updateRowVotes(index, upvotes, downvotes, animalId = null, votedToday = false) {
        const row = this.dom.rankingsList.querySelector(`.ranking-row[data-index="${index}"]`);
        if (row) {
            const upEl = row.querySelector('.row-vote-up');
            const downEl = row.querySelector('.row-vote-down');
            if (upEl) {
                const countEl = upEl.querySelector('.vote-count');
                if (countEl) countEl.textContent = upvotes;
            }
            if (downEl) {
                const countEl = downEl.querySelector('.vote-count');
                if (countEl) countEl.textContent = downvotes;
            }
            
            // Update active states if animalId provided
            if (animalId) {
                const userVote = this.userVotes[animalId] || 0;
                upEl?.classList.toggle('active', userVote === 1);
                downEl?.classList.toggle('active', userVote === -1);
                
                // Mark as voted today (can't vote again until tomorrow)
                if (votedToday) {
                    upEl?.classList.add('voted-today');
                    downEl?.classList.add('voted-today');
                }
            }
        }
    }
    
    /**
     * Update comment counts in the row and detail panel
     */
    updateCommentCounts(count) {
        // Find the current animal's row
        if (this.currentAnimal) {
            const animalId = this.currentAnimal._id || this.currentAnimal.id;
            const rows = this.dom.rankingsList.querySelectorAll('.ranking-row');
            rows.forEach(row => {
                const commentsBtn = row.querySelector('.row-comments-btn');
                if (commentsBtn && commentsBtn.dataset.animalId === animalId) {
                    const countEl = commentsBtn.querySelector('.comment-count');
                    if (countEl) countEl.textContent = count;
                }
            });
            
            // Update detail panel if same animal is selected
            if (this.dom.detailCommentCount) {
                this.dom.detailCommentCount.textContent = count;
            }
        }
    }
    
    /**
     * Handle voting from the inline row buttons (daily voting system)
     * Users can change their vote anytime, but XP is only awarded once per day
     */
    async handleRowVote(e, rowIndex) {
        const btn = e.currentTarget;
        const animalId = btn.dataset.animalId;
        const animalName = btn.dataset.animalName;
        const voteType = btn.dataset.vote;
        
        if (!Auth.isLoggedIn()) {
            Auth.showToast('Please log in to vote!');
            Auth.showModal('login');
            return;
        }
        
        // Check if clicking same vote to clear it
        const currentVote = this.userVotes[animalId];
        const isToggle = (voteType === 'up' && currentVote === 1) || (voteType === 'down' && currentVote === -1);
        const finalVoteType = isToggle ? 'clear' : voteType;
        
        // Add click animation
        btn.classList.add('vote-clicked');
        setTimeout(() => btn.classList.remove('vote-clicked'), 200);
        
        // Get user's timezone
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        try {
            const response = await fetch('/api/votes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.getToken()}`
                },
                body: JSON.stringify({ animalId, animalName, voteType: finalVoteType, timeZone })
            });

            const result = await response.json();

            if (result.success) {
                // Update local state
                if (result.data.userVote === 'up') {
                    this.userVotes[animalId] = 1;
                } else if (result.data.userVote === 'down') {
                    this.userVotes[animalId] = -1;
                } else {
                    delete this.userVotes[animalId];
                }

                // Update row buttons and counts
                this.updateRowVotes(rowIndex, result.data.upvotes, result.data.downvotes, animalId, false);
                
                // Also update detail panel if same animal is selected
                if (this.selectedRankIndex === rowIndex) {
                    const userVote = this.userVotes[animalId] || 0;
                    this.dom.detailUpvoteBtn?.classList.toggle('active', userVote === 1);
                    this.dom.detailDownvoteBtn?.classList.toggle('active', userVote === -1);
                    if (this.dom.detailUpvotes) this.dom.detailUpvotes.textContent = result.data.upvotes;
                    if (this.dom.detailDownvotes) this.dom.detailDownvotes.textContent = result.data.downvotes;
                }

                // Award XP only if xpAwarded is true (first vote of the day for this animal)
                if (result.xpAwarded) {
                    await this.awardReward('vote');
                }
                Auth.showToast(result.message || 'Vote recorded!');
            } else {
                Auth.showToast(result.error || 'Failed to vote');
            }
        } catch (error) {
            console.error('Vote error:', error);
            Auth.showToast('Error voting. Please try again.');
        }
    }

    // Keep old handleVote for backward compatibility with old card format
    async handleVote(e) {
        const btn = e.currentTarget;
        const animalId = btn.dataset.animalId;
        const animalName = btn.dataset.animalName;
        const value = parseInt(btn.dataset.value);
        const voteType = value === 1 ? 'up' : 'down';

        if (!Auth.isLoggedIn()) {
            Auth.showToast('Please log in to vote!');
            Auth.showModal('login');
            return;
        }
        
        // Check if clicking same vote to clear it
        const currentVote = this.userVotes[animalId];
        const isToggle = (value === 1 && currentVote === 1) || (value === -1 && currentVote === -1);
        const finalVoteType = isToggle ? 'clear' : voteType;
        
        // Get user's timezone
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        try {
            const response = await fetch('/api/votes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.getToken()}`
                },
                body: JSON.stringify({ animalId, animalName, voteType: finalVoteType, timeZone })
            });

            const result = await response.json();

            if (result.success) {
                // Update local state
                if (result.data.userVote === 'up') {
                    this.userVotes[animalId] = 1;
                } else if (result.data.userVote === 'down') {
                    this.userVotes[animalId] = -1;
                } else {
                    delete this.userVotes[animalId];
                }

                // Update the UI
                const card = btn.closest('.ranking-card');
                const upBtn = card.querySelector('.upvote');
                const downBtn = card.querySelector('.downvote');
                const upCount = card.querySelector('.vote-count.up');
                const downCount = card.querySelector('.vote-count.down');

                const userVote = this.userVotes[animalId] || 0;
                upBtn.classList.toggle('active', userVote === 1);
                downBtn.classList.toggle('active', userVote === -1);
                
                // Update vote counts from response
                if (upCount && result.data.upvotes !== undefined) {
                    upCount.textContent = `+${result.data.upvotes}`;
                }
                if (downCount && result.data.downvotes !== undefined) {
                    downCount.textContent = `-${result.data.downvotes}`;
                }

                // Award XP only if xpAwarded is true (first vote of the day for this animal)
                if (result.xpAwarded) {
                    await this.awardReward('vote');
                }
                Auth.showToast(result.message || 'Vote recorded!');
            } else {
                Auth.showToast(result.error || 'Failed to vote');
            }
        } catch (error) {
            console.error('Vote error:', error);
            Auth.showToast('Error voting. Please try again.');
        }
    }

    /**
     * Award XP/BP rewards via the API (actually adds to user account)
     * @param {string} action - The action type (vote, comment, reply, tournament_win, etc.)
     */
    async awardReward(action) {
        if (!Auth.isLoggedIn()) return;
        
        try {
            const response = await fetch('/api/auth?action=rewards', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.getToken()}`
                },
                body: JSON.stringify({ action })
            });

            const result = await response.json();

            if (result.success) {
                // Show XP popup with actual amounts from API
                this.showXpPopup(result.data.xpAdded, result.data.bpAdded);
                
                // Check for level up - show BP reward earned
                if (result.data.leveledUp) {
                    this.showLevelUpPopup(result.data.newLevel, result.data.levelUpBpReward || 0);
                }
                
                // Update auth display (XP bar, BP count)
                Auth.refreshUserStats();
            }
        } catch (error) {
            console.error('Error awarding reward:', error);
        }
    }

    showXpPopup(xp, bp) {
        if (xp === 0 && bp === 0) return; // Don't show if no rewards
        
        const popup = document.createElement('div');
        popup.className = 'xp-popup';
        
        let text = '';
        if (xp > 0) text += `+${xp} XP`;
        if (bp > 0) text += (text ? ', ' : '') + `+${bp} BP`;
        
        popup.innerHTML = `<i class="fas fa-star"></i> ${text}`;
        document.body.appendChild(popup);
        
        setTimeout(() => {
            popup.remove();
        }, 2000);
    }
    
    showLevelUpPopup(newLevel, bpReward = 0) {
        const popup = document.createElement('div');
        popup.className = 'level-up-popup';
        popup.innerHTML = `
            <div class="level-up-content">
                <i class="fas fa-crown"></i>
                <span>LEVEL UP!</span>
                <span class="new-level">Level ${newLevel}</span>
                ${bpReward > 0 ? `<span class="level-up-reward">+${bpReward} BP</span>` : ''}
            </div>
        `;
        document.body.appendChild(popup);
        
        setTimeout(() => {
            popup.remove();
        }, 3000);
    }

    async refreshRankingScore(animalId, scoreEl) {
        try {
            const response = await fetch('/api/rankings');
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    const item = result.data.find(r => (r.animal?._id || r.animal?.id) === animalId);
                    if (item && scoreEl) {
                        const score = item.netScore || 0;
                        scoreEl.textContent = score;
                        scoreEl.className = 'vote-score';
                        if (score > 0) scoreEl.classList.add('positive');
                        else if (score < 0) scoreEl.classList.add('negative');
                    }
                }
            }
        } catch (error) {
            console.error('Error refreshing score:', error);
        }
    }

    filterRankings(searchTerm) {
        const term = searchTerm.toLowerCase();
        const rows = this.dom.rankingsList.querySelectorAll('.ranking-row');
        
        rows.forEach(row => {
            const nameEl = row.querySelector('.row-animal-name');
            const name = nameEl ? nameEl.textContent.toLowerCase() : '';
            row.style.display = name.includes(term) ? '' : 'none';
        });
    }

    // ========================================
    // Comments Modal
    // ========================================

    openCommentsModal(e) {
        const btn = e.currentTarget;
        this.currentAnimal = {
            id: btn.dataset.animalId,
            name: btn.dataset.animalName,
            image: btn.dataset.animalImage
        };

        // Update modal header - just show "Comments" to avoid duplicate animal name
        this.dom.commentsAnimalName.textContent = 'Comments';
        // Keep image hidden
        this.dom.commentsAnimalImage.style.display = 'none';

        // Show/hide login prompt vs comment form
        if (Auth.isLoggedIn()) {
            this.dom.addCommentForm.style.display = 'block';
            this.dom.commentsLoginPrompt.style.display = 'none';
        } else {
            this.dom.addCommentForm.style.display = 'none';
            this.dom.commentsLoginPrompt.style.display = 'flex';
        }

        // Clear input
        this.dom.commentInput.value = '';
        this.dom.charCount.textContent = '0';

        // Fetch and display comments
        this.fetchComments();

        // Show modal
        this.dom.commentsModal.classList.add('show');
    }

    hideCommentsModal() {
        this.dom.commentsModal.classList.remove('show');
        // Don't clear currentAnimal here - it's needed for the detail panel's comment button
        // It gets updated when selecting a different animal anyway
    }

    async fetchComments() {
        if (!this.currentAnimal) return;

        this.dom.commentsList.innerHTML = '<div class="rankings-loading"><i class="fas fa-spinner fa-spin"></i> Loading comments...</div>';

        try {
            // Use animalName for reliable lookup (animalId may not always be set)
            const response = await fetch(`/api/comments?animalName=${encodeURIComponent(this.currentAnimal.name)}`);
            const result = await response.json();
            
            if (!response.ok) {
                console.error('Comments API error:', result);
                throw new Error(result.error || 'Failed to fetch comments');
            }
            
            if (result.success) {
                this.comments = result.data;
                // Update count badge (just the number)
                this.dom.commentsCount.textContent = this.comments.length;
                this.renderComments();
            }
        } catch (error) {
            console.error('Error fetching comments:', error);
            this.dom.commentsList.innerHTML = `<div class="no-comments"><i class="fas fa-exclamation-triangle"></i> Failed to load comments. ${error.message}</div>`;
        }
    }

    renderComments() {
        if (!this.comments.length) {
            this.dom.commentsList.innerHTML = `
                <div class="no-comments">
                    <i class="fas fa-comment-slash"></i>
                    <p>No comments yet. Be the first to share your thoughts!</p>
                </div>
            `;
            return;
        }

        const fragment = document.createDocumentFragment();

        this.comments.forEach(comment => {
            const el = this.createCommentElement(comment);
            fragment.appendChild(el);
        });

        this.dom.commentsList.innerHTML = '';
        this.dom.commentsList.appendChild(fragment);
    }

    createCommentElement(comment, isReply = false) {
        const div = document.createElement('div');
        const hasReplies = comment.replies && comment.replies.length > 0;
        div.className = 'comment-item' + (isReply ? ' reply-item' : '') + (comment.isAnonymous ? ' anonymous' : '') + (hasReplies ? ' has-replies' : '');
        div.dataset.commentId = comment._id;

        // Handle anonymous vs regular display
        const displayName = comment.isAnonymous ? 'Anonymous' : 
            (comment.authorUsername || comment.author?.displayName || comment.author?.username || 'Unknown');
        const authorUsername = comment.author?.username || comment.authorUsername || null;
        const authorInitial = comment.isAnonymous ? '?' : displayName[0].toUpperCase();
        const timeAgo = this.getTimeAgo(new Date(comment.createdAt));
        const authorId = comment.authorId || comment.author?.userId;
        const currentUserId = Auth.getUser()?.id;
        const isOwn = Auth.isLoggedIn() && authorId && authorId.toString() === currentUserId;

        // Profile animal for avatar
        const profileAnimal = comment.author?.profileAnimal || comment.profileAnimal;
        const avatarHtml = this.getUserAvatarHtml(profileAnimal, authorInitial, comment.isAnonymous);

        // Vote state
        const hasUpvoted = comment.upvotes?.some(id => id.toString() === currentUserId);
        const hasDownvoted = comment.downvotes?.some(id => id.toString() === currentUserId);
        const score = comment.score ?? ((comment.upvotes?.length || 0) - (comment.downvotes?.length || 0));
        const scoreClass = score > 0 ? 'positive' : score < 0 ? 'negative' : '';
        
        // Reply count
        const replyCount = comment.replies?.length || 0;

        // Add user ID for avatar refresh
        const userIdAttr = authorId ? `data-user-id="${authorId}"` : '';
        
        // Admin/mod badge
        const roleBadge = comment.author?.role === 'admin' ? '<span class="comment-badge admin">Admin</span>' : 
                          comment.author?.role === 'moderator' ? '<span class="comment-badge mod">Mod</span>' : '';
        
        // Clickable author (if not anonymous and has username)
        const isClickable = !comment.isAnonymous && authorUsername;
        const avatarClass = isClickable ? 'comment-avatar clickable-avatar' : 'comment-avatar';
        const nameClass = isClickable ? 'comment-author-name clickable-author' : 'comment-author-name';
        const usernameAttr = isClickable ? `data-username="${authorUsername}"` : '';
        
        div.innerHTML = `
            <div class="comment-header" ${userIdAttr}>
                <div class="comment-author">
                    <span class="${avatarClass}" ${usernameAttr}>${avatarHtml}</span>
                    <span class="${nameClass}" ${usernameAttr}>${displayName}</span>
                    ${roleBadge}
                    <span class="comment-dot">•</span>
                    <span class="comment-date">${timeAgo}</span>
                </div>
            </div>
            <div class="comment-content">${this.escapeHtml(comment.content)}</div>
            <div class="comment-actions">
                <button class="comment-action-btn upvote-btn ${hasUpvoted ? 'upvoted' : ''}" data-comment-id="${comment._id}">
                    <span class="vote-icon"><svg viewBox="0 0 3000 3000" fill="currentColor"><path d="m1500 233l-1267 1364 377-97 106.15-167.32 103.54 189.82 396.91-22.5 43.14-301.06 90.6 204.06 52.66 97-16.31 97-27.01 248.64-69.05 167.36-56.03 754h542.33l-57.64-754-74.55-173.01-32.94-242.99-14.8-97 51.02-97 43.14-182.49 60.4 279.49 399.76 26.47 79.11-154.97 159.57 128.5 194 97h272z"/></svg></span>
                </button>
                <span class="vote-score ${scoreClass}">${score}</span>
                <button class="comment-action-btn downvote-btn ${hasDownvoted ? 'downvoted' : ''}" data-comment-id="${comment._id}">
                    <span class="vote-icon"><svg viewBox="0 0 3000 3000" fill="currentColor"><path d="m1500 233l-1267 1364 377-97 106.15-167.32 103.54 189.82 396.91-22.5 43.14-301.06 90.6 204.06 52.66 97-16.31 97-27.01 248.64-69.05 167.36-56.03 754h542.33l-57.64-754-74.55-173.01-32.94-242.99-14.8-97 51.02-97 43.14-182.49 60.4 279.49 399.76 26.47 79.11-154.97 159.57 128.5 194 97h272z"/></svg></span>
                </button>
                <button class="comment-action-btn reply-btn" data-comment-id="${comment._id}">
                    <i class="fas fa-reply"></i>
                    Reply${replyCount > 0 ? ` (${replyCount})` : ''}
                </button>
                ${isOwn ? `
                    <button class="comment-action-btn delete-btn" data-comment-id="${comment._id}">
                        <i class="fas fa-trash"></i>
                        Delete
                    </button>
                ` : ''}
            </div>
        `;

        // Bind actions
        div.querySelector('.upvote-btn').addEventListener('click', () => this.handleCommentVote(comment._id, 'upvote'));
        div.querySelector('.downvote-btn').addEventListener('click', () => this.handleCommentVote(comment._id, 'downvote'));
        div.querySelector('.reply-btn').addEventListener('click', () => this.handleReply(comment));
        div.querySelector('.delete-btn')?.addEventListener('click', (e) => this.handleDelete(e));

        // Add click handlers for clickable avatars and names
        div.querySelectorAll('.clickable-avatar, .clickable-author').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const username = el.dataset.username;
                if (username && window.app?.goToUserProfile) {
                    window.app.goToUserProfile(username);
                }
            });
        });

        // Render nested replies
        if (comment.replies && comment.replies.length > 0) {
            const repliesContainer = document.createElement('div');
            repliesContainer.className = 'comment-replies';
            comment.replies.forEach(reply => {
                repliesContainer.appendChild(this.createCommentElement(reply, true));
            });
            div.appendChild(repliesContainer);
        }

        return div;
    }

    async submitComment() {
        const content = this.dom.commentInput.value.trim();

        if (!content) {
            Auth.showToast('Please write something!');
            return;
        }

        if (!Auth.isLoggedIn()) {
            Auth.showToast('Please log in to comment!');
            Auth.showModal('login');
            return;
        }

        this.dom.commentSubmit.disabled = true;

        try {
            const response = await fetch('/api/comments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.getToken()}`
                },
                body: JSON.stringify({
                    targetType: 'animal',
                    animalId: this.currentAnimal.id,
                    animalName: this.currentAnimal.name,
                    content,
                    isAnonymous: this.dom.anonymousCheckbox?.checked || false,
                    parentId: this.replyingToComment?._id || null
                })
            });

            const result = await response.json();

            if (result.success) {
                // Clear input and reset reply state
                this.dom.commentInput.value = '';
                this.dom.charCount.textContent = '0';
                const wasReply = this.replyingToComment !== null;
                this.cancelReply();

                // Refresh comments
                await this.fetchComments();
                
                // Update comment counts in row and detail panel
                this.updateCommentCounts(this.comments.length);

                // Award XP for commenting
                await this.awardReward(wasReply ? 'reply' : 'comment');
                Auth.showToast(wasReply ? 'Reply posted!' : 'Comment posted!');
            } else {
                Auth.showToast(result.error || 'Failed to post comment');
            }
        } catch (error) {
            console.error('Error posting comment:', error);
            Auth.showToast('Error posting comment');
        } finally {
            this.dom.commentSubmit.disabled = false;
        }
    }

    async handleCommentVote(commentId, action) {

        if (!Auth.isLoggedIn()) {
            Auth.showToast(`Please log in to ${action} comments!`);
            return;
        }

        try {
            const response = await fetch(`/api/comments?id=${commentId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.getToken()}`
                },
                body: JSON.stringify({ action })
            });

            if (response.ok) {
                await this.fetchComments();
            }
        } catch (error) {
            console.error(`Error ${action}ing comment:`, error);
        }
    }

    handleReply(comment) {
        // Set the reply target
        this.replyingToComment = comment;
        
        // Update reply indicator
        const authorName = comment.isAnonymous ? 'Anonymous' : 
            (comment.author?.displayName || comment.author?.username || 'User');
        
        if (this.dom.replyIndicator) {
            const replyText = this.dom.replyIndicator.querySelector('.reply-text');
            if (replyText) {
                replyText.textContent = `Replying to ${authorName}`;
            }
            this.dom.replyIndicator.style.display = 'flex';
        }
        
        this.dom.commentInput.focus();
    }


    async handleDelete(e) {
        const commentId = e.currentTarget.dataset.commentId;

        if (!confirm('Are you sure you want to delete this comment?')) return;

        // Optimistically remove from DOM immediately for better perceived performance
        const commentEl = e.currentTarget.closest('.comment-item');
        if (commentEl) {
            commentEl.style.opacity = '0.5';
            commentEl.style.pointerEvents = 'none';
        }

        try {
            const response = await fetch(`/api/comments?id=${commentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${Auth.getToken()}`
                }
            });

            if (response.ok) {
                // Remove from local array and DOM instead of re-fetching
                this.comments = this.comments.filter(c => c._id !== commentId);
                if (commentEl) commentEl.remove();
                this.dom.commentsCount.textContent = this.comments.length;
                
                // Show empty state if no comments left
                if (this.comments.length === 0) {
                    this.dom.commentsList.innerHTML = `
                        <div class="no-comments">
                            <i class="fas fa-comment-slash"></i>
                            <p>No comments yet. Be the first to share your thoughts!</p>
                        </div>
                    `;
                }
                Auth.showToast('Comment deleted');
            } else {
                // Restore on failure
                if (commentEl) {
                    commentEl.style.opacity = '1';
                    commentEl.style.pointerEvents = '';
                }
                Auth.showToast('Failed to delete comment');
            }
        } catch (error) {
            console.error('Error deleting comment:', error);
            if (commentEl) {
                commentEl.style.opacity = '1';
                commentEl.style.pointerEvents = '';
            }
            Auth.showToast('Error deleting comment');
        }
    }

    /**
     * Get avatar HTML for a user (animal image or fallback)
     */
    getUserAvatarHtml(profileAnimal, fallbackInitial, isAnonymous = false) {
        if (isAnonymous) {
            return '<i class="fas fa-mask"></i>';
        }

        // Handle profileAnimal as object with image property
        if (profileAnimal?.image) {
            return `<img src="${profileAnimal.image}" alt="${profileAnimal.name || 'Avatar'}" class="user-avatar-img" onerror="this.style.display='none'">`;
        }
        
        // Handle profileAnimal as string (animal name)
        if (profileAnimal && typeof profileAnimal === 'string' && this.app?.state?.animals) {
            const animal = this.app.state.animals.find(a => 
                a.name.toLowerCase() === profileAnimal.toLowerCase()
            );
            if (animal?.image) {
                return `<img src="${animal.image}" alt="${profileAnimal}" class="user-avatar-img" onerror="this.parentElement.innerHTML='${fallbackInitial}'">`;
            }
        }

        return fallbackInitial;
    }

    /**
     * Refresh comments (called when user profile is updated)
     */
    refreshComments() {
        if (this.currentAnimal && this.dom.commentsModal?.classList.contains('active')) {
            this.fetchComments(this.currentAnimal._id || this.currentAnimal.id);
        }
    }

    viewAnimalStats(e) {
        const animalName = e.currentTarget.dataset.animalName;
        
        // Switch to stats view
        document.querySelector('[data-view="stats"]').click();
        
        // Wait for view to switch and find the animal
        requestAnimationFrame(() => {
            // Find and click the animal in the grid
            const animalCards = document.querySelectorAll('.animal-card');
            for (const card of animalCards) {
                const nameEl = card.querySelector('.animal-name');
                if (nameEl && nameEl.textContent.trim().toLowerCase() === animalName.toLowerCase()) {
                    card.click();
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    break;
                }
            }
        });
    }
}

// ========================================

