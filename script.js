// ============================================
// FIGHTING GAME UI - Animal Stats  
// ============================================

let allAnimals = [];
let filteredAnimals = [];
let currentView = 'stats';
let selectedAnimal = null;
let fighter1 = null;
let fighter2 = null;
let selectingSlot = null; // 'animal1' or 'animal2'

document.addEventListener("DOMContentLoaded", () => {
    fetch('animal_stats.json')
        .then(response => response.json())
        .then(data => {
            allAnimals = data;
            filteredAnimals = [...allAnimals];
            initializeApp();
        })
        .catch(error => {
            console.error("Error loading animal stats:", error);
            alert("Failed to load animal data. Please refresh the page.");
        });
});

function initializeApp() {
    populateFilters();
    renderCharacterGrid();
    setupEventListeners();
    switchView('stats');
    displayInitialStats();
}

function setupEventListeners() {
    document.getElementById('stats-mode-btn').addEventListener('click', () => switchView('stats'));
    document.getElementById('compare-mode-btn').addEventListener('click', () => switchView('compare'));
    
    // Search functionality
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
        filterAndRender();
    });
    
    // Class filter
    const classFilter = document.getElementById('class-filter');
    classFilter.addEventListener('change', filterAndRender);
    
    // Sort functionality
    const sortBy = document.getElementById('sort-by');
    sortBy.addEventListener('change', filterAndRender);
    
    // Expand details button
    const expandBtn = document.getElementById('expand-details-btn');
    const detailsPanel = document.getElementById('details-panel');
    const gridContainer = document.querySelector('.character-grid-container');
    const toggleGridBtn = document.getElementById('toggle-grid-btn');
    
    expandBtn?.addEventListener('click', () => {
        detailsPanel.classList.toggle('expanded');
        expandBtn.classList.toggle('expanded');
        
        if (expandBtn.classList.contains('expanded')) {
            expandBtn.innerHTML = '<i class="fas fa-chevron-up"></i> LESS DETAILS';
            // Auto-hide grid when details expand
            gridContainer?.classList.add('hidden');
            // Hide the toggle button completely when details are expanded
            if (toggleGridBtn) {
                toggleGridBtn.style.display = 'none';
            }
        } else {
            expandBtn.innerHTML = '<i class="fas fa-chevron-down"></i> MORE DETAILS';
            // Show the toggle button again when details collapse
            if (toggleGridBtn) {
                toggleGridBtn.style.display = 'flex';
            }
        }
    });
    
    // Toggle grid button
    toggleGridBtn?.addEventListener('click', () => {
        gridContainer?.classList.toggle('hidden');
        toggleGridBtn.classList.toggle('hidden');
        
        if (toggleGridBtn.classList.contains('hidden')) {
            toggleGridBtn.innerHTML = '<i class="fas fa-chevron-up"></i> SHOW ANIMALS';
        } else {
            toggleGridBtn.innerHTML = '<i class="fas fa-chevron-down"></i> HIDE ANIMALS';
        }
    });
    
    // Fight button
    const fightBtn = document.getElementById('fight-btn');
    if (fightBtn) {
        fightBtn.addEventListener('click', () => {
            if (fighter1 && fighter2) {
                alert('Fight functionality coming soon! ' + fighter1.name + ' VS ' + fighter2.name + '!');
            }
        });
    }
    
    // View stats buttons
    document.getElementById('view-stats-1')?.addEventListener('click', () => {
        if (fighter1) {
            switchView('stats');
            selectedAnimal = fighter1;
            displayCharacterStats(fighter1);
            updateSelectedCards();
        }
    });
    
    document.getElementById('view-stats-2')?.addEventListener('click', () => {
        if (fighter2) {
            switchView('stats');
            selectedAnimal = fighter2;
            displayCharacterStats(fighter2);
            updateSelectedCards();
        }
    });
    
    // Animal box selection in compare mode
    const fighter1Display = document.querySelector('.fighter-left .fighter-display');
    const fighter2Display = document.querySelector('.fighter-right .fighter-display');
    
    fighter1Display?.addEventListener('click', () => {
        if (currentView === 'compare') {
            selectingSlot = 'animal1';
            updateSelectionState();
        }
    });
    
    fighter2Display?.addEventListener('click', () => {
        if (currentView === 'compare') {
            selectingSlot = 'animal2';
            updateSelectionState();
        }
    });
}

function populateFilters() {
    // Populate class filter
    const classFilter = document.getElementById('class-filter');
    const types = [...new Set(allAnimals.map(a => a.type))].sort();
    types.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        classFilter.appendChild(option);
    });
}

function filterAndRender() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const classFilter = document.getElementById('class-filter').value;
    const sortBy = document.getElementById('sort-by').value;
    
    // Filter
    filteredAnimals = allAnimals.filter(animal => {
        const matchesSearch = animal.name.toLowerCase().includes(searchTerm);
        const matchesClass = !classFilter || animal.type === classFilter;
        return matchesSearch && matchesClass;
    });
    
    // Sort
    if (sortBy === 'name') {
        filteredAnimals.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'attack') {
        filteredAnimals.sort((a, b) => b.attack - a.attack);
    } else if (sortBy === 'defense') {
        filteredAnimals.sort((a, b) => b.defense - a.defense);
    } else if (sortBy === 'agility') {
        filteredAnimals.sort((a, b) => b.agility - a.agility);
    } else if (sortBy === 'stamina') {
        filteredAnimals.sort((a, b) => b.stamina - a.stamina);
    } else if (sortBy === 'intelligence') {
        filteredAnimals.sort((a, b) => b.intelligence - a.intelligence);
    } else if (sortBy === 'special') {
        filteredAnimals.sort((a, b) => b.special_attack - a.special_attack);
    }
    
    renderCharacterGrid();
}

function switchView(view) {
    currentView = view;
    document.getElementById('stats-view').classList.toggle('active-view', view === 'stats');
    document.getElementById('compare-view').classList.toggle('active-view', view === 'compare');
    document.getElementById('stats-mode-btn').classList.toggle('active', view === 'stats');
    document.getElementById('compare-mode-btn').classList.toggle('active', view === 'compare');
    
    // Reset selection state when switching to compare view
    if (view === 'compare') {
        selectingSlot = null;
        updateSelectionState();
    }
}

function updateSelectionState() {
    const fighter1Display = document.querySelector('.fighter-left .fighter-display');
    const fighter2Display = document.querySelector('.fighter-right .fighter-display');
    
    fighter1Display?.classList.toggle('selecting', selectingSlot === 'animal1');
    fighter2Display?.classList.toggle('selecting', selectingSlot === 'animal2');
}

function renderCharacterGrid() {
    const grid = document.getElementById('character-grid');
    grid.innerHTML = '';
    filteredAnimals.forEach((animal) => {
        const card = document.createElement('div');
        card.className = 'character-card';
        card.innerHTML = '<img src="' + animal.image + '" alt="' + animal.name + '" class="character-card-image" onerror="this.src=\'https://via.placeholder.com/110x80?text=' + animal.name + '\'"><div class="character-card-name">' + animal.name + '</div>';
        card.addEventListener('click', () => handleCardClick(animal));
        grid.appendChild(card);
    });
    updateSelectedCards();
}

function handleCardClick(animal) {
    if (currentView === 'stats') {
        selectedAnimal = animal;
        displayCharacterStats(animal);
        updateSelectedCards();
    } else if (currentView === 'compare') {
        // Only allow selection if a slot is selected
        if (selectingSlot === 'animal1') {
            fighter1 = animal;
            displayFighter(animal, 'left');
            selectingSlot = null; // Clear selection state
        } else if (selectingSlot === 'animal2') {
            fighter2 = animal;
            displayFighter(animal, 'right');
            selectingSlot = null; // Clear selection state
        }
        updateSelectionState();
        updateFightButton();
        updateSelectedCards();
    }
}

function updateSelectedCards() {
    const cards = document.querySelectorAll('.character-card');
    cards.forEach((card) => {
        card.classList.remove('selected');
        const animalName = card.querySelector('.character-card-name').textContent;
        
        if (currentView === 'stats' && selectedAnimal && animalName === selectedAnimal.name) {
            card.classList.add('selected');
        } else if (currentView === 'compare') {
            if (fighter1 && animalName === fighter1.name) card.classList.add('selected');
            if (fighter2 && animalName === fighter2.name) card.classList.add('selected');
        }
    });
}

function displayInitialStats() {
    // Show placeholder stats on initial load
    const leftPanel = document.getElementById('left-stats');
    const rightPanel = document.getElementById('right-stats');
    
    if (leftPanel) {
        leftPanel.innerHTML = 
            createStatRow('fa-fist-raised', 'ATTACK', 0, false, '#ff6b00') +
            createStatRow('fa-shield-alt', 'DEFENSE', 0, false, '#00d4ff') +
            createStatRow('fa-wind', 'AGILITY', 0, false, '#00ff88');
    }
    
    if (rightPanel) {
        rightPanel.innerHTML = 
            createStatRow('fa-heart', 'STAMINA', 0, true, '#ff3366') +
            createStatRow('fa-brain', 'INTELLIGENCE', 0, true, '#9966ff') +
            createStatRow('fa-bolt', 'SPECIAL', 0, true, '#ffcc00');
    }
}

function displayCharacterStats(animal) {
    // Update character name
    const nameDisplay = document.querySelector('.character-name-display');
    if (nameDisplay) {
        nameDisplay.textContent = animal.name.toUpperCase();
    }
    
    // Update scientific name
    const scientificDisplay = document.querySelector('.character-scientific-name');
    if (scientificDisplay) {
        scientificDisplay.textContent = animal.scientific_name;
    }
    
    // Update character model
    const modelContainer = document.querySelector('.character-model-container');
    if (modelContainer) {
        modelContainer.innerHTML = '<img src="' + animal.image + '" alt="' + animal.name + '" class="character-model" onerror="this.src=\'https://via.placeholder.com/500x500?text=' + animal.name + '\'">';
    }
    
    // Update character type
    const classDisplay = document.querySelector('.character-class-display');
    if (classDisplay) {
        classDisplay.textContent = animal.type;
    }
    
    // Update mini info (subtle, below type)
    const miniInfo = document.getElementById('character-mini-info');
    if (miniInfo) {
        let info = [];
        if (animal.weight_kg) info.push(animal.weight_kg + ' kg');
        if (animal.lifespan_years) info.push(animal.lifespan_years + ' yrs');
        if (animal.bite_force_psi) info.push(animal.bite_force_psi + ' PSI');
        miniInfo.innerHTML = info.map(i => '<span>' + i + '</span>').join('');
    }
    
    // Update abilities inline (bottom bar)
    const abilitiesInline = document.getElementById('abilities-inline');
    if (abilitiesInline && animal.special_abilities && animal.special_abilities.length > 0) {
        abilitiesInline.textContent = animal.special_abilities.join(', ');
    } else if (abilitiesInline) {
        abilitiesInline.textContent = 'None';
    }
    
    // Update traits inline (bottom bar)
    const traitsInline = document.getElementById('traits-inline');
    if (traitsInline && animal.unique_traits && animal.unique_traits.length > 0) {
        traitsInline.textContent = animal.unique_traits.join(', ');
    } else if (traitsInline) {
        traitsInline.textContent = 'None';
    }
    
    // Update detailed stats panel
    updateDetailedStats(animal);
    
    // Update left stats panel
    displaySideStats('left', animal);
    
    // Update right stats panel
    displaySideStats('right', animal);
}

function updateDetailedStats(animal) {
    // Classification
    document.getElementById('detail-type').textContent = animal.type || '---';
    document.getElementById('detail-scientific').textContent = animal.scientific_name || '---';
    
    // Description (placeholder for now - will be added to JSON later)
    const description = document.getElementById('animal-description');
    if (description) {
        description.textContent = animal.description || 'No description available yet. This will be added soon!';
    }
    
    // Habitat & Diet
    document.getElementById('detail-habitat').textContent = animal.habitat || '---';
    document.getElementById('detail-diet').textContent = Array.isArray(animal.diet) ? animal.diet.join(', ') : (animal.diet || '---');
    
    // Physical Stats
    document.getElementById('detail-weight').textContent = animal.weight_kg ? animal.weight_kg + ' kg' : '---';
    document.getElementById('detail-height').textContent = animal.height_cm ? animal.height_cm + ' cm' : '---';
    document.getElementById('detail-length').textContent = animal.length_cm ? animal.length_cm + ' cm' : '---';
    document.getElementById('detail-speed').textContent = animal.speed_mps ? animal.speed_mps.toFixed(1) + ' m/s (' + (animal.speed_mps * 3.6).toFixed(1) + ' km/h)' : '---';
    document.getElementById('detail-lifespan').textContent = animal.lifespan_years ? animal.lifespan_years + ' years' : '---';
    document.getElementById('detail-bite').textContent = animal.bite_force_psi ? animal.bite_force_psi + ' PSI' : '---';
    
    // Additional Stats
    document.getElementById('detail-size').textContent = animal.size || '---';
    document.getElementById('detail-nocturnal').textContent = animal.isNocturnal ? 'Yes 🌙' : 'No ☀️';
    document.getElementById('detail-social').textContent = animal.isSocial ? 'Yes 👥' : 'No (Solitary)';
    document.getElementById('detail-size-score').textContent = animal.size_score ? animal.size_score.toFixed(1) + ' / 100' : '---';
}

function displaySideStats(side, animal) {
    const panelId = side === 'left' ? 'left-stats' : 'right-stats';
    const panel = document.getElementById(panelId);
    if (!panel) return;
    
    if (side === 'left') {
        panel.innerHTML = 
            createStatRow('fa-fist-raised', 'ATTACK', animal.attack, false, '#ff6b00') +
            createStatRow('fa-shield-alt', 'DEFENSE', animal.defense, false, '#00d4ff') +
            createStatRow('fa-wind', 'AGILITY', animal.agility, false, '#00ff88');
    } else {
        panel.innerHTML = 
            createStatRow('fa-heart', 'STAMINA', animal.stamina, true, '#ff3366') +
            createStatRow('fa-brain', 'INTELLIGENCE', animal.intelligence, true, '#9966ff') +
            createStatRow('fa-bolt', 'SPECIAL', animal.special_attack, true, '#ffcc00');
    }
}

function createStatRow(icon, label, value, isRight, color) {
    const percentage = Math.min(value, 100);
    
    if (isRight) {
        return '<div class="stat-row">' +
            '<div class="stat-value">' + value + '</div>' +
            '<div class="stat-bar-wrapper"><div class="stat-bar"><div class="stat-bar-fill" style="width: ' + percentage + '%; background: ' + color + ';"></div></div></div>' +
            '<div class="stat-name">' + label + '</div>' +
            '<div class="stat-icon"><i class="fas ' + icon + '"></i></div>' +
            '</div>';
    } else {
        return '<div class="stat-row">' +
            '<div class="stat-icon"><i class="fas ' + icon + '"></i></div>' +
            '<div class="stat-name">' + label + '</div>' +
            '<div class="stat-bar-wrapper"><div class="stat-bar"><div class="stat-bar-fill" style="width: ' + percentage + '%; background: ' + color + ';"></div></div></div>' +
            '<div class="stat-value">' + value + '</div>' +
            '</div>';
    }
}

function displayFighter(animal, side) {
    const sectionSelector = side === 'left' ? '.fighter-left' : '.fighter-right';
    const fighterDisplay = document.querySelector(sectionSelector + ' .fighter-display');
    const fighterName = document.querySelector(sectionSelector + ' .fighter-name');
    
    if (fighterDisplay) {
        fighterDisplay.innerHTML = '<img src="' + animal.image + '" alt="' + animal.name + '" class="fighter-image" onerror="this.src=\'https://via.placeholder.com/350x350?text=' + animal.name + '\'">';
    }
    
    if (fighterName) {
        fighterName.textContent = animal.name.toUpperCase();
    }
}

function updateFightButton() {
    const fightBtn = document.getElementById('fight-btn');
    if (fightBtn) {
        if (fighter1 && fighter2) {
            fightBtn.disabled = false;
            fightBtn.style.opacity = '1';
            fightBtn.style.cursor = 'pointer';
        } else {
            fightBtn.disabled = true;
            fightBtn.style.opacity = '0.5';
            fightBtn.style.cursor = 'not-allowed';
        }
    }
}
