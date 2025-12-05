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
            miniInfo: document.getElementById('character-mini-info'),
            
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
                abilities: document.getElementById('abilities-inline'),
                traits: document.getElementById('traits-inline')
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
            navBtns: {
                stats: document.getElementById('stats-mode-btn'),
                compare: document.getElementById('compare-mode-btn'),
                rankings: document.getElementById('rankings-mode-btn')
            },
            
            // Rankings View
            rankingsView: document.getElementById('rankings-view'),
            
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
            
            // Fetch rankings data to get power ranks for sorting
            await this.rankingsManager.fetchRankings();
            
            // Initial Render with power rank sort as default
            this.state.filters.sort = 'rank';
            this.applyFilters();
            
            // Select first animal by default if available
            if (this.state.filteredAnimals.length > 0) {
                this.selectAnimal(this.state.filteredAnimals[0]);
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
            card.classList.add(`card-tier-${overallTier.toLowerCase()}`);
            
            // Add selection classes
            if (this.state.view === 'stats' && this.state.selectedAnimal?.name === animal.name) {
                card.classList.add('selected');
            } else if (this.state.view === 'compare') {
                if (this.state.compare.left?.name === animal.name) card.classList.add('selected-fighter1');
                if (this.state.compare.right?.name === animal.name) card.classList.add('selected-fighter2');
            }

            card.innerHTML = `
                <span class="card-tier-badge tier-${overallTier.toLowerCase()}">${overallTier}</span>
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
     * Calculate Tier based on stat value
     */
    calculateTier(value) {
        if (value >= 90) return 'S';
        if (value >= 80) return 'A';
        if (value >= 70) return 'B';
        if (value >= 55) return 'C';
        if (value >= 40) return 'D';
        if (value >= 25) return 'E';
        return 'F';
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
                // Add tier class for color-coding
                this.dom.statBars[stat].className = `stat-bar-fill stat-bar-tier-${tier.toLowerCase()}`;
            }
            
            if (this.dom.statValues[stat]) {
                // Add Tier Badge
                this.dom.statValues[stat].innerHTML = `${value} <span class="stat-tier-badge tier-${tier.toLowerCase()}">${tier}</span>`;
            }
        });

        // Mini Info
        let info = [];
        if (animal.weight_kg) info.push(`${formatNumber(animal.weight_kg)} kg`);
        if (animal.lifespan_years) info.push(`${animal.lifespan_years} yrs`);
        if (animal.bite_force_psi) info.push(`${formatNumber(animal.bite_force_psi)} PSI`);
        this.dom.miniInfo.innerHTML = info.map(i => `<span>${i}</span>`).join('');

        // Info Bar
        this.dom.info.abilities.textContent = animal.special_abilities?.join(', ') || 'None';
        this.dom.info.traits.textContent = animal.unique_traits?.join(', ') || 'None';

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
            setSub('sub-natural-weapons', animal.substats.natural_weapons);
            setSub('sub-armor', animal.substats.armor);
            setSub('sub-resilience', animal.substats.resilience);
            setSub('sub-speed-stat', animal.substats.speed_stat);
            setSub('sub-maneuverability', animal.substats.maneuverability);
            
            setSub('sub-endurance', animal.substats.endurance);
            setSub('sub-recovery', animal.substats.recovery);
            setSub('sub-tactics', animal.substats.tactics);
            setSub('sub-senses', animal.substats.senses);
            setSub('sub-ferocity', animal.substats.ferocity);
            setSub('sub-unique_abilities', animal.substats.unique_abilities);
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
        d.weight.textContent = animal.weight_kg ? `${formatNumber(animal.weight_kg)} kg` : '---';
        d.height.textContent = animal.height_cm ? `${formatNumber(animal.height_cm)} cm` : '---';
        d.length.textContent = animal.length_cm ? `${formatNumber(animal.length_cm)} cm` : '---';
        d.speed.textContent = animal.speed_mps ? `${animal.speed_mps.toFixed(1)} m/s (${(animal.speed_mps * 3.6).toFixed(1)} km/h)` : '---';
        d.lifespan.textContent = animal.lifespan_years ? `${animal.lifespan_years} years` : '---';
        d.bite.textContent = animal.bite_force_psi ? `${formatNumber(animal.bite_force_psi)} PSI` : '---';
        d.sizeScore.textContent = animal.size_score ? `${animal.size_score.toFixed(1)} / 100` : '---';
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
        
        // Update UI classes
        this.dom.statsView.classList.toggle('active-view', viewName === 'stats');
        this.dom.compareView.classList.toggle('active-view', viewName === 'compare');
        this.dom.rankingsView?.classList.toggle('active-view', viewName === 'rankings');
        
        this.dom.navBtns.stats.classList.toggle('active', viewName === 'stats');
        this.dom.navBtns.compare.classList.toggle('active', viewName === 'compare');
        this.dom.navBtns.rankings?.classList.toggle('active', viewName === 'rankings');

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
        } else {
            this.dom.toggleGridBtn.style.display = 'flex';
            this.dom.gridWrapper.classList.remove('hidden');
        }

        // Ensure grid state is synced for non-rankings views
        if (viewName !== 'rankings') {
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
            this.dom.expandDetailsBtn.innerHTML = '<i class="fas fa-chevron-down"></i> MORE DETAILS';
            this.dom.gridWrapper.classList.remove('hidden');
            this.dom.toggleGridBtn.style.display = 'flex';
        }
    }

    /**
     * Toggle Grid Visibility
     */
    toggleGrid() {
        this.state.isGridVisible = !this.state.isGridVisible;
        this.dom.gridWrapper.classList.toggle('hidden', !this.state.isGridVisible);
        this.dom.toggleGridBtn.classList.toggle('hidden', !this.state.isGridVisible);
        
        // Update both buttons if they exist
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

        // Calculate scores
        const score1 = this.calculateCombatScore(left);
        const score2 = this.calculateCombatScore(right);
        
        let winner, loser;
        if (score1 > score2) {
            winner = left;
            loser = right;
        } else if (score2 > score1) {
            winner = right;
            loser = left;
        } else {
            // Tie breaker: Aggression/Attack
            if (left.attack > right.attack) {
                winner = left;
                loser = right;
            } else {
                winner = right;
                loser = left;
            }
        }

        // Notify Discord about the fight (await to ensure it sends before alert blocks)
        await this.notifyFight(left.name, right.name);

        alert(`FIGHT RESULT:\n\n${winner.name} defeats ${loser.name}!\n\n${winner.name} Score: ${score1.toFixed(1)}\n${loser.name} Score: ${score2.toFixed(1)}`);
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
     * Calculate a simple combat score
     */
    calculateCombatScore(animal) {
        // Weighted formula
        return (animal.attack * 2) + (animal.defense * 1.5) + (animal.agility * 1.5) + (animal.intelligence * 1.2) + animal.stamina + (animal.special * 0.8);
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
            rankingsSort: document.getElementById('rankings-sort'),
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
            replyingTo: document.getElementById('replying-to'),
            replyToName: document.getElementById('reply-to-name'),
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

        // Rankings sort
        this.dom.rankingsSort?.addEventListener('change', (e) => {
            this.sortRankings(e.target.value);
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
        if (this.dom.replyingTo) this.dom.replyingTo.style.display = 'none';
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

        const scoreClass = item.netScore > 0 ? 'positive' : item.netScore < 0 ? 'negative' : '';

        card.innerHTML = `
            <div class="ranking-card-top">
                <div class="rank-number">#${rank}</div>
                <img src="${animal.image}" alt="${animal.name}" class="ranking-animal-img" 
                    onerror="this.src='https://via.placeholder.com/70x70?text=?'">
                <div class="ranking-animal-info">
                    <div class="ranking-animal-name">${animal.name}</div>
                    <div class="ranking-animal-stats">
                        <span><i class="fas fa-fist-raised"></i> ${Math.round(animal.attack || 0)}</span>
                        <span><i class="fas fa-shield-alt"></i> ${Math.round(animal.defense || 0)}</span>
                        <span><i class="fas fa-bolt"></i> ${Math.round(animal.special || 0)}</span>
                    </div>
                </div>
            </div>
            <div class="ranking-card-actions">
                <div class="vote-buttons">
                    <button class="vote-btn upvote ${userVote === 1 ? 'active' : ''}" 
                        data-animal-id="${animalId}" data-animal-name="${animal.name}" data-value="1"
                        ${!isLoggedIn ? 'disabled title="Log in to vote"' : ''}>
                        <i class="fas fa-arrow-up"></i>
                    </button>
                    <span class="vote-score ${scoreClass}">${item.netScore || 0}</span>
                    <button class="vote-btn downvote ${userVote === -1 ? 'active' : ''}" 
                        data-animal-id="${animalId}" data-animal-name="${animal.name}" data-value="-1"
                        ${!isLoggedIn ? 'disabled title="Log in to vote"' : ''}>
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
                const scoreEl = card.querySelector('.vote-score');

                upBtn.classList.toggle('active', this.userVotes[animalId] === 1);
                downBtn.classList.toggle('active', this.userVotes[animalId] === -1);
                
                // Update score from response
                const score = result.data.score;
                scoreEl.textContent = score;
                scoreEl.className = 'vote-score';
                if (score > 0) scoreEl.classList.add('positive');
                else if (score < 0) scoreEl.classList.add('negative');
            } else {
                Auth.showToast(result.error || 'Failed to vote');
            }
        } catch (error) {
            console.error('Vote error:', error);
            Auth.showToast('Error voting. Please try again.');
        }
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

    sortRankings(sortBy) {
        let sorted = [...this.rankings];

        switch (sortBy) {
            case 'rank':
                // Already sorted by rank (netScore desc)
                break;
            case 'upvotes':
                sorted.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
                break;
            case 'downvotes':
                sorted.sort((a, b) => (b.downvotes || 0) - (a.downvotes || 0));
                break;
            case 'controversial':
                // Most total votes (both up and down)
                sorted.sort((a, b) => {
                    const totalA = (a.upvotes || 0) + (a.downvotes || 0);
                    const totalB = (b.upvotes || 0) + (b.downvotes || 0);
                    return totalB - totalA;
                });
                break;
            case 'name':
                sorted.sort((a, b) => {
                    const nameA = a.animal?.name || '';
                    const nameB = b.animal?.name || '';
                    return nameA.localeCompare(nameB);
                });
                break;
        }

        this.rankings = sorted;
        this.renderRankings();
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
            const response = await fetch(`/api/comments?animalId=${this.currentAnimal.id}`);
            
            if (!response.ok) throw new Error('Failed to fetch comments');

            const result = await response.json();
            
            if (result.success) {
                this.comments = result.data;
                this.dom.commentsCount.textContent = `${this.comments.length} comment${this.comments.length !== 1 ? 's' : ''}`;
                this.renderComments();
            }
        } catch (error) {
            console.error('Error fetching comments:', error);
            this.dom.commentsList.innerHTML = '<div class="no-comments"><i class="fas fa-exclamation-triangle"></i> Failed to load comments.</div>';
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

    createCommentElement(comment) {
        const div = document.createElement('div');
        div.className = 'comment-item';
        div.dataset.commentId = comment._id;

        // Handle both nested author object and flat authorUsername field
        const authorName = comment.authorUsername || comment.author?.displayName || comment.author?.username || 'Unknown';
        const authorInitial = authorName[0].toUpperCase();
        const timeAgo = this.getTimeAgo(new Date(comment.createdAt));
        const authorId = comment.authorId || comment.author?.userId;
        const currentUserId = Auth.getUser()?.id;
        const isOwn = Auth.isLoggedIn() && authorId && authorId.toString() === currentUserId;
        // Vote state
        const hasUpvoted = comment.upvotes?.some(id => id.toString() === currentUserId);
        const hasDownvoted = comment.downvotes?.some(id => id.toString() === currentUserId);
        const score = comment.score ?? ((comment.upvotes?.length || 0) - (comment.downvotes?.length || 0));
        const scoreClass = score > 0 ? 'positive' : score < 0 ? 'negative' : '';
        const hasLiked = comment.likes?.some(id => id.toString() === currentUserId);

        div.innerHTML = `
            <div class="comment-header">
                <div class="comment-author">
                    <span class="comment-avatar">${authorInitial}</span>
                    <span class="comment-author-name">${authorName}</span>
                </div>
                <span class="comment-date">${timeAgo}</span>
            </div>
            <div class="comment-content">${this.escapeHtml(comment.content)}</div>
            <div class="comment-actions">
                <button class="comment-action-btn like-btn ${hasLiked ? 'liked' : ''}" data-comment-id="${comment._id}">
                    <i class="fas fa-heart"></i>
                    <span>${comment.likeCount || comment.likes?.length || 0}</span>
                </button>
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
        div.querySelector('.like-btn').addEventListener('click', (e) => this.handleLike(e));
        div.querySelector('.reply-btn').addEventListener('click', () => this.handleReply(comment));
        div.querySelector('.delete-btn')?.addEventListener('click', (e) => this.handleDelete(e));

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
                    content
                })
            });

            const result = await response.json();

            if (result.success) {
                // Clear input
                this.dom.commentInput.value = '';
                this.dom.charCount.textContent = '0';

                // Refresh comments
                await this.fetchComments();

                Auth.showToast('Comment posted!');
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

    async handleLike(e) {
        const commentId = e.currentTarget.dataset.commentId;

        if (!Auth.isLoggedIn()) {
            Auth.showToast('Please log in to like comments!');
            return;
        }

        try {
            const response = await fetch(`/api/comments?id=${commentId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.getToken()}`
                },
                body: JSON.stringify({ action: 'like' })
            });

            if (response.ok) {
                await this.fetchComments();
            }
        } catch (error) {
            console.error('Error liking comment:', error);
        }
    }

    handleReply(comment) {
        // Focus the input and prepend @username
        const username = comment.author?.displayName || comment.author?.username || '';
        this.dom.commentInput.value = `@${username} `;
        this.dom.commentInput.focus();
        this.dom.charCount.textContent = this.dom.commentInput.value.length;
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




