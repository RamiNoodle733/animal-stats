/**
 * ============================================
 * COMMUNITY PAGE ENHANCEMENTS - community-page.js
 * ============================================
 * 
 * Accurate online user tracking and site visit counting.
 * 
 * FEATURES:
 * - Heartbeat-based online user tracking (25s interval)
 * - Duplicate tab detection (best effort via localStorage)
 * - Site visit counter with rate limiting
 * 
 * IMPORTANT BEHAVIOR:
 * - Only runs heartbeat when on Community page
 * - Pauses when tab is hidden (visibilitychange)
 * - Stops when user navigates away from Community view
 */

(function() {
    'use strict';

    const CommunityPageEnhancements = {
        // Heartbeat interval (ms)
        HEARTBEAT_INTERVAL: 25000,
        
        // Online status expiry (ms) - server side is 90s, we use 30s client check
        ONLINE_REFRESH_INTERVAL: 30000,
        
        // Tab ID for duplicate detection
        tabId: null,
        
        // Intervals
        heartbeatInterval: null,
        onlineRefreshInterval: null,
        
        // Track if we've registered this session's visit
        visitRegistered: false,
        
        // Track if currently on community page
        isOnCommunityPage: false,
        
        // Mutation observer for view changes
        viewObserver: null,

        /**
         * Initialize community enhancements
         */
        init() {
            this.tabId = this.generateTabId();
            this.registerTabPresence();
            this.setupVisibilityHandler();
            this.setupViewChangeObserver();
            
            // Only start heartbeat if currently on community page
            this.checkIfOnCommunityPage();
            
            console.log('[Community] Enhancements initialized, tabId:', this.tabId);
        },

        /**
         * Generate unique tab ID
         */
        generateTabId() {
            return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        },

        /**
         * Register this tab in localStorage for duplicate detection
         */
        registerTabPresence() {
            try {
                const tabs = this.getActiveTabs();
                tabs[this.tabId] = Date.now();
                localStorage.setItem('abs_active_tabs', JSON.stringify(tabs));
                
                // Cleanup on unload
                window.addEventListener('beforeunload', () => {
                    this.unregisterTab();
                });
            } catch (e) {
                // localStorage might be disabled
                console.warn('[Community] localStorage not available for tab tracking');
            }
        },

        /**
         * Get active tabs from localStorage
         */
        getActiveTabs() {
            try {
                const stored = localStorage.getItem('abs_active_tabs');
                if (!stored) return {};
                
                const tabs = JSON.parse(stored);
                const now = Date.now();
                const activeTabs = {};
                
                // Keep only tabs active in last 60 seconds
                Object.entries(tabs).forEach(([id, timestamp]) => {
                    if (now - timestamp < 60000) {
                        activeTabs[id] = timestamp;
                    }
                });
                
                return activeTabs;
            } catch (e) {
                return {};
            }
        },

        /**
         * Check if this is a duplicate tab (same user has another tab open)
         */
        isDuplicateTab() {
            const tabs = this.getActiveTabs();
            const tabIds = Object.keys(tabs);
            
            // If there are other tabs besides this one, it's a duplicate
            return tabIds.length > 1 && tabIds.some(id => id !== this.tabId);
        },

        /**
         * Unregister this tab on close
         */
        unregisterTab() {
            try {
                const tabs = this.getActiveTabs();
                delete tabs[this.tabId];
                localStorage.setItem('abs_active_tabs', JSON.stringify(tabs));
            } catch (e) {
                // Ignore
            }
        },

        /**
         * Update this tab's timestamp
         */
        updateTabTimestamp() {
            try {
                const tabs = this.getActiveTabs();
                tabs[this.tabId] = Date.now();
                localStorage.setItem('abs_active_tabs', JSON.stringify(tabs));
            } catch (e) {
                // Ignore
            }
        },

        /**
         * Start heartbeat for presence tracking
         */
        startHeartbeat() {
            // Clear any existing interval
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
            }
            if (this.onlineRefreshInterval) {
                clearInterval(this.onlineRefreshInterval);
            }
            
            // Send initial heartbeat
            this.sendHeartbeat();
            
            // Send heartbeat every 25 seconds
            this.heartbeatInterval = setInterval(() => {
                this.sendHeartbeat();
            }, this.HEARTBEAT_INTERVAL);
            
            // Refresh online count every 30 seconds
            this.onlineRefreshInterval = setInterval(() => {
                this.refreshOnlineCount();
            }, this.ONLINE_REFRESH_INTERVAL);
        },

        /**
         * Stop heartbeat
         */
        stopHeartbeat() {
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
                this.heartbeatInterval = null;
            }
            if (this.onlineRefreshInterval) {
                clearInterval(this.onlineRefreshInterval);
                this.onlineRefreshInterval = null;
            }
        },

        /**
         * Send heartbeat to server
         */
        async sendHeartbeat() {
            // Update local tab timestamp
            this.updateTabTimestamp();
            
            // Only send to server if logged in and not a duplicate tab
            if (!this.isLoggedIn()) {
                return;
            }
            
            // For duplicate tabs, still send but server handles deduplication by user ID
            try {
                const token = this.getAuthToken();
                if (!token) return;
                
                const currentPage = this.getCurrentPage();
                
                await fetch('/api/community?action=ping', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ 
                        page: currentPage,
                        tabId: this.tabId
                    })
                });
            } catch (error) {
                // Silent fail for presence
            }
        },

        /**
         * Refresh online count from server
         */
        async refreshOnlineCount() {
            const countEl = document.getElementById('hud-online-count');
            if (!countEl) return;
            
            try {
                const response = await fetch('/api/community?action=presence');
                if (!response.ok) return;
                
                const result = await response.json();
                const count = result.count || 0;
                
                // Animate number change
                const currentCount = parseInt(countEl.textContent) || 0;
                if (count !== currentCount) {
                    countEl.classList.add('count-updated');
                    countEl.textContent = count;
                    setTimeout(() => countEl.classList.remove('count-updated'), 300);
                }
            } catch (error) {
                // Silent fail
            }
        },

        /**
         * Register a site visit (with rate limiting)
         */
        async registerSiteVisit() {
            if (this.visitRegistered) return;
            
            // Check if we've already registered a visit recently
            try {
                const lastVisit = localStorage.getItem('abs_last_visit');
                const now = Date.now();
                
                // Rate limit: one visit per 30 minutes per browser
                if (lastVisit && (now - parseInt(lastVisit)) < 30 * 60 * 1000) {
                    console.log('[Community] Visit already registered recently');
                    return;
                }
                
                // Register the visit
                await this.incrementSiteVisits();
                
                localStorage.setItem('abs_last_visit', now.toString());
                this.visitRegistered = true;
            } catch (error) {
                console.error('[Community] Error registering visit:', error);
            }
        },

        /**
         * Increment site visits counter
         */
        async incrementSiteVisits() {
            try {
                const response = await fetch('/api/community?action=visit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.totalVisits) {
                        this.updateVisitsDisplay(result.totalVisits);
                    }
                }
            } catch (error) {
                // Silent fail - visit counter is not critical
            }
        },

        /**
         * Update visits display
         */
        updateVisitsDisplay(count) {
            const visitsEl = document.getElementById('hud-total-visits');
            if (visitsEl) {
                visitsEl.textContent = this.formatNumber(count);
            }
        },

        /**
         * Format large numbers
         */
        formatNumber(num) {
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
            if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
            return num.toString();
        },

        /**
         * Handle visibility change (pause/resume heartbeat)
         */
        setupVisibilityHandler() {
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    // Resume heartbeat only if on community page
                    if (this.isOnCommunityPage) {
                        this.sendHeartbeat();
                        this.refreshOnlineCount();
                        this.startHeartbeat();
                    }
                } else {
                    // Pause heartbeat when tab is hidden
                    this.stopHeartbeat();
                }
            });
        },
        
        /**
         * Setup observer to detect view changes
         */
        setupViewChangeObserver() {
            // Watch for class changes on view containers
            const viewsContainer = document.querySelector('.views-container');
            if (!viewsContainer) {
                // Fallback: check periodically
                setInterval(() => this.checkIfOnCommunityPage(), 1000);
                return;
            }
            
            this.viewObserver = new MutationObserver(() => {
                this.checkIfOnCommunityPage();
            });
            
            this.viewObserver.observe(viewsContainer, {
                subtree: true,
                attributes: true,
                attributeFilter: ['class']
            });
        },
        
        /**
         * Check if user is currently on Community page and start/stop accordingly
         */
        checkIfOnCommunityPage() {
            const communityView = document.getElementById('community-view');
            const isNowOnCommunity = communityView && communityView.classList.contains('active-view');
            
            if (isNowOnCommunity && !this.isOnCommunityPage) {
                // Just entered community page
                console.log('[Community] Entered community page, starting heartbeat');
                this.isOnCommunityPage = true;
                this.startHeartbeat();
                this.registerSiteVisit();
            } else if (!isNowOnCommunity && this.isOnCommunityPage) {
                // Just left community page
                console.log('[Community] Left community page, stopping heartbeat');
                this.isOnCommunityPage = false;
                this.stopHeartbeat();
            }
        },

        /**
         * Get current page name
         */
        getCurrentPage() {
            const view = document.querySelector('.view-container.active-view');
            if (!view) return 'unknown';
            
            const id = view.id || '';
            if (id.includes('stats')) return 'stats';
            if (id.includes('compare')) return 'compare';
            if (id.includes('rankings')) return 'rankings';
            if (id.includes('community')) return 'community';
            return 'other';
        },

        /**
         * Check if user is logged in
         */
        isLoggedIn() {
            return typeof Auth !== 'undefined' && Auth.isLoggedIn();
        },

        /**
         * Get auth token
         */
        getAuthToken() {
            if (typeof Auth !== 'undefined' && Auth.getToken) {
                return Auth.getToken();
            }
            return null;
        }
    };

    // Expose globally
    window.CommunityPageEnhancements = CommunityPageEnhancements;

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => CommunityPageEnhancements.init());
    } else {
        CommunityPageEnhancements.init();
    }

})();
