require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const animalSchema = new mongoose.Schema({
    name: String,
    image: String,
    attack: Number,
    defense: Number,
    agility: Number,
    stamina: Number,
    intelligence: Number,
    special: Number,
    description: String
}, { collection: 'animals', strict: false });

const Animal = mongoose.model('Animal', animalSchema);

async function syncDataJs() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!\n');
    
    const animals = await Animal.find({}).lean();
    console.log(`Found ${animals.length} animals in MongoDB\n`);
    
    // Format animals for data.js
    const formattedAnimals = animals.map(animal => ({
        name: animal.name,
        image: animal.image,
        attack: animal.attack || 0,
        defense: animal.defense || 0,
        agility: animal.agility || 0,
        stamina: animal.stamina || 0,
        intelligence: animal.intelligence || 0,
        special: animal.special || 0,
        description: animal.description || ''
    }));
    
    // Sort by name
    formattedAnimals.sort((a, b) => a.name.localeCompare(b.name));
    
    // Create data.js content - use window.animalData for frontend compatibility
    const dataJsContent = `// Animal data - synced from MongoDB on ${new Date().toISOString()}
window.animalData = ${JSON.stringify(formattedAnimals, null, 2)};
`;
    
    const dataJsPath = path.join(__dirname, '..', 'data.js');
    fs.writeFileSync(dataJsPath, dataJsContent);
    
    console.log('✓ data.js has been synced!');
    console.log(`  Total animals: ${formattedAnimals.length}`);
    
    // Show some sample stats
    const topAttack = [...formattedAnimals].sort((a, b) => b.attack - a.attack).slice(0, 3);
    const topDefense = [...formattedAnimals].sort((a, b) => b.defense - a.defense).slice(0, 3);
    const topAgility = [...formattedAnimals].sort((a, b) => b.agility - a.agility).slice(0, 3);
    
    console.log('\nTop 3 Attack:', topAttack.map(a => `${a.name}: ${a.attack}`).join(', '));
    console.log('Top 3 Defense:', topDefense.map(a => `${a.name}: ${a.defense}`).join(', '));
    console.log('Top 3 Agility:', topAgility.map(a => `${a.name}: ${a.agility}`).join(', '));
    
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
}

syncDataJs().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
