// Update all animal image URLs in MongoDB to use local paths
// This fixes CORS issues where external image hosts block cross-origin requests
//
// Run with: node update_all_image_urls.js

require('dotenv').config({ path: '../../.env.local' });
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Get all image files from the animals directory
const imagesDir = path.join(__dirname, '../../images/animals');

function slugify(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGODB_URI not found in environment');
        console.error('Make sure .env.local exists with MONGODB_URI=...');
        process.exit(1);
    }

    // Get available image files
    const imageFiles = fs.readdirSync(imagesDir);
    const imageMap = new Map();
    
    for (const file of imageFiles) {
        const ext = path.extname(file);
        const slug = path.basename(file, ext);
        imageMap.set(slug, `/images/animals/${file}`);
    }
    
    console.log(`Found ${imageMap.size} local images\n`);

    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB\n');

        const db = client.db('animal-stats');
        const collection = db.collection('animals');

        // Get all animals
        const animals = await collection.find({}).toArray();
        console.log(`Found ${animals.length} animals in database\n`);

        let updated = 0;
        let skipped = 0;
        let notFound = [];

        for (const animal of animals) {
            const slug = slugify(animal.name);
            const localPath = imageMap.get(slug);
            
            if (!localPath) {
                console.log(`⚠️  No local image for: ${animal.name} (slug: ${slug})`);
                notFound.push(animal.name);
                continue;
            }
            
            // Check if already using local path
            if (animal.image && animal.image.startsWith('/images/animals/')) {
                skipped++;
                continue;
            }
            
            // Update to local path
            const result = await collection.updateOne(
                { _id: animal._id },
                { $set: { image: localPath } }
            );
            
            if (result.modifiedCount > 0) {
                console.log(`✅ ${animal.name}: ${localPath}`);
                updated++;
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log('SUMMARY');
        console.log('='.repeat(50));
        console.log(`✅ Updated: ${updated}`);
        console.log(`⏭️  Skipped (already local): ${skipped}`);
        console.log(`⚠️  Not found: ${notFound.length}`);
        
        if (notFound.length > 0) {
            console.log('\nMissing local images for:');
            notFound.forEach(name => console.log(`  - ${name}`));
        }

    } finally {
        await client.close();
        console.log('\nDisconnected from MongoDB');
    }
}

main().catch(console.error);
