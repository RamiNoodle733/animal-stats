/**
 * Cleanup MongoDB - Remove duplicate/obsolete fields
 * This script removes old fields and ensures clean data structure
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const animalSchema = new mongoose.Schema({}, { collection: 'animals', strict: false });
const Animal = mongoose.model('Animal', animalSchema);

async function cleanup() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!\n');

    // Remove obsolete fields from all animals
    console.log('=== REMOVING OBSOLETE FIELDS ===');
    
    const result = await Animal.updateMany(
        {},
        {
            $unset: {
                special_attack: "",      // Old duplicate of 'special'
                calculatedStats: "",     // Old calculated stats object
                stats: ""                // Old empty stats object
            }
        }
    );
    
    console.log(`✓ Cleaned ${result.modifiedCount} animals`);

    // Verify the cleanup
    console.log('\n=== VERIFICATION ===');
    const sample = await Animal.findOne({ name: 'African Elephant' }).lean();
    
    console.log('\nAfrican Elephant fields after cleanup:');
    const statFields = ['attack', 'defense', 'agility', 'stamina', 'intelligence', 'special'];
    statFields.forEach(f => console.log(`  ${f}: ${sample[f]}`));
    
    console.log('\nRemoved fields check:');
    console.log(`  special_attack: ${sample.special_attack === undefined ? '✓ REMOVED' : '✗ STILL EXISTS'}`);
    console.log(`  calculatedStats: ${sample.calculatedStats === undefined ? '✓ REMOVED' : '✗ STILL EXISTS'}`);
    console.log(`  stats: ${sample.stats === undefined ? '✓ REMOVED' : '✗ STILL EXISTS'}`);

    // Show all remaining fields
    console.log('\n=== FINAL FIELD STRUCTURE ===');
    const allFields = Object.keys(sample).filter(k => !k.startsWith('_'));
    console.log('Fields:', allFields.sort().join(', '));

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
}

cleanup().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
