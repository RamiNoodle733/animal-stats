/**
 * Battle Points Shop Manager
 * 
 * Handles the /battlepoints page:
 * - Loading and displaying BP packs from server
 * - Creating Stripe checkout sessions
 * - Handling success/cancel states
 * - Login gating for purchases
 * 
 * Security: All pack data comes from server, only packId sent on purchase
 */

'use strict';

class BattlepointsManager {
    constructor(app) {
        this.app = app;
        this.packs = [];
        this.isLoading = false;
        this.hasLoadedPacks = false;
        
        // DOM elements - cached on init
        this.dom = {};
    }
    
    /**
     * Initialize the manager
     */
    init() {
        this.cacheElements();
        this.bindEvents();
    }
    
    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.dom = {
            view: document.getElementById('battlepoints-view'),
            packsGrid: document.getElementById('bp-packs-grid'),
            balance: document.getElementById('bp-shop-balance'),
            successMessage: document.getElementById('bp-message-success'),
            cancelMessage: document.getElementById('bp-message-cancel'),
            successClose: document.getElementById('bp-message-success-close'),
            cancelClose: document.getElementById('bp-message-cancel-close')
        };
    }
    
    /**
     * Bind event listeners
     */
    bindEvents() {
        // Message close buttons
        this.dom.successClose?.addEventListener('click', () => {
            this.dom.successMessage.style.display = 'none';
            this.clearUrlParams();
        });
        
        this.dom.cancelClose?.addEventListener('click', () => {
            this.dom.cancelMessage.style.display = 'none';
            this.clearUrlParams();
        });
        
        // Pack grid click delegation
        this.dom.packsGrid?.addEventListener('click', (e) => {
            const buyBtn = e.target.closest('.bp-pack-btn');
            if (buyBtn && !buyBtn.disabled) {
                const packId = buyBtn.dataset.packId;
                this.handleBuyClick(packId, buyBtn);
            }
        });
    }
    
    /**
     * Called when entering the battlepoints view
     */
    async onViewEnter() {
        // Update balance display
        this.updateBalanceDisplay();
        
        // Load packs if not loaded
        if (!this.hasLoadedPacks) {
            await this.loadPacks();
        }
        
        // Check for success/cancel URL params
        this.checkUrlParams();
    }
    
    /**
     * Update the balance display
     */
    updateBalanceDisplay() {
        if (!this.dom.balance) return;
        
        const user = window.Auth?.getUser();
        const bp = user?.battlePoints || 0;
        this.dom.balance.textContent = bp.toLocaleString();
    }
    
    /**
     * Load BP packs from server
     */
    async loadPacks() {
        if (this.isLoading) return;
        this.isLoading = true;
        
        try {
            const response = await fetch('/api/battlepoints?action=packs');
            const result = await response.json();
            
            if (result.success && result.packs) {
                this.packs = result.packs;
                this.renderPacks();
                this.hasLoadedPacks = true;
            } else {
                this.showPacksError('Failed to load packs');
            }
        } catch (error) {
            console.error('Error loading packs:', error);
            this.showPacksError('Unable to connect to server');
        } finally {
            this.isLoading = false;
        }
    }
    
    /**
     * Render the packs grid
     */
    renderPacks() {
        if (!this.dom.packsGrid) return;
        
        if (this.packs.length === 0) {
            this.dom.packsGrid.innerHTML = `
                <div class="bp-packs-loading">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>No packs available</span>
                </div>
            `;
            return;
        }
        
        const packsHtml = this.packs.map(pack => this.renderPackCard(pack)).join('');
        this.dom.packsGrid.innerHTML = packsHtml;
    }
    
    /**
     * Render a single pack card
     */
    renderPackCard(pack) {
        const ribbonHtml = pack.ribbon 
            ? `<div class="bp-pack-ribbon">${pack.ribbon}</div>` 
            : '';
        
        const bestValueClass = pack.isBestValue ? 'best-value' : '';
        
        return `
            <div class="bp-pack-card ${bestValueClass}">
                ${ribbonHtml}
                <div class="bp-pack-icon">
                    <div class="bp-pack-coin">
                        <span class="bp-icon">⚔</span>
                    </div>
                </div>
                <div class="bp-pack-amount">${pack.bpAmount.toLocaleString()}</div>
                <div class="bp-pack-label">Battle Points</div>
                <div class="bp-pack-price">${pack.priceDisplay}</div>
                <button class="bp-pack-btn" data-pack-id="${pack.id}">
                    BUY NOW
                </button>
            </div>
        `;
    }
    
    /**
     * Show error in packs grid
     */
    showPacksError(message) {
        if (!this.dom.packsGrid) return;
        
        this.dom.packsGrid.innerHTML = `
            <div class="bp-packs-loading">
                <i class="fas fa-exclamation-triangle" style="color: #ff6b6b;"></i>
                <span>${message}</span>
                <button onclick="window.battlepointsManager.loadPacks()" 
                        style="margin-top: 12px; padding: 8px 16px; background: var(--primary-color); border: none; border-radius: 6px; color: #fff; cursor: pointer;">
                    Try Again
                </button>
            </div>
        `;
    }
    
    /**
     * Handle buy button click
     */
    async handleBuyClick(packId, buttonEl) {
        // Check if logged in
        if (!window.Auth || !window.Auth.isLoggedIn()) {
            this.promptLogin();
            return;
        }
        
        // Disable button and show loading
        buttonEl.disabled = true;
        buttonEl.classList.add('loading');
        const originalText = buttonEl.textContent;
        buttonEl.textContent = 'PROCESSING';
        
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('/api/battlepoints?action=checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ packId })
            });
            
            const result = await response.json();
            
            if (result.success && result.checkoutUrl) {
                // Redirect to Stripe Checkout
                window.location.href = result.checkoutUrl;
            } else if (result.requiresLogin) {
                this.promptLogin();
            } else {
                this.showToast(result.error || 'Failed to start checkout', 'error');
                // Re-enable button
                buttonEl.disabled = false;
                buttonEl.classList.remove('loading');
                buttonEl.textContent = originalText;
            }
        } catch (error) {
            console.error('Checkout error:', error);
            this.showToast('Connection error. Please try again.', 'error');
            // Re-enable button
            buttonEl.disabled = false;
            buttonEl.classList.remove('loading');
            buttonEl.textContent = originalText;
        }
    }
    
    /**
     * Prompt user to log in
     */
    promptLogin() {
        // Store return URL
        if (window.Auth) {
            window.Auth.returnUrl = '/battlepoints';
        }
        
        // Navigate to login
        if (window.Router) {
            window.Router.navigate('/login');
        }
    }
    
    /**
     * Check URL params for success/cancel
     */
    checkUrlParams() {
        const params = new URLSearchParams(window.location.search);
        
        if (params.get('success') === '1') {
            this.showSuccessMessage();
            // Refresh user data to get updated BP
            this.refreshUserData();
        } else if (params.get('canceled') === '1') {
            this.showCancelMessage();
        }
    }
    
    /**
     * Clear URL params without reload
     */
    clearUrlParams() {
        const url = new URL(window.location);
        url.searchParams.delete('success');
        url.searchParams.delete('canceled');
        url.searchParams.delete('session_id');
        window.history.replaceState({}, '', url);
    }
    
    /**
     * Show success message
     */
    showSuccessMessage() {
        if (this.dom.successMessage) {
            this.dom.successMessage.style.display = 'flex';
        }
        if (this.dom.cancelMessage) {
            this.dom.cancelMessage.style.display = 'none';
        }
    }
    
    /**
     * Show cancel message
     */
    showCancelMessage() {
        if (this.dom.cancelMessage) {
            this.dom.cancelMessage.style.display = 'flex';
        }
        if (this.dom.successMessage) {
            this.dom.successMessage.style.display = 'none';
        }
    }
    
    /**
     * Refresh user data from server
     */
    async refreshUserData() {
        if (!window.Auth || !window.Auth.isLoggedIn()) return;
        
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('/api/auth?action=me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const result = await response.json();
            
            if (result.success && result.data?.user) {
                // Update Auth user data
                window.Auth.user = result.data.user;
                
                // Update all BP displays
                this.updateBalanceDisplay();
                window.Auth.updateUserStatsBar();
            }
        } catch (error) {
            console.error('Error refreshing user data:', error);
        }
    }
    
    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        if (window.Auth && window.Auth.showToast) {
            window.Auth.showToast(message, type);
        } else {
            // Fallback
            alert(message);
        }
    }
}

// Create global instance
window.BattlepointsManager = BattlepointsManager;
