/**
 * Migration Script: Fix User XP/Level Data
 * 
 * This script:
 * 1. Migrates users with old XP data to the new leveling system
 * 2. Calculates proper level from total XP
 * 3. Adds new fields (prestige, lifetimeXp)
 * 
 * Run: node scripts/migrate_xp_system.js
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ Error: MONGODB_URI environment variable is not set.');
    console.log('\nPlease create a .env.local file with your MongoDB connection string.');
    process.exit(1);
}

// XP curve function (must match lib/xpSystem.js)
function xpToNext(level) {
    if (level >= 100) return Infinity;
    if (level < 1) return 25;
    
    const x = level - 1;
    const raw = 25 + 3 * x + 0.03 * x * x;
    return Math.max(25, Math.round(raw / 5) * 5);
}

// Calculate level from total XP
function calculateLevelFromTotalXp(totalXp) {
    let level = 1;
    let remainingXp = totalXp;
    
    while (level < 100) {
        const needed = xpToNext(level);
        if (remainingXp < needed) break;
        remainingXp -= needed;
        level++;
    }
    
    return { level, xp: remainingXp };
}

async function migrate() {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected!\n');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Get all users
    const users = await usersCollection.find({}).toArray();
    console.log(`📋 Found ${users.length} users to check\n`);

    let migratedCount = 0;

    for (const user of users) {
        const oldXp = user.xp || 0;
        const oldLevel = user.level || 1;
        
        // Calculate what level they should be based on their total XP
        // If XP was stored as total (accumulated), use it directly
        // If XP was stored as current level progress, we need to calculate total first
        
        let totalXp = oldXp;
        
        // If they have more XP than xpToNext for their level, they need migration
        const xpNeededForCurrentLevel = xpToNext(oldLevel);
        const needsMigration = oldXp >= xpNeededForCurrentLevel || 
                               user.prestige === undefined || 
                               user.lifetimeXp === undefined;
        
        if (needsMigration) {
            // Calculate new level and remaining XP
            const { level: newLevel, xp: newXp } = calculateLevelFromTotalXp(totalXp);
            
            console.log(`👤 ${user.username}:`);
            console.log(`   Old: Level ${oldLevel}, XP ${oldXp}`);
            console.log(`   New: Level ${newLevel}, XP ${newXp}/${xpToNext(newLevel)}`);
            
            // Update user
            await usersCollection.updateOne(
                { _id: user._id },
                {
                    $set: {
                        level: newLevel,
                        xp: newXp,
                        prestige: user.prestige || 0,
                        lifetimeXp: user.lifetimeXp || totalXp
                    }
                }
            );
            
            migratedCount++;
        }
    }

    console.log(`\n🎉 Migration complete!`);
    console.log(`   Migrated ${migratedCount} users to new XP system`);
    console.log('\nXP Curve Reference:');
    console.log('   Level 1 → 2: 25 XP');
    console.log('   Level 10 → 11: 55 XP');
    console.log('   Level 50 → 51: 245 XP');
    console.log('   Level 99 → 100: 605 XP');

    await mongoose.disconnect();
}

migrate().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
