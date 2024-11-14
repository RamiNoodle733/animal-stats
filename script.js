document.addEventListener("DOMContentLoaded", () => {
    fetch('animal_stats.json')
        .then(response => {
            console.log("Fetching animal stats...");  // For debugging
            if (!response.ok) {
                throw new Error("Failed to load animal stats");
            }
            return response.json();
        })
        .then(data => {
            console.log("Animal data:", data);  // Check if data is loaded correctly
            displayAnimals(data);
        })
        .catch(error => console.error("Error loading animal stats:", error));
});

function displayAnimals(animals) {
    const animalList = document.getElementById("animal-list");

    animals.forEach(animal => {
        const animalCard = document.createElement("div");
        animalCard.className = "animal-card";

        animalCard.innerHTML = `
            <h2>${animal.name} <span>(${animal.scientific_name})</span></h2>
            <p><strong>Habitat:</strong> ${animal.habitat}</p>
            <div class="animal-stats">
                <p><strong>Size:</strong> ${animal.size}</p>
                <p><strong>Weight (kg):</strong> ${animal.weight_kg}</p>
                <p><strong>Speed (m/s):</strong> ${animal.speed_mps}</p>
                <p><strong>Lifespan (years):</strong> ${animal.lifespan_years}</p>
                <p><strong>Nocturnal:</strong> ${animal.isNocturnal ? "Yes" : "No"}</p>
                <p><strong>Social:</strong> ${animal.isSocial ? "Yes" : "No"}</p>
                <p><strong>Diet:</strong> ${animal.diet.join(", ")}</p>
                <p><strong>Attack:</strong> ${animal.attack}</p>
                <p><strong>Defense:</strong> ${animal.defense}</p>
                <p><strong>Agility:</strong> ${animal.agility}</p>
                <p><strong>Intelligence:</strong> ${animal.intelligence}</p>
                <p><strong>Unique Traits:</strong> ${animal.unique_traits.join(", ")}</p>
            </div>
        `;

        animalList.appendChild(animalCard);
    });
}
