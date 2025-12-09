/**
 * Animal Stats - Expert Optimized Script
 * Handles application logic, state management, and UI rendering.
 * 
 * @version 3.0.0 - MongoDB Backend Integration
 */

'use strict';

// Helper function to format numbers with commas
function formatNumber(num) {
    if (num === null || num === undefined) return null;
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Helper function to format numbers with consistent decimals (.0 for whole numbers)
function formatStat(num, decimals = 1) {
    if (num === null || num === undefined) return null;
    const fixed = Number(num).toFixed(decimals);
    // Insert commas only in the integer part, keep decimal part intact
    const parts = fixed.split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.length > 1 ? `${intPart}.${parts[1]}` : intPart;
}

// API Configuration
const API_CONFIG = {
    // Base URL for API - auto-detects local vs production
    baseUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? '' // Use relative paths in development
        : '', // Use relative paths in production too (same domain)
    endpoints: {
        animals: '/api/animals',
        search: '/api/search',
        random: '/api/random',
        stats: '/api/stats',
        health: '/api/health'
    },
    // Fallback to local data if API fails
    useFallback: true
};

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
            
            // New Compare Controls
            compareToggleGridBtn: document.getElementById('compare-toggle-grid-btn')
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
            
            // Fetch rankings data to get power ranks for sorting
            await this.rankingsManager.fetchRankings();
            
            // Initial Render with power rank sort as default
            this.state.filters.sort = 'rank';
            this.applyFilters();
            
            // Select first animal by default if available
            if (this.state.filteredAnimals.length > 0) {
                this.selectAnimal(this.state.filteredAnimals[0]);
            }
            
            // Refresh user avatar now that animals are loaded
            if (window.Auth && window.Auth.isLoggedIn()) {
                window.Auth.updateUserStatsBar();
            }
            
            this.showLoadingState(false);
            console.log(`Animal Stats App Initialized (API: ${this.state.apiAvailable ? 'Connected' : 'Fallback Mode'})`);
        } catch (error) {
            console.error('Initialization failed:', error);
            this.showLoadingState(false);
            alert('Failed to load animal data. Please try refreshing the page.');
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
            fetch(API_CONFIG.baseUrl + '/api/health', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            }).catch(() => {});
            
            // Set up site leave tracking
            window.addEventListener('beforeunload', () => {
                const data = JSON.stringify({ type: 'site_leave', username });
                navigator.sendBeacon(API_CONFIG.baseUrl + '/api/health', data);
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
     * Fetch animal data from API or fallback to local data
     */
    async fetchData() {
        // First, check if API is available
        const apiHealthy = await this.checkApiHealth();
        
        if (apiHealthy) {
            try {
                // Add cache-busting timestamp to always get fresh data from MongoDB
                const cacheBuster = `?_t=${Date.now()}`;
                const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.animals}${cacheBuster}`, {
                    method: 'GET',
                    headers: { 
                        'Accept': 'application/json',
                        'Cache-Control': 'no-cache'
                    },
                    signal: AbortSignal.timeout(10000) // 10 second timeout
                });
                
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.data) {
                        this.state.animals = result.data;
                        this.state.filteredAnimals = [...result.data];
                        this.state.apiAvailable = true;
                        console.log(`Loaded ${result.data.length} animals from MongoDB API`);
                        return;
                    }
                }
                throw new Error('Invalid API response');
            } catch (error) {
                console.warn('API fetch failed, falling back to local data:', error.message);
            }
        }

        // Fallback to local data
        await this.loadLocalData();
    }

    /**
     * Load data from local sources (window.animalData or animal_stats.json)
     */
    async loadLocalData() {
        // Check for global data first (from data.js)
        if (window.animalData) {
            this.state.animals = window.animalData;
            this.state.filteredAnimals = [...window.animalData];
            this.state.apiAvailable = false;
            console.log(`Loaded ${window.animalData.length} animals from local data.js`);
            return;
        }

        // Fallback to fetch JSON file
        try {
            const response = await fetch('animal_stats.json');
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            this.state.animals = data;
            this.state.filteredAnimals = [...data];
            this.state.apiAvailable = false;
            console.log(`Loaded ${data.length} animals from animal_stats.json`);
        } catch (error) {
            console.error('Error loading local data:', error);
            throw error;
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
        
        // UI Toggles
        if (this.dom.expandDetailsBtn) {
            this.dom.expandDetailsBtn.addEventListener('click', this.toggleDetails);
        }
        if (this.dom.toggleGridBtn) {
            this.dom.toggleGridBtn.addEventListener('click', this.toggleGrid);
        }
        if (this.dom.compareToggleGridBtn) {
            this.dom.compareToggleGridBtn.addEventListener('click', this.toggleGrid);
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
        
        // Navigation
        this.dom.navBtns.stats.addEventListener('click', () => this.switchView('stats'));
        this.dom.navBtns.compare.addEventListener('click', () => this.switchView('compare'));
        this.dom.navBtns.rankings?.addEventListener('click', () => this.switchView('rankings'));
        this.dom.navBtns.community?.addEventListener('click', () => this.switchView('community'));
        
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
        
        // Toggle filter dropdown
        if (filterToggle && filterPanel) {
            filterToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                filterToggle.classList.toggle('active');
                filterPanel.classList.toggle('show');
                // Close sort panel
                sortToggle?.classList.remove('active');
                sortPanel?.classList.remove('show');
            });
        }
        
        // Toggle sort dropdown
        if (sortToggle && sortPanel) {
            sortToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                sortToggle.classList.toggle('active');
                sortPanel.classList.toggle('show');
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
     * Handle category filter
     */
    handleFilter = (e) => {
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
            // Power Rank: sort by powerRank if available, otherwise by attack stat
            if (sort === 'rank') {
                // If rankings are loaded, use netScore, otherwise use attack
                const aRank = a.powerRank ?? a.attack;
                const bRank = b.powerRank ?? b.attack;
                return bRank - aRank;
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
                <img src="${animal.image}" alt="${animal.name}" class="character-card-image" loading="lazy" onerror="this.src='https://via.placeholder.com/110x80?text=?'">
                <div class="character-card-name">${animal.name}</div>
                <div class="card-hover-stats">
                    <div class="hover-stat"><span class="hover-stat-icon">⚔</span>${Math.round(animal.attack || 0)}</div>
                    <div class="hover-stat"><span class="hover-stat-icon">🛡</span>${Math.round(animal.defense || 0)}</div>
                    <div class="hover-stat"><span class="hover-stat-icon">⚡</span>${Math.round(animal.agility || 0)}</div>
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
                this.selectAnimal(animal);
            } else {
                this.selectFighter(animal);
            }
        }
    }

    /**
     * Select an animal in Stats view
     */
    selectAnimal(animal) {
        this.state.selectedAnimal = animal;
        this.updateStatsView(animal);
        this.renderGrid(); // Re-render to update selection highlight
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
                this.dom.statValues[stat].innerHTML = `${value} <span class="stat-tier-badge tier-${tierClass}">${tier}</span>`;
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
     */
    switchView(viewName) {
        this.state.view = viewName;
        
        // Update the main title based on current view
        const titleModes = {
            stats: 'STATS',
            compare: 'COMPARE',
            rankings: 'RANKINGS',
            community: 'COMMUNITY'
        };
        if (this.dom.titleMode) {
            this.dom.titleMode.textContent = titleModes[viewName] || 'STATS';
        }
        
        // Update UI classes
        this.dom.statsView.classList.toggle('active-view', viewName === 'stats');
        this.dom.compareView.classList.toggle('active-view', viewName === 'compare');
        this.dom.rankingsView?.classList.toggle('active-view', viewName === 'rankings');
        this.dom.communityView?.classList.toggle('active-view', viewName === 'community');
        
        this.dom.navBtns.stats.classList.toggle('active', viewName === 'stats');
        this.dom.navBtns.compare.classList.toggle('active', viewName === 'compare');
        this.dom.navBtns.rankings?.classList.toggle('active', viewName === 'rankings');
        this.dom.navBtns.community?.classList.toggle('active', viewName === 'community');

        // Grid visibility logic
        if (viewName === 'compare') {
            this.dom.gridWrapper.classList.remove('hidden');
            this.dom.toggleGridBtn.style.display = 'none';
            
            // Reset selection state if entering compare mode
            if (!this.state.compare.selectingSide) {
                if (!this.state.compare.left) this.setSelectingSide('left');
            }
        } else if (viewName === 'rankings') {
            // Hide grid in rankings view
            this.dom.gridWrapper.classList.add('hidden');
            this.dom.toggleGridBtn.style.display = 'none';
            
            // Fetch rankings when entering rankings view
            if (this.rankingsManager) {
                this.rankingsManager.fetchRankings();
            }
        } else if (viewName === 'community') {
            // Hide grid in community view
            this.dom.gridWrapper.classList.add('hidden');
            this.dom.toggleGridBtn.style.display = 'none';
            
            // Load community content when entering
            if (this.communityManager) {
                this.communityManager.onViewEnter();
            }
        } else {
            this.dom.toggleGridBtn.style.display = 'flex';
            this.dom.gridWrapper.classList.remove('hidden');
        }

        // Ensure grid state is synced for stats/compare views only
        if (viewName !== 'rankings' && viewName !== 'community') {
            this.state.isGridVisible = true;
            this.dom.gridWrapper.classList.remove('hidden');
            
            // Update buttons text
            const updateBtn = (btn) => {
                if (btn) btn.innerHTML = '<i class="fas fa-chevron-down"></i> HIDE MENU';
            };
            updateBtn(this.dom.toggleGridBtn);
            updateBtn(this.dom.compareToggleGridBtn);

            this.renderGrid();
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

        this.state.compare[side] = animal;
        this.updateFighterCard(side, animal);
        this.updateRadarChart(); // Update chart whenever a fighter changes
        
        // Auto-switch to other side if empty
        if (side === 'left' && !this.state.compare.right) {
            this.setSelectingSide('right');
        } else if (side === 'right' && !this.state.compare.left) {
            this.setSelectingSide('left');
        } else {
            this.setSelectingSide(null); // Both selected
        }

        this.updateFightButton();
        this.renderGrid();
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
        
        els.placeholder.style.display = 'none';
        els.img.style.display = 'block';
        els.img.src = animal.image;
        els.img.onerror = () => { els.img.src = 'https://via.placeholder.com/350x350?text=' + animal.name; };
        
        els.name.textContent = animal.name.toUpperCase();
        
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
        
        if (this.state.isDetailsExpanded) {
            icon.className = 'fas fa-chevron-down';
            this.dom.expandDetailsBtn.innerHTML = '<i class="fas fa-chevron-up"></i> LESS DETAILS';
            this.dom.gridWrapper.classList.add('hidden');
            this.dom.toggleGridBtn.style.display = 'none';
        } else {
            icon.className = 'fas fa-chevron-up';
            this.dom.expandDetailsBtn.innerHTML = '<i class="fas fa-info-circle"></i> MORE DETAILS';
            this.dom.gridWrapper.classList.remove('hidden');
            this.dom.toggleGridBtn.style.display = 'flex';
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
        const rankData = rankings.find(r => r.name && r.name.toLowerCase() === animalName);
        
        if (rankData) {
            // Set rank
            if (this.dom.info.animalRank) {
                this.dom.info.animalRank.textContent = `#${rankData.rank || '--'}`;
            }
            
            // Calculate battles (wins + losses)
            const wins = rankData.wins || 0;
            const losses = rankData.losses || 0;
            const battles = wins + losses;
            
            if (this.dom.info.animalBattles) {
                this.dom.info.animalBattles.textContent = battles;
            }
            
            // Calculate win rate
            if (this.dom.info.animalWinrate) {
                if (battles > 0) {
                    const winRate = Math.round((wins / battles) * 100);
                    this.dom.info.animalWinrate.textContent = `${winRate}%`;
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
        this.dom.gridWrapper.classList.toggle('hidden', !this.state.isGridVisible);
        
        // Update button text
        const updateBtn = (btn) => {
            if (!btn) return;
            if (this.state.isGridVisible) {
                btn.innerHTML = '<i class="fas fa-chevron-down"></i> HIDE MENU';
            } else {
                btn.innerHTML = '<i class="fas fa-chevron-up"></i> SHOW MENU';
            }
        };

        updateBtn(this.dom.toggleGridBtn);
        updateBtn(this.dom.compareToggleGridBtn);
    }

    /**
     * Start the fight simulation
     */
    async startFight() {
        const { left, right } = this.state.compare;
        
        if (!left || !right) return;

        // Fetch battle stats (PowerScores) for both animals
        let leftStats = { battleRating: 1000 };
        let rightStats = { battleRating: 1000 };
        
        try {
            const [leftRes, rightRes] = await Promise.all([
                fetch(`/api/battles?animal=${encodeURIComponent(left.name)}`),
                fetch(`/api/battles?animal=${encodeURIComponent(right.name)}`)
            ]);
            
            if (leftRes.ok) {
                const data = await leftRes.json();
                if (data.success && data.data) {
                    leftStats = data.data;
                }
            }
            if (rightRes.ok) {
                const data = await rightRes.json();
                if (data.success && data.data) {
                    rightStats = data.data;
                }
            }
        } catch (e) {
            console.warn('Could not fetch battle stats, using defaults');
        }

        // Calculate fight scores using PowerScore formula
        // PowerScore = 0.60 * TournamentScore + 0.25 * VoteScore + 0.15 * AttackScore
        // For fight prediction, we use battleRating as the primary indicator
        const score1 = this.calculateFightScore(left, leftStats.battleRating);
        const score2 = this.calculateFightScore(right, rightStats.battleRating);
        
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

        // Display result with win probability
        const probPercent = Math.round(winnerProb * 100);
        alert(`FIGHT PREDICTION:\n\n🏆 ${winner.name} wins!\n\n${winner.name}: ${probPercent}% chance\n${loser.name}: ${100 - probPercent}% chance\n\nFight Score:\n${winner.name}: ${winnerScore.toFixed(1)}\n${loser.name}: ${loserScore.toFixed(1)}`);
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
     * Calculate fight score using battle rating (ELO) and raw stats
     * FightScore = battleRating * (1 + statsBonus)
     * where statsBonus comes from raw attack/defense/agility
     */
    calculateFightScore(animal, battleRating = 1000) {
        // Stats bonus: weighted combination normalized to 0-0.3 range
        const rawScore = (animal.attack * 2) + (animal.defense * 1.5) + (animal.agility * 1.2) + animal.stamina;
        const maxPossible = 100 * 2 + 100 * 1.5 + 100 * 1.2 + 100; // 570
        const statsBonus = (rawScore / maxPossible) * 0.3; // 0 to 0.3 bonus
        
        // FightScore = battleRating * (1 + statsBonus)
        return battleRating * (1 + statsBonus);
    }
}

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
        this.comments = [];
        
        // DOM Elements
        this.dom = {
            rankingsList: document.getElementById('rankings-list'),
            rankingsSearch: document.getElementById('rankings-search'),
            loginPrompt: document.getElementById('rankings-login-prompt'),
            
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
    }

    bindEvents() {
        // Rankings search
        this.dom.rankingsSearch?.addEventListener('input', (e) => {
            this.filterRankings(e.target.value);
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
     * Update the main app's animals with power rank data for sorting
     */
    updateAnimalPowerRanks() {
        if (!this.app || !this.app.state.animals) return;
        
        // Create a lookup map: name -> rank info
        const rankMap = {};
        this.rankings.forEach((item, index) => {
            // powerRank = netScore (votes), or if no votes, use attack as tiebreaker
            // Higher is better, so we use a composite score
            const powerRank = item.netScore * 1000 + (item.animal.attack || 0);
            rankMap[item.animal.name] = powerRank;
        });
        
        // Update each animal with its power rank
        this.app.state.animals.forEach(animal => {
            animal.powerRank = rankMap[animal.name] ?? animal.attack;
        });
        
        // Trigger re-render if current sort is 'rank'
        if (this.app.state.filters.sort === 'rank') {
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
            const card = this.createRankingCard(item, index + 1);
            fragment.appendChild(card);
        });

        this.dom.rankingsList.innerHTML = '';
        this.dom.rankingsList.appendChild(fragment);
    }

    createRankingCard(item, rank) {
        const card = document.createElement('div');
        card.className = 'ranking-card';
        
        if (rank <= 3) {
            card.classList.add('top-3', `rank-${rank}`);
        }

        const animal = item.animal || item;
        const animalId = animal._id || animal.id;
        const userVote = this.userVotes[animalId] || 0;
        const isLoggedIn = Auth.isLoggedIn();

        // Trend data (from API or calculated)
        const trend = item.trend || 0;
        const trendClass = trend > 0 ? 'rising' : trend < 0 ? 'falling' : 'stable';
        const trendIcon = trend > 0 ? 'fa-arrow-up' : trend < 0 ? 'fa-arrow-down' : 'fa-minus';
        const trendText = trend > 0 ? `+${trend}` : trend < 0 ? `${trend}` : '=';
        
        // Add trend glow to card
        if (trend > 0) card.classList.add('trend-rising');
        else if (trend < 0) card.classList.add('trend-falling');

        // Power score (from API)
        const powerScore = item.powerScore || 50;
        
        // Win rate (from tournament battles)
        const winRate = item.winRate || 50;
        const winRateClass = winRate >= 60 ? '' : winRate >= 40 ? 'low' : 'poor';
        const totalFights = item.totalFights || 0;
        const winRateLabel = totalFights > 0 ? `${winRate}%` : '--';

        card.innerHTML = `
            <div class="ranking-card-top">
                <div class="rank-display">
                    <div class="rank-number">#${rank}</div>
                    <div class="rank-trend ${trendClass}">
                        <i class="fas ${trendIcon}"></i>
                        <span>${trendText}</span>
                    </div>
                </div>
                <img src="${animal.image}" alt="${animal.name}" class="ranking-animal-img" 
                    onerror="this.src='https://via.placeholder.com/70x70?text=?'">
                <div class="ranking-animal-info">
                    <div class="ranking-animal-name">${animal.name}</div>
                    <div class="ranking-animal-meta">
                        <div class="win-rate">
                            <i class="fas fa-trophy"></i>
                            ${totalFights > 0 
                                ? `<span class="win-rate-value ${winRateClass}">${winRate}%</span> win rate <span class="win-rate-fights">(${totalFights} battles)</span>`
                                : '<span class="win-rate-value">No battles yet</span>'}
                        </div>
                    </div>
                </div>
            </div>
            <div class="ranking-card-actions">
                <div class="vote-buttons">
                    <button class="vote-btn upvote ${userVote === 1 ? 'active' : ''}" 
                        data-animal-id="${animalId}" data-animal-name="${animal.name}" data-value="1"
                        ${!isLoggedIn ? 'disabled' : ''} title="Should be ranked higher">
                        <i class="fas fa-arrow-up"></i>
                    </button>
                    <div class="vote-counts">
                        <span class="vote-count up">+${item.upvotes || 0}</span>
                        <span class="vote-count down">-${item.downvotes || 0}</span>
                    </div>
                    <button class="vote-btn downvote ${userVote === -1 ? 'active' : ''}" 
                        data-animal-id="${animalId}" data-animal-name="${animal.name}" data-value="-1"
                        ${!isLoggedIn ? 'disabled' : ''} title="Overrated">
                        <i class="fas fa-arrow-down"></i>
                    </button>
                </div>
                <div class="ranking-card-btns">
                    <button class="view-stats-ranking-btn" data-animal-name="${animal.name}">
                        <i class="fas fa-chart-bar"></i>
                        <span>Stats</span>
                    </button>
                    <button class="comments-btn" data-animal-id="${animalId}" data-animal-name="${animal.name}" 
                        data-animal-image="${animal.image}">
                        <i class="fas fa-comment"></i>
                        <span class="count">${item.commentCount || 0}</span>
                    </button>
                </div>
            </div>
        `;

        // Bind vote buttons
        card.querySelectorAll('.vote-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleVote(e));
        });

        // Bind View Stats button
        card.querySelector('.view-stats-ranking-btn').addEventListener('click', (e) => this.viewAnimalStats(e));

        // Bind comments button
        card.querySelector('.comments-btn').addEventListener('click', (e) => this.openCommentsModal(e));

        return card;
    }

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

        try {
            const response = await fetch('/api/votes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.getToken()}`
                },
                body: JSON.stringify({ animalId, animalName, voteType })
            });

            const result = await response.json();

            if (result.success) {
                // Update local state based on response
                if (result.action === 'removed') {
                    delete this.userVotes[animalId];
                } else {
                    // Store 1 for 'up', -1 for 'down'
                    this.userVotes[animalId] = result.data.userVote === 'up' ? 1 : -1;
                }

                // Update the UI
                const card = btn.closest('.ranking-card');
                const upBtn = card.querySelector('.upvote');
                const downBtn = card.querySelector('.downvote');
                const upCount = card.querySelector('.vote-count.up');
                const downCount = card.querySelector('.vote-count.down');

                upBtn.classList.toggle('active', this.userVotes[animalId] === 1);
                downBtn.classList.toggle('active', this.userVotes[animalId] === -1);
                
                // Update vote counts from response
                if (upCount && result.data.upvotes !== undefined) {
                    upCount.textContent = `+${result.data.upvotes}`;
                }
                if (downCount && result.data.downvotes !== undefined) {
                    downCount.textContent = `-${result.data.downvotes}`;
                }

                // Show XP popup if vote was added (not removed)
                if (result.action !== 'removed') {
                    this.showXpPopup(5, 1); // 5 XP, 1 BP
                }
            } else {
                Auth.showToast(result.error || 'Failed to vote');
            }
        } catch (error) {
            console.error('Vote error:', error);
            Auth.showToast('Error voting. Please try again.');
        }
    }

    showXpPopup(xp, bp) {
        const popup = document.createElement('div');
        popup.className = 'xp-popup';
        popup.innerHTML = `<i class="fas fa-star"></i> +${xp} XP, +${bp} BP`;
        document.body.appendChild(popup);
        
        setTimeout(() => {
            popup.remove();
        }, 2000);
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
        const cards = this.dom.rankingsList.querySelectorAll('.ranking-card');
        
        cards.forEach(card => {
            const name = card.querySelector('.ranking-animal-name').textContent.toLowerCase();
            card.style.display = name.includes(term) ? '' : 'none';
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

        // Update modal header
        this.dom.commentsAnimalName.textContent = this.currentAnimal.name;
        this.dom.commentsAnimalImage.src = this.currentAnimal.image;
        this.dom.commentsAnimalImage.onerror = () => {
            this.dom.commentsAnimalImage.src = 'https://via.placeholder.com/60x60?text=?';
        };

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
        this.currentAnimal = null;
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
                this.dom.commentsCount.textContent = `${this.comments.length} comment${this.comments.length !== 1 ? 's' : ''}`;
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
        div.className = 'comment-item' + (isReply ? ' reply-item' : '') + (comment.isAnonymous ? ' anonymous' : '');
        div.dataset.commentId = comment._id;

        // Handle anonymous vs regular display
        const displayName = comment.isAnonymous ? 'Anonymous' : 
            (comment.authorUsername || comment.author?.displayName || comment.author?.username || 'Unknown');
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

        // Add user ID for avatar refresh
        const userIdAttr = authorId ? `data-user-id="${authorId}"` : '';
        
        div.innerHTML = `
            <div class="comment-header" ${userIdAttr}>
                <div class="comment-author">
                    <span class="comment-avatar">${avatarHtml}</span>
                    <span class="comment-author-name">${displayName}</span>
                </div>
                <span class="comment-date">${timeAgo}</span>
            </div>
            <div class="comment-content">${this.escapeHtml(comment.content)}</div>
            <div class="comment-actions">
                <button class="comment-action-btn upvote-btn ${hasUpvoted ? 'upvoted' : ''}" data-comment-id="${comment._id}"><i class="fas fa-thumbs-up"></i></button><span class="vote-score ${scoreClass}">${score}</span><button class="comment-action-btn downvote-btn ${hasDownvoted ? 'downvoted' : ''}" data-comment-id="${comment._id}"><i class="fas fa-thumbs-down"></i></button>
                <button class="comment-action-btn reply-btn" data-comment-id="${comment._id}">
                    <i class="fas fa-reply"></i>
                    Reply
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

        try {
            const response = await fetch(`/api/comments?id=${commentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${Auth.getToken()}`
                }
            });

            if (response.ok) {
                await this.fetchComments();
                Auth.showToast('Comment deleted');
            }
        } catch (error) {
            console.error('Error deleting comment:', error);
            Auth.showToast('Error deleting comment');
        }
    }

    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        
        const intervals = [
            { label: 'year', seconds: 31536000 },
            { label: 'month', seconds: 2592000 },
            { label: 'day', seconds: 86400 },
            { label: 'hour', seconds: 3600 },
            { label: 'minute', seconds: 60 }
        ];

        for (const interval of intervals) {
            const count = Math.floor(seconds / interval.seconds);
            if (count >= 1) {
                return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
            }
        }

        return 'Just now';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Get avatar HTML for a user (animal image or fallback)
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

// Initialize App when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AnimalStatsApp();
    window.app.init();
});


/**
 * Tournament Manager - Handles bracket tournaments
 */
class TournamentManager {
    constructor(app) {
        this.app = app;
        this.bracketSize = 0;
        this.selectedBracketSize = 0;
        this.selectedType = 'all';
        this.animals = [];
        this.filteredAnimals = [];
        this.bracket = [];
        this.currentRound = 0;
        this.currentMatch = 0;
        this.totalMatches = 0;
        this.completedMatches = 0;
        this.winners = [];
        this.matchHistory = [];
        this.isActive = false;
        
        // DOM Elements
        this.dom = {
            modal: document.getElementById('tournament-modal'),
            setup: document.getElementById('tournament-setup'),
            battle: document.getElementById('tournament-battle'),
            results: document.getElementById('tournament-results'),
            closeBtn: document.getElementById('tournament-close'),
            quitBtn: document.getElementById('tournament-quit'),
            bracketOptions: document.querySelectorAll('.bracket-option'),
            openBtn: document.getElementById('open-tournament-btn'),
            startBtn: document.getElementById('start-tournament-btn'),
            loginNote: document.getElementById('tournament-login-note'),
            typeFilters: document.getElementById('tournament-type-filters'),
            previewAnimalCount: document.getElementById('preview-animal-count'),
            previewBracketSize: document.getElementById('preview-bracket-size'),
            // Battle elements
            progressText: document.getElementById('tournament-progress-text'),
            progressBar: document.getElementById('tournament-progress-bar'),
            matchText: document.getElementById('tournament-match-text'),
            fighter1: document.getElementById('tournament-fighter-1'),
            fighter2: document.getElementById('tournament-fighter-2'),
            fighter1Img: document.getElementById('fighter-1-img'),
            fighter1Name: document.getElementById('fighter-1-name'),
            fighter1Rank: document.getElementById('fighter-1-rank'),
            fighter1Winrate: document.getElementById('fighter-1-winrate'),
            fighter1Attack: document.getElementById('fighter-1-attack'),
            fighter1Defense: document.getElementById('fighter-1-defense'),
            fighter1Agility: document.getElementById('fighter-1-agility'),
            fighter1Stamina: document.getElementById('fighter-1-stamina'),
            fighter1Intelligence: document.getElementById('fighter-1-intelligence'),
            fighter1Special: document.getElementById('fighter-1-special'),
            fighter1AttackBar: document.getElementById('fighter-1-attack-bar'),
            fighter1DefenseBar: document.getElementById('fighter-1-defense-bar'),
            fighter1AgilityBar: document.getElementById('fighter-1-agility-bar'),
            fighter1StaminaBar: document.getElementById('fighter-1-stamina-bar'),
            fighter1IntelligenceBar: document.getElementById('fighter-1-intelligence-bar'),
            fighter1SpecialBar: document.getElementById('fighter-1-special-bar'),
            fighter2Img: document.getElementById('fighter-2-img'),
            fighter2Name: document.getElementById('fighter-2-name'),
            fighter2Rank: document.getElementById('fighter-2-rank'),
            fighter2Winrate: document.getElementById('fighter-2-winrate'),
            fighter2Attack: document.getElementById('fighter-2-attack'),
            fighter2Defense: document.getElementById('fighter-2-defense'),
            fighter2Agility: document.getElementById('fighter-2-agility'),
            fighter2Stamina: document.getElementById('fighter-2-stamina'),
            fighter2Intelligence: document.getElementById('fighter-2-intelligence'),
            fighter2Special: document.getElementById('fighter-2-special'),
            fighter2AttackBar: document.getElementById('fighter-2-attack-bar'),
            fighter2DefenseBar: document.getElementById('fighter-2-defense-bar'),
            fighter2AgilityBar: document.getElementById('fighter-2-agility-bar'),
            fighter2StaminaBar: document.getElementById('fighter-2-stamina-bar'),
            fighter2IntelligenceBar: document.getElementById('fighter-2-intelligence-bar'),
            fighter2SpecialBar: document.getElementById('fighter-2-special-bar'),
            // Results elements
            championImg: document.getElementById('champion-img'),
            championName: document.getElementById('champion-name'),
            resultMatches: document.getElementById('result-matches'),
            resultBracket: document.getElementById('result-bracket'),
            runnerUpList: document.getElementById('runner-up-list'),
            playAgainBtn: document.getElementById('play-again-btn'),
            closeResultsBtn: document.getElementById('close-results-btn')
        };
    }

    init() {
        this.bindEvents();
        this.updateLoginNote();
        this.populateTypeFilters();
        this.updateFilteredAnimals();
    }

    bindEvents() {
        // Open tournament modal button
        this.dom.openBtn?.addEventListener('click', () => this.showSetup());
        
        // Start tournament button - now actually starts the tournament
        this.dom.startBtn?.addEventListener('click', () => this.startTournament());
        
        // Close button
        this.dom.closeBtn?.addEventListener('click', () => this.hideModal());
        
        // Quit button
        this.dom.quitBtn?.addEventListener('click', () => {
            if (confirm('Are you sure you want to quit the tournament?')) {
                this.hideModal();
            }
        });
        
        // Bracket size options - now just selects, doesn't start
        this.dom.bracketOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const size = parseInt(e.currentTarget.dataset.rounds);
                this.selectBracketSize(size, e.currentTarget);
            });
        });
        
        // Fighter selection
        this.dom.fighter1?.addEventListener('click', () => this.selectWinner(0));
        this.dom.fighter2?.addEventListener('click', () => this.selectWinner(1));
        
        // Results buttons
        this.dom.playAgainBtn?.addEventListener('click', () => this.showSetup());
        this.dom.closeResultsBtn?.addEventListener('click', () => this.hideModal());
        
        // Escape key closes modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.dom.modal?.classList.contains('show')) {
                if (this.isActive) {
                    if (confirm('Are you sure you want to quit the tournament?')) {
                        this.hideModal();
                    }
                } else {
                    this.hideModal();
                }
            }
        });
    }
    
    /**
     * Populate type filter buttons from animal data
     */
    populateTypeFilters() {
        if (!this.dom.typeFilters) return;
        
        const types = [...new Set(this.app.state.animals.map(a => a.type).filter(Boolean))].sort();
        
        // Keep the "All Animals" button, add type buttons
        let html = `
            <button class="type-filter-btn active" data-type="all">
                <i class="fas fa-globe"></i>
                <span>All Animals</span>
            </button>
        `;
        
        const typeIcons = {
            'Mammal': 'fa-paw',
            'Bird': 'fa-dove',
            'Reptile': 'fa-dragon',
            'Fish': 'fa-fish',
            'Amphibian': 'fa-frog',
            'Insect': 'fa-bug',
            'Arachnid': 'fa-spider',
            'Crustacean': 'fa-shrimp',
            'Mollusk': 'fa-shell'
        };
        
        types.forEach(type => {
            const icon = typeIcons[type] || 'fa-paw';
            html += `
                <button class="type-filter-btn" data-type="${type}">
                    <i class="fas ${icon}"></i>
                    <span>${type}</span>
                </button>
            `;
        });
        
        this.dom.typeFilters.innerHTML = html;
        
        // Bind click events
        this.dom.typeFilters.querySelectorAll('.type-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active from all
                this.dom.typeFilters.querySelectorAll('.type-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedType = btn.dataset.type;
                this.updateFilteredAnimals();
                this.updatePreview();
            });
        });
    }
    
    /**
     * Update filtered animals based on selected type
     */
    updateFilteredAnimals() {
        if (this.selectedType === 'all') {
            this.filteredAnimals = [...this.app.state.animals];
        } else {
            this.filteredAnimals = this.app.state.animals.filter(a => a.type === this.selectedType);
        }
        this.updatePreview();
    }
    
    /**
     * Select bracket size (doesn't start tournament yet)
     */
    selectBracketSize(size, element) {
        // Remove selected from all
        this.dom.bracketOptions.forEach(opt => opt.classList.remove('selected'));
        // Add selected to clicked
        element.classList.add('selected');
        this.selectedBracketSize = size;
        this.updatePreview();
    }
    
    /**
     * Update the preview panel
     */
    updatePreview() {
        const available = this.filteredAnimals.length;
        const size = this.selectedBracketSize;
        
        if (this.dom.previewAnimalCount) {
            this.dom.previewAnimalCount.textContent = `${available} animals available`;
        }
        
        if (this.dom.previewBracketSize) {
            if (size > 0) {
                this.dom.previewBracketSize.textContent = `${size}-animal bracket`;
            } else {
                this.dom.previewBracketSize.textContent = 'Select bracket size';
            }
        }
        
        // Enable/disable start button
        if (this.dom.startBtn) {
            const canStart = size > 0 && available >= size;
            this.dom.startBtn.disabled = !canStart;
            
            if (size > 0 && available < size) {
                this.dom.previewAnimalCount.textContent = `${available} animals available (need ${size})`;
            }
        }
    }

    updateLoginNote() {
        if (this.dom.loginNote) {
            this.dom.loginNote.style.display = Auth.isLoggedIn() ? 'none' : 'block';
        }
    }

    showSetup() {
        this.resetTournamentState();
        this.updateLoginNote();
        this.updateFilteredAnimals();
        // Reset UI selections
        this.dom.bracketOptions.forEach(opt => opt.classList.remove('selected'));
        this.selectedBracketSize = 0;
        this.updatePreview();
        
        this.dom.setup.style.display = 'flex';
        this.dom.battle.style.display = 'none';
        this.dom.results.style.display = 'none';
        this.dom.modal.classList.add('show');
    }

    hideModal() {
        this.dom.modal.classList.remove('show');
        this.isActive = false;
    }

    resetTournamentState() {
        this.bracketSize = 0;
        this.animals = [];
        this.bracket = [];
        this.currentRound = 0;
        this.currentMatch = 0;
        this.totalMatches = 0;
        this.completedMatches = 0;
        this.winners = [];
        this.matchHistory = [];
        this.isActive = false;
        this.currentAnimal1 = null;
        this.currentAnimal2 = null;
    }
    
    reset() {
        this.resetTournamentState();
        this.selectedBracketSize = 0;
        this.selectedType = 'all';
    }
    
    startTournament() {
        // Use selected bracket size
        const size = this.selectedBracketSize;
        if (!size || this.filteredAnimals.length < size) {
            alert('Please select a bracket size with enough animals available.');
            return;
        }
        
        this.resetTournamentState();
        this.bracketSize = size;
        this.totalMatches = size - 1;
        this.isActive = true;
        
        // Get random animals from filtered list
        this.animals = this.getRandomAnimals(size);
        
        // Build initial bracket (pairs of animals)
        this.bracket = [];
        for (let i = 0; i < this.animals.length; i += 2) {
            this.bracket.push([this.animals[i], this.animals[i + 1]]);
        }
        
        // Calculate total rounds
        this.totalRounds = Math.log2(size);
        this.currentRound = 1;
        this.currentMatch = 0;
        
        // Show battle screen
        this.dom.setup.style.display = 'none';
        this.dom.battle.style.display = 'flex';
        this.dom.results.style.display = 'none';
        
        // Show first matchup
        this.showCurrentMatch();
    }

    getRandomAnimals(count) {
        // Use filtered animals instead of all animals
        const allAnimals = [...this.filteredAnimals];
        
        // Shuffle array
        for (let i = allAnimals.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allAnimals[i], allAnimals[j]] = [allAnimals[j], allAnimals[i]];
        }
        
        // Take first 'count' animals
        return allAnimals.slice(0, count);
    }

    showCurrentMatch() {
        if (this.currentMatch >= this.bracket.length) {
            // Move to next round
            this.advanceRound();
            return;
        }
        
        const match = this.bracket[this.currentMatch];
        const [animal1, animal2] = match;
        
        // Store current animals
        this.currentAnimal1 = animal1;
        this.currentAnimal2 = animal2;
        
        // Update progress
        this.updateProgress();
        
        // Reset any previous selection styling
        this.dom.fighter1.classList.remove('selected', 'eliminated');
        this.dom.fighter2.classList.remove('selected', 'eliminated');
        
        // Update fighter 1
        this.updateFighterCard(1, animal1);
        
        // Update fighter 2
        this.updateFighterCard(2, animal2);
        
        // Highlight stat winners for each row
        this.highlightStatWinners(animal1, animal2);
        
        // Add entrance animation
        this.dom.fighter1.style.animation = 'none';
        this.dom.fighter2.style.animation = 'none';
        setTimeout(() => {
            this.dom.fighter1.style.animation = 'slideInLeft 0.5s ease';
            this.dom.fighter2.style.animation = 'slideInRight 0.5s ease';
        }, 10);
    }
    
    /**
     * Highlight which fighter wins each stat category
     */
    highlightStatWinners(animal1, animal2) {
        const stats = ['attack', 'defense', 'agility', 'stamina', 'intelligence', 'special'];
        
        stats.forEach(stat => {
            const row = document.querySelector(`.stat-row[data-stat="${stat}"]`);
            if (!row) return;
            
            const val1 = Math.round(animal1[stat] || 0);
            const val2 = Math.round(animal2[stat] || 0);
            
            // Remove previous winner classes
            row.classList.remove('left-wins', 'right-wins', 'tie');
            
            if (val1 > val2) {
                row.classList.add('left-wins');
            } else if (val2 > val1) {
                row.classList.add('right-wins');
            } else {
                row.classList.add('tie');
            }
        });
    }
    
    /**
     * Update a fighter card with animal data and stat bars
     */
    updateFighterCard(fighterNum, animal) {
        const prefix = `fighter${fighterNum}`;
        
        // Image
        const imgEl = this.dom[`${prefix}Img`];
        if (imgEl) {
            imgEl.src = animal.image;
            imgEl.alt = animal.name;
            imgEl.onerror = () => { imgEl.src = 'https://via.placeholder.com/300x200?text=?'; };
        }
        
        // Name
        const nameEl = this.dom[`${prefix}Name`];
        if (nameEl) nameEl.textContent = animal.name;
        
        // Rank badge
        const rankEl = this.dom[`${prefix}Rank`];
        if (rankEl) {
            const rankings = this.app.state.animals
                .filter(a => a.powerRanking !== undefined)
                .sort((a, b) => b.powerRanking - a.powerRanking);
            const rankIndex = rankings.findIndex(a => a.name === animal.name);
            rankEl.textContent = rankIndex >= 0 ? `#${rankIndex + 1}` : '-';
        }
        
        // Win rate badge
        const winrateEl = this.dom[`${prefix}Winrate`];
        if (winrateEl) {
            const stats = animal.battleStats;
            if (stats && stats.totalBattles > 0) {
                const winRate = Math.round((stats.wins / stats.totalBattles) * 100);
                winrateEl.textContent = `${winRate}% wins`;
            } else {
                winrateEl.textContent = 'New';
            }
        }
        
        // Stats
        const stats = ['Attack', 'Defense', 'Agility', 'Stamina', 'Intelligence', 'Special'];
        const statKeys = ['attack', 'defense', 'agility', 'stamina', 'intelligence', 'special'];
        
        statKeys.forEach((key, i) => {
            const value = Math.round(animal[key] || 0);
            
            // Update stat value
            const statEl = this.dom[`${prefix}${stats[i]}`];
            if (statEl) statEl.textContent = value;
            
            // Update stat bar
            const barEl = this.dom[`${prefix}${stats[i]}Bar`];
            if (barEl) barEl.style.width = `${value}%`;
        });
    }

    updateProgress() {
        const roundName = this.getRoundName(this.currentRound, this.totalRounds);
        const matchInRound = this.currentMatch + 1;
        const matchesInRound = this.bracket.length;
        
        this.dom.progressText.textContent = roundName;
        this.dom.matchText.textContent = `Match ${matchInRound} of ${matchesInRound}`;
        
        const progressPercent = (this.completedMatches / this.totalMatches) * 100;
        this.dom.progressBar.style.width = `${progressPercent}%`;
    }

    getRoundName(round, totalRounds) {
        if (round === totalRounds) return 'FINALS';
        if (round === totalRounds - 1) return 'SEMI-FINALS';
        if (round === totalRounds - 2) return 'QUARTER-FINALS';
        return `Round ${round} of ${totalRounds}`;
    }

    selectWinner(fighterIndex) {
        const match = this.bracket[this.currentMatch];
        const winner = match[fighterIndex];
        const loser = match[1 - fighterIndex];
        
        // Record match locally
        this.matchHistory.push({
            round: this.currentRound,
            winner: winner,
            loser: loser
        });
        
        // Record battle to API (updates ELO ratings)
        this.recordBattle(winner.name, loser.name);
        
        // Add winner to next round
        this.winners.push(winner);
        this.completedMatches++;
        
        // Visual feedback using CSS classes
        const winnerEl = fighterIndex === 0 ? this.dom.fighter1 : this.dom.fighter2;
        const loserEl = fighterIndex === 0 ? this.dom.fighter2 : this.dom.fighter1;
        
        winnerEl.classList.add('selected');
        loserEl.classList.add('eliminated');
        
        // Move to next match after brief delay
        setTimeout(() => {
            // Reset classes
            winnerEl.classList.remove('selected');
            loserEl.classList.remove('eliminated');
            
            this.currentMatch++;
            this.showCurrentMatch();
        }, 800);
    }
    
    async recordBattle(winnerName, loserName) {
        try {
            const response = await fetch('/api/battles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ winner: winnerName, loser: loserName })
            });
            
            if (!response.ok) {
                console.error('Failed to record battle');
                return;
            }
            
            const result = await response.json();
            console.log('Battle recorded:', result.data);
            
            // Show rating change (optional visual feedback)
            if (result.success && result.data) {
                const winnerChange = result.data.winner.change;
                console.log(`${winnerName}: +${winnerChange} rating`);
            }
        } catch (error) {
            console.error('Error recording battle:', error);
        }
    }

    advanceRound() {
        if (this.winners.length === 1) {
            // Tournament complete!
            this.showResults();
            return;
        }
        
        // Build new bracket from winners
        this.bracket = [];
        for (let i = 0; i < this.winners.length; i += 2) {
            this.bracket.push([this.winners[i], this.winners[i + 1]]);
        }
        
        this.winners = [];
        this.currentRound++;
        this.currentMatch = 0;
        
        // Show next match
        this.showCurrentMatch();
    }

    showResults() {
        this.isActive = false;
        const champion = this.winners[0];
        
        // Get final four (semi-finalists + finalists)
        const finalFour = this.getFinalFour();
        
        // Update results screen
        this.dom.championImg.src = champion.image;
        this.dom.championImg.onerror = () => { this.dom.championImg.src = 'https://via.placeholder.com/180x180?text=?'; };
        this.dom.championName.textContent = champion.name;
        this.dom.resultMatches.textContent = this.totalMatches;
        this.dom.resultBracket.textContent = this.bracketSize;
        
        // Show runner-ups
        let runnerUpHtml = '';
        finalFour.forEach(animal => {
            if (animal.name !== champion.name) {
                runnerUpHtml += `
                    <div class="runner-up-item">
                        <img src="${animal.image}" alt="${animal.name}" onerror="this.src='https://via.placeholder.com/50x50?text=?'">
                        <span>${animal.name}</span>
                    </div>
                `;
            }
        });
        this.dom.runnerUpList.innerHTML = runnerUpHtml;
        
        // Switch to results screen
        this.dom.setup.style.display = 'none';
        this.dom.battle.style.display = 'none';
        this.dom.results.style.display = 'flex';
    }

    getFinalFour() {
        // Get the last 4 unique animals from match history
        const seen = new Set();
        const finalFour = [];
        
        // Start from the end (finals, then semis)
        for (let i = this.matchHistory.length - 1; i >= 0 && finalFour.length < 4; i--) {
            const match = this.matchHistory[i];
            if (!seen.has(match.winner.name)) {
                seen.add(match.winner.name);
                finalFour.push(match.winner);
            }
            if (!seen.has(match.loser.name) && finalFour.length < 4) {
                seen.add(match.loser.name);
                finalFour.push(match.loser);
            }
        }
        
        return finalFour;
    }
}


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
    }

    init() {
        this.setupEventListeners();
        this.updateLoginState();
        this.loadDailyMatchup();
        this.loadRankingsPreview();
        this.setupTournamentSection();
        this.startMatchupCountdown();
        
        // Listen for auth changes
        window.addEventListener('authChange', () => this.updateLoginState());
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.community-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Chat input
        const chatInput = document.getElementById('chat-input');
        const chatSendBtn = document.getElementById('chat-send-btn');
        
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendChatMessage();
                }
            });
        }
        
        if (chatSendBtn) {
            chatSendBtn.addEventListener('click', () => this.sendChatMessage());
        }

        // Chat login link
        const chatLoginLink = document.getElementById('chat-login-link');
        if (chatLoginLink) {
            chatLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                Auth.showModal('login');
            });
        }

        // Load more button
        const loadMoreBtn = document.getElementById('feed-load-more');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => this.loadMoreFeed());
        }
        
        // Daily Matchup vote buttons
        document.getElementById('vote-fighter-1')?.addEventListener('click', () => this.voteMatchup(1));
        document.getElementById('vote-fighter-2')?.addEventListener('click', () => this.voteMatchup(2));
        
        // Matchup comment input
        const matchupCommentInput = document.getElementById('matchup-comment-input');
        const matchupCommentSend = document.getElementById('matchup-comment-send');
        
        matchupCommentInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMatchupComment();
        });
        matchupCommentSend?.addEventListener('click', () => this.sendMatchupComment());
        
        // View full rankings button
        document.getElementById('view-full-rankings')?.addEventListener('click', () => {
            this.app.showView('rankings');
        });
        
        // Tournament bracket buttons
        document.querySelectorAll('.bracket-size-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const size = parseInt(btn.dataset.size);
                this.startTournament(size);
            });
        });
        
        document.getElementById('continue-tournament-btn')?.addEventListener('click', () => {
            this.app.showView('rankings');
            // TODO: Show tournament modal
        });
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
        
        // Fighter 1
        document.getElementById('fighter-1-image').src = fighter1.image;
        document.getElementById('fighter-1-image').alt = fighter1.name;
        document.getElementById('fighter-1-name').textContent = fighter1.name;
        document.getElementById('fighter-1-stats').textContent = `ATK ${fighter1.attack} • DEF ${fighter1.defense}`;
        document.getElementById('fighter-1-percent').textContent = `${percent1}%`;
        document.getElementById('fighter-1-bar').style.width = `${percent1}%`;
        
        // Fighter 2
        document.getElementById('fighter-2-image').src = fighter2.image;
        document.getElementById('fighter-2-image').alt = fighter2.name;
        document.getElementById('fighter-2-name').textContent = fighter2.name;
        document.getElementById('fighter-2-stats').textContent = `ATK ${fighter2.attack} • DEF ${fighter2.defense}`;
        document.getElementById('fighter-2-percent').textContent = `${percent2}%`;
        document.getElementById('fighter-2-bar').style.width = `${percent2}%`;
        
        // Update vote button states
        this.updateMatchupVoteButtons();
    }
    
    updateMatchupVoteButtons() {
        const btn1 = document.getElementById('vote-fighter-1');
        const btn2 = document.getElementById('vote-fighter-2');
        const fighter1 = document.getElementById('fighter-1');
        const fighter2 = document.getElementById('fighter-2');
        
        if (!Auth.isLoggedIn()) {
            btn1?.setAttribute('disabled', 'true');
            btn2?.setAttribute('disabled', 'true');
            return;
        }
        
        btn1?.removeAttribute('disabled');
        btn2?.removeAttribute('disabled');
        
        if (this.userMatchupVote === 1) {
            btn1?.classList.add('selected');
            btn2?.classList.remove('selected');
            fighter1?.classList.add('voted');
            fighter2?.classList.remove('voted');
        } else if (this.userMatchupVote === 2) {
            btn1?.classList.remove('selected');
            btn2?.classList.add('selected');
            fighter1?.classList.remove('voted');
            fighter2?.classList.add('voted');
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
        this.showXpPopup(10, 2); // More XP for daily matchup
        Auth.showToast('Vote recorded!');
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
            
            const countdown = document.getElementById('matchup-countdown');
            if (countdown) {
                countdown.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        };
        
        updateCountdown();
        setInterval(updateCountdown, 1000);
    }
    
    async sendMatchupComment() {
        const input = document.getElementById('matchup-comment-input');
        if (!input || !input.value.trim()) return;
        
        if (!Auth.isLoggedIn()) {
            Auth.showToast('Log in to comment!');
            Auth.showModal('login');
            return;
        }
        
        // For now, just show toast - would integrate with comments API
        Auth.showToast('Comment posted!');
        input.value = '';
    }
    
    // ==================== RANKINGS PREVIEW ====================
    
    async loadRankingsPreview() {
        const container = document.getElementById('rankings-preview-list');
        if (!container) return;
        
        try {
            const response = await fetch('/api/rankings');
            if (!response.ok) throw new Error('Failed to load rankings');
            
            const result = await response.json();
            const top5 = (result.data || []).slice(0, 5);
            
            container.innerHTML = top5.map((item, index) => {
                const animal = item.animal;
                const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : '';
                const trend = item.trend || 0;
                const trendClass = trend > 0 ? 'rising' : trend < 0 ? 'falling' : 'stable';
                const trendIcon = trend > 0 ? 'fa-arrow-up' : trend < 0 ? 'fa-arrow-down' : 'fa-minus';
                const trendText = trend > 0 ? `+${trend}` : trend < 0 ? `${trend}` : '';
                
                return `
                    <div class="rankings-preview-item">
                        <span class="preview-rank ${rankClass}">#${index + 1}</span>
                        <img src="${animal.image}" alt="${animal.name}" class="preview-animal-img">
                        <div class="preview-animal-info">
                            <div class="preview-animal-name">${animal.name}</div>
                        </div>
                        <div class="preview-trend ${trendClass}">
                            <i class="fas ${trendIcon}"></i>
                            ${trendText}
                        </div>
                    </div>
                `;
            }).join('');
            
        } catch (error) {
            console.error('Error loading rankings preview:', error);
            container.innerHTML = '<div class="rankings-loading">Failed to load</div>';
        }
    }
    
    // ==================== TOURNAMENTS ====================
    
    setupTournamentSection() {
        // Check for active tournament in localStorage
        const activeTournament = localStorage.getItem('activeTournament');
        const activeCard = document.getElementById('active-tournament-card');
        const startOptions = document.querySelector('.tournament-start-options');
        
        if (activeTournament && activeCard && startOptions) {
            try {
                const tournament = JSON.parse(activeTournament);
                if (tournament.bracket && tournament.bracket.length > 0) {
                    activeCard.style.display = 'flex';
                    startOptions.style.display = 'none';
                    
                    const roundNames = ['Finals', 'Semi-Finals', 'Quarter-Finals', 'Round of 16', 'Round of 32'];
                    const roundIndex = Math.log2(tournament.bracketSize) - Math.log2(tournament.bracket.length * 2);
                    document.getElementById('tournament-round').textContent = roundNames[roundIndex] || 'Tournament';
                    document.getElementById('tournament-progress').textContent = `${tournament.bracket.length} matches remaining`;
                }
            } catch (e) {
                console.error('Error parsing tournament:', e);
            }
        }
    }
    
    startTournament(size) {
        // Navigate to rankings and open tournament modal
        this.app.showView('rankings');
        // Trigger tournament start
        setTimeout(() => {
            document.getElementById('start-tournament-btn')?.click();
        }, 100);
    }
    
    showXpPopup(xp, bp) {
        const popup = document.createElement('div');
        popup.className = 'xp-popup';
        popup.innerHTML = `<i class="fas fa-star"></i> +${xp} XP, +${bp} BP`;
        document.body.appendChild(popup);
        
        setTimeout(() => popup.remove(), 2000);
    }

    updateLoginState() {
        const isLoggedIn = Auth.isLoggedIn();
        const communityLoginPrompt = document.getElementById('community-login-prompt');
        const chatInputWrapper = document.getElementById('chat-input-wrapper');
        
        if (communityLoginPrompt) communityLoginPrompt.style.display = isLoggedIn ? 'none' : 'block';
        if (chatInputWrapper) chatInputWrapper.style.display = isLoggedIn ? 'flex' : 'none';
    }

    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Update tab buttons
        document.querySelectorAll('.community-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        // Update sections
        document.getElementById('community-chat-section')?.classList.toggle('active', tabName === 'chat');
        document.getElementById('community-feed-section')?.classList.toggle('active', tabName === 'feed');
        
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
        if (this.currentTab === 'chat') {
            this.loadChat();
            this.startChatPolling();
        } else {
            this.loadFeed();
        }
    }

    onViewLeave() {
        this.stopChatPolling();
    }

    // ==================== CHAT ====================

    async loadChat() {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        try {
            const response = await fetch('/api/chat?limit=50');
            if (!response.ok) throw new Error('Failed to load chat');
            
            const result = await response.json();
            this.chatMessages = result.data || [];
            
            if (this.chatMessages.length > 0) {
                this.lastChatTime = this.chatMessages[this.chatMessages.length - 1].createdAt;
            }
            
            this.renderChat();
            
            // Scroll to bottom
            container.scrollTop = container.scrollHeight;
        } catch (error) {
            console.error('Error loading chat:', error);
            container.innerHTML = `
                <div class="chat-empty">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Failed to load chat. Please try again.</p>
                </div>
            `;
        }
    }

    renderChat() {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        if (this.chatMessages.length === 0) {
            container.innerHTML = `
                <div class="chat-empty">
                    <i class="fas fa-comments"></i>
                    <p>No messages yet. Be the first to say hello!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.chatMessages.map(msg => this.renderChatMessage(msg)).join('');
    }

    renderChatMessage(msg) {
        const initial = msg.authorUsername ? msg.authorUsername.charAt(0).toUpperCase() : '?';
        const time = this.formatTime(msg.createdAt);
        const profileAnimal = msg.author?.profileAnimal || msg.profileAnimal;
        const avatarHtml = this.getUserAvatarHtml(profileAnimal, initial);
        const authorId = msg.authorId || msg.author?._id;
        const userIdAttr = authorId ? `data-user-id="${authorId}"` : '';
        
        return `
            <div class="chat-message" data-id="${msg._id}" ${userIdAttr}>
                <div class="chat-message-avatar">${avatarHtml}</div>
                <div class="chat-message-content">
                    <div class="chat-message-header">
                        <span class="chat-message-author">${this.escapeHtml(msg.authorUsername)}</span>
                        <span class="chat-message-time">${time}</span>
                    </div>
                    <div class="chat-message-text">${this.escapeHtml(msg.content)}</div>
                </div>
            </div>
        `;
    }

    async sendChatMessage() {
        const input = document.getElementById('chat-input');
        if (!input) return;

        const content = input.value.trim();
        if (!content) return;

        const token = Auth.getToken();
        if (!token) {
            Auth.showToast('Please log in to send messages');
            return;
        }

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to send message');
            }

            const result = await response.json();
            
            // Add message to list and render
            this.chatMessages.push(result.data);
            this.renderChat();
            
            // Clear input and scroll to bottom
            input.value = '';
            const container = document.getElementById('chat-messages');
            if (container) container.scrollTop = container.scrollHeight;

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
            
            // Check for new messages
            if (newMessages.length > 0) {
                const existingIds = new Set(this.chatMessages.map(m => m._id));
                const trulyNew = newMessages.filter(m => !existingIds.has(m._id));
                
                if (trulyNew.length > 0) {
                    this.chatMessages.push(...trulyNew);
                    this.renderChat();
                    
                    // Scroll to bottom
                    const container = document.getElementById('chat-messages');
                    if (container) container.scrollTop = container.scrollHeight;
                }
            }
        } catch (error) {
            console.error('Error polling messages:', error);
        }
    }

    // ==================== FEED ====================

    async loadFeed(reset = true) {
        if (reset) {
            this.feedSkip = 0;
            this.feedComments = [];
            this.feedHasMore = true;
        }

        const container = document.getElementById('feed-list');
        const loadMoreBtn = document.getElementById('feed-load-more');
        if (!container) return;

        if (reset) {
            container.innerHTML = `
                <div class="feed-loading">
                    <i class="fas fa-spinner fa-spin"></i> Loading comments...
                </div>
            `;
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
                <div class="feed-empty">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Failed to load comments. Please try again.</p>
                </div>
            `;
        }
    }

    loadMoreFeed() {
        this.loadFeed(false);
    }

    renderFeed() {
        const container = document.getElementById('feed-list');
        if (!container) return;

        if (this.feedComments.length === 0) {
            container.innerHTML = `
                <div class="feed-empty">
                    <i class="fas fa-comments"></i>
                    <p>No comments yet. Be the first to comment on an animal!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.feedComments.map(comment => this.renderFeedItem(comment)).join('');
        
        // Add click handlers for animal names
        container.querySelectorAll('.feed-animal-name').forEach(el => {
            el.addEventListener('click', (e) => {
                const animalName = e.target.dataset.animal;
                if (animalName) {
                    this.goToAnimal(animalName);
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
    }

    renderFeedItem(comment) {
        const initial = comment.isAnonymous ? '?' : (comment.authorUsername?.charAt(0).toUpperCase() || '?');
        const authorName = comment.isAnonymous ? 'Anonymous' : comment.authorUsername;
        const time = this.formatTime(comment.createdAt);
        const animalImage = comment.animalImage || 'https://via.placeholder.com/50x50?text=?';
        const animalId = comment.animalId || '';
        
        // Profile animal for avatar
        const profileAnimal = comment.author?.profileAnimal || comment.profileAnimal;
        const avatarHtml = this.getUserAvatarHtml(profileAnimal, initial, comment.isAnonymous);
        const authorId = comment.authorId || comment.author?._id;
        const userIdAttr = authorId ? `data-user-id="${authorId}"` : '';
        
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
                    <img src="${animalImage}" alt="${comment.animalName}" class="feed-animal-image" onerror="this.src='https://via.placeholder.com/50x50?text=?'">
                    <div class="feed-animal-info">
                        <div class="feed-animal-name" data-animal="${this.escapeHtml(comment.animalName)}">${this.escapeHtml(comment.animalName)}</div>
                        <div class="feed-comment-type">${comment.targetType === 'comparison' ? 'Comparison' : 'Animal Discussion'}</div>
                    </div>
                    <button class="feed-view-btn" data-animal="${this.escapeHtml(comment.animalName)}" data-animal-id="${animalId}" data-animal-image="${animalImage}" title="View in animal comments">
                        <i class="fas fa-external-link-alt"></i>
                    </button>
                </div>
                <div class="feed-comment-main" ${userIdAttr}>
                    <div class="feed-comment-avatar">${avatarHtml}</div>
                    <div class="feed-comment-body">
                        <div class="feed-comment-author">
                            <span class="feed-comment-author-name">${this.escapeHtml(authorName)}</span>
                            <span class="feed-comment-time">${time}</span>
                        </div>
                        <div class="feed-comment-content">${this.escapeHtml(comment.content)}</div>
                        <div class="feed-comment-actions">
                            <button class="feed-upvote-btn ${hasUpvoted ? 'active' : ''}" data-comment-id="${comment._id}" title="Upvote">
                                <i class="fas fa-arrow-up"></i>
                            </button>
                            <span class="feed-vote-score ${scoreClass}">${score}</span>
                            <button class="feed-downvote-btn ${hasDownvoted ? 'active' : ''}" data-comment-id="${comment._id}" title="Downvote">
                                <i class="fas fa-arrow-down"></i>
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
        const time = this.formatTime(reply.createdAt);
        
        // Profile animal for avatar
        const profileAnimal = reply.author?.profileAnimal || reply.profileAnimal;
        const avatarHtml = this.getUserAvatarHtml(profileAnimal, initial, reply.isAnonymous);
        const authorId = reply.authorId || reply.author?._id;
        const userIdAttr = authorId ? `data-user-id="${authorId}"` : '';
        
        return `
            <div class="feed-reply" ${userIdAttr}>
                <div class="feed-reply-header">
                    <div class="feed-reply-avatar">${avatarHtml}</div>
                    <span class="feed-reply-author">${this.escapeHtml(authorName)}</span>
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
