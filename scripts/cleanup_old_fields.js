/**
 * Clean up old substat field names from MongoDB
 * Removes: natural_weapons, armor, resilience, speed_stat, unique_abilities
 * Keeps: weaponry, protection, toughness, speed, abilities (and others)
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

async function cleanupOldFields() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!\n');

    const Animal = mongoose.model('Animal', new mongoose.Schema({}, { strict: false }), 'animals');

    // Remove old field names from all animals
    const result = await Animal.updateMany(
      {},
      {
        $unset: {
          'substats.natural_weapons': '',
          'substats.armor': '',
          'substats.resilience': '',
          'substats.speed_stat': '',
          'substats.unique_abilities': ''
        }
      }
    );

    console.log(`✅ Removed old substat fields from ${result.modifiedCount} animals`);

    // Verify cleanup
    const sampleAnimal = await Animal.findOne({}).lean();
    console.log('\nVerifying substat field names after cleanup:');
    console.log('Substats:', Object.keys(sampleAnimal.substats || {}));

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

cleanupOldFields();
