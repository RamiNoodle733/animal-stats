import json
import time
import os
from creative_scraper import scrape_with_all_methods

def main():
    print("🦁 FETCHING IMAGES FOR NEW ANIMALS (ROBUST MODE) 🦁")
    
    json_path = 'animal_stats.json'
    with open(json_path, 'r', encoding='utf-8') as f:
        animals = json.load(f)
        
    # Identify animals with placeholders
    targets = []
    for animal in animals:
        img = animal.get('image', '')
        if 'via.placeholder.com' in img or not img:
            targets.append(animal)
            
    print(f"Found {len(targets)} animals needing images.")
    
    if not targets:
        print("All animals have images!")
        return

    updated_count = 0
    
    for i, animal in enumerate(targets, 1):
        name = animal['name']
        query = f"{name} animal png"
        print(f"[{i}/{len(targets)}] Finding image for: {name}...")
        
        image_url = scrape_with_all_methods(query)
        
        if image_url:
            print(f"  ✅ Found: {image_url[:60]}...")
            animal['image'] = image_url
            updated_count += 1
        else:
            print("  ❌ Still no image found.")
            
        # Save periodically
        if i % 5 == 0:
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(animals, f, indent=2, ensure_ascii=False)
            print("  (Saved progress)")
            
        time.sleep(1.5) # Be polite
        
    # Final Save
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(animals, f, indent=2, ensure_ascii=False)
        
    # Update data.js
    js_content = f"window.animalData = {json.dumps(animals, indent=2, ensure_ascii=False)}"
    with open('data.js', 'w', encoding='utf-8') as f:
        f.write(js_content)
        
    print(f"\n🎉 Finished! Updated {updated_count}/{len(targets)} images.")

if __name__ == "__main__":
    main()
