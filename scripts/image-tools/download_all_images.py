#!/usr/bin/env python3
"""
Download all animal images from external URLs and save them locally.
This fixes CORS issues where external image hosts block cross-origin requests.

Usage:
    python download_all_images.py

The script will:
1. Read animal_stats.json
2. Download each external image
3. Save to /images/animals/{slug}.png
4. Generate a MongoDB update script
"""

import json
import os
import requests
import time
from pathlib import Path
from urllib.parse import urlparse
import re

# Configuration
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
ANIMAL_STATS_FILE = PROJECT_ROOT / "animal_stats.json"
IMAGES_DIR = PROJECT_ROOT / "images" / "animals"
OUTPUT_SCRIPT = SCRIPT_DIR / "update_image_urls.js"

# Headers to mimic a browser (helps avoid some blocks)
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.google.com/',
}

def slugify(name):
    """Convert animal name to URL-friendly slug."""
    slug = name.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    return slug.strip('-')

def download_image(url, save_path, timeout=30):
    """Download an image from URL and save it locally."""
    try:
        response = requests.get(url, headers=HEADERS, timeout=timeout, stream=True)
        response.raise_for_status()
        
        # Check if it's actually an image
        content_type = response.headers.get('content-type', '')
        if 'image' not in content_type and 'octet-stream' not in content_type:
            print(f"  ⚠️  Not an image (content-type: {content_type})")
            return False
        
        with open(save_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        return True
    except requests.exceptions.Timeout:
        print(f"  ⏱️  Timeout")
        return False
    except requests.exceptions.RequestException as e:
        print(f"  ❌ Error: {e}")
        return False

def main():
    # Ensure images directory exists
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    
    # Load animal stats
    print(f"📖 Loading {ANIMAL_STATS_FILE}...")
    with open(ANIMAL_STATS_FILE, 'r') as f:
        animals = json.load(f)
    
    print(f"Found {len(animals)} animals\n")
    
    # Track results
    success = []
    failed = []
    skipped = []
    
    # MongoDB update commands
    mongo_updates = []
    
    for i, animal in enumerate(animals, 1):
        name = animal.get('name', 'Unknown')
        image_url = animal.get('image', '')
        slug = slugify(name)
        
        print(f"[{i}/{len(animals)}] {name}")
        
        # Check if it's an external URL
        if not image_url:
            print(f"  ⚠️  No image URL")
            skipped.append(name)
            continue
            
        # Check if already local
        if image_url.startswith('/images/') or 'animalbattlestats.com' in image_url:
            print(f"  ✓ Already local")
            skipped.append(name)
            continue
        
        # Determine file extension from URL
        parsed = urlparse(image_url)
        ext = os.path.splitext(parsed.path)[1].lower()
        if ext not in ['.png', '.jpg', '.jpeg', '.gif', '.webp']:
            ext = '.png'  # Default to PNG
        
        # Save path
        save_filename = f"{slug}{ext}"
        save_path = IMAGES_DIR / save_filename
        local_url = f"/images/animals/{save_filename}"
        
        # Check if already downloaded
        if save_path.exists():
            print(f"  ✓ Already downloaded")
            success.append(name)
            mongo_updates.append({
                'name': name,
                'old_url': image_url,
                'new_url': local_url
            })
            continue
        
        # Download
        print(f"  ⬇️  Downloading from {urlparse(image_url).netloc}...")
        if download_image(image_url, save_path):
            file_size = save_path.stat().st_size
            print(f"  ✅ Saved ({file_size / 1024:.1f} KB)")
            success.append(name)
            mongo_updates.append({
                'name': name,
                'old_url': image_url,
                'new_url': local_url
            })
        else:
            failed.append({'name': name, 'url': image_url})
        
        # Small delay to be nice to servers
        time.sleep(0.5)
    
    # Summary
    print("\n" + "="*50)
    print("📊 SUMMARY")
    print("="*50)
    print(f"✅ Success: {len(success)}")
    print(f"⚠️  Skipped: {len(skipped)}")
    print(f"❌ Failed:  {len(failed)}")
    
    if failed:
        print("\n❌ Failed downloads:")
        for item in failed:
            print(f"  - {item['name']}: {item['url']}")
    
    # Generate MongoDB update script
    if mongo_updates:
        print(f"\n📝 Generating MongoDB update script...")
        
        script_content = '''// MongoDB script to update image URLs to local paths
// Run with: node update_image_urls.js

require('dotenv').config({ path: '../../.env.local' });
const { MongoClient } = require('mongodb');

const updates = %s;

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGODB_URI not found in environment');
        process.exit(1);
    }
    
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db('animal_stats');
        const collection = db.collection('animals');
        
        let updated = 0;
        let errors = 0;
        
        for (const update of updates) {
            try {
                const result = await collection.updateOne(
                    { name: update.name },
                    { $set: { image: update.new_url } }
                );
                
                if (result.modifiedCount > 0) {
                    console.log(`✅ Updated: ${update.name}`);
                    updated++;
                } else {
                    console.log(`⚠️  Not found or unchanged: ${update.name}`);
                }
            } catch (err) {
                console.error(`❌ Error updating ${update.name}:`, err.message);
                errors++;
            }
        }
        
        console.log(`\\nDone! Updated: ${updated}, Errors: ${errors}`);
        
    } finally {
        await client.close();
    }
}

main().catch(console.error);
''' % json.dumps(mongo_updates, indent=2)
        
        with open(OUTPUT_SCRIPT, 'w') as f:
            f.write(script_content)
        
        print(f"✅ Saved to {OUTPUT_SCRIPT}")
        print(f"\nTo update MongoDB, run:")
        print(f"  cd {SCRIPT_DIR}")
        print(f"  node update_image_urls.js")

if __name__ == "__main__":
    main()
