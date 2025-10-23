// ============================================
// FIGHTING GAME UI - Animal Stats  
// ============================================

let allAnimals = [];
let currentView = 'stats';
let selectedAnimal = null;
let fighter1 = null;
let fighter2 = null;

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
    renderCharacterGrid();
    setupEventListeners();
    switchView('stats');
}

function setupEventListeners() {
    document.getElementById('stats-mode-btn').addEventListener('click', () => switchView('stats'));
    document.getElementById('compare-mode-btn').addEventListener('click', () => switchView('compare'));
    const fightBtn = document.getElementById('fight-btn');
    if (fightBtn) {
        fightBtn.addEventListener('click', () => {
            if (fighter1 && fighter2) {
                alert('Fight functionality coming soon! ' + fighter1.name + ' VS ' + fighter2.name + '!');
            }
        });
    }
}

function switchView(view) {
    currentView = view;
    document.getElementById('stats-view').classList.toggle('active-view', view === 'stats');
    document.getElementById('compare-view').classList.toggle('active-view', view === 'compare');
    document.getElementById('stats-mode-btn').classList.toggle('active', view === 'stats');
    document.getElementById('compare-mode-btn').classList.toggle('active', view === 'compare');
}

function renderCharacterGrid() {
    const grid = document.getElementById('character-grid');
    grid.innerHTML = '';
    allAnimals.forEach((animal, index) => {
        const card = document.createElement('div');
        card.className = 'character-card';
        card.dataset.index = index;
        card.innerHTML = '<img src="' + animal.image + '" alt="' + animal.name + '" class="character-card-image" onerror="this.src=\'https://via.placeholder.com/110x80?text=' + animal.name + '\'"><div class="character-card-name">' + animal.name + '</div>';
        card.addEventListener('click', () => handleCardClick(index));
        grid.appendChild(card);
    });
}

function handleCardClick(index) {
    const animal = allAnimals[index];
    if (currentView === 'stats') {
        selectedAnimal = animal;
        displayCharacterStats(animal);
        updateSelectedCards();
    } else if (currentView === 'compare') {
        // Select fighters for compare mode
        if (!fighter1 || (fighter1 && fighter2)) {
            // Set fighter 1 or reset both
            fighter1 = animal;
            fighter2 = null;
            displayFighter(animal, 'left');
            // Clear fighter 2
            const rightFighter = document.querySelector('.fighter-section:last-child .fighter-display');
            if (rightFighter) {
                rightFighter.innerHTML = '<div class="fighter-placeholder"><i class="fas fa-question-circle"></i><p>SELECT FIGHTER 2</p></div>';
            }
            const rightName = document.querySelector('.fighter-section:last-child .fighter-name');
            if (rightName) {
                rightName.textContent = 'FIGHTER 2';
            }
        } else {
            // Set fighter 2
            fighter2 = animal;
            displayFighter(animal, 'right');
        }
        updateFightButton();
        updateSelectedCards();
    }
}

function updateSelectedCards() {
    const cards = document.querySelectorAll('.character-card');
    cards.forEach((card, index) => {
        card.classList.remove('selected');
        if (currentView === 'stats' && selectedAnimal && allAnimals[index] === selectedAnimal) {
            card.classList.add('selected');
        } else if (currentView === 'compare') {
            if (fighter1 && allAnimals[index] === fighter1) card.classList.add('selected');
            if (fighter2 && allAnimals[index] === fighter2) card.classList.add('selected');
        }
    });
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
    
    // Update character class
    const classDisplay = document.querySelector('.character-class-display');
    if (classDisplay) {
        classDisplay.textContent = animal.class + ' • ' + animal.type;
    }
    
    // Update left stats panel
    displaySideStats('left', animal);
    
    // Update right stats panel
    displaySideStats('right', animal);
}

function displaySideStats(side, animal) {
    const panel = document.querySelector('.stats-panel-' + side);
    if (!panel) return;
    
    if (side === 'left') {
        panel.innerHTML = '<div class="stat-group">' +
            createStatRow('fa-fist-raised', 'ATTACK', animal.attack) +
            createStatRow('fa-shield-alt', 'DEFENSE', animal.defense) +
            createStatRow('fa-wind', 'AGILITY', animal.agility) +
            '</div>';
    } else {
        panel.innerHTML = '<div class="stat-group">' +
            createStatRow('fa-heart', 'STAMINA', animal.stamina, true) +
            createStatRow('fa-brain', 'INTELLIGENCE', animal.intelligence, true) +
            createStatRow('fa-bolt', 'SPECIAL', animal.special_attack, true) +
            '</div>';
    }
}

function createStatRow(icon, label, value, isRight) {
    const percentage = Math.min(value, 100);
    const barColor = value >= 80 ? '#00ff88' : value >= 50 ? '#00d4ff' : '#ff6b00';
    
    if (isRight) {
        return '<div class="stat-row">' +
            '<div class="stat-value">' + value + '</div>' +
            '<div class="stat-bar-wrapper"><div class="stat-bar"><div class="stat-bar-fill" style="width: ' + percentage + '%; background: linear-gradient(90deg, ' + barColor + ', #ff6b00);"></div></div></div>' +
            '<div class="stat-name">' + label + '</div>' +
            '<div class="stat-icon"><i class="fas ' + icon + '"></i></div>' +
            '</div>';
    } else {
        return '<div class="stat-row">' +
            '<div class="stat-icon"><i class="fas ' + icon + '"></i></div>' +
            '<div class="stat-name">' + label + '</div>' +
            '<div class="stat-bar-wrapper"><div class="stat-bar"><div class="stat-bar-fill" style="width: ' + percentage + '%; background: linear-gradient(90deg, ' + barColor + ', #ff6b00);"></div></div></div>' +
            '<div class="stat-value">' + value + '</div>' +
            '</div>';
    }
}

function displayFighter(animal, side) {
    const sectionSelector = side === 'left' ? '.fighter-section:first-child' : '.fighter-section:last-child';
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
