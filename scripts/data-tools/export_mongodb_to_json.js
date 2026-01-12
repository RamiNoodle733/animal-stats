/**
 * Export MongoDB data to animal_stats.json
 * This ensures the local JSON file has the latest data with correct field names
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const fs = require('fs');

const MONGODB_URI = process.env.MONGODB_URI;

async function exportToJson() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!\n');

    const Animal = mongoose.model('Animal', new mongoose.Schema({}, { strict: false }), 'animals');

    // Get all animals from MongoDB
    const animals = await Animal.find({}).lean();
    console.log(`Found ${animals.length} animals in MongoDB`);

    // Sort by name for consistency
    animals.sort((a, b) => a.name.localeCompare(b.name));

    // Write to animal_stats.json
    fs.writeFileSync('animal_stats.json', JSON.stringify(animals, null, 2));
    console.log('✅ Exported to animal_stats.json');

    // Verify the substats field names
    const firstAnimal = animals[0];
    console.log('\nVerifying substat field names in first animal:');
    console.log('Substats:', Object.keys(firstAnimal.substats || {}));

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

exportToJson();
