let allAnimals = [];
let selectedAnimalIndex = null;
let compareAnimal1Index = null;
let compareAnimal2Index = null;
let currentMode = 'grid'; // 'grid' or 'compare'
let waitingForSelection = null; // null, 'animal1', or 'animal2'
let showOnlyFavorites = false;
let currentFilters = {
    search: '',
    class: '',
    type: '',
    sort: 'name'
};

// Load animal data
document.addEventListener("DOMContentLoaded", () => {
    fetch('animal_stats.json')
        .then(response => response.json())
        .then(data => {
            allAnimals = data;
            initializeApp();
        })
        .catch(error => {
            console.error("Error loading animal stats:", error);
            alert("Failed to load animal data. Please refresh the page.");
        });
});

function initializeApp() {
    // Populate filters
    populateFilters();
    
    // Display animals in grid
    displayAnimalsInGrid();
    
    // Set up event listeners
    setupEventListeners();
}

// ============================================
// POPULATE FILTERS
// ============================================
function populateFilters() {
    const classes = [...new Set(allAnimals.map(a => a.class))];
    const types = [...new Set(allAnimals.map(a => a.type))];
    
    const classFilter = document.getElementById("class-filter");
    const typeFilter = document.getElementById("type-filter");
    
    classes.forEach(cls => {
        const option = document.createElement("option");
        option.value = cls;
        option.textContent = cls;
        classFilter.appendChild(option);
    });
    
    types.forEach(type => {
        const option = document.createElement("option");
        option.value = type;
        option.textContent = type;
        typeFilter.appendChild(option);
    });
}

// ============================================
// HANDLE ANIMAL CARD CLICK
// ============================================
function handleAnimalCardClick(index) {
    if (currentMode === 'grid') {
        // Grid mode: Show stats
        selectedAnimalIndex = index;
        displayAnimalStats(index);
        updateSelectedCards();
    } else {
        // Compare mode: Assign to waiting slot
        if (waitingForSelection === 'animal1') {
            compareAnimal1Index = index;
            waitingForSelection = null;
            updateCompareButtons();
            updateCompareDisplay();
        } else if (waitingForSelection === 'animal2') {
            compareAnimal2Index = index;
            waitingForSelection = null;
            updateCompareButtons();
            updateCompareDisplay();
        }
        updateSelectedCards();
    }
}
// ============================================
// DISPLAY ANIMALS IN GRID
// ============================================
function displayAnimalsInGrid() {
    const grid = document.getElementById("animal-grid");
    grid.innerHTML = '';
    
    // Filter animals
    let filtered = allAnimals.filter(animal => {
        const matchesSearch = animal.name.toLowerCase().includes(currentFilters.search.toLowerCase()) ||
                            animal.scientific_name.toLowerCase().includes(currentFilters.search.toLowerCase());
        const matchesClass = !currentFilters.class || animal.class === currentFilters.class;
        const matchesType = !currentFilters.type || animal.type === currentFilters.type;
        const matchesFavorites = !showOnlyFavorites || animal.favorite;
        
        return matchesSearch && matchesClass && matchesType && matchesFavorites;
    });
    
    // Sort animals
    filtered.sort((a, b) => {
        const sortBy = currentFilters.sort;
        if (sortBy === 'name') {
            return a.name.localeCompare(b.name);
        } else {
            return (b[sortBy] || 0) - (a[sortBy] || 0);
        }
    });
    
    // Create horizontal cards
    filtered.forEach((animal, originalIndex) => {
        const animalIndex = allAnimals.indexOf(animal);
        const card = createHorizontalCard(animal, animalIndex);
        grid.appendChild(card);
    });
}

function createHorizontalCard(animal, index) {
    const card = document.createElement("div");
    card.className = "horizontal-animal-card";
    card.dataset.index = index;
    
    if (currentMode === 'grid' && selectedAnimalIndex === index) {
        card.classList.add('selected');
    }
    
    const isFavorite = animal.favorite || false;
    
    card.innerHTML = `
        <img src="${animal.image}" alt="${animal.name}" class="horizontal-card-image" 
             onerror="this.src='https://via.placeholder.com/80x60?text=${animal.name}'">
        <div class="horizontal-card-name">${animal.name}</div>
        <button class="card-favorite-btn ${isFavorite ? 'favorited' : ''}" data-index="${index}">
            <i class="fas fa-star"></i>
        </button>
    `;
    
    card.addEventListener('click', (e) => {
        // Don't trigger if clicking the favorite button
        if (!e.target.closest('.card-favorite-btn')) {
            handleAnimalCardClick(index);
        }
    });
    
    // Favorite button handler
    const favBtn = card.querySelector('.card-favorite-btn');
    favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(index);
    });
    
    return card;
}

// ============================================
// UPDATE COMPARE BUTTONS
// ============================================
function updateCompareButtons() {
    const btn1 = document.getElementById('select-animal-1-btn');
    const btn2 = document.getElementById('select-animal-2-btn');
    
    if (btn1) {
        // Update button 1
        if (waitingForSelection === 'animal1') {
            btn1.classList.add('active');
        } else {
            btn1.classList.remove('active');
        }
    }
    
    if (btn2) {
        // Update button 2
        if (waitingForSelection === 'animal2') {
            btn2.classList.add('active');
        } else {
            btn2.classList.remove('active');
        }
    }
}

// ============================================
// TOGGLE FAVORITE
// ============================================
function toggleFavorite(index) {
    allAnimals[index].favorite = !allAnimals[index].favorite;
    displayAnimalsInGrid();
    updateSelectedCards();
}

// ============================================
// HANDLE ANIMAL CARD CLICK
// ============================================
function handleAnimalCardClick(index) {
    if (currentMode === 'grid') {
        // Grid mode: Show stats
        selectedAnimalIndex = index;
        displayAnimalStats(index);
        updateSelectedCards();
    } else {
        // Compare mode: Assign to waiting selection
        if (waitingForSelection === 'animal1') {
            compareAnimal1Index = index;
            waitingForSelection = null;
            updateCompareDisplay();
            updateCompareButtons();
            updateSelectedCards();
        } else if (waitingForSelection === 'animal2') {
            compareAnimal2Index = index;
            waitingForSelection = null;
            updateCompareDisplay();
            updateCompareButtons();
            updateSelectedCards();
        }
    }
}

// ============================================
// DISPLAY ANIMAL STATS
// ============================================
function displayAnimalStats(index) {
    const animal = allAnimals[index];
    const statsContainer = document.getElementById("selected-animal-stats");
    const placeholder = document.querySelector(".stats-placeholder");
    
    if (placeholder) {
        placeholder.style.display = 'none';
    }
    
    // Calculate star rating (out of 5) based on average stats
    const avgStat = (animal.attack + animal.defense + animal.agility + animal.intelligence + animal.stamina + animal.special_attack) / 6;
    const starRating = Math.round((avgStat / 100) * 5);
    const stars = '★'.repeat(starRating) + '☆'.repeat(5 - starRating);
    
    // Get first special ability for main description
    const mainAbility = animal.special_abilities[0] || 'Unknown Ability';
    const abilityDescription = `All ${animal.class} characters on Darkseid's team gain +300% HEALTH and DAMAGE.`;
    
    statsContainer.style.display = 'grid';
    statsContainer.innerHTML = `
        <div class="game-card-container">
            <div class="card-left">
                <div class="card-rating">
                    <span class="rating-number">${Math.round(avgStat)}/100</span>
                    <span class="rating-stars">${stars}</span>
                </div>
                <div class="card-portrait-frame">
                    <img src="${animal.image}" alt="${animal.name}" class="card-portrait"
                         onerror="this.src='https://via.placeholder.com/300x300?text=${animal.name}'">
                </div>
                <div class="card-name-plate">
                    <div class="card-name">${animal.name.toUpperCase()}</div>
                </div>
            </div>
            
            <div class="card-right">
                <div class="stats-header">
                    <div class="stats-title">STATS</div>
                </div>
                
                <div class="stats-bars">
                    ${createGameStatBar('POWER', animal.attack, '#4A90E2')}
                    ${createGameStatBar('DEFENSE', animal.defense, '#9B59B6')}
                    ${createGameStatBar('SPEED', animal.agility, '#2ECC71')}
                    ${createGameStatBar('HEALTH', animal.stamina, '#E74C3C')}
                </div>
                
                <div class="attacks-section">
                    <div class="attacks-header">ATTACKS</div>
                    <div class="attack-list">
                        ${animal.special_abilities.map((ability, idx) => `
                            <div class="attack-item">
                                <div class="attack-icon">⚡</div>
                                <div class="attack-name">${ability.toUpperCase()}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="ability-highlight">
                    <div class="ability-name">${mainAbility.toUpperCase()}</div>
                </div>
            </div>
        </div>
        
        <div class="ability-description">
            <div class="ability-desc-title">${mainAbility.toUpperCase()}</div>
            <div class="ability-desc-text">${abilityDescription}</div>
        </div>
    `;
}

function createGameStatBar(label, value, color) {
    const percentage = Math.min(value, 100);
    const displayValue = Math.round(value);
    
    return `
        <div class="game-stat-row">
            <div class="game-stat-icon">
                <div class="stat-icon-inner"></div>
            </div>
            <div class="game-stat-label">${label}</div>
            <div class="game-stat-bar-container">
                <div class="game-stat-bar" style="width: ${percentage}%; background: linear-gradient(90deg, ${color}, ${color}dd);"></div>
            </div>
            <div class="game-stat-value">${displayValue}</div>
        </div>
    `;
}

// ============================================
// UPDATE COMPARE DISPLAY
// ============================================
function updateCompareDisplay() {
    const container1 = document.getElementById("compare-animal-1");
    const container2 = document.getElementById("compare-animal-2");
    
    if (compareAnimal1Index !== null) {
        container1.innerHTML = renderCompareAnimal(allAnimals[compareAnimal1Index]);
    } else {
        container1.innerHTML = `
            <button class="compare-select-btn" id="select-animal-1-btn">
                <i class="fas fa-mouse-pointer"></i><br>
                Click to Select Animal 1
            </button>
        `;
        // Re-attach event listener after recreating button
        document.getElementById("select-animal-1-btn").addEventListener('click', () => {
            waitingForSelection = 'animal1';
            updateCompareButtons();
        });
    }
    
    if (compareAnimal2Index !== null) {
        container2.innerHTML = renderCompareAnimal(allAnimals[compareAnimal2Index]);
    } else {
        container2.innerHTML = `
            <button class="compare-select-btn" id="select-animal-2-btn">
                <i class="fas fa-mouse-pointer"></i><br>
                Click to Select Animal 2
            </button>
        `;
        // Re-attach event listener after recreating button
        document.getElementById("select-animal-2-btn").addEventListener('click', () => {
            waitingForSelection = 'animal2';
            updateCompareButtons();
        });
    }
}

function renderCompareAnimal(animal) {
    return `
        <img src="${animal.image}" alt="${animal.name}" style="width: 100%; height: 200px; object-fit: cover; margin-bottom: 15px; border: 3px solid var(--border-bright); box-shadow: 0 0 20px rgba(0, 212, 255, 0.4);"
             onerror="this.src='https://via.placeholder.com/400x200?text=${animal.name}'">
        <h2 style="font-size: 1.5rem; color: var(--accent-color); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 2px;">${animal.name}</h2>
        <h3 style="font-size: 0.85rem; color: rgba(255,255,255,0.6); margin-bottom: 15px; font-style: italic;">${animal.scientific_name}</h3>
        
        <div class="stat-bar-container">
            ${createStatBar('Attack', animal.attack)}
            ${createStatBar('Defense', animal.defense)}
            ${createStatBar('Agility', animal.agility)}
            ${createStatBar('Intelligence', animal.intelligence)}
            ${createStatBar('Stamina', animal.stamina)}
            ${createStatBar('Special', animal.special_attack)}
        </div>
        
        <div style="margin-top: 15px; padding: 12px; background: linear-gradient(135deg, rgba(0, 212, 255, 0.15), rgba(0, 0, 0, 0.4)); border-left: 4px solid var(--accent-color); font-size: 0.8rem; border: 2px solid rgba(0, 212, 255, 0.3);">
            <div style="margin-bottom: 8px;"><strong>🏷️ Class:</strong> ${animal.class}</div>
            <div style="margin-bottom: 8px;"><strong>⚖️ Weight:</strong> ${animal.weight_kg.toLocaleString()} kg</div>
            <div><strong>💨 Speed:</strong> ${animal.speed_mps.toFixed(1)} m/s</div>
        </div>
    `;
}

// ============================================
// UPDATE SELECTED CARDS
// ============================================
function updateSelectedCards() {
    const cards = document.querySelectorAll('.horizontal-animal-card');
    cards.forEach(card => {
        card.classList.remove('selected');
    });
    
    if (currentMode === 'grid' && selectedAnimalIndex !== null) {
        const selectedCard = document.querySelector(`.horizontal-animal-card[data-index="${selectedAnimalIndex}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
    } else if (currentMode === 'compare') {
        if (compareAnimal1Index !== null) {
            const card1 = document.querySelector(`.horizontal-animal-card[data-index="${compareAnimal1Index}"]`);
            if (card1) card1.classList.add('selected');
        }
        if (compareAnimal2Index !== null) {
            const card2 = document.querySelector(`.horizontal-animal-card[data-index="${compareAnimal2Index}"]`);
            if (card2) card2.classList.add('selected');
        }
    }
}

// ============================================
// TOGGLE VIEW MODE
// ============================================
function toggleViewMode(mode) {
    currentMode = mode;
    
    const gridBtn = document.getElementById("grid-view-btn");
    const compareBtn = document.getElementById("compare-view-btn");
    const gridStatsView = document.getElementById("grid-stats-view");
    const compareStatsView = document.getElementById("compare-stats-view");
    
    if (mode === 'grid') {
        gridBtn.classList.add('active');
        compareBtn.classList.remove('active');
        gridStatsView.classList.add('active-stats-view');
        gridStatsView.classList.remove('inactive-stats-view');
        compareStatsView.classList.add('inactive-stats-view');
        compareStatsView.classList.remove('active-stats-view');
        
        // Reset compare selections when switching to grid
        compareAnimal1Index = null;
        compareAnimal2Index = null;
        waitingForSelection = null;
        updateSelectedCards();
        updateCompareButtons();
    } else {
        gridBtn.classList.remove('active');
        compareBtn.classList.add('active');
        gridStatsView.classList.add('inactive-stats-view');
        gridStatsView.classList.remove('active-stats-view');
        compareStatsView.classList.add('active-stats-view');
        compareStatsView.classList.remove('inactive-stats-view');
        
        updateCompareDisplay();
        updateSelectedCards();
        updateCompareButtons();
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
    // Mode toggle buttons
    document.getElementById("grid-view-btn").addEventListener('click', () => {
        toggleViewMode('grid');
    });
    
    document.getElementById("compare-view-btn").addEventListener('click', () => {
        toggleViewMode('compare');
    });
    
    // Search input
    document.getElementById("search-input").addEventListener('input', (e) => {
        currentFilters.search = e.target.value;
        displayAnimalsInGrid();
    });
    
    // Class filter
    document.getElementById("class-filter").addEventListener('change', (e) => {
        currentFilters.class = e.target.value;
        displayAnimalsInGrid();
    });
    
    // Type filter
    document.getElementById("type-filter").addEventListener('change', (e) => {
        currentFilters.type = e.target.value;
        displayAnimalsInGrid();
    });
    
    // Sort by
    document.getElementById("sort-by").addEventListener('change', (e) => {
        currentFilters.sort = e.target.value;
        displayAnimalsInGrid();
    });
    
    // Favorites filter toggle
    document.getElementById("favorites-filter").addEventListener('click', () => {
        showOnlyFavorites = !showOnlyFavorites;
        const btn = document.getElementById("favorites-filter");
        if (showOnlyFavorites) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
        displayAnimalsInGrid();
    });
    
    // Compare select buttons
    document.getElementById("select-animal-1-btn").addEventListener('click', () => {
        waitingForSelection = 'animal1';
        updateCompareButtons();
    });
    
    document.getElementById("select-animal-2-btn").addEventListener('click', () => {
        waitingForSelection = 'animal2';
        updateCompareButtons();
    });
}
