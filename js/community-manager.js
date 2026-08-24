/**
 * ============================================
 * COMMUNITY PAGE - community.js (Manager)
 * ============================================
 * Handles: Community page, location analytics, comments feed, and discussion
 * DOM Container: #community-view
 */

'use strict';

// SECTION: COMMUNITY MANAGER
// ========================================
// Handles: Community page, location analytics, comments feed, and discussion
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
        this.currentTab = 'map';
        
        // Hub features
        this.presenceInterval = null;
        this.hubRefreshInterval = null;
        this.replyingTo = null; // For chat replies

        // Globe analytics module
        this.globe = null;
        this.globeRefreshInterval = null;
        this.lastGlobePayload = null;
        this.selectedGlobeKey = null;
        this.globeMode = 'globe';
        this.globeModeBound = false;
        this.globeDirectoryBound = false;
        this.globeControlsBound = false;
        this.globeCityFilter = '';
        this.globeTrendRange = 'all';
        this.currentGlobePointData = null;
        this.ownerAnalyticsData = null;
        this.ownerAnalyticsFilters = {
            eventType: '',
            user: '',
            from: '',
            to: '',
            deliveryStatus: ''
        };
        this.globeCharts = {
            trend: null,
            country: null
        };
        this.numberFormatter = new Intl.NumberFormat();
    }

    init() {
        this.setupEventListeners();
        this.updateLoginState();
        // Load community totals and location analytics.
        this.loadSiteStats();
        this.loadOnlineCount();
        this.initGlobeModule();
        
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
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                if (!tabName) return;

                if (window.AudioManager) {
                    AudioManager.click();
                }

                if (window.Router) {
                    const targetPath = this.getRouteForTab(tabName);
                    if (window.location.pathname !== targetPath) {
                        window.Router.navigate(targetPath);
                        return;
                    }
                }

                this.switchTab(tabName, { silent: true });
            });
        });

        document.getElementById('globe-open-map-btn')?.addEventListener('click', () => {
            if (window.Router) {
                window.Router.navigate('/community/map');
            } else {
                this.switchTab('map');
            }
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
        
        // Mobile sidebar toggle
        const mobileSidebarToggle = document.getElementById('mobile-sidebar-toggle');
        if (mobileSidebarToggle) {
            mobileSidebarToggle.addEventListener('click', () => this.toggleMobileSidebar());
        }
    }

    normalizeTabName(tabName) {
        const rawTab = typeof tabName === 'string' ? tabName.toLowerCase() : 'map';
        if (rawTab === 'hub') return 'map';
        return new Set(['map', 'feed', 'chat']).has(rawTab) ? rawTab : 'map';
    }

    getRouteForTab(tabName) {
        return `/community/${this.normalizeTabName(tabName)}`;
    }

    ensureActiveTabVisible(tabName, smooth = true) {
        const tabBar = document.querySelector('#community-view .community-tab-bar');
        if (!tabBar) return;

        const tabBtn = tabBar.querySelector(`.community-tab-btn[data-tab="${tabName}"]`);
        if (!tabBtn) return;

        tabBtn.scrollIntoView({
            behavior: smooth ? 'smooth' : 'auto',
            block: 'nearest',
            inline: 'center'
        });
    }

    scheduleGlobeResize() {
        if (!this.globe) return;

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.globe?.resize?.();
            });
        });
    }
    
    toggleMobileSidebar() {
        const sidebar = document.querySelector('.community-sidebar-column');
        if (sidebar) {
            sidebar.classList.toggle('mobile-visible');
        }
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

    // ==================== GLOBE ANALYTICS ====================

    initGlobeModule() {
        const canvas = document.getElementById('community-globe-canvas');
        const empty = document.getElementById('community-globe-empty');
        if (!canvas) return;

        if (!window.CommunityGlobe) {
            if (empty) {
                empty.textContent = 'Globe module failed to load.';
                empty.style.display = 'flex';
            }
            return;
        }

        if (!this.globe) {
            try {
                this.globe = new window.CommunityGlobe(canvas, {
                    tooltipEl: document.getElementById('community-globe-tooltip')
                });
            } catch (error) {
                console.error('Failed to initialize community globe:', error);
                if (empty) {
                    empty.textContent = 'Globe unavailable on this device.';
                    empty.style.display = 'flex';
                }
                return;
            }

            this.globe.setOnPointSelect((point) => {
                this.selectedGlobeKey = point?.key || null;
                this.loadGlobePointDetails(this.selectedGlobeKey);
                this.highlightSelectedCityRow();
            });

            requestAnimationFrame(() => this.globe?.resize?.());
        }

        this.bindGlobeModeSwitch();
        this.bindGlobeDirectoryControls();
        this.bindGlobeAnalyticsControls();
        this.applyGlobeMode(this.globeMode);

        this.loadGlobeAnalytics();
        this.startGlobeRefresh();
    }

    bindGlobeModeSwitch() {
        if (this.globeModeBound) return;

        const modeButtons = document.querySelectorAll('.globe-mode-btn');
        if (!modeButtons.length) return;

        modeButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const mode = button.dataset.mode;
                if (mode) {
                    this.applyGlobeMode(mode);
                }
            });
        });

        this.globeModeBound = true;
    }

    bindGlobeDirectoryControls() {
        if (this.globeDirectoryBound) return;

        const searchInput = document.getElementById('globe-city-search');
        if (!searchInput) return;

        searchInput.addEventListener('input', (event) => {
            this.globeCityFilter = String(event.target.value || '').trim().toLowerCase();
            this.renderGlobeCityDirectory(this.lastGlobePayload?.points || []);
        });

        this.globeDirectoryBound = true;
    }

    bindGlobeAnalyticsControls() {
        if (this.globeControlsBound) return;

        const trendRange = document.getElementById('globe-trend-range');
        if (trendRange) {
            trendRange.value = this.globeTrendRange;
            trendRange.addEventListener('change', (event) => {
                const nextRange = String(event.target.value || 'all').toLowerCase();
                this.globeTrendRange = ['all', '14d', '30d', '90d', '365d'].includes(nextRange) ? nextRange : 'all';
                this.updateGlobeContextChips();
                this.loadGlobeAnalytics();
            });
        }

        this.updateGlobeContextChips();
        this.globeControlsBound = true;
    }

    applyGlobeMode(mode) {
        const normalized = mode === 'flat' ? 'flat' : 'globe';
        this.globeMode = normalized;
        this.globe?.setMode?.(normalized);

        document.querySelectorAll('.globe-mode-btn').forEach((button) => {
            button.classList.toggle('active', button.dataset.mode === normalized);
        });
    }

    startGlobeRefresh() {
        this.stopGlobeRefresh();
        this.globeRefreshInterval = setInterval(() => {
            const canvas = document.getElementById('community-globe-canvas');
            if (document.visibilityState === 'visible' && canvas?.offsetParent !== null) {
                this.loadGlobeAnalytics({ silent: true });
            }
        }, 60000);
    }

    stopGlobeRefresh() {
        if (this.globeRefreshInterval) {
            clearInterval(this.globeRefreshInterval);
            this.globeRefreshInterval = null;
        }
    }

    async loadGlobeAnalytics(options = {}) {
        const { silent = false } = options;
        const empty = document.getElementById('community-globe-empty');

        if (!silent && empty) {
            empty.style.display = 'flex';
            empty.textContent = 'Loading global activity...';
        }

        try {
            const query = new URLSearchParams({
                action: 'globe',
                range: this.globeTrendRange || 'all'
            });
            const response = await fetch(`/api/community?${query.toString()}`);
            if (!response.ok) throw new Error('Failed to load globe analytics');

            const result = await response.json();
            const payload = result.data || {};
            this.lastGlobePayload = payload;

            if (this.globe) {
                this.globe.setPoints(payload.points || []);
            }

            this.renderGlobeSummary(payload);
            this.renderGlobeBreakdown('globe-actions-list', payload.actions || []);
            this.renderGlobeBreakdown('globe-pages-list', payload.pages || []);
            this.renderGlobeInsights(payload);
            this.renderGlobeTrendChart(payload.trend || []);
            this.renderGlobeCountryChart(payload.points || []);
            this.renderGlobeCityDirectory(payload.points || []);
            this.updateGlobeContextChips(payload.trendRange);

            if (empty) {
                empty.style.display = 'none';
            }

            if (!this.selectedGlobeKey && Auth.user?.role === 'admin') {
                this.loadOwnerAnalyticsOverview();
            }
        } catch (error) {
            console.error('Error loading globe analytics:', error);
            if (empty) {
                empty.style.display = 'flex';
                empty.textContent = 'Unable to load globe analytics.';
            }
        }
    }

    renderGlobeSummary(payload) {
        const summary = payload.summary || {};
        const windows = payload.windows || {};

        const mappings = [
            ['globe-total-events', summary.totalEvents],
            ['globe-total-visits', summary.totalVisits],
            ['globe-total-visitors', summary.uniqueVisitors],
            ['globe-window-24h', windows.last24h],
            ['globe-window-7d', windows.last7d],
            ['globe-window-30d', windows.last30d]
        ];

        mappings.forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = this.formatExactNumber(value || 0);
            }
        });
    }

    renderGlobeInsights(payload) {
        const points = Array.isArray(payload.points) ? payload.points : [];
        const windows = payload.windows || {};

        const hottest = points[0] || null;
        const hottestLabel = hottest
            ? (hottest.locationRaw || [hottest.city, hottest.region, hottest.country].filter(Boolean).join(', ') || 'Unknown')
            : 'No data';

        const countryTotals = points.reduce((acc, point) => {
            const country = (point.country || 'Unknown').trim() || 'Unknown';
            acc[country] = (acc[country] || 0) + (Number(point.totalEvents) || 0);
            return acc;
        }, {});

        const topCountryEntry = Object.entries(countryTotals)
            .sort((a, b) => b[1] - a[1])[0];
        const topCountryLabel = topCountryEntry
            ? `${topCountryEntry[0]} (${this.formatExactNumber(topCountryEntry[1])})`
            : 'No data';

        const last24h = Number(windows.last24h) || 0;
        const last7d = Number(windows.last7d) || 0;
        const weeklyPace = last7d > 0 ? (last24h * 7) / last7d : 0;
        const momentumLabel = last7d > 0
            ? `${weeklyPace.toFixed(2)}x weekly pace`
            : 'No weekly baseline';

        this.updateInsightValue('globe-insight-hottest', hottestLabel);
        this.updateInsightValue('globe-insight-country', topCountryLabel);
        this.updateInsightValue('globe-insight-momentum', momentumLabel);
    }

    updateInsightValue(id, value) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = value;
        }
    }

    renderGlobeTrendChart(trend) {
        const canvas = document.getElementById('globe-trend-chart');
        if (!canvas) return;

        if (!Array.isArray(trend) || trend.length === 0 || !window.Chart) {
            this.destroyGlobeChart('trend');
            this.renderChartFallback(canvas, 'Trend chart unavailable');
            return;
        }

        const labels = trend.map((item) => {
            const date = new Date(`${item.day}T00:00:00`);
            if (Number.isNaN(date.getTime())) return item.day;
            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        });

        const events = trend.map(item => Number(item.events) || 0);
        const visits = trend.map(item => Number(item.visits) || 0);

        this.destroyGlobeChart('trend');

        this.globeCharts.trend = new window.Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Events',
                        data: events,
                        borderColor: 'rgba(0, 212, 255, 0.95)',
                        backgroundColor: 'rgba(0, 212, 255, 0.2)',
                        fill: true,
                        tension: 0.34,
                        borderWidth: 2,
                        pointRadius: 2.4,
                        pointHoverRadius: 4
                    },
                    {
                        label: 'Visits',
                        data: visits,
                        borderColor: 'rgba(255, 155, 0, 0.95)',
                        backgroundColor: 'rgba(255, 155, 0, 0.15)',
                        fill: false,
                        tension: 0.28,
                        borderWidth: 1.8,
                        pointRadius: 2,
                        pointHoverRadius: 3.8
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: 'rgba(206, 235, 247, 0.88)',
                            boxWidth: 10,
                            boxHeight: 10,
                            font: { size: 10 }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: 'rgba(174, 211, 227, 0.72)',
                            maxRotation: 0,
                            autoSkip: true,
                            font: { size: 9 }
                        },
                        grid: {
                            color: 'rgba(80, 128, 148, 0.18)'
                        }
                    },
                    y: {
                        ticks: {
                            color: 'rgba(174, 211, 227, 0.72)',
                            precision: 0,
                            font: { size: 9 }
                        },
                        grid: {
                            color: 'rgba(80, 128, 148, 0.18)'
                        }
                    }
                }
            }
        });

        const title = document.getElementById('globe-trend-title');
        if (title) {
            title.textContent = `Activity Trend (${this.formatTrendRangeLabel(this.globeTrendRange)})`;
        }
    }

    renderGlobeCountryChart(points) {
        const canvas = document.getElementById('globe-country-chart');
        if (!canvas) return;

        if (!Array.isArray(points) || points.length === 0 || !window.Chart) {
            this.destroyGlobeChart('country');
            this.renderChartFallback(canvas, 'Country chart unavailable');
            return;
        }

        const countryTotals = points.reduce((acc, point) => {
            const country = (point.country || 'Unknown').trim() || 'Unknown';
            acc[country] = (acc[country] || 0) + (Number(point.totalEvents) || 0);
            return acc;
        }, {});

        const topCountries = Object.entries(countryTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);

        if (!topCountries.length) {
            this.destroyGlobeChart('country');
            this.renderChartFallback(canvas, 'Country chart unavailable');
            return;
        }

        this.destroyGlobeChart('country');

        this.globeCharts.country = new window.Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: topCountries.map(([country]) => country),
                datasets: [{
                    label: 'Events',
                    data: topCountries.map(([, count]) => count),
                    backgroundColor: [
                        'rgba(0, 212, 255, 0.85)',
                        'rgba(51, 202, 255, 0.8)',
                        'rgba(103, 191, 255, 0.75)',
                        'rgba(145, 180, 255, 0.7)',
                        'rgba(185, 170, 255, 0.65)',
                        'rgba(255, 158, 116, 0.7)',
                        'rgba(255, 188, 92, 0.72)',
                        'rgba(255, 220, 102, 0.74)'
                    ],
                    borderColor: 'rgba(12, 32, 44, 0.9)',
                    borderWidth: 1,
                    borderRadius: 5,
                    barThickness: 12
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        ticks: {
                            color: 'rgba(174, 211, 227, 0.72)',
                            precision: 0,
                            font: { size: 9 }
                        },
                        grid: {
                            color: 'rgba(80, 128, 148, 0.16)'
                        }
                    },
                    y: {
                        ticks: {
                            color: 'rgba(206, 235, 247, 0.88)',
                            font: { size: 9 }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    renderChartFallback(canvas, message) {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.clientWidth || 320;
        const height = canvas.clientHeight || 140;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);

        ctx.fillStyle = 'rgba(170, 211, 229, 0.75)';
        ctx.font = '12px Rajdhani, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(message, width / 2, height / 2);
    }

    renderGlobeCityDirectory(points) {
        const listEl = document.getElementById('globe-city-list');
        const countEl = document.getElementById('globe-city-count');
        if (!listEl || !countEl) return;

        const normalizedFilter = this.globeCityFilter;
        const normalizedPoints = Array.isArray(points)
            ? points
                .filter(point => point && point.key)
                .map((point) => {
                    const label = point.locationRaw || [point.city, point.region, point.country].filter(Boolean).join(', ') || 'Unknown location';
                    return {
                        ...point,
                        label,
                        searchText: `${label} ${point.country || ''} ${point.region || ''} ${point.city || ''}`.toLowerCase()
                    };
                })
            : [];

        const filtered = normalizedFilter
            ? normalizedPoints.filter(point => point.searchText.includes(normalizedFilter))
            : normalizedPoints;

        countEl.textContent = `${filtered.length} locations`;

        if (!filtered.length) {
            listEl.innerHTML = '<div class="globe-directory-empty">No locations match the current filter.</div>';
            return;
        }

        listEl.innerHTML = filtered.slice(0, 250).map((point) => {
            const isActive = this.selectedGlobeKey && point.key === this.selectedGlobeKey;
            return `
                <button type="button" class="globe-city-row ${isActive ? 'active' : ''}" data-location-key="${this.escapeHtml(point.key)}" aria-pressed="${isActive ? 'true' : 'false'}">
                    <span class="globe-city-label">${this.escapeHtml(point.label)}</span>
                    <span class="globe-city-metrics">
                        ${this.formatExactNumber(point.totalEvents || 0)} events • ${this.formatExactNumber(point.totalVisits || 0)} visits
                    </span>
                </button>
            `;
        }).join('');

        listEl.querySelectorAll('.globe-city-row').forEach((row) => {
            row.addEventListener('click', () => {
                const key = row.dataset.locationKey;
                if (!key) return;

                this.selectedGlobeKey = key;
                this.loadGlobePointDetails(key);
                this.highlightSelectedCityRow();
                this.updateGlobeContextChips();
            });
        });

        this.highlightSelectedCityRow();
    }

    highlightSelectedCityRow() {
        const listEl = document.getElementById('globe-city-list');
        if (!listEl) return;

        const selectedKey = this.selectedGlobeKey || '';
        listEl.querySelectorAll('.globe-city-row').forEach((row) => {
            const isActive = row.dataset.locationKey === selectedKey;
            row.classList.toggle('active', isActive);
            row.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });

        this.updateGlobeContextChips();
    }

    destroyGlobeChart(chartKey) {
        const chart = this.globeCharts[chartKey];
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
        this.globeCharts[chartKey] = null;
    }

    destroyGlobeCharts() {
        this.destroyGlobeChart('trend');
        this.destroyGlobeChart('country');
    }

    renderGlobeBreakdown(containerId, items) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!Array.isArray(items) || items.length === 0) {
            container.innerHTML = '<div class="globe-breakdown-empty">No data</div>';
            return;
        }

        container.innerHTML = items.slice(0, 6).map(item => {
            const label = this.escapeHtml(item.key || 'Unknown');
            const count = this.formatExactNumber(item.count || 0);
            return `
                <div class="globe-breakdown-item">
                    <span class="globe-breakdown-label">${label}</span>
                    <span class="globe-breakdown-value">${count}</span>
                </div>
            `;
        }).join('');
    }

    async loadGlobePointDetails(locationKey) {
        const detailsEl = document.getElementById('globe-point-details');
        if (!detailsEl || !locationKey) return;

        this.selectedGlobeKey = locationKey;
        this.highlightSelectedCityRow();

        detailsEl.innerHTML = '<div class="globe-point-loading"><i class="fas fa-spinner fa-spin"></i> Loading location details...</div>';

        try {
            const response = await fetch(`/api/community?action=globe-point&key=${encodeURIComponent(locationKey)}`);
            if (!response.ok) throw new Error('Failed to load point details');

            const result = await response.json();
            this.currentGlobePointData = result.data || {};
            let ownerAnalytics = null;

            if (Auth.user?.role === 'admin') {
                const token = Auth.getToken();
                const ownerQuery = this.buildOwnerAnalyticsQuery({ key: locationKey });
                const ownerResponse = await fetch(`/api/admin/analytics?${ownerQuery.toString()}`, {
                    credentials: 'same-origin',
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                });

                if (ownerResponse.ok) {
                    const ownerResult = await ownerResponse.json();
                    ownerAnalytics = ownerResult.data || null;
                }
            }

            this.ownerAnalyticsData = ownerAnalytics;
            this.renderGlobePointDetails(this.currentGlobePointData, ownerAnalytics);
        } catch (error) {
            console.error('Error loading point details:', error);
            detailsEl.innerHTML = '<div class="globe-point-error">Failed to load location detail.</div>';
        }
    }

    async loadOwnerAnalyticsOverview() {
        const detailsEl = document.getElementById('globe-point-details');
        if (!detailsEl || Auth.user?.role !== 'admin') return;

        const token = Auth.getToken();
        try {
            const ownerQuery = this.buildOwnerAnalyticsQuery();
            const response = await fetch(`/api/admin/analytics?${ownerQuery.toString()}`, {
                credentials: 'same-origin',
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (!response.ok) return;

            const result = await response.json();
            this.ownerAnalyticsData = result.data || null;
            detailsEl.innerHTML = `
                <div class="globe-point-placeholder">Select an anonymous hotspot for location totals, or use the private admin stream below.</div>
                ${this.renderOwnerAnalytics(this.ownerAnalyticsData)}
            `;
            this.bindOwnerAnalyticsControls();
        } catch (error) {
            console.error('Error loading owner analytics:', error);
        }
    }

    renderGlobePointDetails(data, ownerAnalytics = null) {
        const detailsEl = document.getElementById('globe-point-details');
        if (!detailsEl) return;

        const summary = data.summary || {};
        const place = summary.locationRaw || [summary.city, summary.region, summary.country].filter(Boolean).join(', ') || 'Unknown location';
        const actions = Array.isArray(data.actions) ? data.actions.slice(0, 5) : [];
        const pages = Array.isArray(data.pages) ? data.pages.slice(0, 5) : [];
        const devices = Array.isArray(data.devices) ? data.devices.slice(0, 4) : [];

        detailsEl.innerHTML = `
            <div class="globe-point-header">
                <div class="globe-point-place">${this.escapeHtml(place)}</div>
                <div class="globe-point-time">Last seen ${this.formatDateTime(summary.lastSeen)}</div>
            </div>
            <div class="globe-point-totals">
                <div><span>Events</span><strong>${this.formatExactNumber(summary.totalEvents || 0)}</strong></div>
                <div><span>Visits</span><strong>${this.formatExactNumber(summary.totalVisits || 0)}</strong></div>
                <div><span>Visitors</span><strong>${this.formatExactNumber(summary.uniqueVisitors || 0)}</strong></div>
            </div>
            <div class="globe-point-grid">
                <div class="globe-point-col">
                    <h5>Actions</h5>
                    ${this.renderMiniList(actions)}
                </div>
                <div class="globe-point-col">
                    <h5>Pages</h5>
                    ${this.renderMiniList(pages)}
                </div>
                <div class="globe-point-col">
                    <h5>Devices</h5>
                    ${this.renderDeviceList(devices)}
                </div>
            </div>
            ${this.renderOwnerAnalytics(ownerAnalytics)}
        `;

        this.bindOwnerAnalyticsControls();
        this.updateGlobeContextChips();
    }

    buildOwnerAnalyticsQuery({ key = this.selectedGlobeKey, cursor = '' } = {}) {
        const query = new URLSearchParams({ limit: '25' });
        if (key) query.set('key', key);
        if (cursor) query.set('cursor', cursor);
        Object.entries(this.ownerAnalyticsFilters).forEach(([name, value]) => {
            if (value) query.set(name, value);
        });
        return query;
    }

    async refreshOwnerAnalytics({ append = false } = {}) {
        if (Auth.user?.role !== 'admin') return;
        const token = Auth.getToken();
        const cursor = append ? this.ownerAnalyticsData?.nextCursor : '';
        if (append && !cursor) return;

        try {
            const query = this.buildOwnerAnalyticsQuery({ cursor });
            const response = await fetch(`/api/admin/analytics?${query.toString()}`, {
                credentials: 'same-origin',
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (!response.ok) throw new Error('Failed to load owner analytics');
            const result = await response.json();
            const nextData = result.data || { events: [], nextCursor: null };
            if (append) {
                nextData.events = [...(this.ownerAnalyticsData?.events || []), ...(nextData.events || [])];
            }
            this.ownerAnalyticsData = nextData;

            const detailsEl = document.getElementById('globe-point-details');
            if (this.selectedGlobeKey && this.currentGlobePointData) {
                this.renderGlobePointDetails(this.currentGlobePointData, nextData);
            } else if (detailsEl) {
                detailsEl.innerHTML = `
                    <div class="globe-point-placeholder">Select an anonymous hotspot for location totals, or use the private admin stream below.</div>
                    ${this.renderOwnerAnalytics(nextData)}
                `;
                this.bindOwnerAnalyticsControls();
            }
        } catch (error) {
            console.error('Error refreshing owner analytics:', error);
        }
    }

    renderOwnerAnalytics(ownerAnalytics) {
        const events = Array.isArray(ownerAnalytics?.events) ? ownerAnalytics.events : [];
        if (Auth.user?.role !== 'admin') return '';

        const rows = events.map((event) => {
            const environment = [event.device, event.browser, event.os].filter(Boolean).join(' • ');
            const detailText = Object.entries(event.details || {})
                .map(([key, value]) => {
                    const printable = typeof value === 'object' ? JSON.stringify(value) : String(value);
                    return `${key}: ${printable}`;
                })
                .join(' • ')
                .slice(0, 500);

            return `
                <div class="globe-owner-event">
                    <div class="globe-owner-event-heading">
                        <strong>${this.escapeHtml(event.username || 'Anonymous')}</strong>
                        <span>${this.escapeHtml(event.eventType || 'event')} • ${this.escapeHtml(this.formatDateTime(event.occurredAt))}</span>
                    </div>
                    <div>${this.escapeHtml(event.page || '/')} ${environment ? `• ${this.escapeHtml(environment)}` : ''}</div>
                    ${event.referrer ? `<div>Referrer: ${this.escapeHtml(event.referrer)}</div>` : ''}
                    ${event.screenSize || event.language ? `<div>${this.escapeHtml([event.screenSize, event.language].filter(Boolean).join(' • '))}</div>` : ''}
                    ${event.discordDelivery ? `<div>Discord: ${this.escapeHtml(event.discordDelivery.status || 'legacy')} • ${this.formatExactNumber(event.discordDelivery.attempts || 0)} attempts${event.discordDelivery.lastError ? ` • ${this.escapeHtml(event.discordDelivery.lastError)}` : ''}</div>` : '<div>Discord: legacy event</div>'}
                    ${detailText ? `<div>${this.escapeHtml(detailText)}</div>` : ''}
                    ${event.discordDelivery?.status === 'failed' ? `<button type="button" class="globe-owner-retry" data-activity-id="${this.escapeHtml(event.id)}">Retry Discord</button>` : ''}
                </div>
            `;
        }).join('');

        const filters = this.ownerAnalyticsFilters;
        const selectedScope = this.selectedGlobeKey ? 'Selected location' : 'All locations';

        return `
            <section class="globe-owner-analytics" aria-label="Owner-only detailed analytics">
                <div class="globe-owner-heading">
                    <strong>Owner-only latest events</strong>
                    <span>${selectedScope} • sanitized • ${events.length} shown</span>
                </div>
                <form class="globe-owner-filters" id="globe-owner-filters">
                    <input name="eventType" value="${this.escapeHtml(filters.eventType)}" placeholder="Event type">
                    <input name="user" value="${this.escapeHtml(filters.user)}" placeholder="Username">
                    <input name="from" value="${this.escapeHtml(filters.from)}" type="date" aria-label="From date">
                    <input name="to" value="${this.escapeHtml(filters.to)}" type="date" aria-label="To date">
                    <select name="deliveryStatus" aria-label="Discord delivery status">
                        <option value="">All Discord states</option>
                        ${['pending', 'sent', 'failed'].map(status => `<option value="${status}" ${filters.deliveryStatus === status ? 'selected' : ''}>${this.escapeHtml(status)}</option>`).join('')}
                    </select>
                    <button type="submit">Apply</button>
                    <button type="button" data-owner-clear>Clear</button>
                </form>
                <div class="globe-owner-events">${rows || '<div class="globe-mini-empty">No private events match these filters.</div>'}</div>
                ${ownerAnalytics?.nextCursor ? '<button type="button" class="globe-owner-load-more" data-owner-load-more>Load more</button>' : ''}
            </section>
        `;
    }

    bindOwnerAnalyticsControls() {
        const form = document.getElementById('globe-owner-filters');
        if (!form) return;

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const formData = new FormData(form);
            Object.keys(this.ownerAnalyticsFilters).forEach((name) => {
                this.ownerAnalyticsFilters[name] = String(formData.get(name) || '').trim();
            });
            this.refreshOwnerAnalytics();
        });

        form.querySelector('[data-owner-clear]')?.addEventListener('click', () => {
            Object.keys(this.ownerAnalyticsFilters).forEach((name) => {
                this.ownerAnalyticsFilters[name] = '';
            });
            this.refreshOwnerAnalytics();
        });

        document.querySelector('[data-owner-load-more]')?.addEventListener('click', () => {
            this.refreshOwnerAnalytics({ append: true });
        });

        document.querySelectorAll('.globe-owner-retry').forEach((button) => {
            button.addEventListener('click', async () => {
                const id = button.dataset.activityId;
                const token = Auth.getToken();
                button.disabled = true;
                try {
                    const response = await fetch('/api/admin/discord-retry', {
                        method: 'POST',
                        credentials: 'same-origin',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { Authorization: `Bearer ${token}` } : {})
                        },
                        body: JSON.stringify({ ids: [id] })
                    });
                    if (!response.ok) throw new Error('Discord retry failed');
                    await this.refreshOwnerAnalytics();
                } catch (error) {
                    console.error('Error retrying Discord delivery:', error);
                    button.disabled = false;
                }
            });
        });
    }

    renderMiniList(items) {
        if (!items.length) return '<div class="globe-mini-empty">No data</div>';

        return items.map(item => `
            <div class="globe-mini-item">
                <span>${this.escapeHtml(item.key || 'Unknown')}</span>
                <strong>${this.formatExactNumber(item.count || 0)}</strong>
            </div>
        `).join('');
    }

    renderDeviceList(items) {
        if (!items.length) return '<div class="globe-mini-empty">No data</div>';

        return items.map(item => {
            const label = [item.device, item.browser, item.os].filter(Boolean).join(' • ') || 'Unknown';
            return `
                <div class="globe-mini-item">
                    <span>${this.escapeHtml(label)}</span>
                    <strong>${this.formatExactNumber(item.count || 0)}</strong>
                </div>
            `;
        }).join('');
    }

    updateGlobeContextChips(serverRange = null) {
        if (serverRange && ['all', '14d', '30d', '90d', '365d'].includes(serverRange)) {
            this.globeTrendRange = serverRange;
        }

        const rangeSelect = document.getElementById('globe-trend-range');
        if (rangeSelect && rangeSelect.value !== this.globeTrendRange) {
            rangeSelect.value = this.globeTrendRange;
        }

        const trendTitle = document.getElementById('globe-trend-title');
        if (trendTitle) {
            trendTitle.textContent = `Activity Trend (${this.formatTrendRangeLabel(this.globeTrendRange)})`;
        }

        const locationScope = document.getElementById('globe-location-scope');
        if (locationScope) {
            const selectedPoint = (this.lastGlobePayload?.points || []).find(point => point?.key === this.selectedGlobeKey);
            const label = selectedPoint
                ? (selectedPoint.locationRaw || [selectedPoint.city, selectedPoint.region, selectedPoint.country].filter(Boolean).join(', ') || 'Unknown location')
                : 'Global';
            locationScope.textContent = label;
        }
    }

    formatTrendRangeLabel(range) {
        const normalized = String(range || 'all').toLowerCase();
        const labels = {
            all: 'All Time',
            '14d': 'Last 14 Days',
            '30d': 'Last 30 Days',
            '90d': 'Last 90 Days',
            '365d': 'Last 12 Months'
        };
        return labels[normalized] || labels.all;
    }

    formatDateTime(value) {
        if (!value) return 'just now';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'recently';

        return date.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
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
        } catch {
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

    formatExactNumber(num) {
        const numeric = Number(num);
        if (!Number.isFinite(numeric)) return '0';
        return this.numberFormatter.format(Math.trunc(numeric));
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

    switchTab(tabName, options = {}) {
        const normalizedTab = this.normalizeTabName(tabName);
        this.currentTab = normalizedTab;

        // Update tab buttons (new unified tabs)
        document.querySelectorAll('.community-tab-btn').forEach(tab => {
            const isActive = tab.dataset.tab === normalizedTab;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', String(isActive));
        });

        this.updateChannelHeader(normalizedTab);

        // Handle mobile sidebar/feed visibility
        const sidebar = document.querySelector('.community-sidebar-column');
        const feedColumn = document.querySelector('.community-feed-column');
        const communityView = document.getElementById('community-view');

        if (communityView) {
            communityView.classList.toggle('map-tab-active', normalizedTab === 'map');
            communityView.classList.toggle('globe-compact-mode', normalizedTab !== 'map');
        }

        this.scheduleGlobeResize();

        if (normalizedTab === 'map') {
            if (sidebar) sidebar.classList.add('mobile-sidebar-active');
            if (feedColumn) feedColumn.classList.add('mobile-feed-hidden');
            this.stopChatPolling();

            if (normalizedTab === 'map') {
                this.globe?.setPaused(false);
                this.scheduleGlobeResize();
                this.loadGlobeAnalytics({ silent: true });
            }
        } else {
            if (sidebar) sidebar.classList.remove('mobile-sidebar-active');
            if (feedColumn) feedColumn.classList.remove('mobile-feed-hidden');

            const composeBox = document.getElementById('feed-compose-box');
            if (composeBox) {
                composeBox.style.display = normalizedTab === 'chat' ? 'block' : 'none';
            }

            if (normalizedTab === 'chat') {
                this.loadChat();
                this.startChatPolling();
            } else {
                this.stopChatPolling();
                this.loadFeed();
            }
        }

        this.ensureActiveTabVisible(normalizedTab, !options.silent);
    }

    updateChannelHeader(tabName) {
        const metadata = {
            chat: {
                icon: 'fa-comments',
                kicker: 'COMMUNITY DISCUSSION',
                title: 'Animal & Matchup Discussion',
                description: 'Talk matchups, animal stats, and powerscaling with the community.'
            },
            feed: {
                icon: 'fa-comment-dots',
                kicker: 'COMMENTS & ACTIVITY',
                title: 'Community Conversations',
                description: 'Read recent animal comments, replies, votes, battles, and community milestones.'
            }
        };
        const active = metadata[tabName] || metadata.chat;
        const icon = document.querySelector('#community-channel-icon i');
        const kicker = document.getElementById('community-channel-kicker');
        const title = document.getElementById('community-channel-title');
        const description = document.getElementById('community-channel-description');

        if (icon) icon.className = `fas ${active.icon}`;
        if (kicker) kicker.textContent = active.kicker;
        if (title) title.textContent = active.title;
        if (description) description.textContent = active.description;
    }

    onViewEnter() {
        // Called when entering community view
        this.updateLoginState();
        this.startPresencePing();
        this.startGlobeRefresh();
        this.globe?.setPaused(false);
        this.scheduleGlobeResize();
        
        // Refresh community totals and location analytics.
        this.loadSiteStats();
        this.loadOnlineCount();
        this.loadGlobeAnalytics({ silent: true });

        this.switchTab(this.currentTab, { silent: true });
    }

    onViewLeave() {
        this.stopChatPolling();
        this.stopPresencePing();
        this.stopGlobeRefresh();
        this.globe?.setPaused(true);
        this.destroyGlobeCharts();
        
        // Reset mobile sidebar state
        const sidebar = document.querySelector('.community-sidebar-column');
        const feedColumn = document.querySelector('.community-feed-column');
        const communityView = document.getElementById('community-view');
        if (sidebar) sidebar.classList.remove('mobile-sidebar-active');
        if (feedColumn) feedColumn.classList.remove('mobile-feed-hidden');
        if (communityView) {
            communityView.classList.remove('map-tab-active');
            communityView.classList.remove('globe-compact-mode');
        }
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
                    <div class="feed-reply-context-author">-> Replying to ${this.escapeHtml(item.parentUsername || 'someone')}</div>
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
                    ${animalContextHtml}
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

        // Play send sound
        if (window.AudioManager) {
            AudioManager.swoosh();
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
window.CommunityManager = CommunityManager;
