/**
 * Export MongoDB data to animal_stats.json
 * 
 * This keeps your local JSON backup in sync with MongoDB (the source of truth)
 * Run this whenever you want to update your local backup
 * 
 * Usage: node scripts/export_to_json.js
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const Animal = require('../lib/models/Animal');

async function exportToJson() {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected!\n');
    
    // Fetch ALL data from MongoDB (no field filtering)
    const animals = await Animal.find({}).lean();
    console.log(`📦 Found ${animals.length} animals in MongoDB\n`);
    
    // Clean up MongoDB-specific fields for cleaner JSON
    const cleanedAnimals = animals.map(animal => {
        const cleaned = { ...animal };
        
        // Convert _id to string
        if (cleaned._id) {
            cleaned._id = cleaned._id.toString();
        }
        
        // Remove MongoDB version key if present
        delete cleaned.__v;
        
        return cleaned;
    });
    
    // Sort alphabetically by name
    cleanedAnimals.sort((a, b) => a.name.localeCompare(b.name));
    
    // Write to animal_stats.json
    const outputPath = path.join(__dirname, '..', 'animal_stats.json');
    fs.writeFileSync(outputPath, JSON.stringify(cleanedAnimals, null, 2), 'utf-8');
    
    console.log(`✅ Exported ${cleanedAnimals.length} animals to animal_stats.json`);
    console.log(`📍 Location: ${outputPath}`);
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);
    
    // Show sample of what was exported
    console.log('\n📋 Sample animal data:');
    const sample = cleanedAnimals[0];
    console.log(`   Name: ${sample.name}`);
    console.log(`   Scientific: ${sample.scientific_name}`);
    console.log(`   Stats: ATK ${sample.attack}, DEF ${sample.defense}, AGI ${sample.agility}`);
    console.log(`   Fields: ${Object.keys(sample).length} total fields`);
    
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
}

exportToJson().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
