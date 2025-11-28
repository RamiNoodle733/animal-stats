import json
import requests
import re
import time
import os
import urllib.parse

# The list of animals the user specifically mentioned
TARGET_ANIMALS = [
    "Megalodon", "Honey Badger", "Snow Leopard", "Bison", "Wild Boar", "Yak", 
    "Musk Ox", "Bottlenose Dolphin", "Tarantula Hawk", "Beluga Whale", "Pelican", 
    "Black Rhinoceros", "Beaver", "Bactrian Camel", "Baboon", "Maned Wolf", 
    "Platypus", "Crow", "Macaw", "Stoat", "Quokka", "Piranha", "Armadillo", 
    "Ring-tailed Lemur", "Quoll", "Giant Centipede", "Puffin", "Camel Spider"
]

def get_first_google_image(query):
    """
    Simulates a browser request to Google Images and tries to grab the 
    very first image result URL found in the page source.
    """
    print(f"  🔍 Searching Google for: '{query}'")
    
    url = "https://www.google.com/search"
    params = {
        "q": query,
        "tbm": "isch", # Image search
        "tbs": "ic:trans", # Transparent filter (User asked for 'transparent animal png')
        "hl": "en"
    }
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    try:
        response = requests.get(url, params=params, headers=headers, timeout=10)
        html = response.text
        
        # Google Images embeds images in script tags like:
        # _docs_flag_ = ...; ... ["http://url...", height, width] ...
        # We look for http URLs that end in image extensions.
        # The first one appearing in the main data block is usually the first result.
        
        # This regex looks for http/s URLs ending in common image formats
        # We avoid looking inside html tags to avoid thumbnails if possible, 
        # but Google's structure is complex.
        # A common pattern for the high-res image in the script is:
        # "http...jpg",\d+,\d+
        
        # Let's try to find all image-like URLs
        matches = re.findall(r'"(https?://[^"]+?\.(?:png|jpg|jpeg|webp))"', html)
        
        for match in matches:
            # Decode unicode escapes (e.g. \u0026 -> &)
            url = match.encode().decode('unicode_escape')
            
            # Filter out Google's own assets, favicons, and tiny thumbnails
            if "google.com" in url or "gstatic.com" in url or "favicon" in url:
                continue
                
            # Filter out base64 images
            if "base64" in url:
                continue

            # Filter out Wikimedia/Wikipedia file pages (which end in .png but are HTML pages)
            if "/wiki/" in url or "/File:" in url or "title=File:" in url:
                continue
                
            # If we found a valid-looking external URL, this is likely the first result
            # because regex iterates from top to bottom.
            return url
            
    except Exception as e:
        print(f"  ❌ Error searching Google: {e}")
        
    return None

def main():
    # Path to the json file (it's in the parent directory relative to scripts/ if we run from there, 
    # but we assume we run from root based on previous context)
    json_path = 'animal_stats.json'
    js_path = 'data.js'
    
    if not os.path.exists(json_path):
        print(f"Error: Could not find {json_path}")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        animals = json.load(f)
        
    updated_count = 0
    
    for animal in animals:
        name = animal['name']
        
        # Only update the ones in our target list
        # Case-insensitive check
        if any(t.lower() == name.lower() for t in TARGET_ANIMALS):
            
            # User requested: "transparent animal png" or similar
            search_query = f"{name} transparent animal png"
            
            image_url = get_first_google_image(search_query)
            
            if image_url:
                print(f"  ✅ Found: {image_url}")
                animal['image'] = image_url
                updated_count += 1
            else:
                print(f"  ⚠️ No image found for {name}")
            
            # Sleep slightly to avoid aggressive rate limiting
            time.sleep(1.5)

    if updated_count > 0:
        print(f"\nSaving {updated_count} updates to {json_path}...")
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(animals, f, indent=2, ensure_ascii=False)
            
        print(f"Updating {js_path}...")
        with open(js_path, 'w', encoding='utf-8') as f:
            f.write(f"window.animalData = {json.dumps(animals, indent=2, ensure_ascii=False)};")
            
        print("Done! Please refresh your page.")
    else:
        print("No updates were made.")

if __name__ == "__main__":
    main()
