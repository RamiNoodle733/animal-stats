let allAnimals = [];

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
    
    // Display animals in grid view
    displayAnimalsInGrid(animals);
    
    // Populate comparison select dropdowns
    populateComparisonDropdowns(animals);
    
    // Set up event listeners
    setupEventListeners();
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
    
    animals.forEach(animal => {
        const animalCard = createAnimalCard(animal);
        animalGrid.appendChild(animalCard);
    });
}

function createAnimalCard(animal) {
    const cardDiv = document.createElement("div");
    cardDiv.className = "animal-card";
    cardDiv.dataset.animalName = animal.name;
    
    // Add image and badges
    cardDiv.innerHTML = `
        <img src="${animal.image}" alt="${animal.name}" class="animal-image">
        <div class="animal-class-badge">${animal.class}</div>
        <div class="animal-type-badge">${animal.type}</div>
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
                <div class="stat-track">
                    <div class="stat-fill attack-fill" style="width: ${animal.attack}%"></div>
                </div>
            </div>
            <div class="stat-bar">
                <div class="stat-label">
                    <span>Defense</span>
                    <span>${animal.defense}</span>
                </div>
                <div class="stat-track">
                    <div class="stat-fill defense-fill" style="width: ${animal.defense}%"></div>
                </div>
            </div>
            <div class="stat-bar">
                <div class="stat-label">
                    <span>Agility</span>
                    <span>${animal.agility}</span>
                </div>
                <div class="stat-track">
                    <div class="stat-fill agility-fill" style="width: ${animal.agility}%"></div>
                </div>
            </div>
            <div class="stat-bar">
                <div class="stat-label">
                    <span>Intelligence</span>
                    <span>${animal.intelligence}</span>
                </div>
                <div class="stat-track">
                    <div class="stat-fill intelligence-fill" style="width: ${animal.intelligence}%"></div>
                </div>
            </div>
            <div class="stat-bar">
                <div class="stat-label">
                    <span>Stamina</span>
                    <span>${animal.stamina}</span>
                </div>
                <div class="stat-track">
                    <div class="stat-fill stamina-fill" style="width: ${animal.stamina}%"></div>
                </div>
            </div>
            <div class="animal-special">
                <div class="special-title">Special Abilities:</div>
                <ul>
                    ${animal.special_abilities.map(ability => `<li>${ability}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;
    
    // Add click event to show details
    cardDiv.addEventListener('click', () => showAnimalDetails(animal));
    
    return cardDiv;
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
    // Search functionality
    const searchInput = document.getElementById("search-input");
    searchInput.addEventListener("input", filterAnimals);
    
    // Filter dropdowns
    document.getElementById("class-filter").addEventListener("change", filterAnimals);
    document.getElementById("type-filter").addEventListener("change", filterAnimals);
    document.getElementById("sort-by").addEventListener("change", filterAnimals);
    
    // View toggle buttons
    document.getElementById("grid-view-btn").addEventListener("click", () => toggleView("grid"));
    document.getElementById("compare-view-btn").addEventListener("click", () => toggleView("compare"));
    
    // Comparison dropdowns
    document.getElementById("animal1-select").addEventListener("change", updateComparison);
    document.getElementById("animal2-select").addEventListener("change", updateComparison);
    
    // Close modal
    document.querySelector(".close-button").addEventListener("click", closeModal);
    window.addEventListener("click", (event) => {
        const modal = document.getElementById("animal-detail-modal");
        if (event.target === modal) {
            closeModal();
        }
    });
    
    // Theme toggle
    const themeSwitch = document.getElementById("theme-switch");
    themeSwitch.addEventListener("change", () => {
        document.body.classList.toggle("dark-mode");
        localStorage.setItem("darkMode", themeSwitch.checked);
    });
    
    // Check for saved theme preference
    if (localStorage.getItem("darkMode") === "true") {
        themeSwitch.checked = true;
        document.body.classList.add("dark-mode");
    }
}

function filterAnimals() {
    const searchTerm = document.getElementById("search-input").value.toLowerCase();
    const selectedClass = document.getElementById("class-filter").value;
    const selectedType = document.getElementById("type-filter").value;
    const sortBy = document.getElementById("sort-by").value;
    
    let filteredAnimals = allAnimals.filter(animal => {
        // Filter by search term
        const matchesSearch = animal.name.toLowerCase().includes(searchTerm) || 
                             animal.scientific_name.toLowerCase().includes(searchTerm);
        
        // Filter by class
        const matchesClass = selectedClass === "" || animal.class === selectedClass;
        
        // Filter by type
        const matchesType = selectedType === "" || animal.type === selectedType;
        
        return matchesSearch && matchesClass && matchesType;
    });
    
    // Sort animals
    filteredAnimals.sort((a, b) => {
        if (sortBy === "name") {
            return a.name.localeCompare(b.name);
        } else {
            return b[sortBy] - a[sortBy]; // For numeric sorting (highest first)
        }
    });
    
    // Update displays
    displayAnimalsInGrid(filteredAnimals);
}

function toggleView(viewType) {
    const gridViewBtn = document.getElementById("grid-view-btn");
    const compareViewBtn = document.getElementById("compare-view-btn");
    const gridView = document.getElementById("grid-view");
    const compareView = document.getElementById("compare-view");
    
    if (viewType === "grid") {
        gridViewBtn.classList.add("active");
        compareViewBtn.classList.remove("active");
        gridView.classList.add("active-view");
        gridView.classList.remove("inactive-view");
        compareView.classList.add("inactive-view");
        compareView.classList.remove("active-view");
    } else {
        gridViewBtn.classList.remove("active");
        compareViewBtn.classList.add("active");
        gridView.classList.add("inactive-view");
        gridView.classList.remove("active-view");
        compareView.classList.add("active-view");
        compareView.classList.remove("inactive-view");
    }
}

function updateComparison() {
    const animal1Name = document.getElementById("animal1-select").value;
    const animal2Name = document.getElementById("animal2-select").value;
    
    if (animal1Name && animal2Name) {
        const animal1 = allAnimals.find(animal => animal.name === animal1Name);
        const animal2 = allAnimals.find(animal => animal.name === animal2Name);
        
        displayComparison(animal1, animal2);
    } else {
        // Clear comparison area if one or both selections are empty
        document.getElementById("comparison-container").innerHTML = `
            <div class="comparison-message">Select two animals to compare</div>
        `;
    }
}

function displayComparison(animal1, animal2) {
    const comparisonContainer = document.getElementById("comparison-container");
    
    // Create comparison stats
    comparisonContainer.innerHTML = `
        <div class="comparison-card">
            <img src="${animal1.image}" alt="${animal1.name}" class="animal-image">
            <div class="animal-header">
                <h2>${animal1.name}</h2>
                <h3>${animal1.scientific_name}</h3>
            </div>
            <div class="animal-content">
                <div class="animal-special">
                    <div class="special-title">Special Abilities:</div>
                    <ul>
                        ${animal1.special_abilities.map(ability => `<li>${ability}</li>`).join('')}
                    </ul>
                </div>
            </div>
        </div>
        
        <div class="stat-comparison">
            <h3 class="comparison-title">Statistics Comparison</h3>
            
            <div class="comparison-row">
                <div class="comparison-stat ${animal1.attack > animal2.attack ? 'winner' : ''}">${animal1.attack}</div>
                <div class="comparison-label">ATTACK</div>
                <div class="comparison-stat ${animal2.attack > animal1.attack ? 'winner' : ''}">${animal2.attack}</div>
            </div>
            
            <div class="comparison-row">
                <div class="comparison-stat ${animal1.defense > animal2.defense ? 'winner' : ''}">${animal1.defense}</div>
                <div class="comparison-label">DEFENSE</div>
                <div class="comparison-stat ${animal2.defense > animal1.defense ? 'winner' : ''}">${animal2.defense}</div>
            </div>
            
            <div class="comparison-row">
                <div class="comparison-stat ${animal1.agility > animal2.agility ? 'winner' : ''}">${animal1.agility}</div>
                <div class="comparison-label">AGILITY</div>
                <div class="comparison-stat ${animal2.agility > animal1.agility ? 'winner' : ''}">${animal2.agility}</div>
            </div>
            
            <div class="comparison-row">
                <div class="comparison-stat ${animal1.intelligence > animal2.intelligence ? 'winner' : ''}">${animal1.intelligence}</div>
                <div class="comparison-label">INTELLIGENCE</div>
                <div class="comparison-stat ${animal2.intelligence > animal1.intelligence ? 'winner' : ''}">${animal2.intelligence}</div>
            </div>
            
            <div class="comparison-row">
                <div class="comparison-stat ${animal1.stamina > animal2.stamina ? 'winner' : ''}">${animal1.stamina}</div>
                <div class="comparison-label">STAMINA</div>
                <div class="comparison-stat ${animal2.stamina > animal1.stamina ? 'winner' : ''}">${animal2.stamina}</div>
            </div>
            
            <div class="comparison-row">
                <div class="comparison-stat ${animal1.special_attack > animal2.special_attack ? 'winner' : ''}">${animal1.special_attack}</div>
                <div class="comparison-label">SPECIAL ATTACK</div>
                <div class="comparison-stat ${animal2.special_attack > animal1.special_attack ? 'winner' : ''}">${animal2.special_attack}</div>
            </div>
            
            <div class="comparison-row">
                <div class="comparison-stat ${calculateTotalStats(animal1) > calculateTotalStats(animal2) ? 'winner' : ''}">${calculateTotalStats(animal1)}</div>
                <div class="comparison-label">TOTAL</div>
                <div class="comparison-stat ${calculateTotalStats(animal2) > calculateTotalStats(animal1) ? 'winner' : ''}">${calculateTotalStats(animal2)}</div>
            </div>
        </div>
        
        <div class="comparison-card">
            <img src="${animal2.image}" alt="${animal2.name}" class="animal-image">
            <div class="animal-header">
                <h2>${animal2.name}</h2>
                <h3>${animal2.scientific_name}</h3>
            </div>
            <div class="animal-content">
                <div class="animal-special">
                    <div class="special-title">Special Abilities:</div>
                    <ul>
                        ${animal2.special_abilities.map(ability => `<li>${ability}</li>`).join('')}
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

function showAnimalDetails(animal) {
    const modal = document.getElementById("animal-detail-modal");
    const detailContent = document.getElementById("animal-detail-content");
    
    detailContent.innerHTML = `
        <div class="animal-detail">
            <div class="animal-detail-left">
                <img src="${animal.image}" alt="${animal.name}" class="animal-detail-image">
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
                            ${animal.speed_mps} m/s
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
                <h1 class="detail-title">${animal.name}</h1>
                <h2 class="detail-subtitle">${animal.scientific_name}</h2>
                
                <div class="detail-section">
                    <h3>Battle Stats</h3>
                    <div class="stat-bar">
                        <div class="stat-label">
                            <span>Attack</span>
                            <span>${animal.attack}</span>
                        </div>
                        <div class="stat-track">
                            <div class="stat-fill attack-fill" style="width: ${animal.attack}%"></div>
                        </div>
                    </div>
                    <div class="stat-bar">
                        <div class="stat-label">
                            <span>Defense</span>
                            <span>${animal.defense}</span>
                        </div>
                        <div class="stat-track">
                            <div class="stat-fill defense-fill" style="width: ${animal.defense}%"></div>
                        </div>
                    </div>
                    <div class="stat-bar">
                        <div class="stat-label">
                            <span>Agility</span>
                            <span>${animal.agility}</span>
                        </div>
                        <div class="stat-track">
                            <div class="stat-fill agility-fill" style="width: ${animal.agility}%"></div>
                        </div>
                    </div>
                    <div class="stat-bar">
                        <div class="stat-label">
                            <span>Intelligence</span>
                            <span>${animal.intelligence}</span>
                        </div>
                        <div class="stat-track">
                            <div class="stat-fill intelligence-fill" style="width: ${animal.intelligence}%"></div>
                        </div>
                    </div>
                    <div class="stat-bar">
                        <div class="stat-label">
                            <span>Stamina</span>
                            <span>${animal.stamina}</span>
                        </div>
                        <div class="stat-track">
                            <div class="stat-fill stamina-fill" style="width: ${animal.stamina}%"></div>
                        </div>
                    </div>
                    <div class="stat-bar">
                        <div class="stat-label">
                            <span>Special Attack</span>
                            <span>${animal.special_attack}</span>
                        </div>
                        <div class="stat-track">
                            <div class="stat-fill attack-fill" style="width: ${animal.special_attack}%"></div>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h3>Class & Type</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <strong>Class</strong>
                            ${animal.class}
                        </div>
                        <div class="detail-item">
                            <strong>Type</strong>
                            ${animal.type}
                        </div>
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
    
    modal.style.display = "block";
}

function closeModal() {
    document.getElementById("animal-detail-modal").style.display = "none";
}
