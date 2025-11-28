/**
 * Animal Stats - Expert Optimized Script
 * Handles application logic, state management, and UI rendering.
 * 
 * @version 2.0.0
 */

'use strict';

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
                sort: 'name'
            }
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
            sortBy: document.getElementById('sort-by'),
            toggleGridBtn: document.getElementById('toggle-grid-btn'),
            
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
                description: document.getElementById('animal-description')
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
                compare: document.getElementById('compare-mode-btn')
            }
        };

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
            await this.fetchData();
            this.populateClassFilter();
            this.setupEventListeners();
            
            // Initial Render
            this.renderGrid();
            
            // Select first animal by default if available
            if (this.state.animals.length > 0) {
                this.selectAnimal(this.state.animals[0]);
            }
            
            console.log('Animal Stats App Initialized');
        } catch (error) {
            console.error('Initialization failed:', error);
            alert('Failed to load animal data. Please try refreshing the page.');
        }
    }

    /**
     * Fetch animal data from JSON
     */
    async fetchData() {
        // Check for global data first (fixes local file CORS issues)
        if (window.animalData) {
            this.state.animals = window.animalData;
            this.state.filteredAnimals = [...window.animalData];
            return;
        }

        // Fallback to fetch
        try {
            const response = await fetch('animal_stats.json');
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            this.state.animals = data;
            this.state.filteredAnimals = [...data];
        } catch (error) {
            console.error('Error loading data:', error);
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
        this.dom.searchInput.addEventListener('input', this.handleSearch);
        this.dom.classFilter.addEventListener('change', this.handleFilter);
        this.dom.sortBy.addEventListener('change', this.handleSort);
        
        // Grid Interaction (Event Delegation)
        this.dom.gridContainer.addEventListener('click', this.handleGridClick);
        
        // UI Toggles
        if (this.dom.expandDetailsBtn) {
            this.dom.expandDetailsBtn.addEventListener('click', this.toggleDetails);
        }
        if (this.dom.toggleGridBtn) {
            this.dom.toggleGridBtn.addEventListener('click', this.toggleGrid);
        }
        
        // Navigation
        this.dom.navBtns.stats.addEventListener('click', () => this.switchView('stats'));
        this.dom.navBtns.compare.addEventListener('click', () => this.switchView('compare'));
        
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
     * Handle search input
     */
    handleSearch(e) {
        this.state.filters.search = e.target.value.toLowerCase();
        this.applyFilters();
    }

    /**
     * Handle category filter
     */
    handleFilter(e) {
        this.state.filters.class = e.target.value;
        this.applyFilters();
    }

    /**
     * Handle sort
     */
    handleSort(e) {
        this.state.filters.sort = e.target.value;
        this.applyFilters();
    }

    /**
     * Apply all filters and sort
     */
    applyFilters() {
        const { search, class: classFilter, sort } = this.state.filters;
        
        // Filter
        this.state.filteredAnimals = this.state.animals.filter(animal => {
            const matchesSearch = animal.name.toLowerCase().includes(search);
            const matchesClass = classFilter === 'all' || animal.type === classFilter;
            return matchesSearch && matchesClass;
        });

        // Sort
        this.state.filteredAnimals.sort((a, b) => {
            if (sort === 'name') return a.name.localeCompare(b.name);
            
            // Map sort keys to data keys
            const keyMap = {
                'attack': 'attack',
                'defense': 'defense',
                'agility': 'agility',
                'stamina': 'stamina',
                'intelligence': 'intelligence',
                'special': 'special_attack'
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
            
            // Add selection classes
            if (this.state.view === 'stats' && this.state.selectedAnimal?.name === animal.name) {
                card.classList.add('selected');
            } else if (this.state.view === 'compare') {
                if (this.state.compare.left?.name === animal.name) card.classList.add('selected-fighter1');
                if (this.state.compare.right?.name === animal.name) card.classList.add('selected-fighter2');
            }

            card.innerHTML = `
                <img src="${animal.image}" alt="${animal.name}" class="character-card-image" loading="lazy" onerror="this.src='https://via.placeholder.com/110x80?text=?'">
                <div class="character-card-name">${animal.name}</div>
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
            special: animal.special_attack
        };

        Object.keys(this.dom.statBars).forEach(stat => {
            const value = statsMap[stat] || 0;
            if (this.dom.statBars[stat]) this.dom.statBars[stat].style.width = `${Math.min(value, 100)}%`;
            if (this.dom.statValues[stat]) this.dom.statValues[stat].textContent = value;
        });

        // Mini Info
        let info = [];
        if (animal.weight_kg) info.push(`${animal.weight_kg} kg`);
        if (animal.lifespan_years) info.push(`${animal.lifespan_years} yrs`);
        if (animal.bite_force_psi) info.push(`${animal.bite_force_psi} PSI`);
        this.dom.miniInfo.innerHTML = info.map(i => `<span>${i}</span>`).join('');

        // Info Bar
        this.dom.info.abilities.textContent = animal.special_abilities?.join(', ') || 'None';
        this.dom.info.traits.textContent = animal.unique_traits?.join(', ') || 'None';

        // Details Panel
        const d = this.dom.detailText;
        d.type.textContent = animal.type || '---';
        d.scientific.textContent = animal.scientific_name || '---';
        d.size.textContent = animal.size || '---';
        d.habitat.textContent = animal.habitat || '---';
        d.diet.textContent = Array.isArray(animal.diet) ? animal.diet.join(', ') : (animal.diet || '---');
        d.nocturnal.textContent = animal.isNocturnal ? 'Yes ' : 'No ';
        d.social.textContent = animal.isSocial ? 'Yes ' : 'No (Solitary)';
        d.weight.textContent = animal.weight_kg ? `${animal.weight_kg} kg` : '---';
        d.height.textContent = animal.height_cm ? `${animal.height_cm} cm` : '---';
        d.length.textContent = animal.length_cm ? `${animal.length_cm} cm` : '---';
        d.speed.textContent = animal.speed_mps ? `${animal.speed_mps.toFixed(1)} m/s (${(animal.speed_mps * 3.6).toFixed(1)} km/h)` : '---';
        d.lifespan.textContent = animal.lifespan_years ? `${animal.lifespan_years} years` : '---';
        d.bite.textContent = animal.bite_force_psi ? `${animal.bite_force_psi} PSI` : '---';
        d.sizeScore.textContent = animal.size_score ? `${animal.size_score.toFixed(1)} / 100` : '---';
        d.description.textContent = animal.description || 'No description available yet.';
    }

    /**
     * Switch between Stats and Compare views
     */
    switchView(viewName) {
        this.state.view = viewName;
        
        // Update UI classes
        this.dom.statsView.classList.toggle('active-view', viewName === 'stats');
        this.dom.compareView.classList.toggle('active-view', viewName === 'compare');
        
        this.dom.navBtns.stats.classList.toggle('active', viewName === 'stats');
        this.dom.navBtns.compare.classList.toggle('active', viewName === 'compare');

        // Grid visibility logic
        if (viewName === 'compare') {
            this.dom.gridWrapper.classList.remove('hidden');
            this.dom.toggleGridBtn.style.display = 'none';
            
            // Reset selection state if entering compare mode
            if (!this.state.compare.selectingSide) {
                if (!this.state.compare.left) this.setSelectingSide('left');
            }
        } else {
            this.dom.toggleGridBtn.style.display = 'flex';
        }

        this.renderGrid();
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
            special: animal.special_attack
        };

        Object.keys(els.stats).forEach(stat => {
            if (els.stats[stat]) els.stats[stat].textContent = statsMap[stat]?.toFixed(1) || '0';
        });
    }

    toggleFighterStats(side) {
        const els = side === 'left' ? this.dom.fighter1 : this.dom.fighter2;
        const isVisible = els.statsPanel.style.display === 'block';
        els.statsPanel.style.display = isVisible ? 'none' : 'block';
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
        
        if (this.state.isGridVisible) {
            this.dom.toggleGridBtn.innerHTML = '<i class="fas fa-chevron-down"></i> HIDE MENU';
        } else {
            this.dom.toggleGridBtn.innerHTML = '<i class="fas fa-chevron-up"></i> SHOW MENU';
        }
    }

    /**
     * Start the fight simulation
     */
    startFight() {
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

        alert(`FIGHT RESULT:\n\n${winner.name} defeats ${loser.name}!\n\n${winner.name} Score: ${score1.toFixed(1)}\n${loser.name} Score: ${score2.toFixed(1)}`);
    }

    /**
     * Calculate a simple combat score
     */
    calculateCombatScore(animal) {
        // Weighted formula
        return (animal.attack * 2) + (animal.defense * 1.5) + (animal.agility * 1.5) + (animal.intelligence * 1.2) + animal.stamina + (animal.special_attack * 0.8);
    }
}

// Initialize App when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AnimalStatsApp();
    window.app.init();
});
