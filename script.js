// ============================================
// FIGHTING GAME UI - Animal Stats  
// ============================================

let allAnimals = [];
let currentView = 'stats';
let selectedAnimal = null;
let fighter1 = null;
let fighter2 = null;
let waitingForFighterSelection = null;

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
    document.getElementById('select-fighter-1-btn').addEventListener('click', () => selectFighterMode('fighter1'));
    document.getElementById('select-fighter-2-btn').addEventListener('click', () => selectFighterMode('fighter2'));
    document.getElementById('fight-btn').addEventListener('click', () => {
        if (fighter1 && fighter2) {
            console.log(fighter1.name + ' VS ' + fighter2.name + '!');
        }
    });
}

function switchView(view) {
    currentView = view;
    document.getElementById('stats-view').classList.toggle('active-view', view === 'stats');
    document.getElementById('compare-view').classList.toggle('active-view', view === 'compare');
    document.getElementById('stats-mode-btn').classList.toggle('active', view === 'stats');
    document.getElementById('compare-mode-btn').classList.toggle('active', view === 'compare');
    if (view === 'stats') {
        waitingForFighterSelection = null;
        updateFighterSelectButtons();
    }
}

function renderCharacterGrid() {
    const grid = document.getElementById('animal-grid');
    grid.innerHTML = '';
    allAnimals.forEach((animal, index) => {
        const card = document.createElement('div');
        card.className = 'animal-card';
        card.dataset.index = index;
        card.innerHTML = '<img src="' + animal.image + '" alt="' + animal.name + '"><div class="animal-card-name">' + animal.name + '</div>';
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
        if (waitingForFighterSelection === 'fighter1') {
            fighter1 = animal;
            displayFighter(animal, 'left');
            waitingForFighterSelection = null;
            updateFighterSelectButtons();
        } else if (waitingForFighterSelection === 'fighter2') {
            fighter2 = animal;
            displayFighter(animal, 'right');
            waitingForFighterSelection = null;
            updateFighterSelectButtons();
        }
        updateSelectedCards();
    }
}

function updateSelectedCards() {
    const cards = document.querySelectorAll('.animal-card');
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
    document.querySelector('.character-placeholder').style.display = 'none';
    const viewer = document.getElementById('character-viewer');
    viewer.innerHTML = '<img src="' + animal.image + '" alt="' + animal.name + '">';
    viewer.style.display = 'flex';
    displaySideStats('left', animal);
    displaySideStats('right', animal);
}

function displaySideStats(side, animal) {
    const panel = document.getElementById(side + '-stats-panel');
    if (side === 'left') {
        panel.innerHTML = '<div class="stat-section"><div class="stat-title">Combat Stats</div>' +
            createStatBar('Attack', animal.attack) +
            createStatBar('Defense', animal.defense) +
            createStatBar('Special Attack', animal.special_attack) +
            '</div><div class="stat-section"><div class="stat-title">Physical Stats</div>' +
            createStatBar('Agility', animal.agility) +
            createStatBar('Stamina', animal.stamina) +
            createStatBar('Intelligence', animal.intelligence) + '</div>';
    } else {
        panel.innerHTML = '<div class="info-display"><div class="stat-title">' + animal.name + '</div>' +
            '<div class="info-row"><span class="info-label">Scientific Name</span><span class="info-value">' + animal.scientific_name + '</span></div>' +
            '<div class="info-row"><span class="info-label">Class</span><span class="info-value">' + animal.class + '</span></div>' +
            '<div class="info-row"><span class="info-label">Type</span><span class="info-value">' + animal.type + '</span></div>' +
            '<div class="info-row"><span class="info-label">Weight</span><span class="info-value">' + animal.weight_kg.toLocaleString() + ' kg</span></div>' +
            '<div class="info-row"><span class="info-label">Speed</span><span class="info-value">' + animal.speed_mps.toFixed(1) + ' m/s</span></div></div>' +
            '<div class="stat-section"><div class="stat-title">Special Abilities</div>' +
            animal.special_abilities.map(ability => '<div style="padding: 8px 10px; background: rgba(0, 212, 255, 0.1); border-left: 3px solid var(--border-bright); margin-bottom: 8px; font-size: 0.85rem; border-radius: 3px;"> ' + ability + '</div>').join('') + '</div>';
    }
}

function selectFighterMode(fighter) {
    waitingForFighterSelection = fighter;
    updateFighterSelectButtons();
}

function updateFighterSelectButtons() {
    const btn1 = document.getElementById('select-fighter-1-btn');
    const btn2 = document.getElementById('select-fighter-2-btn');
    btn1.classList.toggle('active', waitingForFighterSelection === 'fighter1');
    btn2.classList.toggle('active', waitingForFighterSelection === 'fighter2');
}

function displayFighter(animal, side) {
    const container = document.getElementById(side + '-fighter');
    container.innerHTML = '<div class="fighter-name-plate">' + animal.name.toUpperCase() + '</div>' +
        '<div class="fighter-placeholder" style="background: none; border: none;"><img src="' + animal.image + '" alt="' + animal.name + '" style="max-width: 400px; max-height: 400px; object-fit: contain; filter: drop-shadow(0 0 30px rgba(0, 212, 255, 0.6));"></div>' +
        '<div class="stat-section" style="width: 100%; max-width: 400px;">' +
        createStatBar('Attack', animal.attack) +
        createStatBar('Defense', animal.defense) +
        createStatBar('Agility', animal.agility) +
        createStatBar('Stamina', animal.stamina) + '</div>';
}

function createStatBar(label, value) {
    const percentage = Math.min(value, 100);
    return '<div class="stat-row"><span class="stat-label">' + label + '</span><div class="stat-bar-bg"><div class="stat-bar-fill" style="width: ' + percentage + '%"></div></div><span class="stat-value">' + value + '</span></div>';
}
