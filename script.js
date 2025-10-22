let allAnimals = [];
let favorites = new Set(JSON.parse(localStorage.getItem('favorites') || '[]'));
let favoritesOnly = false;

document.addEventListener("DOMContentLoaded", () => {
    // Show loading state
    showLoading();
    
    // Load animal data
    fetch('animal_stats.json')
        .then(response => {
            if (!response.ok) {
                throw new Error("Failed to load animal stats");
            }
            return response.json();
        })
        .then(data => {
            allAnimals = data;
            
            // Hide loading state
            hideLoading();
            
            // Initialize app
            initializeApp(allAnimals);
        })
        .catch(error => {
            console.error("Error loading animal stats:", error);
            showError("Failed to load animal data. Please refresh the page.");
        });
});

function showLoading() {
    const gridView = document.getElementById("grid-view");
    gridView.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>Loading animal data...</p>
        </div>
    `;
}

function hideLoading() {
    const gridView = document.getElementById("grid-view");
    gridView.innerHTML = '<div id="animal-grid" class="animal-grid"></div>';
}

function showError(message) {
    const gridView = document.getElementById("grid-view");
    gridView.innerHTML = `
        <div class="error-container">
            <div class="error-icon">⚠️</div>
            <p>${message}</p>
            <button onclick="location.reload()">Try Again</button>
        </div>
    `;
}

function initializeApp(animals) {
    // Initialize filters
    initializeFilters(animals);
    
    // Restore state from URL if available
    restoreStateFromURL();
    
    // Display animals in grid view (may be filtered by URL params)
    const hasFilters = new URLSearchParams(window.location.search).toString();
    if (!hasFilters) {
        displayAnimalsInGrid(animals);
    }
    
    // Populate comparison select dropdowns
    populateComparisonDropdowns(animals);
    
    // Set up event listeners
    setupEventListeners();
    
    // Add initial CSS for smooth card entry
    const style = document.createElement('style');
    style.textContent = `
        .animal-card {
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.6s ease, transform 0.6s ease;
        }
    `;
    document.head.appendChild(style);
}

function initializeFilters(animals) {
    // Get unique classes and types
    const classes = [...new Set(animals.map(animal => animal.class))];
    const types = [...new Set(animals.map(animal => animal.type))];
    
    // Populate class filter
    const classFilter = document.getElementById("class-filter");
    classes.forEach(className => {
        const option = document.createElement("option");
        option.value = className;
        option.textContent = className;
        classFilter.appendChild(option);
    });
    
    // Populate type filter
    const typeFilter = document.getElementById("type-filter");
    types.forEach(typeName => {
        const option = document.createElement("option");
        option.value = typeName;
        option.textContent = typeName;
        typeFilter.appendChild(option);
    });
}

function displayAnimalsInGrid(animals) {
    const animalGrid = document.getElementById("animal-grid");
    animalGrid.innerHTML = ''; // Clear existing content
    
    // Add a subtle stagger effect for card animations
    animals.forEach((animal, index) => {
        setTimeout(() => {
            const animalCard = createAnimalCard(animal);
            animalGrid.appendChild(animalCard);
            
            // Trigger animation after a small delay
            requestAnimationFrame(() => {
                animalCard.style.opacity = '1';
                animalCard.style.transform = 'translateY(0)';
            });
        }, index * 50); // Stagger by 50ms
    });
    
    // Update results count for accessibility
    announceToScreenReader(`Showing ${animals.length} animals`);
}

function createAnimalCard(animal) {
  const cardDiv = document.createElement("div");
  cardDiv.className = "animal-card";
  cardDiv.dataset.animalName = animal.name;
  cardDiv.setAttribute("role", "gridcell");
  cardDiv.setAttribute("tabindex", "0");
  cardDiv.setAttribute("aria-label", `${animal.name} - Click for details`);

  const isFavorite = favorites.has(animal.name);

  // Add image, badges, and favorite button
  cardDiv.innerHTML = `
    <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-name="${animal.name}" aria-label="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
      <i class="fas fa-star" aria-hidden="true"></i>
    </button>
    <img src="${animal.image}" alt="${animal.name}" class="animal-image" loading="lazy">
    <div class="animal-type-badge" aria-label="Animal type">${animal.type}</div>
    <div class="animal-header">
      <h2>${animal.name}</h2>
      <h3>${animal.scientific_name}</h3>
    </div>
    <div class="animal-content">
      <div class="stat-bar">
        <div class="stat-label">
          <span>Attack</span>
          <span>${animal.attack}</span>
        </div>
        <div class="stat-track" role="progressbar" aria-valuenow="${animal.attack}" aria-valuemin="0" aria-valuemax="100" aria-label="Attack rating">
          <div class="stat-fill attack-fill" style="--stat-width: ${animal.attack}%"></div>
        </div>
      </div>
      <div class="stat-bar">
        <div class="stat-label">
          <span>Defense</span>
          <span>${animal.defense}</span>
        </div>
        <div class="stat-track" role="progressbar" aria-valuenow="${animal.defense}" aria-valuemin="0" aria-valuemax="100" aria-label="Defense rating">
          <div class="stat-fill defense-fill" style="--stat-width: ${animal.defense}%"></div>
        </div>
      </div>
      <div class="stat-bar">
        <div class="stat-label">
          <span>Agility</span>
          <span>${animal.agility}</span>
        </div>
        <div class="stat-track" role="progressbar" aria-valuenow="${animal.agility}" aria-valuemin="0" aria-valuemax="100" aria-label="Agility rating">
          <div class="stat-fill agility-fill" style="--stat-width: ${animal.agility}%"></div>
        </div>
      </div>
      <div class="stat-bar">
        <div class="stat-label">
          <span>Intelligence</span>
          <span>${animal.intelligence}</span>
        </div>
        <div class="stat-track" role="progressbar" aria-valuenow="${animal.intelligence}" aria-valuemin="0" aria-valuemax="100" aria-label="Intelligence rating">
          <div class="stat-fill intelligence-fill" style="--stat-width: ${animal.intelligence}%"></div>
        </div>
      </div>
      <div class="stat-bar">
        <div class="stat-label">
          <span>Stamina</span>
          <span>${animal.stamina}</span>
        </div>
        <div class="stat-track" role="progressbar" aria-valuenow="${animal.stamina}" aria-valuemin="0" aria-valuemax="100" aria-label="Stamina rating">
          <div class="stat-fill stamina-fill" style="--stat-width: ${animal.stamina}%"></div>
        </div>
      </div>
      <div class="animal-special">
        <div class="special-title">Special Abilities:</div>
        <ul>
          ${animal.special_abilities.map(a => `<li>${a}</li>`).join("")}
        </ul>
      </div>
    </div>
  `;
  
  // Animate stat bars after a short delay
  setTimeout(() => {
    const statFills = cardDiv.querySelectorAll('.stat-fill');
    statFills.forEach(fill => {
      fill.classList.add('animated');
    });
  }, 100);

  // Open details on click or keyboard
  const showDetails = () => showAnimalDetails(animal);
  cardDiv.addEventListener("click", showDetails);
  cardDiv.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      showDetails();
    }
  });

  // Favorite button
  const favoriteBtn = cardDiv.querySelector(".favorite-btn");
  favoriteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleFavorite(animal.name, favoriteBtn);
  });

  return cardDiv;
}

function toggleFavorite(name, button) {
  if (favorites.has(name)) {
    favorites.delete(name);
    button.classList.remove("active");
    button.setAttribute("aria-label", "Add to favorites");
  } else {
    favorites.add(name);
    button.classList.add("active");
    button.setAttribute("aria-label", "Remove from favorites");
    button.classList.add("pop");
    setTimeout(() => button.classList.remove("pop"), 300);
  }
  localStorage.setItem("favorites", JSON.stringify([...favorites]));
  if (typeof favoritesOnly !== "undefined" && favoritesOnly) {
    filterAnimals();
  }
}

function toggleFavorite(name, button) {
    if (favorites.has(name)) {
        favorites.delete(name);
        button.classList.remove('active');
        button.setAttribute('aria-label', 'Add to favorites');
    } else {
        favorites.add(name);
        button.classList.add('active');
        button.setAttribute('aria-label', 'Remove from favorites');
        // Trigger a quick animation for visual feedback
        button.classList.add('pop');
        setTimeout(() => button.classList.remove('pop'), 300);
    }
    localStorage.setItem('favorites', JSON.stringify([...favorites]));
    if (favoritesOnly) {
        filterAnimals();
    }
}

function populateComparisonDropdowns(animals) {
    const animal1Select = document.getElementById("animal1-select");
    const animal2Select = document.getElementById("animal2-select");
    
    // Clear existing options except the first one
    animal1Select.innerHTML = '<option value="">Select Animal 1</option>';
    animal2Select.innerHTML = '<option value="">Select Animal 2</option>';
    
    // Add animal options
    animals.forEach(animal => {
        const option1 = document.createElement("option");
        option1.value = animal.name;
        option1.textContent = animal.name;
        animal1Select.appendChild(option1);
        
        const option2 = document.createElement("option");
        option2.value = animal.name;
        option2.textContent = animal.name;
        animal2Select.appendChild(option2);
    });
}

function setupEventListeners() {
    // Search functionality with debouncing
    const searchInput = document.getElementById("search-input");
    let searchTimeout;
    searchInput.addEventListener("input", () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(filterAnimals, 300);
    });
    
    // Filter dropdowns
    document.getElementById("class-filter").addEventListener("change", filterAnimals);
    document.getElementById("type-filter").addEventListener("change", filterAnimals);
    document.getElementById("sort-by").addEventListener("change", filterAnimals);
    const favoritesFilterBtn = document.getElementById("favorites-filter");
    favoritesFilterBtn.addEventListener("click", () => {
        favoritesOnly = !favoritesOnly;
        favoritesFilterBtn.classList.toggle("active", favoritesOnly);
        favoritesFilterBtn.setAttribute("aria-pressed", favoritesOnly);
        filterAnimals();
    });
    
    // View toggle buttons with proper ARIA attributes
    const gridViewBtn = document.getElementById("grid-view-btn");
    const compareViewBtn = document.getElementById("compare-view-btn");
    
    gridViewBtn.addEventListener("click", () => toggleView("grid"));
    compareViewBtn.addEventListener("click", () => toggleView("compare"));
    
    // Keyboard navigation for view toggle
    [gridViewBtn, compareViewBtn].forEach(btn => {
        btn.addEventListener("keydown", (event) => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                event.preventDefault();
                const isGrid = btn.id === "grid-view-btn";
                const targetBtn = isGrid ? compareViewBtn : gridViewBtn;
                targetBtn.focus();
                targetBtn.click();
            }
        });
    });
    
    // Comparison dropdowns
    document.getElementById("animal1-select").addEventListener("change", checkCompareReady);
    document.getElementById("animal2-select").addEventListener("change", checkCompareReady);
    
    // Compare button
    const compareButton = document.getElementById("compare-button");
    compareButton.addEventListener("click", performComparison);
    
    // Modal controls with keyboard support
    const modal = document.getElementById("animal-detail-modal");
    const closeButton = document.querySelector(".close-button");
    
    closeButton.addEventListener("click", closeModal);
    
    // Close modal on Escape key
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modal.style.display === "block") {
            closeModal();
        }
    });
    
    // Close modal on backdrop click
    window.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });
    
    // Force dark mode
    document.body.classList.add("dark-mode");
    
    // Add focus management for better keyboard navigation
    document.addEventListener('focusin', (event) => {
        const focusedElement = event.target;
        if (focusedElement.classList.contains('animal-card')) {
            focusedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
}

function filterAnimals() {
    const searchTerm = document.getElementById("search-input").value.toLowerCase().trim();
    const selectedClass = document.getElementById("class-filter").value;
    const selectedType = document.getElementById("type-filter").value;
    const sortBy = document.getElementById("sort-by").value;
    
    // Use more efficient filtering
    let filteredAnimals = allAnimals.filter(animal => {
        // Early returns for better performance
        if (selectedClass && animal.class !== selectedClass) return false;
        if (selectedType && animal.type !== selectedType) return false;
        if (favoritesOnly && !favorites.has(animal.name)) return false;
        
        // Search in multiple fields
        if (searchTerm) {
            const searchFields = [
                animal.name,
                animal.scientific_name,
                animal.habitat,
                ...animal.special_abilities,
                ...animal.unique_traits
            ].join(' ').toLowerCase();
            
            if (!searchFields.includes(searchTerm)) return false;
        }
        
        return true;
    });
    
    // Optimized sorting
    const sortFunctions = {
        name: (a, b) => a.name.localeCompare(b.name),
        attack: (a, b) => b.attack - a.attack,
        defense: (a, b) => b.defense - a.defense,
        agility: (a, b) => b.agility - a.agility,
        intelligence: (a, b) => b.intelligence - a.intelligence,
        stamina: (a, b) => b.stamina - a.stamina
    };
    
    if (sortFunctions[sortBy]) {
        filteredAnimals.sort(sortFunctions[sortBy]);
    }
    
    // Update displays with performance optimization
    displayAnimalsInGrid(filteredAnimals);
    
    // Update browser URL for better UX (without page reload)
    updateURLParams({ search: searchTerm, class: selectedClass, type: selectedType, sort: sortBy });
}

// Function to update URL parameters for better user experience
function updateURLParams(params) {
    const url = new URL(window.location);
    Object.entries(params).forEach(([key, value]) => {
        if (value) {
            url.searchParams.set(key, value);
        } else {
            url.searchParams.delete(key);
        }
    });
    window.history.replaceState({}, '', url);
}

// Function to restore state from URL parameters
function restoreStateFromURL() {
    const params = new URLSearchParams(window.location.search);
    
    const searchTerm = params.get('search');
    const selectedClass = params.get('class');
    const selectedType = params.get('type');
    const sortBy = params.get('sort');
    
    if (searchTerm) document.getElementById("search-input").value = searchTerm;
    if (selectedClass) document.getElementById("class-filter").value = selectedClass;
    if (selectedType) document.getElementById("type-filter").value = selectedType;
    if (sortBy) document.getElementById("sort-by").value = sortBy;
    
    // Apply filters if any were found in URL
    if (searchTerm || selectedClass || selectedType || sortBy) {
        filterAnimals();
    }
}

function toggleView(viewType) {
    const gridViewBtn = document.getElementById("grid-view-btn");
    const compareViewBtn = document.getElementById("compare-view-btn");
    const gridView = document.getElementById("grid-view");
    const compareView = document.getElementById("compare-view");
    
    if (viewType === "grid") {
        // Update buttons
        gridViewBtn.classList.add("active");
        compareViewBtn.classList.remove("active");
        
        // Update ARIA attributes
        gridViewBtn.setAttribute('aria-selected', 'true');
        compareViewBtn.setAttribute('aria-selected', 'false');
        
        // Update views
        gridView.classList.add("active-view");
        gridView.classList.remove("inactive-view");
        gridView.setAttribute('aria-hidden', 'false');
        
        compareView.classList.add("inactive-view");
        compareView.classList.remove("active-view");
        compareView.setAttribute('aria-hidden', 'true');
        
        // Announce change to screen readers
        announceToScreenReader("Grid view activated");
        
    } else {
        // Update buttons
        gridViewBtn.classList.remove("active");
        compareViewBtn.classList.add("active");
        
        // Update ARIA attributes
        gridViewBtn.setAttribute('aria-selected', 'false');
        compareViewBtn.setAttribute('aria-selected', 'true');
        
        // Update views
        gridView.classList.add("inactive-view");
        gridView.classList.remove("active-view");
        gridView.setAttribute('aria-hidden', 'true');
        
        compareView.classList.add("active-view");
        compareView.classList.remove("inactive-view");
        compareView.setAttribute('aria-hidden', 'false');
        
        // Announce change to screen readers
        announceToScreenReader("Compare view activated");
    }
}

// Helper function to announce changes to screen readers
function announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.style.cssText = 'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0;';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
}

function checkCompareReady() {
    const animal1Name = document.getElementById("animal1-select").value;
    const animal2Name = document.getElementById("animal2-select").value;
    const compareButton = document.getElementById("compare-button");
    
    if (animal1Name && animal2Name) {
        compareButton.style.display = "block";
        // Clear previous comparison
        document.getElementById("comparison-container").innerHTML = `
            <div class="comparison-message">Click "Compare Animals" to see detailed comparison</div>
        `;
    } else {
        compareButton.style.display = "none";
        document.getElementById("comparison-container").innerHTML = `
            <div class="comparison-message">Select two animals to compare</div>
        `;
    }
}

function performComparison() {
    const animal1Name = document.getElementById("animal1-select").value;
    const animal2Name = document.getElementById("animal2-select").value;
    
    if (animal1Name && animal2Name) {
        const animal1 = allAnimals.find(animal => animal.name === animal1Name);
        const animal2 = allAnimals.find(animal => animal.name === animal2Name);
        
        displayComparison(animal1, animal2);
    }
}

function displayComparison(animal1, animal2) {
    const comparisonContainer = document.getElementById("comparison-container");
    
    // Calculate stats
    const total1 = calculateTotalStats(animal1);
    const total2 = calculateTotalStats(animal2);
    
    // Create enhanced comparison without winner announcement
    comparisonContainer.innerHTML = `
        <div class="comparison-card">
            <img src="${animal1.image}" alt="${animal1.name}" class="animal-image">
            <div class="animal-header">
                <h2>${animal1.name}</h2>
                <h3>${animal1.scientific_name}</h3>
            </div>
            <div class="animal-badges">
                <span class="badge">${animal1.type}</span>
            </div>
            <div class="animal-content">
                <div class="quick-stats">
                    <div class="quick-stat"><strong>Size:</strong> ${animal1.size}</div>
                    <div class="quick-stat"><strong>Weight:</strong> ${animal1.weight_kg} kg</div>
                    <div class="quick-stat"><strong>Speed:</strong> ${animal1.speed_mps} m/s</div>
                    <div class="quick-stat"><strong>Lifespan:</strong> ${animal1.lifespan_years} years</div>
                </div>
                <div class="animal-special">
                    <div class="special-title">Special Abilities:</div>
                    <ul>
                        ${animal1.special_abilities.map(ability => `<li>${ability}</li>`).join('')}
                    </ul>
                </div>
                <div class="animal-special">
                    <div class="special-title">Unique Traits:</div>
                    <ul>
                        ${animal1.unique_traits.map(trait => `<li>${trait}</li>`).join('')}
                    </ul>
                </div>
            </div>
        </div>
        
        <div class="stat-comparison">
            <h3 class="comparison-title">Battle Statistics</h3>
            
            <div class="comparison-row">
                <div class="comparison-stat ${animal1.attack > animal2.attack ? 'higher' : animal1.attack === animal2.attack ? 'tie' : ''}">${animal1.attack}</div>
                <div class="comparison-label">
                    <i class="fas fa-fire"></i> ATTACK
                </div>
                <div class="comparison-stat ${animal2.attack > animal1.attack ? 'higher' : animal1.attack === animal2.attack ? 'tie' : ''}">${animal2.attack}</div>
            </div>
            
            <div class="comparison-row">
                <div class="comparison-stat ${animal1.defense > animal2.defense ? 'higher' : animal1.defense === animal2.defense ? 'tie' : ''}">${animal1.defense}</div>
                <div class="comparison-label">
                    <i class="fas fa-shield-alt"></i> DEFENSE
                </div>
                <div class="comparison-stat ${animal2.defense > animal1.defense ? 'higher' : animal1.defense === animal2.defense ? 'tie' : ''}">${animal2.defense}</div>
            </div>
            
            <div class="comparison-row">
                <div class="comparison-stat ${animal1.agility > animal2.agility ? 'higher' : animal1.agility === animal2.agility ? 'tie' : ''}">${animal1.agility}</div>
                <div class="comparison-label">
                    <i class="fas fa-wind"></i> AGILITY
                </div>
                <div class="comparison-stat ${animal2.agility > animal1.agility ? 'higher' : animal1.agility === animal2.agility ? 'tie' : ''}">${animal2.agility}</div>
            </div>
            
            <div class="comparison-row">
                <div class="comparison-stat ${animal1.intelligence > animal2.intelligence ? 'higher' : animal1.intelligence === animal2.intelligence ? 'tie' : ''}">${animal1.intelligence}</div>
                <div class="comparison-label">
                    <i class="fas fa-brain"></i> INTELLIGENCE
                </div>
                <div class="comparison-stat ${animal2.intelligence > animal1.intelligence ? 'higher' : animal1.intelligence === animal2.intelligence ? 'tie' : ''}">${animal2.intelligence}</div>
            </div>
            
            <div class="comparison-row">
                <div class="comparison-stat ${animal1.stamina > animal2.stamina ? 'higher' : animal1.stamina === animal2.stamina ? 'tie' : ''}">${animal1.stamina}</div>
                <div class="comparison-label">
                    <i class="fas fa-heart"></i> STAMINA
                </div>
                <div class="comparison-stat ${animal2.stamina > animal1.stamina ? 'higher' : animal1.stamina === animal2.stamina ? 'tie' : ''}">${animal2.stamina}</div>
            </div>
            
            <div class="comparison-row">
                <div class="comparison-stat ${animal1.special_attack > animal2.special_attack ? 'higher' : animal1.special_attack === animal2.special_attack ? 'tie' : ''}">${animal1.special_attack}</div>
                <div class="comparison-label">
                    <i class="fas fa-bolt"></i> SPECIAL ATTACK
                </div>
                <div class="comparison-stat ${animal2.special_attack > animal1.special_attack ? 'higher' : animal1.special_attack === animal2.special_attack ? 'tie' : ''}">${animal2.special_attack}</div>
            </div>
            
            <div class="comparison-row total-row">
                <div class="comparison-stat ${total1 > total2 ? 'higher' : total1 === total2 ? 'tie' : ''}">${total1}</div>
                <div class="comparison-label">
                    <i class="fas fa-star"></i> TOTAL
                </div>
                <div class="comparison-stat ${total2 > total1 ? 'higher' : total1 === total2 ? 'tie' : ''}">${total2}</div>
            </div>
        </div>
        
        <div class="comparison-card">
            <img src="${animal2.image}" alt="${animal2.name}" class="animal-image">
            <div class="animal-header">
                <h2>${animal2.name}</h2>
                <h3>${animal2.scientific_name}</h3>
            </div>
            <div class="animal-badges">
                <span class="badge">${animal2.type}</span>
            </div>
            <div class="animal-content">
                <div class="quick-stats">
                    <div class="quick-stat"><strong>Size:</strong> ${animal2.size}</div>
                    <div class="quick-stat"><strong>Weight:</strong> ${animal2.weight_kg} kg</div>
                    <div class="quick-stat"><strong>Speed:</strong> ${animal2.speed_mps} m/s</div>
                    <div class="quick-stat"><strong>Lifespan:</strong> ${animal2.lifespan_years} years</div>
                </div>
                <div class="animal-special">
                    <div class="special-title">Special Abilities:</div>
                    <ul>
                        ${animal2.special_abilities.map(ability => `<li>${ability}</li>`).join('')}
                    </ul>
                </div>
                <div class="animal-special">
                    <div class="special-title">Unique Traits:</div>
                    <ul>
                        ${animal2.unique_traits.map(trait => `<li>${trait}</li>`).join('')}
                    </ul>
                </div>
            </div>
        </div>
    `;
}

function calculateTotalStats(animal) {
    return animal.attack + animal.defense + animal.agility + 
           animal.intelligence + animal.stamina + animal.special_attack;
}

function generateAnimalDescription(animal) {
    // Generate a detailed description based on animal characteristics
    const descriptions = {
        "Cheetah": "The cheetah is renowned as the fastest land animal, capable of reaching speeds up to 70 mph in short bursts. Their slender, aerodynamic build and non-retractable claws provide exceptional traction during high-speed chases. Found primarily in African grasslands and savannas, cheetahs hunt during the day using their incredible eyesight to spot prey from great distances.",
        "Peregrine Falcon": "The peregrine falcon holds the title of fastest animal on Earth, achieving speeds over 240 mph during its characteristic hunting dive, called a stoop. These remarkable birds of prey have adapted to various habitats worldwide, from mountain cliffs to urban skyscrapers. Their exceptional vision and aerial agility make them supreme hunters.",
        "Saltwater Crocodile": "The saltwater crocodile is the largest living reptile, with males reaching up to 23 feet in length. These apex predators possess one of the strongest bite forces in the animal kingdom. Found in brackish and saltwater habitats across Southeast Asia and Northern Australia, they are patient ambush predators capable of taking down large prey.",
        "African Elephant": "African elephants are the world's largest land animals, with remarkable intelligence and complex social structures. Their trunks contain over 40,000 muscles, providing incredible dexterity. These gentle giants play a crucial role in their ecosystems as keystone species, shaping the landscape and creating water holes that benefit countless other animals.",
        "Great White Shark": "The great white shark is one of the ocean's most formidable predators, combining power, speed, and sophisticated hunting abilities. They can detect a single drop of blood in 25 gallons of water and sense electrical fields produced by other animals. Despite their fearsome reputation, they are vulnerable to overfishing and environmental changes.",
        "Honey Badger": "Despite their small size, honey badgers are renowned for their fearlessness and tenacity. They have thick, loose skin that provides protection against bites and stings, and they're one of the few animals that actively hunt venomous snakes. Their intelligence and adaptability make them successful in various African and Asian habitats.",
        "Grizzly Bear": "Grizzly bears are powerful omnivores with an incredible sense of smell, able to detect food from miles away. They can run up to 35 mph despite their massive size and are excellent swimmers. These solitary animals enter hibernation during winter months, during which pregnant females give birth to cubs.",
        "Siberian Tiger": "The Siberian tiger is the largest cat species, adapted to survive in harsh, snowy environments. They are solitary hunters with exceptional strength, capable of taking down prey much larger than themselves. With only a few hundred remaining in the wild, they are critically endangered due to habitat loss and poaching.",
        "Gray Wolf": "Gray wolves are highly intelligent pack animals with complex social hierarchies. Their cooperation in hunting allows them to take down prey much larger than any individual wolf. Wolves communicate through howls, body language, and scent marking, maintaining territories that can span hundreds of square miles.",
        "Mountain Gorilla": "Mountain gorillas are gentle giants despite their immense strength, living in close-knit family groups led by a silverback male. They share 98% of their DNA with humans and display remarkable intelligence and emotional depth. Found only in the mountains of central Africa, they are critically endangered with fewer than 1,000 individuals remaining.",
        "Polar Bear": "Polar bears are the largest land carnivores, perfectly adapted to Arctic life with thick fur and a layer of blubber for insulation. They are excellent swimmers, capable of swimming for days at a time in search of food. Climate change poses a severe threat to their survival as sea ice, crucial for hunting seals, continues to diminish.",
        "Komodo Dragon": "The Komodo dragon is the world's largest living lizard, reaching lengths of 10 feet. Their saliva contains dangerous bacteria and venom that weakens prey. These ancient reptiles have excellent scent detection, able to locate carrion from miles away using their forked tongues.",
        "American Bison": "American bison are North America's largest land mammal and a symbol of the Great Plains. Once numbering in the tens of millions, they were hunted nearly to extinction. These powerful grazers play a vital role in prairie ecosystems, and conservation efforts have helped their populations recover.",
        "Hippopotamus": "Hippos are among Africa's most dangerous animals, responsible for more human fatalities than any other large animal on the continent. Despite spending most of their time in water, they can run surprisingly fast on land. Their massive jaws and tusks make them formidable when threatened.",
        "King Cobra": "The king cobra is the world's longest venomous snake, reaching lengths up to 18 feet. Unlike other cobras, they primarily hunt other snakes. Female king cobras are the only snakes known to build nests for their eggs, which they guard fiercely until hatching.",
        "Red Kangaroo": "Red kangaroos are the largest marsupials, adapted for life in Australia's arid interior. Their powerful hind legs allow them to leap up to 25 feet in a single bound and reach speeds of 35 mph. Males engage in boxing matches to establish dominance and mating rights.",
        "Wolverine": "Wolverines are incredibly strong for their size, with powerful jaws capable of crushing frozen meat and bones. Their fierce reputation is well-earned, as they will defend their territory and food against animals much larger than themselves, including bears. They have remarkable endurance, traveling up to 15 miles per day in search of food.",
        "Orca": "Orcas, or killer whales, are actually the largest members of the dolphin family and one of the ocean's apex predators. They live in sophisticated social groups with unique dialects and hunting techniques passed down through generations. Different populations specialize in hunting specific prey, from fish to seals to even great white sharks.",
        "Harpy Eagle": "The harpy eagle is one of the world's most powerful birds of prey, capable of snatching monkeys and sloths from the rainforest canopy. Their talons are larger than a grizzly bear's claws, and their grip strength is powerful enough to crush bones. These magnificent birds are indicators of healthy rainforest ecosystems.",
        "Poison Dart Frog": "Despite their tiny size, poison dart frogs pack some of the most potent toxins in nature. Indigenous peoples used their skin secretions to poison blow darts for hunting. Their brilliant colors serve as a warning to predators. Interestingly, captive-bred frogs raised on a different diet are not poisonous.",
        "Fennec Fox": "The fennec fox is the smallest fox species, perfectly adapted to desert life with oversized ears that help dissipate heat and locate prey underground. They can survive without free water, getting moisture from their food. Their thick fur protects them from the cold desert nights and hot days.",
        "Snow Leopard": "Snow leopards are elusive mountain predators, rarely seen in their remote Himalayan habitats. Their long, thick tail helps with balance on steep terrain and serves as a warm wrap in freezing temperatures. They can leap up to 50 feet in a single bound, making them extraordinary hunters in mountainous regions.",
        "Electric Eel": "Despite their name, electric eels are actually a type of knifefish. They can generate electrical discharges up to 600 volts, which they use for hunting, navigation, and self-defense. They must surface to breathe air every 10 minutes, and this ability allows them to survive in oxygen-poor waters.",
        "Giant Panda": "Giant pandas are beloved symbols of conservation, spending up to 14 hours a day eating bamboo to meet their energy needs. Despite belonging to the order Carnivora, their diet is 99% bamboo. They have a 'pseudo-thumb'—an enlarged wrist bone that helps them grip bamboo stalks. Successful breeding programs have helped them recover from the brink of extinction.",
        "Narwhal": "Narwhals are often called the 'unicorns of the sea' due to their distinctive long tusk, which is actually an elongated tooth that can grow up to 10 feet long. These Arctic whales use echolocation to navigate through ice-covered waters. Their tusks contain millions of nerve endings and may help them detect changes in their environment.",
        "Mantis Shrimp": "Mantis shrimp possess the most complex eyes in the animal kingdom, capable of seeing polarized and ultraviolet light. Their specialized club-like appendages can strike with the force of a bullet, generating temperatures nearly as hot as the sun's surface at the point of impact. They're one of nature's most extraordinary predators.",
        "Great Horned Owl": "Great horned owls are powerful nocturnal hunters with exceptional hearing and nearly silent flight. Their distinctive 'horns' are actually feather tufts. They have a varied diet and are one of the few animals that regularly prey on skunks. Their grip strength is powerful enough to crush the spine of large prey.",
        "Vampire Bat": "Vampire bats are the only mammals that feed exclusively on blood. They have heat sensors on their noses to detect blood vessels close to the skin. Contrary to popular belief, they rarely attack humans and usually feed on livestock. They display remarkable social behavior, sharing food with roostmates who haven't fed.",
        "Bald Eagle": "The bald eagle is an iconic symbol of the United States, making a remarkable recovery from near-extinction due to DDT poisoning. These powerful raptors can spot prey from over a mile away and dive at speeds up to 100 mph. They mate for life and return to the same nest year after year, continuously adding to it.",
        "Box Jellyfish": "Box jellyfish are among the most venomous creatures on Earth, with tentacles containing millions of microscopic stinging cells. Despite lacking a brain, they have 24 eyes and can actively hunt prey. Their venom can cause death in humans within minutes, making them one of the ocean's most dangerous inhabitants."
    };
    
    return descriptions[animal.name] || `The ${animal.name} (${animal.scientific_name}) is a fascinating ${animal.type.toLowerCase()} found in ${animal.habitat}. Weighing approximately ${animal.weight_kg} kg and capable of speeds up to ${animal.speed_mps} m/s, this remarkable creature has adapted to thrive in its environment. With an average lifespan of ${animal.lifespan_years} years, the ${animal.name} exhibits unique traits including ${animal.unique_traits.join(' and ')}. These characteristics make it a remarkable example of nature's diversity.`;
}

function showAnimalDetails(animal) {
    const modal = document.getElementById("animal-detail-modal");
    const detailContent = document.getElementById("animal-detail-content");
    
    // Store the currently focused element to restore focus later
    const previouslyFocused = document.activeElement;
    
    detailContent.innerHTML = `
        <div class="animal-detail">
            <div class="animal-detail-left">
                <img src="${animal.image}" alt="${animal.name} icon" class="animal-detail-image">
                <div class="detail-section">
                    <h3>Quick Facts</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <strong>Habitat</strong>
                            ${animal.habitat}
                        </div>
                        <div class="detail-item">
                            <strong>Size</strong>
                            ${animal.size}
                        </div>
                        <div class="detail-item">
                            <strong>Weight</strong>
                            ${animal.weight_kg} kg
                        </div>
                        <div class="detail-item">
                            <strong>Speed</strong>
                            ${animal.speed_mps} m/s (${Math.round(animal.speed_mps * 3.6)} km/h)
                        </div>
                        <div class="detail-item">
                            <strong>Lifespan</strong>
                            ${animal.lifespan_years} years
                        </div>
                        <div class="detail-item">
                            <strong>Diet</strong>
                            ${animal.diet.join(", ")}
                        </div>
                        <div class="detail-item">
                            <strong>Nocturnal</strong>
                            ${animal.isNocturnal ? "Yes" : "No"}
                        </div>
                        <div class="detail-item">
                            <strong>Social</strong>
                            ${animal.isSocial ? "Yes" : "No"}
                        </div>
                    </div>
                </div>
            </div>
            <div class="animal-detail-right">
                <h1 class="detail-title" id="modal-title">${animal.name}</h1>
                <h2 class="detail-subtitle">${animal.scientific_name}</h2>
                
                <div class="detail-section">
                    <h3>Battle Stats</h3>
                    <div class="stat-bar">
                        <div class="stat-label">
                            <span>Attack</span>
                            <span>${animal.attack}</span>
                        </div>
                        <div class="stat-track" role="progressbar" aria-valuenow="${animal.attack}" aria-valuemin="0" aria-valuemax="100" aria-label="Attack rating">
                            <div class="stat-fill attack-fill" style="--stat-width: ${animal.attack}%"></div>
                        </div>
                    </div>
                    <div class="stat-bar">
                        <div class="stat-label">
                            <span>Defense</span>
                            <span>${animal.defense}</span>
                        </div>
                        <div class="stat-track" role="progressbar" aria-valuenow="${animal.defense}" aria-valuemin="0" aria-valuemax="100" aria-label="Defense rating">
                            <div class="stat-fill defense-fill" style="--stat-width: ${animal.defense}%"></div>
                        </div>
                    </div>
                    <div class="stat-bar">
                        <div class="stat-label">
                            <span>Agility</span>
                            <span>${animal.agility}</span>
                        </div>
                        <div class="stat-track" role="progressbar" aria-valuenow="${animal.agility}" aria-valuemin="0" aria-valuemax="100" aria-label="Agility rating">
                            <div class="stat-fill agility-fill" style="--stat-width: ${animal.agility}%"></div>
                        </div>
                    </div>
                    <div class="stat-bar">
                        <div class="stat-label">
                            <span>Intelligence</span>
                            <span>${animal.intelligence}</span>
                        </div>
                        <div class="stat-track" role="progressbar" aria-valuenow="${animal.intelligence}" aria-valuemin="0" aria-valuemax="100" aria-label="Intelligence rating">
                            <div class="stat-fill intelligence-fill" style="--stat-width: ${animal.intelligence}%"></div>
                        </div>
                    </div>
                    <div class="stat-bar">
                        <div class="stat-label">
                            <span>Stamina</span>
                            <span>${animal.stamina}</span>
                        </div>
                        <div class="stat-track" role="progressbar" aria-valuenow="${animal.stamina}" aria-valuemin="0" aria-valuemax="100" aria-label="Stamina rating">
                            <div class="stat-fill stamina-fill" style="--stat-width: ${animal.stamina}%"></div>
                        </div>
                    </div>
                    <div class="stat-bar">
                        <div class="stat-label">
                            <span>Special Attack</span>
                            <span>${animal.special_attack}</span>
                        </div>
                        <div class="stat-track" role="progressbar" aria-valuenow="${animal.special_attack}" aria-valuemin="0" aria-valuemax="100" aria-label="Special attack rating">
                            <div class="stat-fill attack-fill" style="--stat-width: ${animal.special_attack}%"></div>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h3>Type</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <strong>Classification</strong>
                            ${animal.type}
                        </div>
                    </div>
                </div>
                
                <div class="detail-description-section">
                    <button class="description-toggle" onclick="this.parentElement.classList.toggle('expanded')">
                        <i class="fas fa-book"></i> View Description
                        <i class="fas fa-chevron-down toggle-icon"></i>
                    </button>
                    <div class="description-content">
                        <p>${generateAnimalDescription(animal)}</p>
                    </div>
                </div>
                
                <div class="detail-special">
                    <div class="special-title">Special Abilities:</div>
                    <ul>
                        ${animal.special_abilities.map(ability => `<li>${ability}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="detail-special">
                    <div class="special-title">Unique Traits:</div>
                    <ul>
                        ${animal.unique_traits.map(trait => `<li>${trait}</li>`).join('')}
                    </ul>
                </div>
            </div>
        </div>
    `;
    
    // Show modal
    modal.style.display = "block";
    modal.setAttribute('aria-hidden', 'false');
    
    // Animate stat bars after a short delay
    setTimeout(() => {
        const statFills = modal.querySelectorAll('.stat-fill');
        statFills.forEach(fill => {
            fill.classList.add('animated');
        });
    }, 100);
    
    // Focus management for accessibility
    const closeButton = modal.querySelector('.close-button');
    closeButton.focus();
    
    // Store reference to restore focus
    modal.previouslyFocused = previouslyFocused;
    
    // Trap focus within modal
    trapFocus(modal);
}

function closeModal() {
    const modal = document.getElementById("animal-detail-modal");
    modal.style.display = "none";
    modal.setAttribute('aria-hidden', 'true');
    
    // Restore focus to previously focused element
    if (modal.previouslyFocused) {
        modal.previouslyFocused.focus();
    }
}

// Function to trap focus within modal for accessibility
function trapFocus(element) {
    const focusableElements = element.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    element.addEventListener('keydown', (event) => {
        if (event.key === 'Tab') {
            if (event.shiftKey) {
                if (document.activeElement === firstElement) {
                    event.preventDefault();
                    lastElement.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    event.preventDefault();
                    firstElement.focus();
                }
            }
        }
    });
}

