/**
 * Sync MongoDB data to data.js
 * 
 * This script exports ALL animal data from MongoDB to data.js
 * Run this whenever you make changes to animal data in MongoDB
 * 
 * Usage: node scripts/sync_data_js.js
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Use the full Animal model schema
const Animal = require('../lib/models/Animal');

async function syncDataJs() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!\n');
    
    // Fetch ALL fields from MongoDB
    const animals = await Animal.find({}).lean();
    console.log(`Found ${animals.length} animals in MongoDB\n`);
    
    // Format animals for data.js - include ALL relevant fields
    const formattedAnimals = animals.map(animal => ({
        // Identity
        id: animal._id?.toString(),
        name: animal.name,
        scientific_name: animal.scientific_name || 'Unknown Species',
        description: animal.description || '',
        image: animal.image,
        
        // Classification
        type: animal.type || 'Mammal',
        class: animal.class || 'Fighter',
        habitat: animal.habitat || 'Varied',
        size: animal.size || 'Medium',
        
        // Physical Attributes
        weight_kg: animal.weight_kg || 50,
        height_cm: animal.height_cm || 50,
        length_cm: animal.length_cm || 100,
        speed_mps: animal.speed_mps || 10,
        lifespan_years: animal.lifespan_years || 15,
        bite_force_psi: animal.bite_force_psi || 0,
        size_score: animal.size_score || 0,
        
        // Behavior
        isNocturnal: animal.isNocturnal || false,
        isSocial: animal.isSocial !== false,
        diet: animal.diet || ['Varied'],
        
        // Main Stats (0-100)
        attack: animal.attack || 50,
        defense: animal.defense || 50,
        agility: animal.agility || 50,
        stamina: animal.stamina || 50,
        intelligence: animal.intelligence || 50,
        special: animal.special_attack || animal.special || 50,
        
        // Substats
        substats: animal.substats || {},
        
        // Battle Profile
        battle_profile: animal.battle_profile || {},
        
        // Traits & Abilities
        unique_traits: animal.unique_traits || [],
        special_abilities: animal.special_abilities || []
    }));
    
    // Sort by name
    formattedAnimals.sort((a, b) => a.name.localeCompare(b.name));
    
    // Create data.js content
    const dataJsContent = `// Animal data - synced from MongoDB on ${new Date().toISOString()}
// This file is auto-generated. Do not edit manually.
// To update, run: node scripts/sync_data_js.js
// Total animals: ${formattedAnimals.length}

window.animalData = ${JSON.stringify(formattedAnimals, null, 2)};
`;
    
    const dataJsPath = path.join(__dirname, '..', 'data.js');
    fs.writeFileSync(dataJsPath, dataJsContent);
    
    console.log('✓ data.js has been synced with ALL fields!');
    console.log(`  Total animals: ${formattedAnimals.length}`);
    
    // Show some sample data
    const sample = formattedAnimals[0];
    console.log('\nSample animal fields:');
    console.log(`  Name: ${sample.name}`);
    console.log(`  Scientific: ${sample.scientific_name}`);
    console.log(`  Type: ${sample.type}`);
    console.log(`  Weight: ${sample.weight_kg} kg`);
    console.log(`  Speed: ${sample.speed_mps} m/s`);
    console.log(`  Traits: ${sample.unique_traits?.length || 0}`);
    console.log(`  Abilities: ${sample.special_abilities?.length || 0}`);
    
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    console.log('\n✓ Done! data.js now has complete animal data.');
}

syncDataJs().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
