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
    // Show placeholder message
    const leftPanel = document.getElementById('left-stats-group');
    const rightPanel = document.getElementById('right-stats-group');
    const attacksList = document.getElementById('attacks-list');
    const traitsList = document.getElementById('traits-list');
    
    if (leftPanel) leftPanel.innerHTML = '<p style="text-align: center; opacity: 0.5; padding: 20px;">Select an animal to view stats</p>';
    if (rightPanel) rightPanel.innerHTML = '<p style="text-align: center; opacity: 0.5; padding: 20px;">Select an animal to view stats</p>';
    if (attacksList) attacksList.innerHTML = '<p style="text-align: center; opacity: 0.5; padding: 15px; font-size: 0.9rem;">No animal selected</p>';
    if (traitsList) traitsList.innerHTML = '<p style="text-align: center; opacity: 0.5; padding: 15px; font-size: 0.9rem;">No animal selected</p>';
}

function displayCharacterStats(animal) {
    // Update character name
    const nameDisplay = document.querySelector('.character-name-display');
    if (nameDisplay) {
        nameDisplay.textContent = animal.name.toUpperCase();
    }
    
    // Update character model
    const modelContainer = document.querySelector('.character-model-container');
    if (modelContainer) {
        modelContainer.innerHTML = '<img src="' + animal.image + '" alt="' + animal.name + '" class="character-model" onerror="this.src=\'https://via.placeholder.com/500x500?text=' + animal.name + '\'">';
    }
    
    // Update character class/type
    const classDisplay = document.querySelector('.character-class-display');
    if (classDisplay) {
        classDisplay.textContent = animal.type.toUpperCase();
    }
    
    // Update left stats panel
    displaySideStats('left', animal);
    
    // Update right stats panel
    displaySideStats('right', animal);
    
    // Update attacks list
    displayAttacks(animal);
    
    // Update traits list
    displayTraits(animal);
    
    // Update ability description
    displayAbilityDescription(animal);
}

function displaySideStats(side, animal) {
    const panel = document.getElementById(side + '-stats-group');
    if (!panel) return;
    
    if (side === 'left') {
        panel.innerHTML = 
            createStatRow('fa-fist-raised', 'ATTACK', animal.attack, false) +
            createStatRow('fa-shield-alt', 'DEFENSE', animal.defense, false) +
            createStatRow('fa-wind', 'AGILITY', animal.agility, false);
    } else {
        panel.innerHTML = 
            createStatRow('fa-heart', 'STAMINA', animal.stamina, true) +
            createStatRow('fa-brain', 'INTELLIGENCE', animal.intelligence, true) +
            createStatRow('fa-bolt', 'SPECIAL', animal.special_attack, true);
    }
}

function createStatRow(icon, label, value, isRight) {
    const percentage = Math.min(value, 100);
    const barColor = getStatColor(value);
    
    if (isRight) {
        return '<div class="stat-row">' +
            '<div class="stat-value">' + Math.round(value) + '</div>' +
            '<div class="stat-bar-wrapper"><div class="stat-bar"><div class="stat-bar-fill" style="width: ' + percentage + '%; background: linear-gradient(90deg, ' + barColor + ', #ff6b00);"></div></div></div>' +
            '<div class="stat-icon"><i class="fas ' + icon + '"></i></div>' +
            '</div>';
    } else {
        return '<div class="stat-row">' +
            '<div class="stat-icon"><i class="fas ' + icon + '"></i></div>' +
            '<div class="stat-bar-wrapper"><div class="stat-bar"><div class="stat-bar-fill" style="width: ' + percentage + '%; background: linear-gradient(90deg, ' + barColor + ', #ff6b00);"></div></div></div>' +
            '<div class="stat-value">' + Math.round(value) + '</div>' +
            '</div>';
    }
}

function getStatColor(value) {
    if (value >= 80) return '#00ff88';
    if (value >= 60) return '#00d4ff';
    if (value >= 40) return '#ffd700';
    return '#ff6b00';
}

function displayAttacks(animal) {
    const attacksList = document.getElementById('attacks-list');
    if (!attacksList) return;
    
    if (!animal.special_abilities || animal.special_abilities.length === 0) {
        attacksList.innerHTML = '<p style="text-align: center; opacity: 0.5; padding: 10px; font-size: 0.85rem;">No special attacks</p>';
        return;
    }
    
    const attackIcons = ['fa-fire-alt', 'fa-bolt', 'fa-skull-crossbones', 'fa-meteor', 'fa-fist-raised'];
    
    attacksList.innerHTML = animal.special_abilities.map((ability, index) => {
        const icon = attackIcons[index % attackIcons.length];
        return '<div class="attack-item">' +
            '<div class="attack-icon"><i class="fas ' + icon + '"></i></div>' +
            '<div class="attack-name">' + ability.toUpperCase() + '</div>' +
            '</div>';
    }).join('');
}

function displayTraits(animal) {
    const traitsList = document.getElementById('traits-list');
    if (!traitsList) return;
    
    if (!animal.unique_traits || animal.unique_traits.length === 0) {
        traitsList.innerHTML = '<p style="text-align: center; opacity: 0.5; padding: 10px; font-size: 0.85rem;">No unique traits</p>';
        return;
    }
    
    const traitIcons = ['fa-star', 'fa-crown', 'fa-gem', 'fa-certificate', 'fa-award'];
    
    traitsList.innerHTML = animal.unique_traits.slice(0, 5).map((trait, index) => {
        const icon = traitIcons[index % traitIcons.length];
        return '<div class="trait-item">' +
            '<div class="trait-icon"><i class="fas ' + icon + '"></i></div>' +
            '<div class="trait-name">' + capitalizeWords(trait) + '</div>' +
            '</div>';
    }).join('');
}

function displayAbilityDescription(animal) {
    const abilityDesc = document.getElementById('ability-description');
    const abilityName = document.getElementById('ability-name');
    const abilityText = document.getElementById('ability-text');
    
    if (!abilityDesc || !abilityName || !abilityText) return;
    
    // Create a description based on animal's stats and abilities
    if (animal.special_abilities && animal.special_abilities.length > 0) {
        const mainAbility = animal.special_abilities[0];
        let description = generateAbilityDescription(animal);
        
        abilityName.textContent = mainAbility.toUpperCase();
        abilityText.textContent = description;
        abilityDesc.style.display = 'block';
    } else {
        abilityDesc.style.display = 'none';
    }
}

function generateAbilityDescription(animal) {
    // Generate dynamic descriptions based on animal traits
    const descriptions = [];
    
    if (animal.bite_force_psi && animal.bite_force_psi > 1000) {
        descriptions.push('Devastating bite force of ' + animal.bite_force_psi + ' PSI.');
    }
    
    if (animal.attack > 80) {
        descriptions.push('Exceptional offensive capabilities.');
    }
    
    if (animal.defense > 80) {
        descriptions.push('Superior defensive armor.');
    }
    
    if (animal.intelligence > 80) {
        descriptions.push('Highly intelligent and strategic.');
    }
    
    if (animal.speed_mps > 20) {
        descriptions.push('Incredible speed at ' + animal.speed_mps + ' m/s.');
    }
    
    if (descriptions.length === 0) {
        return 'A unique creature with specialized abilities adapted to its environment.';
    }
    
    return descriptions.join(' ');
}

function capitalizeWords(str) {
    return str.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
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
