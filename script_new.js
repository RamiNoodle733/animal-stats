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
        // Compare mode: Set animal in comparison
        if (compareAnimal1Index === null) {
            compareAnimal1Index = index;
            document.getElementById("animal1-select").value = index;
        } else {
            compareAnimal2Index = index;
            document.getElementById("animal2-select").value = index;
        }
        updateCompareDisplay();
        updateSelectedCards();
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
    
    statsContainer.style.display = 'grid';
    statsContainer.innerHTML = `
        <div>
            <img src="${animal.image}" alt="${animal.name}" class="stats-animal-image"
                 onerror="this.src='https://via.placeholder.com/250x250?text=${animal.name}'">
        </div>
        <div class="stats-animal-info">
            <h2>${animal.name}</h2>
            <h3>${animal.scientific_name}</h3>
            
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-label">Class</div>
                    <div class="stat-value">${animal.class}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Type</div>
                    <div class="stat-value">${animal.type}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Weight</div>
                    <div class="stat-value">${animal.weight_kg} kg</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Speed</div>
                    <div class="stat-value">${animal.speed_mps.toFixed(2)} m/s</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Lifespan</div>
                    <div class="stat-value">${animal.lifespan_years} years</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Habitat</div>
                    <div class="stat-value">${animal.habitat}</div>
                </div>
            </div>
            
            <div class="stat-bar-container">
                ${createStatBar('Attack', animal.attack)}
                ${createStatBar('Defense', animal.defense)}
                ${createStatBar('Agility', animal.agility)}
                ${createStatBar('Intelligence', animal.intelligence)}
                ${createStatBar('Stamina', animal.stamina)}
                ${createStatBar('Special', animal.special_attack)}
            </div>
            
            <div class="stats-traits">
                <h4>Special Abilities</h4>
                <ul>
                    ${animal.special_abilities.map(ability => `<li>${ability}</li>`).join('')}
                </ul>
            </div>
            
            <div class="stats-traits">
                <h4>Unique Traits</h4>
                <ul>
                    ${animal.unique_traits.map(trait => `<li>${trait}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;
}

function createStatBar(label, value) {
    const percentage = Math.min(value, 100);
    return `
        <div class="stat-bar">
            <span class="stat-bar-label">${label}</span>
            <div class="stat-bar-track">
                <div class="stat-bar-fill" style="width: ${percentage}%"></div>
            </div>
            <span class="stat-bar-value">${value.toFixed(2)}</span>
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
        <img src="${animal.image}" alt="${animal.name}" style="width: 100%; height: 180px; object-fit: cover; margin-bottom: 10px; border: 2px solid var(--border-bright);"
             onerror="this.src='https://via.placeholder.com/400x180?text=${animal.name}'">
        <h2 style="font-size: 1.3rem; color: var(--accent-color); margin-bottom: 5px;">${animal.name}</h2>
        <h3 style="font-size: 0.8rem; color: rgba(255,255,255,0.6); margin-bottom: 10px;">${animal.scientific_name}</h3>
        
        <div class="stat-bar-container">
            ${createStatBar('Attack', animal.attack)}
            ${createStatBar('Defense', animal.defense)}
            ${createStatBar('Agility', animal.agility)}
            ${createStatBar('Intelligence', animal.intelligence)}
            ${createStatBar('Stamina', animal.stamina)}
            ${createStatBar('Special', animal.special_attack)}
        </div>
        
        <div style="margin-top: 10px; padding: 8px; background: rgba(0,0,0,0.3); border-left: 2px solid var(--accent-color); font-size: 0.75rem;">
            <strong>Class:</strong> ${animal.class}<br>
            <strong>Weight:</strong> ${animal.weight_kg} kg<br>
            <strong>Speed:</strong> ${animal.speed_mps.toFixed(2)} m/s
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
