/**
 * ============================================
 * ANIMAL STATS - MAIN APPLICATION
 * ============================================
 * 
 * Master controller for the Animal Battle Stats web application.
 * Coordinates all page managers and handles core functionality.
 * 
 * @version 3.1.0 - Modular Architecture
 * 
 * FILE STRUCTURE:
 * â”œâ”€â”€ Lines 1-50:      Global helpers & constants
 * â”œâ”€â”€ Lines 50-2420:   AnimalStatsApp class (core app + stats page)
 * â”œâ”€â”€ Lines 2420-4260: RankingsManager class (rankings page)
 * â”œâ”€â”€ Lines 4260-6130: TournamentManager class (tournament modal)
 * â”œâ”€â”€ Lines 6130-7400: CommunityManager class (community page)
 * 
 * DEPENDENCIES:
 * - js/router.js      - URL routing
 * - js/auth.js        - Authentication
 * - js/core.js        - Shared utilities (optional, for external modules)
 * - js/compare.js     - Compare page enhancements
 * - js/community.js   - Community page enhancements
 * 
 * @see ARCHITECTURE.md for detailed documentation
 */

'use strict';

// Note: FALLBACK_IMAGE, API_CONFIG, formatNumber, formatStat are defined in core.js

// ========================================
// SECTION: ANIMAL STATS APP (CORE + STATS PAGE)
// ========================================
// Main application controller
// Handles: app initialization, routing, stats page, compare page base
// ========================================

class AnimalStatsApp {
    constructor() {
        // Application State
        this.state = {
            animals: [],
            filteredAnimals: [],
            view: 'stats', // 'stats' | 'compare'
            selectedAnimal: null,
            compare: {
                left: null,
                right: null,
                selectingSide: null // 'left' | 'right' | null
            },
            isGridVisible: true,
            isDetailsExpanded: false,
            weightUnit: 'kg', // 'kg' | 'lbs'
            speedUnit: 'kmh', // 'kmh' | 'mph'
            filters: {
                search: '',
                class: 'all',
                diet: 'all',
                biome: 'all',
                sort: 'name',
                // Multi-select arrays
                classes: [],
                diets: [],
                biomes: []
            },
            // API state
            isLoading: false,
            apiAvailable: false,
            lastApiCheck: null
        };

        // DOM Elements Cache
        this.dom = {
            // Views
            statsView: document.getElementById('stats-view'),
            compareView: document.getElementById('compare-view'),
            
            // Grid
            gridContainer: document.getElementById('character-grid'),
            gridWrapper: document.querySelector('.character-grid-container'),
            searchInput: document.getElementById('search-input'),
            classFilter: document.getElementById('class-filter'),
            dietFilter: document.getElementById('diet-filter'),
            biomeFilter: document.getElementById('biome-filter'),
            sortBy: document.getElementById('sort-by'),
            toggleGridBtn: document.getElementById('toggle-grid-btn'),
            radarCanvas: document.getElementById('comparison-radar'),
            
            // Stats View Elements
            charName: document.getElementById('character-name'),
            charScientific: document.getElementById('character-scientific'),
            charImage: document.getElementById('character-model'),
            charSilhouette: document.getElementById('character-silhouette'),
            quickWeight: document.getElementById('quick-weight'),
            quickSpeed: document.getElementById('quick-speed'),
            quickBite: document.getElementById('quick-bite'),
            
            statBars: {
                attack: document.getElementById('stat-attack-bar'),
                defense: document.getElementById('stat-defense-bar'),
                agility: document.getElementById('stat-agility-bar'),
                stamina: document.getElementById('stat-stamina-bar'),
                intelligence: document.getElementById('stat-intelligence-bar'),
                special: document.getElementById('stat-special-bar')
            },
            statValues: {
                attack: document.getElementById('stat-attack-val'),
                defense: document.getElementById('stat-defense-val'),
                agility: document.getElementById('stat-agility-val'),
                stamina: document.getElementById('stat-stamina-val'),
                intelligence: document.getElementById('stat-intelligence-val'),
                special: document.getElementById('stat-special-val')
            },
            
            info: {
                abilitiesList: document.getElementById('abilities-list'),
                traitsList: document.getElementById('traits-list'),
                // Battle record
                animalRank: document.getElementById('animal-rank'),
                animalBattles: document.getElementById('animal-battles'),
                animalWinrate: document.getElementById('animal-winrate')
            },
            
            detailsPanel: document.getElementById('details-panel'),
            expandDetailsBtn: document.getElementById('expand-details-btn'),
            detailText: {
                type: document.getElementById('detail-type'),
                scientific: document.getElementById('detail-scientific'),
                size: document.getElementById('detail-size'),
                habitat: document.getElementById('detail-habitat'),
                diet: document.getElementById('detail-diet'),
                nocturnal: document.getElementById('detail-nocturnal'),
                social: document.getElementById('detail-social'),
                weight: document.getElementById('detail-weight'),
                height: document.getElementById('detail-height'),
                length: document.getElementById('detail-length'),
                speed: document.getElementById('detail-speed'),
                lifespan: document.getElementById('detail-lifespan'),
                bite: document.getElementById('detail-bite'),
                sizeScore: document.getElementById('detail-size-score'),
                description: document.getElementById('animal-description'),
                // Battle Profile
                combatStyle: document.getElementById('detail-combat-style'),
                range: document.getElementById('detail-range'),
                strengths: document.getElementById('detail-strengths'),
                weaknesses: document.getElementById('detail-weaknesses')
            },
            
            // Compare View Elements
            fighter1: {
                display: document.querySelector('.fighter-left .fighter-display'),
                img: document.getElementById('animal-1-image'),
                name: document.getElementById('animal-1-name'),
                placeholder: document.getElementById('animal-1-placeholder'),
                statsPanel: document.getElementById('compare-stats-1'),
                viewStatsBtn: document.getElementById('view-stats-1'),
                stats: {
                    attack: document.getElementById('compare-attack-1'),
                    defense: document.getElementById('compare-defense-1'),
                    agility: document.getElementById('compare-agility-1'),
                    stamina: document.getElementById('compare-stamina-1'),
                    intelligence: document.getElementById('compare-intelligence-1'),
                    special: document.getElementById('compare-special-1')
                }
            },
            fighter2: {
                display: document.querySelector('.fighter-right .fighter-display'),
                img: document.getElementById('animal-2-image'),
                name: document.getElementById('animal-2-name'),
                placeholder: document.getElementById('animal-2-placeholder'),
                statsPanel: document.getElementById('compare-stats-2'),
                viewStatsBtn: document.getElementById('view-stats-2'),
                stats: {
                    attack: document.getElementById('compare-attack-2'),
                    defense: document.getElementById('compare-defense-2'),
                    agility: document.getElementById('compare-agility-2'),
                    stamina: document.getElementById('compare-stamina-2'),
                    intelligence: document.getElementById('compare-intelligence-2'),
                    special: document.getElementById('compare-special-2')
                }
            },
            fightBtn: document.getElementById('fight-btn'),
            
            // Navigation
            mainTitle: document.getElementById('main-title'),
            titleMode: document.querySelector('.title-mode'),
            navBtns: {
                stats: document.getElementById('stats-mode-btn'),
                compare: document.getElementById('compare-mode-btn'),
                rankings: document.getElementById('rankings-mode-btn'),
                community: document.getElementById('community-mode-btn')
            },
            
            // Rankings View
            rankingsView: document.getElementById('rankings-view'),
            
            // Community View
            communityView: document.getElementById('community-view'),
            
            // Battle Points View
            battlepointsView: document.getElementById('battlepoints-view'),
            
            // Shared bottom bar (now outside view containers)
            sharedBottomBar: document.getElementById('shared-bottom-bar')
        };

        // Rankings Manager
        this.rankingsManager = null;

        // Bind methods
        this.init = this.init.bind(this);
        this.handleSearch = this.handleSearch.bind(this);
        this.handleFilter = this.handleFilter.bind(this);
        this.handleSort = this.handleSort.bind(this);
        this.handleGridClick = this.handleGridClick.bind(this);
        this.toggleDetails = this.toggleDetails.bind(this);
        this.toggleGrid = this.toggleGrid.bind(this);
        this.switchView = this.switchView.bind(this);
        this.selectFighter = this.selectFighter.bind(this);
        this.startFight = this.startFight.bind(this);
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            this.showLoadingState(true);
            await this.fetchData();
            this.populateClassFilter();
            this.setupEventListeners();
            
            // Cache home view element
            this.dom.homeView = document.getElementById('home-view');
            
            // Cache auth view elements
            this.dom.loginView = document.getElementById('login-view');
            this.dom.signupView = document.getElementById('signup-view');
            
            // Cache about view element
            this.dom.aboutView = document.getElementById('about-view');
            
            // Cache profile view elements
            this.dom.profileView = document.getElementById('profile-view');
            this.dom.publicProfileView = document.getElementById('public-profile-view');

            // Track site visit
            this.trackSiteVisit();

            // Initialize Rankings Manager
            this.rankingsManager = new RankingsManager(this);
            this.rankingsManager.init();
            window.rankingsManager = this.rankingsManager; // Expose globally for stats comments
            
            // Initialize Tournament Manager
            this.tournamentManager = new TournamentManager(this);
            this.tournamentManager.init();
            window.tournamentManager = this.tournamentManager;
            
            // Initialize Community Manager
            this.communityManager = new CommunityManager(this);
            this.communityManager.init();
            window.communityManager = this.communityManager;
            
            // Initialize Battle Points Manager
            if (window.BattlepointsManager) {
                this.battlepointsManager = new BattlepointsManager(this);
                this.battlepointsManager.init();
                window.battlepointsManager = this.battlepointsManager;
            }
            
            // Fetch rankings data to get power ranks for sorting
            await this.rankingsManager.fetchRankings();
            
            // Initial Render with power rank sort as default
            this.state.filters.sort = 'rank';
            this.applyFilters();
            
            // Initialize Router
            this.initRouter();
            
            // Refresh user avatar now that animals are loaded
            if (window.Auth && window.Auth.isLoggedIn()) {
                window.Auth.updateUserStatsBar();
            }
            
            // Hide loading screen and mark app as loaded
            this.hideLoadingScreen();
            
            console.log(`Animal Stats App Initialized (API: ${this.state.apiAvailable ? 'Connected' : 'Fallback Mode'})`);
        } catch (error) {
            console.error('Initialization failed:', error);
            this.hideLoadingScreen();
            alert('Failed to load animal data. Please try refreshing the page.');
        }
    }

    /**
     * Hide the loading screen and clean up initial load classes
     */
    hideLoadingScreen() {
        this.state.isLoading = false;
        
        // Hide loading screen
        const loadingScreen = document.getElementById('app-loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
            // Remove from DOM after transition
            setTimeout(() => {
                loadingScreen.remove();
            }, 300);
        }
        
        // Clean up initial load classes - let JS handle view management now
        document.documentElement.classList.add('app-loaded');
        document.documentElement.classList.remove('is-home', 'is-login', 'is-signup', 'is-profile');
    }

    /**
     * Initialize URL Router
     */
    initRouter() {
        if (!window.Router) {
            console.warn('Router not available');
            // Fallback: show stats view with first animal
            if (this.state.filteredAnimals.length > 0) {
                this.selectAnimal(this.state.filteredAnimals[0], false);
            }
            return;
        }

        const router = window.Router;

        // Home route
        router.on('/', () => {
            this.switchView('home', false);
        });

        // Stats routes - register more specific route first
        router.on('/stats/:slug', (params) => {
            try {
                this.switchView('stats', false);
                const animal = this.findAnimalBySlug(params.slug);
                if (animal) {
                    this.selectAnimal(animal, false);
                } else {
                    // Animal not found, select first
                    if (this.state.filteredAnimals.length > 0) {
                        this.selectAnimal(this.state.filteredAnimals[0], false);
                    }
                }
            } catch (error) {
                console.error('Error handling /stats/:slug route:', error);
                // Fallback to stats view
                this.switchView('stats', false);
            }
        });

        router.on('/stats', () => {
            this.switchView('stats', false);
            // Select first animal if none selected
            if (!this.state.selectedAnimal && this.state.filteredAnimals.length > 0) {
                this.selectAnimal(this.state.filteredAnimals[0], false);
            }
        });

        // Compare route
        router.on('/compare', () => {
            this.switchView('compare', false);
        });

        // Rankings route
        router.on('/rankings', () => {
            this.switchView('rankings', false);
        });

        // Community route
        router.on('/community', () => {
            this.switchView('community', false);
        });

        // Battle Points route
        router.on('/battlepoints', () => {
            this.switchView('battlepoints', false);
        });

        // About route
        router.on('/about', () => {
            this.switchView('about', false);
        });

        // Tournament route
        router.on('/tournament', () => {
            // Ensure a base view is active before showing tournament overlay
            if (this.state.view === 'home' || !this.state.view) {
                this.switchView('rankings', false);
            }
            // Show tournament modal on top of current view
            if (this.tournamentManager) {
                this.tournamentManager.showSetup();
            }
        });

        // Profile route - own profile (redirects to /profile/username)
        router.on('/profile', () => {
            // If not logged in, redirect to login
            if (!window.Auth || !window.Auth.isLoggedIn()) {
                router.navigate('/login');
                return;
            }
            // Redirect to /profile/username for consistency
            const user = window.Auth.getUser();
            if (user?.username) {
                router.navigate(`/profile/${encodeURIComponent(user.username)}`, { replace: true });
            }
        });

        // Profile route - view specific user profile
        router.on('/profile/:username', (params) => {
            const username = params.username;
            const currentUser = window.Auth?.getUser();
            const isOwnProfile = currentUser && currentUser.username.toLowerCase() === username.toLowerCase();
            
            if (isOwnProfile) {
                // Show editable own profile
                this.switchView('profile', false);
                if (window.Auth.initProfilePage) {
                    window.Auth.initProfilePage();
                }
                this.updateProfilePage();
            } else {
                // Show public profile view
                this.showPublicProfile(username);
            }
        });

        // Login route
        router.on('/login', () => {
            // If already logged in, redirect to home
            if (window.Auth && window.Auth.isLoggedIn()) {
                router.navigate('/');
                return;
            }
            this.switchView('login', false);
        });

        // Signup route
        router.on('/signup', () => {
            // If already logged in, redirect to home
            if (window.Auth && window.Auth.isLoggedIn()) {
                router.navigate('/');
                return;
            }
            this.switchView('signup', false);
        });

        // Initialize router (handles current URL)
        router.init();
    }

    /**
     * Find animal by URL slug
     */
    findAnimalBySlug(slug) {
        // First try exact ID match
        let animal = this.state.animals.find(a => a.id === slug || a._id === slug);
        if (animal) return animal;

        // Try slug match
        animal = this.state.animals.find(a => {
            const animalSlug = Router.slugify(a.name);
            return animalSlug === slug;
        });
        if (animal) return animal;

        // Try partial/fuzzy match (for URL typos)
        const normalizedSlug = slug.toLowerCase().replace(/-/g, '');
        animal = this.state.animals.find(a => {
            const normalizedName = a.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            return normalizedName === normalizedSlug;
        });

        return animal;
    }

    /**
     * Get URL slug for animal
     */
    getAnimalSlug(animal) {
        // Prefer ID if available, otherwise generate from name
        if (animal.id && typeof animal.id === 'string') {
            return animal.id;
        }
        return Router.slugify(animal.name);
    }

    /**
     * Update homepage statistics
     */
    updateHomeStats() {
        const animalCountEl = document.getElementById('home-animal-count');
        if (animalCountEl && this.state.animals.length > 0) {
            animalCountEl.textContent = this.state.animals.length;
        }
        
        // Fetch battle count from API
        this.fetchBattleCount();
    }

    /**
     * Fetch total battle count for homepage
     */
    async fetchBattleCount() {
        try {
            const response = await fetch('/api/stats');
            if (response.ok) {
                const data = await response.json();
                const battleCountEl = document.getElementById('home-battle-count');
                if (battleCountEl && data.totalBattles) {
                    // Format with K for thousands
                    const count = data.totalBattles;
                    battleCountEl.textContent = count >= 1000 
                        ? (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
                        : count.toString();
                }
            }
        } catch (e) {
            console.log('Could not fetch battle stats');
        }
    }

    /**
     * Show/hide loading state
     */
    showLoadingState(isLoading) {
        this.state.isLoading = isLoading;
        // Could add loading spinner UI here if desired
    }

    /**
     * Reset scroll positions on all views and scrollable containers
     * This prevents the "half page" glitch when switching views
     */
    resetScrollPositions() {
        // Reset main window scroll
        window.scrollTo(0, 0);
        
        // Reset scroll on all view containers
        const views = document.querySelectorAll('.view-container');
        views.forEach(view => {
            view.scrollTop = 0;
            // Also reset any scrollable children
            const scrollables = view.querySelectorAll('[style*="overflow"], .overflow-auto, .overflow-y-auto');
            scrollables.forEach(el => el.scrollTop = 0);
        });
        
        // Reset specific scrollable elements
        const scrollableSelectors = [
            '.abs-profile-page',
            '.rankings-container',
            '.rankings-list',
            '.rankings-console',
            '.community-feed-column',
            '.community-sidebar-column',
            '.feed-scroll-region',
            '.character-grid-container',
            '.stats-panel',
            '.details-panel',
            '.home-portal'
        ];
        
        scrollableSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => el.scrollTop = 0);
        });
    }

    /**
     * Track site visit - sends notification to Discord
     */
    trackSiteVisit() {
        try {
            const token = localStorage.getItem('auth_token');
            let username = 'Anonymous';
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    username = payload.username || 'Anonymous';
                } catch (e) { }
            }
            
            // Generate session ID for tracking
            let sessionId = sessionStorage.getItem('abs_session_id');
            if (!sessionId) {
                sessionId = Math.random().toString(36).substring(2, 15);
                sessionStorage.setItem('abs_session_id', sessionId);
            }
            
            // Get current page/route
            const currentPage = window.location.pathname + window.location.hash;
            const referrer = document.referrer || 'Direct';
            
            // Send Discord notification with detailed info
            fetch(API_CONFIG.baseUrl + '/api/animals?action=notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username,
                    page: currentPage,
                    referrer: referrer,
                    sessionId: sessionId,
                    screenSize: `${window.screen.width}x${window.screen.height}`,
                    language: navigator.language || 'Unknown'
                })
            }).catch(() => {});
            
            // Increment site visit counter (rate limited - once per session)
            const lastVisitKey = 'abs_last_visit';
            const lastVisit = sessionStorage.getItem(lastVisitKey);
            if (!lastVisit) {
                fetch(API_CONFIG.baseUrl + '/api/community?action=visit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                }).catch(() => {});
                sessionStorage.setItem(lastVisitKey, Date.now().toString());
            }
            
            // Store visit start time for duration calculation
            sessionStorage.setItem('abs_visit_start', Date.now().toString());
            
            // Set up site leave tracking
            window.addEventListener('beforeunload', () => {
                const visitStart = parseInt(sessionStorage.getItem('abs_visit_start') || '0');
                const duration = visitStart ? Math.round((Date.now() - visitStart) / 1000) : 0;
                const durationStr = duration > 3600 
                    ? `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`
                    : duration > 60 
                        ? `${Math.floor(duration / 60)}m ${duration % 60}s`
                        : `${duration}s`;
                
                const data = JSON.stringify({ 
                    type: 'site_leave', 
                    username,
                    page: window.location.pathname + window.location.hash,
                    duration: durationStr,
                    sessionId: sessionId
                });
                navigator.sendBeacon(API_CONFIG.baseUrl + '/api/animals?action=notify', data);
            });
        } catch (error) { }
    }

    /**
     * Check if API is available
     */
    async checkApiHealth() {
        try {
            const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.health}`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(3000) // 3 second timeout
            });
            
            if (response.ok) {
                const data = await response.json();
                this.state.apiAvailable = data.success && data.status === 'healthy';
                this.state.lastApiCheck = new Date();
                return this.state.apiAvailable;
            }
            return false;
        } catch (error) {
            console.warn('API health check failed:', error.message);
            return false;
        }
    }

    /**
     * Fetch animal data from MongoDB API
     * This is the single source of truth - no local fallbacks
     */
    async fetchData() {
        try {
            // Add cache-busting timestamp to always get fresh data from MongoDB
            const cacheBuster = `?_t=${Date.now()}`;
            const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.animals}${cacheBuster}`, {
                method: 'GET',
                headers: { 
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                signal: AbortSignal.timeout(15000) // 15 second timeout
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (!result.success || !result.data) {
                throw new Error('Invalid API response format');
            }
            
            this.state.animals = result.data;
            this.state.filteredAnimals = [...result.data];
            this.state.apiAvailable = true;
            console.log(`Loaded ${result.data.length} animals from MongoDB API`);
            
            // Update homepage animal count
            this.updateHomeStats();
            
            // Initialize homepage silhouette panels with animal data
            if (window.HomepageController) {
                window.HomepageController.activate(this.state.animals);
            }
            
            // Now that animals are loaded, retry any pending avatar displays
            if (window.Auth?.retryPendingAvatars) {
                window.Auth.retryPendingAvatars();
            }
            
        } catch (error) {
            console.error('Failed to load animal data:', error.message);
            this.state.apiAvailable = false;
            
            // Show user-friendly error
            this.showLoadError(error.message);
            throw error;
        }
    }
    
    /**
     * Show a loading error to the user
     */
    showLoadError(message) {
        const gridContainer = document.getElementById('character-grid');
        if (gridContainer) {
            gridContainer.innerHTML = `
                <div class="load-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Failed to Load Data</h3>
                    <p>Could not connect to the database. Please try refreshing the page.</p>
                    <button onclick="location.reload()" class="retry-btn">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            `;
        }
    }

    /**
     * Populate the class filter dropdown
     */
    populateClassFilter() {
        const types = [...new Set(this.state.animals.map(a => a.type))].sort();
        types.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            this.dom.classFilter.appendChild(option);
        });
    }

    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        // Initialize AudioManager on first user interaction
        const initAudioOnce = () => {
            if (window.AudioManager) {
                window.AudioManager.init();
            }
            document.removeEventListener('click', initAudioOnce);
            document.removeEventListener('touchstart', initAudioOnce);
            document.removeEventListener('keydown', initAudioOnce);
        };
        document.addEventListener('click', initAudioOnce);
        document.addEventListener('touchstart', initAudioOnce);
        document.addEventListener('keydown', initAudioOnce);
        
        // Search & Filter
        this.dom.searchInput.addEventListener('input', this.debouncedSearch);
        this.dom.classFilter.addEventListener('change', this.handleFilter);
        this.dom.dietFilter.addEventListener('change', this.handleFilter);
        this.dom.biomeFilter.addEventListener('change', this.handleFilter);
        this.dom.sortBy.addEventListener('change', this.handleSort);
        
        // New Filter/Sort Dropdown UI
        this.setupDropdownMenus();
        
        // Grid Interaction (Event Delegation)
        this.dom.gridContainer.addEventListener('click', this.handleGridClick);
        
        // Grid Arrow Buttons & Custom Scrollbar
        this.setupGridNavigation();
        
        // UI Toggles
        if (this.dom.expandDetailsBtn) {
            this.dom.expandDetailsBtn.addEventListener('click', this.toggleDetails);
        }
        // Shared toggle button for grid (works for both Stats and Compare views)
        if (this.dom.toggleGridBtn) {
            this.dom.toggleGridBtn.addEventListener('click', this.toggleGrid);
        }
        
        // Load saved grid visibility state from localStorage
        const savedGridVisible = localStorage.getItem('isGridVisible');
        if (savedGridVisible !== null) {
            this.state.isGridVisible = savedGridVisible === 'true';
            this.updateGridVisibility();
        }
        
        // Weight unit toggle
        const weightToggle = document.getElementById('weight-toggle');
        if (weightToggle) {
            weightToggle.addEventListener('click', () => this.toggleWeightUnit());
        }
        
        // Speed unit toggle
        const speedToggle = document.getElementById('speed-toggle');
        if (speedToggle) {
            speedToggle.addEventListener('click', () => this.toggleSpeedUnit());
        }
        
        // Load saved unit preferences
        const savedWeightUnit = localStorage.getItem('weightUnit');
        if (savedWeightUnit) {
            this.state.weightUnit = savedWeightUnit;
        }
        const savedSpeedUnit = localStorage.getItem('speedUnit');
        if (savedSpeedUnit) {
            this.state.speedUnit = savedSpeedUnit;
        }
        
        // Close details button (mobile)
        const closeDetailsBtn = document.getElementById('close-details-btn');
        if (closeDetailsBtn) {
            closeDetailsBtn.addEventListener('click', this.toggleDetails);
        }
        
        // Stats Comments Button
        const statsCommentsBtn = document.getElementById('stats-comments-btn');
        if (statsCommentsBtn) {
            statsCommentsBtn.addEventListener('click', () => this.openStatsComments());
        }
        
        // Navigation - use router if available
        this.dom.navBtns.stats.addEventListener('click', () => {
            if (window.AudioManager) AudioManager.click();
            if (window.Router) {
                window.Router.navigate('/stats');
            } else {
                this.switchView('stats');
            }
        });
        this.dom.navBtns.compare.addEventListener('click', () => {
            if (window.AudioManager) AudioManager.click();
            if (window.Router) {
                window.Router.navigate('/compare');
            } else {
                this.switchView('compare');
            }
        });
        this.dom.navBtns.rankings?.addEventListener('click', () => {
            if (window.AudioManager) AudioManager.click();
            if (window.Router) {
                window.Router.navigate('/rankings');
            } else {
                this.switchView('rankings');
            }
        });
        this.dom.navBtns.community?.addEventListener('click', () => {
            if (window.AudioManager) AudioManager.click();
            if (window.Router) {
                window.Router.navigate('/community');
            } else {
                this.switchView('community');
            }
        });
        
        // Logo click goes to home
        const headerLogo = document.getElementById('header-logo');
        if (headerLogo) {
            headerLogo.addEventListener('click', () => {
                if (window.Router) {
                    window.Router.navigate('/');
                } else {
                    this.switchView('stats');
                }
            });
        }
        
        // Main title click also goes to home
        const mainTitle = document.getElementById('main-title');
        if (mainTitle) {
            mainTitle.style.cursor = 'pointer';
            mainTitle.addEventListener('click', () => {
                if (window.Router) {
                    window.Router.navigate('/');
                } else {
                    this.switchView('stats');
                }
            });
        }
        
        // Homepage auth buttons - navigate to auth pages
        const homeSignupBtn = document.getElementById('home-signup-btn');
        const homeLoginBtn = document.getElementById('home-login-btn');
        const homeProfileLink = document.getElementById('home-profile-link');
        
        if (homeSignupBtn) {
            homeSignupBtn.addEventListener('click', () => {
                if (window.Router) {
                    window.Router.navigate('/signup');
                }
            });
        }
        if (homeLoginBtn) {
            homeLoginBtn.addEventListener('click', () => {
                if (window.Router) {
                    window.Router.navigate('/login');
                }
            });
        }
        if (homeProfileLink) {
            homeProfileLink.addEventListener('click', (e) => {
                e.preventDefault();
                // Navigate to the link's href directly (which includes username)
                const href = homeProfileLink.getAttribute('href');
                if (window.Router && href) {
                    window.Router.navigate(href);
                }
            });
        }
        
        // About Info Button click handlers (desktop and mobile)
        this.setupAboutInfoButtons();
        
        // Profile page event listeners
        const retroProfileClose = document.getElementById('retro-profile-close');
        const retroProfilePic = document.getElementById('retro-profile-pic');
        
        if (retroProfileClose) {
            retroProfileClose.addEventListener('click', () => {
                // Go back or to home
                if (window.history.length > 1) {
                    window.history.back();
                } else if (window.Router) {
                    window.Router.navigate('/');
                }
            });
        }
        
        // Click on profile pic to change avatar
        if (retroProfilePic) {
            retroProfilePic.addEventListener('click', () => {
                if (window.Auth) {
                    window.Auth.openAvatarPicker();
                }
            });
        }
        
        // Public profile view close button
        const publicProfileClose = document.getElementById('public-profile-close');
        if (publicProfileClose) {
            publicProfileClose.addEventListener('click', () => this.closePublicProfile());
        }
        
        // Setup profile page dropdown toggles
        this.setupProfileDropdowns();
        
        // Compare View Interactions
        this.dom.fighter1.display.addEventListener('click', () => this.setSelectingSide('left'));
        this.dom.fighter2.display.addEventListener('click', () => this.setSelectingSide('right'));
        
        // View Stats Buttons in Compare Mode
        this.dom.fighter1.viewStatsBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFighterStats('left');
        });
        this.dom.fighter2.viewStatsBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFighterStats('right');
        });

        this.dom.fightBtn.addEventListener('click', this.startFight);
        
        // Keyboard Navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.state.isDetailsExpanded) this.toggleDetails();
                if (this.state.compare.selectingSide) this.setSelectingSide(null);
            }
        });
    }

    /**
     * Handle search input with debounce for better INP
     */
    handleSearch = (e) => {
        this.state.filters.search = e.target.value.toLowerCase();
        this.applyFilters();
    }

    /**
     * Debounced search for better INP performance
     */
    debouncedSearch = (() => {
        let timeout;
        return (e) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => this.handleSearch(e), 150);
        };
    })()

    /**
     * Setup dropdown menus for Filter and Sort
     */
    setupDropdownMenus() {
        const filterToggle = document.getElementById('filter-toggle');
        const filterPanel = document.getElementById('filter-panel');
        const sortToggle = document.getElementById('sort-toggle');
        const sortPanel = document.getElementById('sort-panel');
        const clearFiltersBtn = document.getElementById('clear-filters');
        
        // Initialize multi-select filter state
        this.state.filters.diets = [];
        this.state.filters.biomes = [];
        this.state.filters.classes = [];
        
        // Populate class checkboxes
        this.populateClassCheckboxes();
        
        // Filter category tab switching
        const filterTabs = document.querySelectorAll('.filter-tab');
        filterTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.stopPropagation();
                const category = tab.dataset.category;
                
                // Update tab active state
                filterTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Show corresponding category content
                document.querySelectorAll('.filter-category').forEach(cat => {
                    cat.classList.remove('active');
                });
                document.getElementById(`filter-category-${category}`)?.classList.add('active');
            });
        });
        
        // Helper function to position dropdown panel
        const positionDropdown = (toggle, panel) => {
            const rect = toggle.getBoundingClientRect();
            const isMobile = window.innerWidth <= 480;
            
            if (isMobile) {
                // On mobile, position above the bottom bar
                panel.style.position = 'fixed';
                panel.style.bottom = '230px'; // Above nav + grid + bottom bar
                panel.style.left = '10px';
                panel.style.right = '10px';
                panel.style.top = 'auto';
            } else {
                // On desktop, position above the toggle button
                panel.style.position = 'fixed';
                panel.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
                panel.style.left = Math.max(10, rect.left) + 'px';
                panel.style.right = 'auto';
                panel.style.top = 'auto';
            }
        };
        
        // Toggle filter dropdown
        if (filterToggle && filterPanel) {
            filterToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpening = !filterPanel.classList.contains('show');
                
                filterToggle.classList.toggle('active');
                filterPanel.classList.toggle('show');
                
                if (isOpening) {
                    // Move to body and position
                    document.body.appendChild(filterPanel);
                    positionDropdown(filterToggle, filterPanel);
                }
                
                // Close sort panel
                sortToggle?.classList.remove('active');
                sortPanel?.classList.remove('show');
            });
        }
        
        // Toggle sort dropdown
        if (sortToggle && sortPanel) {
            sortToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpening = !sortPanel.classList.contains('show');
                
                sortToggle.classList.toggle('active');
                sortPanel.classList.toggle('show');
                
                if (isOpening) {
                    // Move to body and position
                    document.body.appendChild(sortPanel);
                    positionDropdown(sortToggle, sortPanel);
                }
                
                // Close filter panel
                filterToggle?.classList.remove('active');
                filterPanel?.classList.remove('show');
            });
        }
        
        // Sort radio buttons
        const sortRadios = document.querySelectorAll('input[name="sort"]');
        sortRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.state.filters.sort = e.target.value;
                this.dom.sortBy.value = e.target.value;
                this.applyFilters();
            });
        });
        
        // Set default sort to rank (power ranking order)
        const defaultSort = document.getElementById('sort-rank');
        if (defaultSort) {
            defaultSort.checked = true;
            this.state.filters.sort = 'rank';
        }
        
        // Multi-select checkbox handlers
        document.querySelectorAll('input[data-filter]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const filterType = e.target.dataset.filter;
                const value = e.target.value;
                
                if (filterType === 'diet') {
                    if (e.target.checked) {
                        if (!this.state.filters.diets.includes(value)) {
                            this.state.filters.diets.push(value);
                        }
                    } else {
                        this.state.filters.diets = this.state.filters.diets.filter(d => d !== value);
                    }
                } else if (filterType === 'biome') {
                    if (e.target.checked) {
                        if (!this.state.filters.biomes.includes(value)) {
                            this.state.filters.biomes.push(value);
                        }
                    } else {
                        this.state.filters.biomes = this.state.filters.biomes.filter(b => b !== value);
                    }
                } else if (filterType === 'class') {
                    if (e.target.checked) {
                        if (!this.state.filters.classes.includes(value)) {
                            this.state.filters.classes.push(value);
                        }
                    } else {
                        this.state.filters.classes = this.state.filters.classes.filter(c => c !== value);
                    }
                }
                
                this.applyFilters();
                this.updateFilterBadge();
            });
        });
        
        // Clear filters button
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                // Clear all checkboxes
                document.querySelectorAll('input[data-filter]').forEach(cb => cb.checked = false);
                this.state.filters.diets = [];
                this.state.filters.biomes = [];
                this.state.filters.classes = [];
                this.state.filters.class = 'all';
                this.state.filters.diet = 'all';
                this.state.filters.biome = 'all';
                this.applyFilters();
                this.updateFilterBadge();
            });
        }
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown-menu-container')) {
                filterToggle?.classList.remove('active');
                filterPanel?.classList.remove('show');
                sortToggle?.classList.remove('active');
                sortPanel?.classList.remove('show');
            }
        });
        
        // Initial badge update
        this.updateFilterBadge();
    }

    /**
     * Populate class checkboxes from animal data
     */
    populateClassCheckboxes() {
        const container = document.getElementById('class-checkboxes');
        if (!container) return;
        
        const types = [...new Set(this.state.animals.map(a => a.type))].sort();
        container.innerHTML = types.map(type => `
            <label class="checkbox-option">
                <input type="checkbox" value="${type}" data-filter="class"> 
                <span>${type}</span>
            </label>
        `).join('');
        
        // Add event listeners to new checkboxes
        container.querySelectorAll('input[data-filter="class"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const value = e.target.value;
                if (e.target.checked) {
                    if (!this.state.filters.classes.includes(value)) {
                        this.state.filters.classes.push(value);
                    }
                } else {
                    this.state.filters.classes = this.state.filters.classes.filter(c => c !== value);
                }
                this.applyFilters();
                this.updateFilterBadge();
            });
        });
    }

    /**
     * Update the active filters badge
     */
    updateFilterBadge() {
        const badge = document.getElementById('active-filters-badge');
        const countEl = document.getElementById('filter-count');
        if (!badge || !countEl) return;
        
        let count = 0;
        count += this.state.filters.classes?.length || 0;
        count += this.state.filters.diets?.length || 0;
        count += this.state.filters.biomes?.length || 0;
        
        countEl.textContent = count;
    }

    /**
     * Setup grid navigation (arrow buttons and custom scrollbar)
     */
    setupGridNavigation() {
        const grid = this.dom.gridContainer;
        const leftArrow = document.getElementById('grid-arrow-left');
        const rightArrow = document.getElementById('grid-arrow-right');
        
        if (!grid) return;
        
        // Card scroll amount (card width + gap)
        const getScrollAmount = () => {
            const card = grid.querySelector('.character-card');
            if (!card) return 105; // Default fallback
            const cardWidth = card.offsetWidth;
            const gap = parseInt(getComputedStyle(grid).gap) || 10;
            return cardWidth + gap;
        };
        
        // Smooth continuous scroll using requestAnimationFrame for 60fps (desktop only)
        let animationFrameId = null;
        let scrollDirection = 0;
        
        const smoothScroll = () => {
            if (scrollDirection === 0) return;
            const scrollSpeed = 15; // pixels per frame at 60fps = ~900px/sec
            grid.scrollLeft += scrollDirection * scrollSpeed;
            animationFrameId = requestAnimationFrame(smoothScroll);
        };
        
        const startContinuousScroll = (direction) => {
            if (scrollDirection !== 0) return;
            scrollDirection = direction;
            animationFrameId = requestAnimationFrame(smoothScroll);
        };
        
        const stopContinuousScroll = () => {
            scrollDirection = 0;
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        };
        
        // Arrow button event handlers
        if (leftArrow) {
            leftArrow.addEventListener('mousedown', (e) => {
                e.preventDefault();
                startContinuousScroll(-1);
            });
            leftArrow.addEventListener('mouseup', stopContinuousScroll);
            leftArrow.addEventListener('mouseleave', stopContinuousScroll);
            leftArrow.addEventListener('touchstart', (e) => {
                e.preventDefault();
                startContinuousScroll(-1);
            }, { passive: false });
            leftArrow.addEventListener('touchend', stopContinuousScroll);
        }
        if (rightArrow) {
            rightArrow.addEventListener('mousedown', (e) => {
                e.preventDefault();
                startContinuousScroll(1);
            });
            rightArrow.addEventListener('mouseup', stopContinuousScroll);
            rightArrow.addEventListener('mouseleave', stopContinuousScroll);
            rightArrow.addEventListener('touchstart', (e) => {
                e.preventDefault();
                startContinuousScroll(1);
            }, { passive: false });
            rightArrow.addEventListener('touchend', stopContinuousScroll);
        }
    }

    /**
     * Handle category filter
     */
    handleFilter = (e) => {
        // Play filter sound
        if (window.AudioManager) {
            AudioManager.click();
        }
        
        // Check which filter triggered the event
        if (e.target.id === 'class-filter') this.state.filters.class = e.target.value;
        if (e.target.id === 'diet-filter') this.state.filters.diet = e.target.value;
        if (e.target.id === 'biome-filter') this.state.filters.biome = e.target.value;
        this.applyFilters();
    }

    /**
     * Handle sort
     */
    handleSort = (e) => {
        // Play filter sound
        if (window.AudioManager) {
            AudioManager.click();
        }
        
        this.state.filters.sort = e.target.value;
        this.applyFilters();
    }

    /**
     * Helper to determine diet type
     */
    getDietType(animal) {
        const diet = animal.diet.map(d => d.toLowerCase());
        const hasMeat = diet.some(d => ['meat', 'fish', 'insects', 'small animals', 'prey', 'carrion'].some(k => d.includes(k)));
        const hasPlants = diet.some(d => ['plants', 'fruits', 'grass', 'leaves', 'bark', 'roots', 'berries'].some(k => d.includes(k)));
        
        if (hasMeat && hasPlants) return 'Omnivore';
        if (hasMeat) return 'Carnivore';
        return 'Herbivore'; // Default
    }

    /**
     * Apply all filters and sort
     */
    applyFilters() {
        const { search, class: classFilter, diet: dietFilter, biome: biomeFilter, sort, classes, diets, biomes } = this.state.filters;
        
        // Filter
        this.state.filteredAnimals = this.state.animals.filter(animal => {
            const matchesSearch = animal.name.toLowerCase().includes(search);
            
            // Class Filter - multi-select
            let matchesClass = true;
            if (classes && classes.length > 0) {
                matchesClass = classes.includes(animal.type);
            } else if (classFilter !== 'all') {
                matchesClass = animal.type === classFilter;
            }
            
            // Diet Filter - multi-select
            let matchesDiet = true;
            if (diets && diets.length > 0) {
                const animalDiet = this.getDietType(animal);
                matchesDiet = diets.includes(animalDiet);
            } else if (dietFilter !== 'all') {
                const animalDiet = this.getDietType(animal);
                matchesDiet = animalDiet === dietFilter;
            }

            // Biome Filter - multi-select
            let matchesBiome = true;
            if (biomes && biomes.length > 0) {
                matchesBiome = biomes.some(b => animal.habitat.toLowerCase().includes(b.toLowerCase()));
            } else if (biomeFilter !== 'all') {
                matchesBiome = animal.habitat.toLowerCase().includes(biomeFilter.toLowerCase());
            }

            return matchesSearch && matchesClass && matchesDiet && matchesBiome;
        });

        // Sort
        this.state.filteredAnimals.sort((a, b) => {
            // Stat Rank: sort by weighted stat score (same as fight prediction)
            if (sort === 'rank') {
                // Normalize weight to 0-100 scale using log scale
                const aWeight = a.weight_kg || a.weight || a.averageWeight || 50;
                const bWeight = b.weight_kg || b.weight || b.averageWeight || 50;
                const aNormWeight = Math.min(100, Math.max(0, (Math.log10(aWeight) + 2) * 16.67));
                const bNormWeight = Math.min(100, Math.max(0, (Math.log10(bWeight) + 2) * 16.67));
                
                const aScore = (a.attack || 0) * 0.50 + (a.defense || 0) * 0.13 + (a.agility || 0) * 0.04 + 
                               (a.stamina || 0) * 0.01 + (a.intelligence || 0) * 0.02 + (a.special || 0) * 0.10 +
                               aNormWeight * 0.20;
                const bScore = (b.attack || 0) * 0.50 + (b.defense || 0) * 0.13 + (b.agility || 0) * 0.04 + 
                               (b.stamina || 0) * 0.01 + (b.intelligence || 0) * 0.02 + (b.special || 0) * 0.10 +
                               bNormWeight * 0.20;
                return bScore - aScore;
            }
            
            // Community Favorites: 50% comparison count + 50% net votes
            if (sort === 'community') {
                const aFavorite = (a.comparisonCount || 0) * 0.5 + (a.netVotes || 0) * 0.5;
                const bFavorite = (b.comparisonCount || 0) * 0.5 + (b.netVotes || 0) * 0.5;
                return bFavorite - aFavorite;
            }
            
            if (sort === 'name') return a.name.localeCompare(b.name);
            
            if (sort === 'total') {
                const totalA = a.attack + a.defense + a.agility + a.stamina + a.intelligence + a.special;
                const totalB = b.attack + b.defense + b.agility + b.stamina + b.intelligence + b.special;
                return totalB - totalA;
            }

            // Map sort keys to data keys
            const keyMap = {
                'attack': 'attack',
                'defense': 'defense',
                'agility': 'agility',
                'stamina': 'stamina',
                'intelligence': 'intelligence',
                'special': 'special'
            };
            
            const key = keyMap[sort];
            if (key) return b[key] - a[key];
            return 0;
        });

        this.renderGrid();
    }

    /**
     * Render the character grid
     */
    renderGrid() {
        this.dom.gridContainer.innerHTML = '';
        
        if (this.state.filteredAnimals.length === 0) {
            this.dom.gridContainer.innerHTML = '<div class="no-results">No animals found</div>';
            return;
        }

        const fragment = document.createDocumentFragment();
        
        this.state.filteredAnimals.forEach(animal => {
            const card = document.createElement('div');
            card.className = 'character-card';
            card.dataset.id = animal.id || animal.name; // Fallback to name if ID missing
            
            // Calculate overall tier based on total stats
            const totalStats = (animal.attack || 0) + (animal.defense || 0) + (animal.agility || 0) + 
                              (animal.stamina || 0) + (animal.intelligence || 0) + (animal.special || 0);
            const avgStat = totalStats / 6;
            const overallTier = this.calculateTier(avgStat);
            const tierClass = overallTier.toLowerCase().replace('+', 'plus').replace('-', 'minus');
            card.classList.add(`card-tier-${tierClass}`);
            
            // Add selection classes
            if (this.state.view === 'stats' && this.state.selectedAnimal?.name === animal.name) {
                card.classList.add('selected');
            } else if (this.state.view === 'compare') {
                if (this.state.compare.left?.name === animal.name) card.classList.add('selected-fighter1');
                if (this.state.compare.right?.name === animal.name) card.classList.add('selected-fighter2');
            }

            card.innerHTML = `
                <span class="card-tier-badge tier-${tierClass}">${overallTier}</span>
                <img src="${animal.image}" alt="${animal.name}" class="character-card-image" loading="lazy" onerror="this.src=FALLBACK_IMAGE">
                <div class="character-card-name">${animal.name}</div>
                <div class="card-hover-stats">
                    <div class="hover-stat"><i class="fas fa-fist-raised"></i>${Math.round(animal.attack || 0)}</div>
                    <div class="hover-stat"><i class="fas fa-shield-alt"></i>${Math.round(animal.defense || 0)}</div>
                    <div class="hover-stat"><i class="fas fa-bolt"></i>${Math.round(animal.agility || 0)}</div>
                </div>
            `;
            
            fragment.appendChild(card);
        });
        
        this.dom.gridContainer.appendChild(fragment);
    }

    /**
     * Handle clicks on the grid
     */
    handleGridClick(e) {
        const card = e.target.closest('.character-card');
        if (!card) return;
        
        const name = card.querySelector('.character-card-name').textContent;
        const animal = this.state.animals.find(a => a.name === name);
        
        if (animal) {
            if (this.state.view === 'stats') {
                this.selectAnimal(animal, true); // Update URL on user click
            } else {
                this.selectFighter(animal);
            }
        }
    }

    /**
     * Select an animal in Stats view
     * @param {object} animal - Animal to select
     * @param {boolean} updateUrl - Whether to update the URL (default true)
     */
    selectAnimal(animal, updateUrl = true) {
        const prevSelected = this.state.selectedAnimal;
        this.state.selectedAnimal = animal;
        this.updateStatsView(animal);
        
        // Play selection sound
        if (window.AudioManager) {
            window.AudioManager.select();
        }
        
        // Update URL to reflect selected animal
        if (updateUrl && window.Router) {
            const slug = this.getAnimalSlug(animal);
            window.Router.navigate(`/stats/${slug}`);
        }
        
        // Update page SEO for this animal
        try {
            this.updatePageSEO('stats', animal);
        } catch (e) {
            console.warn('Failed to update page SEO:', e);
        }
        
        // Update only affected cards instead of full re-render
        if (prevSelected) {
            const prevCard = this.dom.gridContainer.querySelector(`.character-card[data-id="${prevSelected.id || prevSelected.name}"]`);
            if (prevCard) prevCard.classList.remove('selected');
        }
        const newCard = this.dom.gridContainer.querySelector(`.character-card[data-id="${animal.id || animal.name}"]`);
        if (newCard) newCard.classList.add('selected');
        
        this.updateStatsCommentsBtn(animal);
    }

    /**
     * Update the stats page comments button
     */
    async updateStatsCommentsBtn(animal) {
        const btn = document.getElementById('stats-comments-btn');
        const countEl = document.getElementById('stats-comment-count');
        
        if (!btn || !countEl) return;
        
        // Enable the button
        btn.disabled = false;
        
        // Fetch comment count
        try {
            const animalId = animal._id || animal.id;
            const response = await fetch(`/api/comments?animalId=${animalId}`);
            if (response.ok) {
                const result = await response.json();
                const count = result.data?.length || 0;
                countEl.textContent = count;
            }
        } catch (e) {
            countEl.textContent = '0';
        }
    }

    /**
     * Open comments modal for the currently selected animal (Stats view)
     */
    openStatsComments() {
        if (!this.state.selectedAnimal) {
            Auth.showToast('Please select an animal first');
            return;
        }
        
        const animal = this.state.selectedAnimal;
        const animalId = animal._id || animal.id;
        
        // Use RankingsManager's comments modal
        if (window.rankingsManager) {
            // Create a fake event object that the modal opener expects
            const fakeEvent = {
                currentTarget: {
                    dataset: {
                        animalId: animalId,
                        animalName: animal.name,
                        animalImage: animal.image
                    }
                }
            };
            window.rankingsManager.openCommentsModal(fakeEvent);
        }
    }

    /**
     * Calculate Tier based on stat value (18-tier system)
     */
    calculateTier(value) {
        if (value >= 97) return 'S+';
        if (value >= 93) return 'S';
        if (value >= 88) return 'S-';
        if (value >= 83) return 'A+';
        if (value >= 78) return 'A';
        if (value >= 73) return 'A-';
        if (value >= 68) return 'B+';
        if (value >= 63) return 'B';
        if (value >= 58) return 'B-';
        if (value >= 53) return 'C+';
        if (value >= 48) return 'C';
        if (value >= 43) return 'C-';
        if (value >= 38) return 'D+';
        if (value >= 33) return 'D';
        if (value >= 28) return 'D-';
        if (value >= 20) return 'F+';
        if (value >= 12) return 'F';
        return 'F-';
    }

    /**
     * Update the Stats View UI
     */
    updateStatsView(animal) {
        // Basic Info
        this.dom.charName.textContent = animal.name.toUpperCase();
        this.dom.charScientific.textContent = animal.scientific_name || 'Unknown Species';
        
        // Image
        this.dom.charSilhouette.style.display = 'none';
        this.dom.charImage.style.display = 'block';
        this.dom.charImage.src = animal.image;
        this.dom.charImage.onerror = () => { 
            this.dom.charImage.style.display = 'none';
            this.dom.charSilhouette.style.display = 'flex';
        };

        // Stats Bars
        const statsMap = {
            attack: animal.attack,
            defense: animal.defense,
            agility: animal.agility,
            stamina: animal.stamina,
            intelligence: animal.intelligence,
            special: animal.special
        };

        Object.keys(this.dom.statBars).forEach(stat => {
            const value = statsMap[stat] || 0;
            const tier = this.calculateTier(value);
            
            if (this.dom.statBars[stat]) {
                this.dom.statBars[stat].style.width = `${Math.min(value, 100)}%`;
                // Add tier class for color-coding (use base letter for color)
                const tierBase = tier.charAt(0).toLowerCase();
                this.dom.statBars[stat].className = `stat-bar-fill stat-bar-tier-${tierBase}`;
            }
            
            if (this.dom.statValues[stat]) {
                // Add Tier Badge - convert +/- to valid CSS class names
                const tierClass = tier.toLowerCase().replace('+', 'plus').replace('-', 'minus');
                // Add MAX badge only for stats = 100, HIGH for 90+, ELITE for 95+ (but not 100)
                let statBadge = '';
                if (value >= 100) {
                    statBadge = '<span class="stat-max-badge">MAX</span>';
                } else if (value >= 95) {
                    statBadge = '<span class="stat-high-badge">HIGH</span>';
                }
                // Left stats: badge, number, tier (so tier is towards center)
                // Right stats: tier, number, badge (so tier is towards center)
                // The CSS will handle alignment - left stats have badge first
                this.dom.statValues[stat].innerHTML = `<span class="stat-badge-slot">${statBadge}</span><span class="stat-number">${formatStat(value, 1)}</span><span class="stat-tier-badge tier-${tierClass}">${tier}</span>`;
            }
        });

        // Quick Stats Bar
        if (this.dom.quickWeight) {
            this.updateWeightDisplay(animal);
        }
        if (this.dom.quickSpeed) {
            this.updateSpeedDisplay(animal);
        }
        if (this.dom.quickBite) {
            this.dom.quickBite.textContent = animal.bite_force_psi ? `${formatStat(animal.bite_force_psi, 0)} PSI` : '---';
        }

        // Abilities & Traits Tags
        this.updateAbilitiesTraitsTags(animal);

        // Update Substats in Side Panels
        if (animal.substats) {
            const setSub = (id, val) => {
                const elVal = document.getElementById(`${id}-val`);
                const elBar = document.getElementById(`${id}-bar`);
                if (elVal) elVal.textContent = val;
                if (elBar) elBar.style.width = `${Math.min(val, 100)}%`;
            };

            // Map JSON keys to HTML IDs
            setSub('sub-raw-power', animal.substats.raw_power);
            setSub('sub-weaponry', animal.substats.weaponry);
            setSub('sub-protection', animal.substats.protection);
            setSub('sub-toughness', animal.substats.toughness);
            setSub('sub-speed', animal.substats.speed);
            setSub('sub-maneuverability', animal.substats.maneuverability);
            
            setSub('sub-endurance', animal.substats.endurance);
            setSub('sub-recovery', animal.substats.recovery);
            setSub('sub-tactics', animal.substats.tactics);
            setSub('sub-senses', animal.substats.senses);
            setSub('sub-ferocity', animal.substats.ferocity);
            setSub('sub-abilities', animal.substats.abilities);
        }

        // Details Panel
        const d = this.dom.detailText;
        d.type.textContent = animal.type || '---';
        d.scientific.textContent = animal.scientific_name || '---';
        d.size.textContent = animal.size || '---';
        d.habitat.textContent = animal.habitat || '---';
        d.diet.textContent = Array.isArray(animal.diet) ? animal.diet.join(', ') : (animal.diet || '---');
        d.nocturnal.textContent = animal.isNocturnal ? 'Yes ' : 'No ';
        d.social.textContent = animal.isSocial ? 'Yes ' : 'No (Solitary)';
        d.weight.textContent = animal.weight_kg ? `${formatStat(animal.weight_kg)} kg` : '---';
        d.height.textContent = animal.height_cm ? `${formatStat(animal.height_cm)} cm` : '---';
        d.length.textContent = animal.length_cm ? `${formatStat(animal.length_cm)} cm` : '---';
        d.speed.textContent = animal.speed_mps ? `${formatStat(animal.speed_mps)} m/s (${formatStat(animal.speed_mps * 3.6)} km/h)` : '---';
        d.lifespan.textContent = animal.lifespan_years ? `${formatStat(animal.lifespan_years, 0)} years` : '---';
        d.bite.textContent = animal.bite_force_psi ? `${formatStat(animal.bite_force_psi, 0)} PSI` : '---';
        d.sizeScore.textContent = animal.size_score ? `${formatStat(animal.size_score)} / 100` : '---';
        d.description.textContent = animal.description || 'No description available yet.';

        // Battle Profile
        if (animal.battle_profile) {
            d.combatStyle.textContent = animal.battle_profile.combat_style || '---';
            d.range.textContent = animal.battle_profile.preferred_range || '---';
            d.strengths.textContent = Array.isArray(animal.battle_profile.strengths) ? animal.battle_profile.strengths.join(', ') : '---';
            d.weaknesses.textContent = Array.isArray(animal.battle_profile.weaknesses) ? animal.battle_profile.weaknesses.join(', ') : '---';
        } else {
            d.combatStyle.textContent = '---';
            d.range.textContent = '---';
            d.strengths.textContent = '---';
            d.weaknesses.textContent = '---';
        }
    }

    /**
     * Switch between Stats and Compare views
     * @param {string} viewName - View to switch to
     * @param {boolean} updateUrl - Whether to update the URL (default true)
     */
    switchView(viewName, updateUrl = true) {
        const previousView = this.state.view;
        this.state.view = viewName;
        
        // Play page transition sound
        if (window.AudioManager && previousView !== viewName) {
            window.AudioManager.swoosh(1);
        }
        
        // Update page SEO (for stats view with animal, this is handled in selectAnimal)
        try {
            if (viewName !== 'stats' || !this.state.selectedAnimal) {
                this.updatePageSEO(viewName, this.state.selectedAnimal);
            }
        } catch (e) {
            console.warn('Failed to update page SEO:', e);
        }
        
        // Update the main title based on current view
        const titleModes = {
            home: 'STATS',
            stats: 'STATS',
            compare: 'COMPARE',
            rankings: 'RANKINGS',
            community: 'COMMUNITY',
            battlepoints: 'POINTS',
            about: 'ABOUT',
            login: 'LOGIN',
            signup: 'SIGNUP',
            profile: 'PROFILE'
        };
        if (this.dom.titleMode) {
            this.dom.titleMode.textContent = titleModes[viewName] || 'STATS';
        }
        
        // Reset scroll position on any scrollable elements before switching
        this.resetScrollPositions();
        
        // Activate homepage controller when switching to home
        if (viewName === 'home' && window.HomepageController) {
            window.HomepageController.activate(this.state.animals);
        }
        
        // Update UI classes - include home view, auth views, and profile views
        this.dom.homeView?.classList.toggle('active-view', viewName === 'home');
        this.dom.loginView?.classList.toggle('active-view', viewName === 'login');
        this.dom.signupView?.classList.toggle('active-view', viewName === 'signup');
        this.dom.aboutView?.classList.toggle('active-view', viewName === 'about');
        this.dom.profileView?.classList.toggle('active-view', viewName === 'profile');
        this.dom.publicProfileView?.classList.remove('active-view'); // Always hide public profile when switching
        this.dom.statsView.classList.toggle('active-view', viewName === 'stats');
        this.dom.compareView.classList.toggle('active-view', viewName === 'compare');
        this.dom.rankingsView?.classList.toggle('active-view', viewName === 'rankings');
        this.dom.communityView?.classList.toggle('active-view', viewName === 'community');
        this.dom.battlepointsView?.classList.toggle('active-view', viewName === 'battlepoints');
        
        // Update nav button active states (desktop header)
        this.dom.navBtns.stats.classList.toggle('active', viewName === 'stats');
        this.dom.navBtns.compare.classList.toggle('active', viewName === 'compare');
        this.dom.navBtns.rankings?.classList.toggle('active', viewName === 'rankings');
        this.dom.navBtns.community?.classList.toggle('active', viewName === 'community');
        
        // No nav button for home/login/signup/profile/battlepoints - none should be active
        if (viewName === 'home' || viewName === 'login' || viewName === 'signup' || viewName === 'profile' || viewName === 'battlepoints') {
            this.dom.navBtns.stats.classList.remove('active');
        }
        
        // Update mobile bottom nav active states
        const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
        mobileNavItems.forEach(item => {
            const itemView = item.getAttribute('data-view');
            const isActive = itemView === viewName;
            item.classList.toggle('active', isActive);
        });

        // Update URL if requested
        if (updateUrl && window.Router) {
            const routes = {
                home: '/',
                stats: '/stats',
                compare: '/compare',
                rankings: '/rankings',
                community: '/community',
                battlepoints: '/battlepoints',
                about: '/about',
                login: '/login',
                signup: '/signup',
                profile: '/profile'
            };
            if (routes[viewName]) {
                // For stats, include the animal slug if one is selected
                if (viewName === 'stats' && this.state.selectedAnimal) {
                    const slug = this.getAnimalSlug(this.state.selectedAnimal);
                    window.Router.navigate(`/stats/${slug}`);
                } else {
                    window.Router.navigate(routes[viewName]);
                }
            }
        }

        // Grid visibility logic - preserve user's hidden/shown preference across stats/compare
        const isFullscreenView = viewName === 'home' || viewName === 'login' || viewName === 'signup' || viewName === 'about';
        const isProfileView = viewName === 'profile';
        
        // Show/hide header for different view types
        const gameHeader = document.querySelector('.game-header');
        if (gameHeader) {
            // Home and auth pages don't show header
            gameHeader.style.display = isFullscreenView ? 'none' : '';
        }
        
        if (isFullscreenView || isProfileView) {
            // Hide grid and bottom bar on home, auth, about, and profile pages
            this.dom.gridWrapper?.classList.add('hidden');
            if (this.dom.toggleGridBtn) this.dom.toggleGridBtn.style.display = 'none';
            if (this.dom.sharedBottomBar) this.dom.sharedBottomBar.style.display = 'none';
        } else if (viewName === 'compare') {
            // Show bottom bar for Compare view
            if (this.dom.toggleGridBtn) this.dom.toggleGridBtn.style.display = 'flex';
            if (this.dom.sharedBottomBar) this.dom.sharedBottomBar.style.display = 'flex';
            
            // Apply current grid visibility state (preserved from previous view)
            this.dom.gridWrapper.classList.toggle('hidden', !this.state.isGridVisible);
            
            // Reset selection state if entering compare mode
            if (!this.state.compare.selectingSide) {
                if (!this.state.compare.left) this.setSelectingSide('left');
            }
            
            this.renderGrid();
        } else if (viewName === 'rankings') {
            // Hide grid and bottom bar in rankings view (always hidden)
            this.dom.gridWrapper.classList.add('hidden');
            if (this.dom.toggleGridBtn) this.dom.toggleGridBtn.style.display = 'none';
            if (this.dom.sharedBottomBar) this.dom.sharedBottomBar.style.display = 'none';
            
            // Fetch rankings when entering rankings view
            if (this.rankingsManager) {
                this.rankingsManager.fetchRankings();
            }
        } else if (viewName === 'community') {
            // Hide grid and bottom bar in community view (always hidden)
            this.dom.gridWrapper.classList.add('hidden');
            if (this.dom.toggleGridBtn) this.dom.toggleGridBtn.style.display = 'none';
            if (this.dom.sharedBottomBar) this.dom.sharedBottomBar.style.display = 'none';
            
            // Load community content when entering
            if (this.communityManager) {
                this.communityManager.onViewEnter();
            }
        } else if (viewName === 'battlepoints') {
            // Hide grid and bottom bar in battlepoints view
            this.dom.gridWrapper.classList.add('hidden');
            if (this.dom.toggleGridBtn) this.dom.toggleGridBtn.style.display = 'none';
            if (this.dom.sharedBottomBar) this.dom.sharedBottomBar.style.display = 'none';
            
            // Initialize battlepoints manager when entering
            if (this.battlepointsManager) {
                this.battlepointsManager.onViewEnter();
            }
        } else {
            // Stats view - show bottom bar
            if (this.dom.toggleGridBtn) this.dom.toggleGridBtn.style.display = 'flex';
            if (this.dom.sharedBottomBar) this.dom.sharedBottomBar.style.display = 'flex';
            
            // Apply current grid visibility state (preserved from previous view)
            this.dom.gridWrapper.classList.toggle('hidden', !this.state.isGridVisible);
            
            this.renderGrid();
        }
        
        // Update button text to match current state (for stats/compare only)
        if (viewName === 'stats' || viewName === 'compare') {
            this.updateGridVisibility();
            
            // Disable Comments and More Details buttons on Compare page (not yet implemented)
            const isCompare = (viewName === 'compare');
            const expandDetailsBtn = document.getElementById('expand-details-btn');
            const statsCommentsBtn = document.getElementById('stats-comments-btn');
            if (expandDetailsBtn) expandDetailsBtn.disabled = isCompare;
            if (statsCommentsBtn) statsCommentsBtn.disabled = isCompare;
        }
    }

    /**
     * Set which side is currently selecting a fighter
     */
    setSelectingSide(side) {
        this.state.compare.selectingSide = side;
        
        // Visual feedback
        this.dom.fighter1.display.classList.toggle('selecting', side === 'left');
        this.dom.fighter2.display.classList.toggle('selecting', side === 'right');
    }

    /**
     * Select a fighter for the active side
     */
    selectFighter(animal) {
        const side = this.state.compare.selectingSide;
        if (!side) return;

        // Play fighter selection sound
        if (window.AudioManager) {
            AudioManager.fighterSelect();
        }

        const prevAnimal = this.state.compare[side];
        this.state.compare[side] = animal;
        this.updateFighterCard(side, animal);
        this.updateRadarChart(); // Update chart whenever a fighter changes
        
        // Update only affected cards instead of full re-render
        const otherSide = side === 'left' ? 'right' : 'left';
        const selectedClass = side === 'left' ? 'selected-fighter1' : 'selected-fighter2';
        
        if (prevAnimal) {
            const prevCard = this.dom.gridContainer.querySelector(`.character-card[data-id="${prevAnimal.id || prevAnimal.name}"]`);
            if (prevCard) prevCard.classList.remove(selectedClass);
        }
        const newCard = this.dom.gridContainer.querySelector(`.character-card[data-id="${animal.id || animal.name}"]`);
        if (newCard) newCard.classList.add(selectedClass);
        
        // Auto-switch to other side if empty
        if (side === 'left' && !this.state.compare.right) {
            this.setSelectingSide('right');
        } else if (side === 'right' && !this.state.compare.left) {
            this.setSelectingSide('left');
        } else {
            this.setSelectingSide(null); // Both selected
        }

        this.updateFightButton();
    }

    /**
     * Update Radar Chart
     */
    updateRadarChart() {
        const left = this.state.compare.left;
        const right = this.state.compare.right;
        
        if (!this.dom.radarCanvas) return;

        // Destroy existing chart if it exists
        if (this.radarChart) {
            this.radarChart.destroy();
        }

        // If no animals selected, don't render
        if (!left && !right) return;

        const ctx = this.dom.radarCanvas.getContext('2d');
        
        const data = {
            labels: ['Attack', 'Defense', 'Agility', 'Stamina', 'Intel', 'Special'],
            datasets: []
        };

        if (left) {
            data.datasets.push({
                label: left.name,
                data: [left.attack, left.defense, left.agility, left.stamina, left.intelligence, left.special],
                fill: true,
                backgroundColor: 'rgba(0, 255, 136, 0.2)',
                borderColor: '#00ff88',
                pointBackgroundColor: '#00ff88',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#00ff88'
            });
        }

        if (right) {
            data.datasets.push({
                label: right.name,
                data: [right.attack, right.defense, right.agility, right.stamina, right.intelligence, right.special],
                fill: true,
                backgroundColor: 'rgba(255, 0, 153, 0.2)',
                borderColor: '#ff0099',
                pointBackgroundColor: '#ff0099',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#ff0099'
            });
        }

        this.radarChart = new Chart(ctx, {
            type: 'radar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                elements: {
                    line: { borderWidth: 2 }
                },
                scales: {
                    r: {
                        angleLines: { color: 'rgba(255, 255, 255, 0.2)' },
                        grid: { color: 'rgba(255, 255, 255, 0.2)' },
                        pointLabels: {
                            color: '#fff',
                            font: { family: 'Bebas Neue', size: 12 }
                        },
                        ticks: { display: false, backdropColor: 'transparent' },
                        suggestedMin: 0,
                        suggestedMax: 100
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: '#fff', font: { family: 'Inter' } }
                    }
                }
            }
        });
    }

    /**
     * Update a fighter card in Compare view
     */
    updateFighterCard(side, animal) {
        const els = side === 'left' ? this.dom.fighter1 : this.dom.fighter2;
        
        if (els.placeholder) els.placeholder.style.display = 'none';
        if (els.img) {
            els.img.style.display = 'block';
            els.img.src = animal.image;
            els.img.onerror = () => { els.img.src = FALLBACK_IMAGE; };
        }
        
        if (els.name) els.name.textContent = animal.name.toUpperCase();
        
        // Update hidden stats
        const statsMap = {
            attack: animal.attack,
            defense: animal.defense,
            agility: animal.agility,
            stamina: animal.stamina,
            intelligence: animal.intelligence,
            special: animal.special
        };

        Object.keys(els.stats).forEach(stat => {
            if (els.stats[stat]) els.stats[stat].textContent = statsMap[stat]?.toFixed(1) || '0';
        });
        
        // Update comparison highlighting
        this.updateCompareHighlights();
        
        // Trigger ComparePageEnhancements to update tournament-style info
        if (window.ComparePageEnhancements && typeof window.ComparePageEnhancements.updateFighterInfo === 'function') {
            // Trigger via image change - the observer will pick it up
            // Or directly call update
            const num = side === 'left' ? 1 : 2;
            window.ComparePageEnhancements.updateFighterDisplay?.(side, animal);
        }
    }

    /**
     * Update stat comparison highlights to show which animal is better
     */
    updateCompareHighlights() {
        const { left, right } = this.state.compare;
        if (!left || !right) return;
        
        const stats = ['attack', 'defense', 'agility', 'stamina', 'intelligence', 'special'];
        
        stats.forEach(stat => {
            const leftVal = left[stat] || 0;
            const rightVal = right[stat] || 0;
            const leftEl = this.dom.fighter1.stats[stat];
            const rightEl = this.dom.fighter2.stats[stat];
            const leftRow = leftEl?.closest('.compare-stat-row');
            const rightRow = rightEl?.closest('.compare-stat-row');
            
            // Reset classes
            leftRow?.classList.remove('stat-winner', 'stat-loser', 'stat-tie');
            rightRow?.classList.remove('stat-winner', 'stat-loser', 'stat-tie');
            
            if (leftVal > rightVal) {
                leftRow?.classList.add('stat-winner');
                rightRow?.classList.add('stat-loser');
            } else if (rightVal > leftVal) {
                rightRow?.classList.add('stat-winner');
                leftRow?.classList.add('stat-loser');
            } else {
                leftRow?.classList.add('stat-tie');
                rightRow?.classList.add('stat-tie');
            }
        });
    }

    toggleFighterStats(side) {
        const els = side === 'left' ? this.dom.fighter1 : this.dom.fighter2;
        const isVisible = els.statsPanel.style.display === 'block';
        els.statsPanel.style.display = isVisible ? 'none' : 'block';
        
        // Update highlights when showing stats
        if (!isVisible) {
            this.updateCompareHighlights();
        }
    }

    updateFightButton() {
        const { left, right } = this.state.compare;
        if (left && right) {
            this.dom.fightBtn.disabled = false;
            this.dom.fightBtn.style.opacity = '1';
            this.dom.fightBtn.style.cursor = 'pointer';
        } else {
            this.dom.fightBtn.disabled = true;
            this.dom.fightBtn.style.opacity = '0.5';
            this.dom.fightBtn.style.cursor = 'not-allowed';
        }
    }

    /**
     * Toggle Details Panel
     */
    toggleDetails() {
        this.state.isDetailsExpanded = !this.state.isDetailsExpanded;
        this.dom.detailsPanel.classList.toggle('expanded', this.state.isDetailsExpanded);
        this.dom.expandDetailsBtn.classList.toggle('expanded', this.state.isDetailsExpanded);
        
        const icon = this.dom.expandDetailsBtn.querySelector('i');
        const toggleSeparator = document.getElementById('toggle-separator');
        
        if (this.state.isDetailsExpanded) {
            icon.className = 'fas fa-chevron-down';
            this.dom.expandDetailsBtn.innerHTML = '<i class="fas fa-chevron-up"></i> LESS DETAILS';
            this.dom.gridWrapper.classList.add('hidden');
            this.dom.toggleGridBtn.style.display = 'none';
            if (toggleSeparator) toggleSeparator.style.display = 'none';
        } else {
            icon.className = 'fas fa-chevron-up';
            this.dom.expandDetailsBtn.innerHTML = '<i class="fas fa-info-circle"></i> MORE DETAILS';
            this.dom.gridWrapper.classList.remove('hidden');
            this.dom.toggleGridBtn.style.display = 'flex';
            if (toggleSeparator) toggleSeparator.style.display = 'block';
        }
    }

    /**
     * Update weight display based on current unit preference
     */
    updateWeightDisplay(animal) {
        if (!this.dom.quickWeight || !animal) return;
        
        if (!animal.weight_kg) {
            this.dom.quickWeight.textContent = '---';
            return;
        }
        
        if (this.state.weightUnit === 'lbs') {
            const lbs = (animal.weight_kg * 2.20462).toFixed(1);
            this.dom.quickWeight.textContent = `${formatNumber(parseFloat(lbs))} lbs`;
        } else {
            const kg = Number.isInteger(animal.weight_kg) ? animal.weight_kg.toFixed(1) : animal.weight_kg;
            this.dom.quickWeight.textContent = `${formatNumber(parseFloat(kg))} kg`;
        }
    }

    /**
     * Update speed display based on current unit preference
     */
    updateSpeedDisplay(animal) {
        if (!this.dom.quickSpeed || !animal) return;
        
        if (!animal.speed_mps) {
            this.dom.quickSpeed.textContent = '---';
            return;
        }
        
        if (this.state.speedUnit === 'mph') {
            const mph = (animal.speed_mps * 2.23694).toFixed(1);
            this.dom.quickSpeed.textContent = `${formatNumber(parseFloat(mph))} mph`;
        } else {
            const kmh = (animal.speed_mps * 3.6).toFixed(1);
            this.dom.quickSpeed.textContent = `${formatNumber(parseFloat(kmh))} km/h`;
        }
    }

    /**
     * Toggle weight unit between kg and lbs
     */
    toggleWeightUnit() {
        this.state.weightUnit = this.state.weightUnit === 'kg' ? 'lbs' : 'kg';
        // Save preference to localStorage
        localStorage.setItem('weightUnit', this.state.weightUnit);
        // Update display
        if (this.state.selectedAnimal) {
            this.updateWeightDisplay(this.state.selectedAnimal);
        }
    }

    /**
     * Toggle speed unit between km/h and mph
     */
    toggleSpeedUnit() {
        this.state.speedUnit = this.state.speedUnit === 'kmh' ? 'mph' : 'kmh';
        // Save preference to localStorage
        localStorage.setItem('speedUnit', this.state.speedUnit);
        // Update display
        if (this.state.selectedAnimal) {
            this.updateSpeedDisplay(this.state.selectedAnimal);
        }
    }

    /**
     * Update abilities and traits in side cards
     */
    updateAbilitiesTraitsTags(animal) {
        // Update abilities list
        if (this.dom.info.abilitiesList) {
            const abilities = animal.special_abilities || [];
            if (abilities.length > 0) {
                this.dom.info.abilitiesList.innerHTML = abilities.map(ability => 
                    `<div class="ability-item"><i class="fas fa-bolt"></i> ${ability}</div>`
                ).join('');
            } else {
                this.dom.info.abilitiesList.innerHTML = '<div class="ability-item placeholder">No abilities</div>';
            }
        }
        
        // Update traits list
        if (this.dom.info.traitsList) {
            const traits = animal.unique_traits || [];
            if (traits.length > 0) {
                this.dom.info.traitsList.innerHTML = traits.map(trait => 
                    `<div class="trait-item"><i class="fas fa-star"></i> ${trait}</div>`
                ).join('');
            } else {
                this.dom.info.traitsList.innerHTML = '<div class="trait-item placeholder">No traits</div>';
            }
        }
        
        // Update battle record
        this.updateBattleRecord(animal);
    }
    
    /**
     * Update battle record from rankings data
     */
    updateBattleRecord(animal) {
        // Find animal in rankings (from RankingsManager)
        const animalName = animal.name.toLowerCase();
        const rankings = (this.rankingsManager && this.rankingsManager.rankings) ? this.rankingsManager.rankings : [];
        
        // Rankings data uses item.animal.name structure
        const rankData = rankings.find((item, index) => {
            const itemAnimal = item.animal || item;
            return itemAnimal.name && itemAnimal.name.toLowerCase() === animalName;
        });
        
        // Get the rank (1-based index in the rankings array)
        const rankIndex = rankings.findIndex((item) => {
            const itemAnimal = item.animal || item;
            return itemAnimal.name && itemAnimal.name.toLowerCase() === animalName;
        });
        
        if (rankData) {
            // Set rank (1-based)
            if (this.dom.info.animalRank) {
                this.dom.info.animalRank.textContent = `#${rankIndex + 1}`;
            }
            
            // Get totalFights and winRate from rankData (API structure)
            const battles = rankData.totalFights || 0;
            const winRate = rankData.winRate || 0;
            
            if (this.dom.info.animalBattles) {
                this.dom.info.animalBattles.textContent = battles;
            }
            
            // Set win rate
            if (this.dom.info.animalWinrate) {
                if (battles > 0) {
                    this.dom.info.animalWinrate.textContent = `${Math.round(winRate)}%`;
                } else {
                    this.dom.info.animalWinrate.textContent = '--%';
                }
            }
        } else {
            // No ranking data found
            if (this.dom.info.animalRank) this.dom.info.animalRank.textContent = '#--';
            if (this.dom.info.animalBattles) this.dom.info.animalBattles.textContent = '0';
            if (this.dom.info.animalWinrate) this.dom.info.animalWinrate.textContent = '--%';
        }
    }

    /**
     * Toggle Grid Visibility
     */
    toggleGrid() {
        this.state.isGridVisible = !this.state.isGridVisible;
        
        // Play toggle sound
        if (window.AudioManager) {
            window.AudioManager.toggle_sound(this.state.isGridVisible);
        }
        
        // Persist state to localStorage
        localStorage.setItem('isGridVisible', this.state.isGridVisible);
        
        this.updateGridVisibility();
    }
    
    /**
     * Update grid visibility based on current state
     */
    updateGridVisibility() {
        this.dom.gridWrapper.classList.toggle('hidden', !this.state.isGridVisible);
        
        // Update button text
        if (this.dom.toggleGridBtn) {
            if (this.state.isGridVisible) {
                this.dom.toggleGridBtn.innerHTML = '<i class="fas fa-chevron-down"></i> HIDE MENU';
            } else {
                this.dom.toggleGridBtn.innerHTML = '<i class="fas fa-chevron-up"></i> SHOW MENU';
            }
        }
    }

    /**
     * Update profile page with user data (Retro style)
     */
    updateProfilePage() {
        if (!window.Auth || !window.Auth.user) return;
        
        const user = window.Auth.user;
        const {
            displayName = 'User',
            username = 'user',
            level = 1,
            xp = 0,
            xpToNext,
            prestige = 0,
            battlePoints = 0,
            profileAnimal,
            totalXp = 0,
            battlesWon = 0,
            votesCast = 0,
            createdAt
        } = user;
        
        // Calculate XP values
        const xpNeeded = xpToNext || window.Auth.xpToNextLevel(level);
        const xpPercentage = Math.min(100, Math.round((xp / xpNeeded) * 100));
        
        // Update profile picture using Auth helper
        const profilePic = document.getElementById('retro-profile-pic');
        if (profilePic && window.Auth) {
            window.Auth.updateAvatarDisplay(profilePic, profileAnimal);
        }
        
        // Update profile name
        const profileName = document.getElementById('retro-profile-name');
        if (profileName) {
            profileName.textContent = displayName;
        }
        
        // Update profile info
        const levelEl = document.getElementById('retro-profile-level');
        const prestigeEl = document.getElementById('retro-profile-prestige');
        const bpEl = document.getElementById('retro-profile-bp');
        
        if (levelEl) levelEl.textContent = level;
        if (prestigeEl) {
            prestigeEl.textContent = prestige > 0 ? `â­ ${prestige}` : '0';
            // Update the badge tier for styling
            prestigeEl.dataset.tier = Math.min(prestige, 10);
        }
        if (bpEl) bpEl.textContent = window.Auth.formatNumber(battlePoints);
        
        // Update the profile page wrapper prestige for left column styling
        const profilePage = document.querySelector('.abs-profile-page');
        if (profilePage) {
            profilePage.dataset.prestige = Math.min(prestige, 10);
        }
        
        // Update statistics
        const totalXpEl = document.getElementById('retro-profile-total-xp');
        const currentXpEl = document.getElementById('retro-profile-current-xp');
        const battlesWonEl = document.getElementById('retro-profile-battles-won');
        const votesCastEl = document.getElementById('retro-profile-votes-cast');
        
        if (totalXpEl) totalXpEl.textContent = window.Auth.formatNumber(totalXp || xp);
        if (currentXpEl) currentXpEl.textContent = `${xp} / ${xpNeeded}`;
        if (battlesWonEl) battlesWonEl.textContent = battlesWon || '0';
        if (votesCastEl) votesCastEl.textContent = votesCast || '0';
        
        // Update XP progress bar
        const xpLevel = document.getElementById('retro-xp-level');
        const xpNextLevel = document.getElementById('retro-xp-next-level');
        const xpBarFill = document.getElementById('retro-xp-bar-fill');
        const xpText = document.getElementById('retro-xp-text');
        
        if (xpLevel) xpLevel.textContent = level;
        if (xpNextLevel) xpNextLevel.textContent = level + 1;
        if (xpBarFill) xpBarFill.style.width = `${xpPercentage}%`;
        if (xpText) xpText.textContent = `${xp} / ${xpNeeded} XP (${xpPercentage}%)`;
        
        // Update member since
        const memberSince = document.getElementById('retro-profile-member-since');
        if (memberSince && createdAt) {
            const date = new Date(createdAt);
            memberSince.textContent = date.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
            });
        }
        
        // Update feed username and join date
        const feedUsername = document.getElementById('retro-feed-username');
        if (feedUsername) {
            feedUsername.textContent = displayName;
        }
        
        const feedJoinDate = document.getElementById('retro-feed-join-date');
        if (feedJoinDate && createdAt) {
            const date = new Date(createdAt);
            feedJoinDate.textContent = date.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
            });
        }
        
        // Update feed count
        const feedCount = document.getElementById('retro-feed-count');
        if (feedCount) {
            feedCount.textContent = '1'; // At least the join event
        }
        
        // Populate edit form with current values
        const editDisplayName = document.getElementById('retro-display-name');
        const editUsername = document.getElementById('retro-username');
        if (editDisplayName) editDisplayName.value = displayName;
        if (editUsername) editUsername.value = user.username || '';
    }
    
    /**
     * Show public profile for a user (full page view)
     */
    async showPublicProfile(username) {
        // Switch to public profile view
        this.switchToPublicProfileView();
        
        const loading = document.getElementById('public-profile-loading');
        const error = document.getElementById('public-profile-error');
        const errorText = document.getElementById('public-profile-error-text');
        const data = document.getElementById('public-profile-data');
        const page = document.getElementById('public-profile-page');
        
        // Show loading state
        if (loading) loading.style.display = 'flex';
        if (error) error.style.display = 'none';
        if (data) data.style.display = 'none';
        
        try {
            const response = await fetch(`/api/auth?action=user&username=${encodeURIComponent(username)}`);
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to load profile');
            }
            
            const user = result.data.user;
            
            // Set prestige tier on page for styling
            if (page) {
                page.setAttribute('data-prestige', user.prestige || 0);
            }
            
            // Update avatar
            const avatar = document.getElementById('public-profile-avatar');
            if (avatar) {
                if (user.profileAnimal && this.state?.animals) {
                    const animal = this.state.animals.find(a => 
                        a.name.toLowerCase() === user.profileAnimal.toLowerCase()
                    );
                    if (animal?.image) {
                        avatar.innerHTML = `<img src="${animal.image}" alt="${user.profileAnimal}">`;
                    } else {
                        avatar.innerHTML = `<i class="fas fa-user-circle"></i>`;
                    }
                } else {
                    avatar.innerHTML = `<i class="fas fa-user-circle"></i>`;
                }
            }
            
            // Update name
            const name = document.getElementById('public-profile-name');
            if (name) name.textContent = user.displayName || user.username;
            
            // Update badges
            const badges = document.getElementById('public-profile-badges');
            if (badges) {
                let badgeHtml = '';
                if (user.role === 'admin') {
                    badgeHtml += '<span class="abs-role-badge admin"><i class="fas fa-shield-alt"></i> Admin</span>';
                } else if (user.role === 'moderator') {
                    badgeHtml += '<span class="abs-role-badge mod"><i class="fas fa-gavel"></i> Mod</span>';
                }
                badges.innerHTML = badgeHtml;
            }
            
            // Calculate XP values
            const level = user.level || 1;
            const prestige = user.prestige || 0;
            const xp = user.xp || 0;
            const xpNeeded = this.calculateXpNeeded ? this.calculateXpNeeded(level) : 100;
            const xpPercentage = Math.min((xp / xpNeeded) * 100, 100);
            const totalXp = user.totalXp || xp;
            
            // Update sidebar stats
            const levelEl = document.getElementById('public-profile-level');
            const prestigeEl = document.getElementById('public-profile-prestige');
            const bpEl = document.getElementById('public-profile-bp');
            if (levelEl) levelEl.textContent = level;
            if (prestigeEl) {
                prestigeEl.textContent = prestige;
                prestigeEl.setAttribute('data-tier', prestige);
            }
            if (bpEl) bpEl.textContent = totalXp.toLocaleString();
            
            // Update statistics panel
            const totalXpEl = document.getElementById('public-profile-total-xp');
            const currentXpEl = document.getElementById('public-profile-current-xp');
            const battlesWonEl = document.getElementById('public-profile-battles-won');
            const votesCastEl = document.getElementById('public-profile-votes-cast');
            if (totalXpEl) totalXpEl.textContent = totalXp.toLocaleString();
            if (currentXpEl) currentXpEl.textContent = `${xp.toLocaleString()} / ${xpNeeded.toLocaleString()}`;
            if (battlesWonEl) battlesWonEl.textContent = (user.battlesWon || 0).toLocaleString();
            if (votesCastEl) votesCastEl.textContent = (user.votesCast || 0).toLocaleString();
            
            // Update XP progress panel
            const xpLevelEl = document.getElementById('public-xp-level');
            const xpBarFill = document.getElementById('public-xp-bar-fill');
            const xpTextEl = document.getElementById('public-xp-text');
            const xpNextLevelEl = document.getElementById('public-xp-next-level');
            if (xpLevelEl) xpLevelEl.textContent = level;
            if (xpBarFill) xpBarFill.style.width = `${xpPercentage}%`;
            if (xpTextEl) xpTextEl.textContent = `${xp.toLocaleString()} / ${xpNeeded.toLocaleString()} XP`;
            if (xpNextLevelEl) xpNextLevelEl.textContent = level + 1;
            
            // Update member since date
            const memberSince = document.getElementById('public-profile-member-since');
            const feedJoinDate = document.getElementById('public-feed-join-date');
            const feedUsername = document.getElementById('public-feed-username');
            if (user.createdAt) {
                const date = new Date(user.createdAt);
                const dateStr = date.toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                });
                if (memberSince) memberSince.textContent = dateStr;
                if (feedJoinDate) feedJoinDate.textContent = dateStr;
            }
            if (feedUsername) feedUsername.textContent = user.displayName || user.username;
            
            // Update status indicator (we'll show "Offline" for now since we don't track online status)
            const statusDot = document.getElementById('public-profile-status-dot');
            const statusText = document.getElementById('public-profile-status');
            if (statusDot) statusDot.className = 'abs-status-dot offline';
            if (statusText) statusText.textContent = 'Offline';
            
            // Show data, hide loading
            if (loading) loading.style.display = 'none';
            if (data) data.style.display = 'flex';
            
        } catch (err) {
            console.error('Error loading public profile:', err);
            if (loading) loading.style.display = 'none';
            if (error) error.style.display = 'flex';
            if (errorText) errorText.textContent = err.message || 'User not found';
        }
    }
    
    /**
     * Switch to public profile view
     */
    switchToPublicProfileView() {
        // Hide all other views
        this.dom.homeView?.classList.remove('active-view');
        this.dom.loginView?.classList.remove('active-view');
        this.dom.signupView?.classList.remove('active-view');
        this.dom.profileView?.classList.remove('active-view');
        this.dom.statsView?.classList.remove('active-view');
        this.dom.compareView?.classList.remove('active-view');
        this.dom.rankingsView?.classList.remove('active-view');
        this.dom.communityView?.classList.remove('active-view');
        
        // Show public profile view
        this.dom.publicProfileView?.classList.add('active-view');
        
        // Keep header visible, but hide grid and bottom bar
        const gameHeader = document.querySelector('.game-header');
        if (gameHeader) gameHeader.style.display = '';
        this.dom.gridWrapper?.classList.add('hidden');
        if (this.dom.toggleGridBtn) this.dom.toggleGridBtn.style.display = 'none';
        if (this.dom.sharedBottomBar) this.dom.sharedBottomBar.style.display = 'none';
        
        // Remove active states from nav buttons
        this.dom.navBtns.stats?.classList.remove('active');
        this.dom.navBtns.compare?.classList.remove('active');
        this.dom.navBtns.rankings?.classList.remove('active');
        this.dom.navBtns.community?.classList.remove('active');
    }
    
    /**
     * Close public profile and go back
     */
    closePublicProfile() {
        // Navigate back
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.Router?.navigate('/');
        }
    }
    
    /**
     * Navigate to a user's profile
     */
    goToUserProfile(username) {
        if (username) {
            // Close any open modals first
            this.closeAllModals();
            window.Router?.navigate(`/profile/${encodeURIComponent(username)}`);
        }
    }
    
    /**
     * Close all open modals
     */
    closeAllModals() {
        // Close comments modal
        const commentsModal = document.getElementById('comments-modal');
        if (commentsModal) commentsModal.classList.remove('show');
        
        // Close auth modal
        const authModal = document.getElementById('auth-modal');
        if (authModal) authModal.classList.remove('show');
        
        // Close avatar picker
        const avatarPicker = document.getElementById('avatar-picker-modal');
        if (avatarPicker) avatarPicker.classList.remove('show');
        
        // Close inline comments panels
        document.querySelectorAll('.inline-comments-panel').forEach(panel => panel.remove());
        document.querySelectorAll('.ranking-row.comments-expanded').forEach(row => row.classList.remove('comments-expanded'));
        
        // Close any thread detail view in community
        const threadDetail = document.getElementById('thread-detail');
        if (threadDetail) threadDetail.classList.remove('active');
    }
    
    /**
     * Setup profile page dropdown toggles
     */
    setupProfileDropdowns() {
        // Find all panel headers with toggle functionality on the profile page
        document.querySelectorAll('#profile-view .abs-panel-header[data-toggle="collapse"]').forEach(header => {
            header.addEventListener('click', () => {
                const toggle = header.querySelector('.abs-panel-toggle');
                const content = header.nextElementSibling;
                
                if (toggle && content) {
                    const isCollapsed = content.classList.contains('abs-collapsed');
                    
                    if (isCollapsed) {
                        content.classList.remove('abs-collapsed');
                        toggle.classList.remove('fa-chevron-right');
                        toggle.classList.add('fa-chevron-down');
                    } else {
                        content.classList.add('abs-collapsed');
                        toggle.classList.remove('fa-chevron-down');
                        toggle.classList.add('fa-chevron-right');
                    }
                }
            });
        });
    }
    
    /**
     * Setup About info button click handlers for navigation
     * Desktop: In nav tabs after Community
     * Mobile: Top-right after BP pill
     */
    setupAboutInfoButtons() {
        const desktopBtn = document.getElementById('about-info-btn-desktop');
        const mobileBtn = document.getElementById('about-info-btn-mobile');
        
        // Click handler function
        const navigateToAbout = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Add click ripple effect
            const btn = e.currentTarget;
            btn.classList.add('about-btn-clicked');
            setTimeout(() => btn.classList.remove('about-btn-clicked'), 300);
            
            // Navigate to about page
            if (window.Router) {
                window.Router.navigate('/about');
            } else {
                window.location.href = '/about';
            }
        };
        
        // Keyboard handler for accessibility (Enter/Space)
        const handleKeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigateToAbout(e);
            }
        };
        
        // Attach handlers to both buttons
        if (desktopBtn) {
            desktopBtn.addEventListener('click', navigateToAbout);
            desktopBtn.addEventListener('keydown', handleKeydown);
        }
        
        if (mobileBtn) {
            mobileBtn.addEventListener('click', navigateToAbout);
            mobileBtn.addEventListener('keydown', handleKeydown);
            
            // Add touch feedback for mobile
            mobileBtn.addEventListener('touchstart', () => {
                mobileBtn.classList.add('about-btn-touched');
            }, { passive: true });
            
            mobileBtn.addEventListener('touchend', () => {
                setTimeout(() => mobileBtn.classList.remove('about-btn-touched'), 150);
            }, { passive: true });
        }
        
        // Setup audio toggle button
        this.setupAudioToggle();
    }
    
    /**
     * Setup the audio mute toggle button
     */
    setupAudioToggle() {
        const audioBtn = document.getElementById('audio-toggle-btn');
        const audioIcon = document.getElementById('audio-toggle-icon');
        
        if (!audioBtn || !audioIcon) return;
        
        // Update icon based on current state
        const updateIcon = () => {
            if (window.AudioManager) {
                const enabled = AudioManager.isEnabled();
                audioIcon.className = enabled ? 'fas fa-volume-up' : 'fas fa-volume-mute';
                audioBtn.title = enabled ? 'Mute Sound Effects' : 'Unmute Sound Effects';
            }
        };
        
        // Initial state
        updateIcon();
        
        // Toggle on click
        audioBtn.addEventListener('click', () => {
            if (window.AudioManager) {
                AudioManager.toggleMute();
                updateIcon();
                // Play a small click to confirm unmute
                if (AudioManager.isEnabled()) {
                    AudioManager.click();
                }
            }
        });
    }

    /**
     * Start the fight simulation
     */
    async startFight() {
        const { left, right } = this.state.compare;
        
        if (!left || !right) return;

        // Calculate fight scores using weighted stats formula
        // Weights: Attack 35%, Defense 23%, Agility 15%, Stamina 2%, Intelligence 10%, Special 15%
        const score1 = this.calculateFightScore(left);
        const score2 = this.calculateFightScore(right);
        
        // Calculate win probability: probA = scoreA / (scoreA + scoreB)
        const prob1 = score1 / (score1 + score2);
        const prob2 = 1 - prob1;
        
        let winner, loser, winnerScore, loserScore, winnerProb;
        if (prob1 > prob2) {
            winner = left;
            loser = right;
            winnerScore = score1;
            loserScore = score2;
            winnerProb = prob1;
        } else if (prob2 > prob1) {
            winner = right;
            loser = left;
            winnerScore = score2;
            loserScore = score1;
            winnerProb = prob2;
        } else {
            // Tie breaker: Attack stat
            if (left.attack > right.attack) {
                winner = left;
                loser = right;
                winnerScore = score1;
                loserScore = score2;
            } else {
                winner = right;
                loser = left;
                winnerScore = score2;
                loserScore = score1;
            }
            winnerProb = 0.5;
        }

        // Notify Discord about the fight
        await this.notifyFight(left.name, right.name);

        // Calculate loser probability
        const loserProb = winner === left ? prob2 : prob1;

        // Use ComparePageEnhancements for animated result display
        if (window.ComparePageEnhancements && typeof window.ComparePageEnhancements.playFightSequence === 'function') {
            window.ComparePageEnhancements.playFightSequence(left, right, {
                winner,
                loser,
                winnerScore,
                loserScore,
                winnerProb: winnerProb * 100,
                loserProb: loserProb * 100
            });
        } else {
            // Fallback to alert if enhancements not loaded
            const probPercent = Math.round(winnerProb * 100);
            alert(`FIGHT PREDICTION:\n\nðŸ† ${winner.name} wins!\n\n${winner.name}: ${probPercent}% chance\n${loser.name}: ${100 - probPercent}% chance\n\nFight Score:\n${winner.name}: ${winnerScore.toFixed(1)}\n${loser.name}: ${loserScore.toFixed(1)}`);
        }
    }

    /**
     * Notify Discord about a fight comparison
     */
    async notifyFight(animal1, animal2) {
        try {
            const user = Auth.isLoggedIn() ? Auth.getUser()?.username : 'Anonymous';
            await fetch('/api/rankings?action=fight', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ animal1, animal2, user })
            });
        } catch (e) {
            // Silently fail - not critical
        }
    }

    /**
     * Update page title and meta tags for SEO
     * @param {string} view - Current view name
     * @param {object} animal - Selected animal (optional)
     */
    updatePageSEO(view, animal = null) {
        const siteName = 'Animal Battle Stats';
        const baseDescription = 'The animal powerscaling database. Compare matchups, rank the roster, and run tournaments to see who comes out on top.';
        
        let title = siteName;
        let description = baseDescription;
        let canonicalPath = '/';
        let jsonLd = null;
        
        switch (view) {
            case 'home':
                title = `${siteName} - The Ultimate Animal Powerscaling Database`;
                description = baseDescription;
                canonicalPath = '/';
                // Website schema for home
                jsonLd = {
                    "@context": "https://schema.org",
                    "@type": "WebSite",
                    "name": siteName,
                    "url": "https://animalbattlestats.com",
                    "description": baseDescription,
                    "potentialAction": {
                        "@type": "SearchAction",
                        "target": "https://animalbattlestats.com/stats/{search_term_string}",
                        "query-input": "required name=search_term_string"
                    }
                };
                break;
                
            case 'stats':
                if (animal) {
                    title = `${animal.name} Stats & Abilities | ${siteName}`;
                    description = `${animal.name} (${animal.scientific_name || 'Unknown Species'}) combat stats: Attack ${animal.attack || 0}, Defense ${animal.defense || 0}, Agility ${animal.agility || 0}. Weight: ${animal.weight_kg ? animal.weight_kg + ' kg' : 'Unknown'}. ${animal.description || ''}`;
                    const slug = animal.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                    canonicalPath = `/stats/${slug}`;
                    
                    // Rich Animal schema for AI crawlers
                    jsonLd = {
                        "@context": "https://schema.org",
                        "@type": "Dataset",
                        "name": `${animal.name} Combat Statistics`,
                        "description": description,
                        "url": `https://animalbattlestats.com/stats/${slug}`,
                        "keywords": [animal.name, animal.scientific_name, animal.type, "animal stats", "combat stats", "who would win"].filter(Boolean),
                        "creator": {
                            "@type": "Organization",
                            "name": "Animal Battle Stats"
                        },
                        "variableMeasured": [
                            { "@type": "PropertyValue", "name": "Attack", "value": animal.attack || 0, "maxValue": 100, "unitText": "points" },
                            { "@type": "PropertyValue", "name": "Defense", "value": animal.defense || 0, "maxValue": 100, "unitText": "points" },
                            { "@type": "PropertyValue", "name": "Agility", "value": animal.agility || 0, "maxValue": 100, "unitText": "points" },
                            { "@type": "PropertyValue", "name": "Stamina", "value": animal.stamina || 0, "maxValue": 100, "unitText": "points" },
                            { "@type": "PropertyValue", "name": "Intelligence", "value": animal.intelligence || 0, "maxValue": 100, "unitText": "points" },
                            { "@type": "PropertyValue", "name": "Special", "value": animal.special || 0, "maxValue": 100, "unitText": "points" },
                            animal.weight_kg ? { "@type": "PropertyValue", "name": "Weight", "value": animal.weight_kg, "unitText": "kg" } : null,
                            animal.speed_mps ? { "@type": "PropertyValue", "name": "Speed", "value": animal.speed_mps, "unitText": "m/s" } : null,
                            animal.lifespan_years ? { "@type": "PropertyValue", "name": "Lifespan", "value": animal.lifespan_years, "unitText": "years" } : null
                        ].filter(Boolean),
                        "about": {
                            "@type": "Thing",
                            "name": animal.name,
                            "alternateName": animal.scientific_name || undefined,
                            "description": animal.description || `${animal.name} is a ${animal.type || 'animal'} with unique combat abilities.`
                        }
                    };
                    
                    // Add FAQ schema for niche powerscaling questions (GEO targeting)
                    const faqSchema = {
                        "@context": "https://schema.org",
                        "@type": "FAQPage",
                        "mainEntity": [
                            {
                                "@type": "Question",
                                "name": `${animal.name} battle stats`,
                                "acceptedAnswer": {
                                    "@type": "Answer",
                                    "text": `${animal.name} battle stats: Attack ${animal.attack || 0}/100, Defense ${animal.defense || 0}/100, Agility ${animal.agility || 0}/100, Stamina ${animal.stamina || 0}/100, Intelligence ${animal.intelligence || 0}/100, Special ${animal.special || 0}/100. ${animal.weight_kg ? `Weight: ${animal.weight_kg} kg.` : ''} ${animal.speed_mps ? `Top speed: ${(animal.speed_mps * 3.6).toFixed(1)} km/h.` : ''}`
                                }
                            },
                            {
                                "@type": "Question",
                                "name": `${animal.name} powerscaling stats`,
                                "acceptedAnswer": {
                                    "@type": "Answer",
                                    "text": (() => {
                                        const avgStat = ((animal.attack || 0) + (animal.defense || 0) + (animal.agility || 0) + (animal.stamina || 0) + (animal.intelligence || 0) + (animal.special || 0)) / 6;
                                        const tier = avgStat >= 80 ? 'S-tier' : avgStat >= 65 ? 'A-tier' : avgStat >= 50 ? 'B-tier' : avgStat >= 35 ? 'C-tier' : 'D-tier';
                                        const strongest = Object.entries({attack: animal.attack||0, defense: animal.defense||0, agility: animal.agility||0, stamina: animal.stamina||0, intelligence: animal.intelligence||0, special: animal.special||0}).sort((a,b) => b[1]-a[1])[0];
                                        return `${animal.name} powerscaling: ${tier} fighter (avg ${avgStat.toFixed(0)}/100). Strongest stat: ${strongest[0]} (${strongest[1]}). Attack ${animal.attack || 0}, Defense ${animal.defense || 0}, Agility ${animal.agility || 0}. ${animal.weight_kg ? `Weight class: ${animal.weight_kg} kg.` : ''}`;
                                    })()
                                }
                            },
                            {
                                "@type": "Question",
                                "name": `${animal.name} vs - who would win?`,
                                "acceptedAnswer": {
                                    "@type": "Answer",
                                    "text": `${animal.name} matchup analysis: ${animal.attack >= 80 ? 'High offensive threat - can overpower most opponents.' : animal.agility >= 80 ? 'Speed-based fighter - relies on evasion and quick strikes.' : animal.defense >= 80 ? 'Tank build - outlasts enemies through durability.' : 'Balanced stats - matchup dependent.'} Key stats: ATK ${animal.attack || 0}, DEF ${animal.defense || 0}, AGI ${animal.agility || 0}, SPE ${animal.special || 0}. ${animal.weight_kg ? `Mass: ${animal.weight_kg} kg.` : ''} Compare any two animals head-to-head on Animal Battle Stats.`
                                }
                            },
                            {
                                "@type": "Question",
                                "name": `Bloodlusted ${animal.name} - how dangerous?`,
                                "acceptedAnswer": {
                                    "@type": "Answer",
                                    "text": (() => {
                                        const threat = (animal.attack || 0) + (animal.special || 0) + (animal.agility || 0) / 2;
                                        const ferocity = animal.substats?.ferocity || animal.special || 50;
                                        if (threat >= 180) return `Bloodlusted ${animal.name} is an extreme threat. With ${animal.attack} attack, ${animal.special || 0} special, and ${animal.weight_kg ? animal.weight_kg + ' kg of mass' : 'raw power'}, it becomes one of the most dangerous animals when fully aggressive. Ferocity rating: ${ferocity}/100.`;
                                        if (threat >= 130) return `A bloodlusted ${animal.name} is highly dangerous. Attack: ${animal.attack}, Special: ${animal.special || 0}. When enraged, its ${animal.agility || 0} agility and natural weapons make it a serious threat to almost any opponent.`;
                                        if (threat >= 80) return `Bloodlusted ${animal.name}: moderate threat level. Base attack ${animal.attack}/100. When aggressive, can cause serious damage but has limitations. ${animal.weight_kg ? `Weight: ${animal.weight_kg} kg.` : ''}`;
                                        return `Even bloodlusted, ${animal.name} has limited combat capability (${animal.attack} attack). However, any cornered animal can be dangerous. Special abilities: ${animal.special || 0}/100.`;
                                    })()
                                }
                            },
                            {
                                "@type": "Question",
                                "name": `How strong is a ${animal.name} in a fight?`,
                                "acceptedAnswer": {
                                    "@type": "Answer",
                                    "text": `${animal.name} combat strength: Attack ${animal.attack || 0}/100, Defense ${animal.defense || 0}/100, Special ${animal.special || 0}/100. ${animal.attack >= 70 ? `With ${animal.attack} attack, it's a high-tier offensive fighter.` : animal.defense >= 70 ? `With ${animal.defense} defense, it excels at taking hits.` : `Balanced fighter across stats.`} ${animal.weight_kg ? `Fight weight: ${animal.weight_kg} kg (${(animal.weight_kg * 2.205).toFixed(0)} lbs).` : ''}`
                                }
                            }
                        ]
                    };
                    
                    // Combine schemas
                    jsonLd = [jsonLd, faqSchema];
                } else {
                    title = `Animal Stats Database | ${siteName}`;
                    description = 'Browse detailed combat stats for over 225 animals. Attack, defense, agility, stamina, intelligence, and special abilities.';
                    canonicalPath = '/stats';
                    jsonLd = {
                        "@context": "https://schema.org",
                        "@type": "CollectionPage",
                        "name": "Animal Stats Database",
                        "description": description,
                        "url": "https://animalbattlestats.com/stats",
                        "numberOfItems": 225,
                        "mainEntity": {
                            "@type": "ItemList",
                            "name": "Animal Combat Statistics",
                            "description": "Comprehensive database of animal combat statistics"
                        }
                    };
                }
                break;
                
            case 'compare':
                title = `Compare Animals - Who Would Win? | ${siteName}`;
                description = 'Compare any two animals head-to-head. See who would win in a hypothetical battle based on stats, abilities, weight, speed, and more.';
                canonicalPath = '/compare';
                jsonLd = {
                    "@context": "https://schema.org",
                    "@type": "WebApplication",
                    "name": "Animal Battle Comparison Tool",
                    "description": description,
                    "url": "https://animalbattlestats.com/compare",
                    "applicationCategory": "Entertainment",
                    "offers": {
                        "@type": "Offer",
                        "price": "0",
                        "priceCurrency": "USD"
                    }
                };
                break;
                
            case 'rankings':
                title = `Power Rankings - Top Animals | ${siteName}`;
                description = 'Community-voted power rankings for all 225+ animals. See which animals are considered the most powerful apex predators.';
                canonicalPath = '/rankings';
                jsonLd = {
                    "@context": "https://schema.org",
                    "@type": "ItemList",
                    "name": "Animal Power Rankings",
                    "description": description,
                    "url": "https://animalbattlestats.com/rankings",
                    "numberOfItems": 225,
                    "itemListOrder": "https://schema.org/ItemListOrderDescending"
                };
                break;
                
            case 'community':
                title = `Community | ${siteName}`;
                description = 'Join the Animal Battle Stats community. Discuss matchups, share opinions, and connect with other animal enthusiasts.';
                canonicalPath = '/community';
                break;
                
            case 'tournament':
                title = `Tournament Mode | ${siteName}`;
                description = 'Run bracket-style tournaments with 4, 8, 16, or 32 animals to crown the ultimate animal champion.';
                canonicalPath = '/tournament';
                jsonLd = {
                    "@context": "https://schema.org",
                    "@type": "WebApplication",
                    "name": "Animal Battle Tournament",
                    "description": description,
                    "url": "https://animalbattlestats.com/tournament",
                    "applicationCategory": "Game"
                };
                break;
                
            case 'about':
                title = `About | ${siteName}`;
                description = 'Learn about Animal Battle Stats - how we calculate combat stats, our methodology, and the team behind the ultimate animal powerscaling database.';
                canonicalPath = '/about';
                jsonLd = {
                    "@context": "https://schema.org",
                    "@type": "AboutPage",
                    "name": "About Animal Battle Stats",
                    "description": description,
                    "url": "https://animalbattlestats.com/about",
                    "mainEntity": {
                        "@type": "Organization",
                        "name": "Animal Battle Stats",
                        "url": "https://animalbattlestats.com",
                        "description": "The ultimate animal powerscaling database with combat statistics for 225+ animals."
                    }
                };
                break;
                
            case 'login':
            case 'signup':
                title = `${view === 'login' ? 'Login' : 'Sign Up'} | ${siteName}`;
                description = 'Join Animal Battle Stats to vote on rankings, comment on animals, and participate in the community.';
                canonicalPath = `/${view}`;
                break;
        }
        
        // Update document title
        document.title = title;
        
        // Update meta description
        let metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.setAttribute('content', description);
        }
        
        // Update OG tags
        let ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) {
            ogTitle.setAttribute('content', title);
        }
        
        let ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) {
            ogDesc.setAttribute('content', description);
        }
        
        let ogUrl = document.querySelector('meta[property="og:url"]');
        if (ogUrl) {
            ogUrl.setAttribute('content', `https://animalbattlestats.com${canonicalPath}`);
        }
        
        // Update OG image for animal pages
        let ogImage = document.querySelector('meta[property="og:image"]');
        if (ogImage && animal && animal.image) {
            const imageUrl = animal.image.startsWith('http') ? animal.image : `https://animalbattlestats.com${animal.image}`;
            ogImage.setAttribute('content', imageUrl);
        }
        
        // Update canonical link (create if doesn't exist)
        let canonical = document.querySelector('link[rel="canonical"]');
        if (!canonical) {
            canonical = document.createElement('link');
            canonical.setAttribute('rel', 'canonical');
            document.head.appendChild(canonical);
        }
        canonical.setAttribute('href', `https://animalbattlestats.com${canonicalPath}`);
        
        // Update JSON-LD structured data for AI/search engines
        this.updateJsonLd(jsonLd);
    }
    
    /**
     * Update JSON-LD structured data in the document head
     * Critical for GEO (Generative Engine Optimization) - helps AI crawlers understand content
     */
    updateJsonLd(data) {
        // Remove existing JSON-LD scripts
        const existingScripts = document.querySelectorAll('script[type="application/ld+json"][data-dynamic="true"]');
        existingScripts.forEach(script => script.remove());
        
        if (!data) return;
        
        // Handle array of schemas (e.g., Dataset + FAQPage)
        const schemas = Array.isArray(data) ? data : [data];
        
        schemas.forEach(schema => {
            const script = document.createElement('script');
            script.type = 'application/ld+json';
            script.setAttribute('data-dynamic', 'true');
            script.textContent = JSON.stringify(schema);
            document.head.appendChild(script);
        });
    }

    /**
     * Calculate fight score using weighted stats
     * Weights: Attack 50%, Defense 13%, Agility 4%, Stamina 1%, Intelligence 2%, Special 10%, Weight 20%
     */
    calculateFightScore(animal) {
        // Normalize weight to 0-100 scale using log scale
        // Log scale: tiny animals (0.01kg) = ~0, huge animals (10000kg) = ~100
        const weightKg = animal.weight_kg || animal.weight || animal.averageWeight || 50;
        const normalizedWeight = Math.min(100, Math.max(0, (Math.log10(weightKg) + 2) * 16.67));
        
        // Weighted stat formula (weights sum to 100%)
        const score = 
            (animal.attack || 0) * 0.50 +
            (animal.defense || 0) * 0.13 +
            (animal.agility || 0) * 0.04 +
            (animal.stamina || 0) * 0.01 +
            (animal.intelligence || 0) * 0.02 +
            (animal.special || 0) * 0.10 +
            normalizedWeight * 0.20;
        
        return score;
    }
}

// ========================================

// SECTION: APP INITIALIZATION
// ========================================

// Initialize App when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Failsafe: hide loading screen after 10 seconds no matter what
    const loadingFailsafe = setTimeout(() => {
        const loadingScreen = document.getElementById('app-loading-screen');
        if (loadingScreen && !loadingScreen.classList.contains('hidden')) {
            console.warn('Loading screen failsafe triggered - forcing hide');
            loadingScreen.classList.add('hidden');
            setTimeout(() => loadingScreen.remove(), 300);
        }
    }, 10000);
    
    try {
        console.log('[DEBUG] Creating AnimalStatsApp...');
        window.app = new AnimalStatsApp();
        console.log('[DEBUG] Calling init()...');
        await window.app.init();
        console.log('[DEBUG] Init completed successfully');
        clearTimeout(loadingFailsafe);
    } catch (error) {
        console.error('[DEBUG] Fatal error:', error);
        clearTimeout(loadingFailsafe);
        // Force hide loading screen
        const loadingScreen = document.getElementById('app-loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
        alert('Failed to load: ' + error.message);
    }
});

// ========================================

