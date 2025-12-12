/**
 * Migration Script: Update Vote Index for Daily Voting
 * 
 * This script:
 * 1. Drops the old unique index {animalId, votedBy}
 * 2. Adds voteDate field to all existing votes (today's date)
 * 3. Creates the new unique index {animalId, votedBy, voteDate}
 * 
 * Run: node scripts/migrate_daily_voting.js
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ Error: MONGODB_URI environment variable is not set.');
    console.log('\nPlease create a .env.local file with your MongoDB connection string.');
    process.exit(1);
}

async function migrate() {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected!\n');

    const db = mongoose.connection.db;
    const votesCollection = db.collection('votes');

    // Step 1: Check existing indexes
    console.log('📋 Current indexes:');
    const indexes = await votesCollection.indexes();
    indexes.forEach(idx => console.log(`   - ${idx.name}:`, JSON.stringify(idx.key)));
    console.log('');

    // Step 2: Drop the old unique index if it exists
    try {
        const oldIndexName = 'animalId_1_votedBy_1';
        const hasOldIndex = indexes.some(idx => idx.name === oldIndexName);
        
        if (hasOldIndex) {
            console.log('🗑️  Dropping old index:', oldIndexName);
            await votesCollection.dropIndex(oldIndexName);
            console.log('✅ Old index dropped!\n');
        } else {
            console.log('ℹ️  Old index not found, skipping drop.\n');
        }
    } catch (error) {
        if (error.codeName === 'IndexNotFound') {
            console.log('ℹ️  Old index already removed.\n');
        } else {
            throw error;
        }
    }

    // Step 3: Add voteDate to all existing votes
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Adding voteDate="${today}" to existing votes...`);
    
    const updateResult = await votesCollection.updateMany(
        { voteDate: { $exists: false } },
        { $set: { voteDate: today } }
    );
    
    console.log(`✅ Updated ${updateResult.modifiedCount} votes with voteDate.\n`);

    // Step 4: Create new unique index
    console.log('📦 Creating new unique index {animalId, votedBy, voteDate}...');
    await votesCollection.createIndex(
        { animalId: 1, votedBy: 1, voteDate: 1 },
        { unique: true, name: 'animalId_1_votedBy_1_voteDate_1' }
    );
    console.log('✅ New index created!\n');

    // Step 5: Verify
    console.log('📋 Final indexes:');
    const finalIndexes = await votesCollection.indexes();
    finalIndexes.forEach(idx => console.log(`   - ${idx.name}:`, JSON.stringify(idx.key)));
    
    console.log('\n🎉 Migration complete!');
    console.log('\nDaily voting is now active:');
    console.log('  - Users can vote once per animal per day');
    console.log('  - All votes accumulate over time for power rankings');
    console.log('  - XP/BP rewards are now real (saved to user accounts)');

    await mongoose.disconnect();
}

migrate().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
