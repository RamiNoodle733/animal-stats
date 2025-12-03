/**
 * Database Seed Script
 * 
 * Migrates existing animal data from animal_stats.json to MongoDB.
 * Run with: npm run seed
 * 
 * Requirements:
 * - MONGODB_URI environment variable must be set
 * - MongoDB database must be accessible
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ Error: MONGODB_URI environment variable is not set.');
    console.log('\nPlease create a .env.local file with your MongoDB connection string:');
    console.log('MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/animal-stats?retryWrites=true&w=majority');
    process.exit(1);
}

// Import Animal model
const Animal = require('../lib/models/Animal');

async function seedDatabase() {
    console.log('🚀 Starting database seed...\n');

    try {
        // Connect to MongoDB
        console.log('📡 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI, {
            bufferCommands: false,
            maxPoolSize: 10,
        });
        console.log('✅ Connected to MongoDB successfully!\n');

        // Read JSON data
        console.log('📂 Reading animal_stats.json...');
        const jsonPath = path.join(__dirname, '..', 'animal_stats.json');
        
        if (!fs.existsSync(jsonPath)) {
            console.error('❌ Error: animal_stats.json not found!');
            process.exit(1);
        }

        const rawData = fs.readFileSync(jsonPath, 'utf-8');
        const animals = JSON.parse(rawData);
        console.log(`✅ Found ${animals.length} animals in JSON file\n`);

        // Check existing data
        const existingCount = await Animal.countDocuments();
        console.log(`📊 Current database contains ${existingCount} animals`);

        // Ask for confirmation if data exists
        if (existingCount > 0) {
            console.log('\n⚠️  Warning: Database already contains animals.');
            console.log('   This script will update existing animals and add new ones.\n');
        }

        // Process animals
        console.log('💾 Seeding database...\n');
        
        let created = 0;
        let updated = 0;
        let errors = 0;

        for (const animalData of animals) {
            try {
                // Ensure proper data structure
                const processedData = {
                    ...animalData,
                    // Ensure arrays
                    diet: Array.isArray(animalData.diet) ? animalData.diet : ['Varied'],
                    unique_traits: Array.isArray(animalData.unique_traits) ? animalData.unique_traits : [],
                    special_abilities: Array.isArray(animalData.special_abilities) ? animalData.special_abilities : [],
                    // Ensure substats object
                    substats: animalData.substats || {},
                    // Ensure battle_profile object
                    battle_profile: animalData.battle_profile || {}
                };

                // Use upsert to create or update
                const result = await Animal.findOneAndUpdate(
                    { name: processedData.name },
                    processedData,
                    { upsert: true, new: true, runValidators: true }
                );

                if (result.createdAt.getTime() === result.updatedAt.getTime()) {
                    created++;
                } else {
                    updated++;
                }

                // Progress indicator
                process.stdout.write(`\r   Processed: ${created + updated + errors}/${animals.length}`);

            } catch (err) {
                errors++;
                console.error(`\n   ❌ Error processing "${animalData.name}": ${err.message}`);
            }
        }

        console.log('\n');

        // Summary
        console.log('📈 Seed Summary:');
        console.log(`   ✅ Created: ${created} animals`);
        console.log(`   🔄 Updated: ${updated} animals`);
        if (errors > 0) {
            console.log(`   ❌ Errors: ${errors} animals`);
        }

        // Final count
        const finalCount = await Animal.countDocuments();
        console.log(`\n📊 Total animals in database: ${finalCount}`);

        // Create indexes
        console.log('\n🔧 Creating database indexes...');
        await Animal.createIndexes();
        console.log('✅ Indexes created successfully!');

        console.log('\n🎉 Database seeding completed successfully!\n');

    } catch (error) {
        console.error('\n❌ Fatal Error:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        // Close connection
        await mongoose.connection.close();
        console.log('🔌 Database connection closed.');
    }
}

// Run the seed
seedDatabase();
