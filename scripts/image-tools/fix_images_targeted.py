import json
import time
import urllib.parse
import re
import requests
from bs4 import BeautifulSoup

# --- Copying methods from creative_scraper.py ---

def method_1_serpapi_style(query):
    """Method 1: Parse Google Images like SerpAPI does - TRANSPARENT PNG VERSION"""
    try:
        # Add "transparent" and "no background" to query for better results
        # Keep "animal" in the query to avoid superhero issues (e.g. Wolverine)
        transparent_query = query.replace(' animal png', ' animal transparent png no background')
        encoded_query = urllib.parse.quote(transparent_query)
        url = f"https://www.google.com/search?q={encoded_query}&tbm=isch&hl=en&tbs=ic:trans"  # ic:trans = transparent images filter
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        
        # Google embeds image data in JavaScript variables
        # Look for DIRECT image URLs (not wiki pages)
        patterns = [
            r'"(https://[^"]*?\.(?:png|jpg|jpeg|webp))"',
            r"'(https://[^']*?\.(?:png|jpg|jpeg|webp))'",
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, response.text)
            if matches:
                # Filter and prioritize
                for match in matches:
                    # Skip bad URLs
                    if ('gstatic' in match or 
                        'google' in match or
                        'logo' in match.lower() or
                        'icon' in match.lower() or
                        len(match) < 40):
                        continue
                    
                    # Skip wiki pages, get actual images
                    if 'wikimedia' in match and '/wiki/' in match:
                        continue
                    
                    # Prioritize sites known for transparent PNGs (in priority order)
                    priority_sites = [
                        'pngimg.com',           # Best - always transparent
                        'pngwing.com',          # Great - transparent PNGs
                        'pngegg.com',           # Good - transparent PNGs
                        'freepnglogos.com',     # Good - transparent
                        'pngtree.com',          # Good - usually transparent
                        'upload.wikimedia.org', # Good - often transparent
                        'stickpng.com',         # Great - transparent
                        'cleanpng.com',         # Good - transparent
                        'pngmart.com',          # Good - transparent
                        'freepik.com',          # Good - has transparent
                    ]
                    
                    for site in priority_sites:
                        if site in match and match.endswith('.png'):
                            return match
                    
                    # Also accept if "transparent" is in the URL
                    if 'transparent' in match.lower() and match.endswith('.png'):
                        return match
                
                # If no priority matches, return first clean PNG (prefer .png over .jpg)
                png_matches = [m for m in matches if m.endswith('.png')]
                for match in png_matches:
                    if ('gstatic' not in match and 
                        'google' not in match and
                        '/wiki/' not in match and
                        len(match) > 40):
                        return match
                
                # Fallback to any clean URL
                for match in matches:
                    if ('gstatic' not in match and 
                        'google' not in match and
                        '/wiki/' not in match and
                        len(match) > 40):
                        return match
                        
    except Exception as e:
        print(f"    Method 1 error: {e}")
    return None


def method_2_duckduckgo(query):
    """Method 2: Use DuckDuckGo Images (no API needed!) - TRANSPARENT VERSION"""
    try:
        # DuckDuckGo has a simple image search endpoint
        url = "https://duckduckgo.com/"
        
        # Add "transparent" to query
        # Keep "animal" in the query to avoid superhero issues
        transparent_query = query.replace(' animal png', ' animal transparent png')
        
        # Get the vqd token first
        params = {"q": transparent_query}
        headers = {'User-Agent': 'Mozilla/5.0'}
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        vqd_match = re.search(r'vqd=([\d-]+)', response.text)
        
        if vqd_match:
            vqd = vqd_match.group(1)
            
            # Now search for images
            image_url = "https://duckduckgo.com/i.js"
            params = {
                'l': 'us-en',
                'o': 'json',
                'q': transparent_query,
                'vqd': vqd,
                'f': ',,,',
                'p': '1',
                'iax': 'images',
                'ia': 'images'
            }
            
            response = requests.get(image_url, params=params, headers=headers, timeout=10)
            data = response.json()
            
            if data.get('results'):
                # Get the first high-quality result
                for result in data['results']:
                    img_url = result.get('image')
                    if img_url and len(img_url) > 40:
                        return img_url
                        
    except Exception as e:
        print(f"    Method 2 error: {e}")
    return None


def method_4_direct_png_sites(query):
    """Method 4: Directly scrape known PNG sites"""
    animal_name = query.replace(' animal png', '').strip()
    
    sites = [
        f"https://pngimg.com/image/{animal_name.lower().replace(' ', '_')}",
        f"https://www.pngwing.com/en/search?q={urllib.parse.quote(animal_name + ' animal')}",
        f"https://www.pngegg.com/en/search?q={urllib.parse.quote(animal_name + ' animal')}",
        f"https://pngtree.com/so/{urllib.parse.quote(animal_name.lower())}"
    ]
    
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        
        for site_url in sites:
            try:
                response = requests.get(site_url, headers=headers, timeout=5)
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Look for image tags
                img_tags = soup.find_all('img', src=True)
                
                for img in img_tags:
                    src = img.get('src', '')
                    # Look for actual content images (not icons/logos)
                    if (src.startswith('http') and 
                        any(ext in src for ext in ['.png', '.jpg', '.jpeg', '.webp']) and
                        len(src) > 50 and
                        'logo' not in src.lower() and
                        'icon' not in src.lower()):
                        return src
                        
            except:
                continue
                
    except Exception as e:
        print(f"    Method 4 error: {e}")
    return None


def method_5_imgur_search(query):
    """Method 5: Search Imgur (often appears in Google results)"""
    try:
        animal_name = query.replace(' animal png', '').strip()
        url = f"https://imgur.com/search?q={urllib.parse.quote(animal_name + ' animal transparent')}"
        
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers, timeout=10)
        
        # Imgur embeds image URLs in JSON
        matches = re.findall(r'"url":"([^"]+?\.(?:png|jpg|jpeg))"', response.text)
        if matches:
            for match in matches:
                # Clean up the URL
                clean_url = match.replace('\\/', '/')
                if 'i.imgur.com' in clean_url:
                    return f"https:{clean_url}" if not clean_url.startswith('http') else clean_url
                    
    except Exception as e:
        print(f"    Method 5 error: {e}")
    return None


def scrape_with_all_methods(query):
    """Try all methods until one works"""
    
    print(f"  🔍 Trying Method 1: Google Images parsing...")
    result = method_1_serpapi_style(query)
    if result:
        return result
    
    print(f"  🔍 Trying Method 2: DuckDuckGo Images...")
    result = method_2_duckduckgo(query)
    if result:
        return result
    
    print(f"  🔍 Trying Method 3: Direct PNG site scraping...")
    result = method_4_direct_png_sites(query)
    if result:
        return result
    
    print(f"  🔍 Trying Method 4: Imgur search...")
    result = method_5_imgur_search(query)
    if result:
        return result
    
    return None

# --- Main Logic ---

def main():
    target_list = [
        "Armadillo", "Honey Badger", "Bison", "Yak", "Siberian Tiger", "Snow Leopard", 
        "Zebra", "Beaver", "Reindeer", "Goose", "Pelican", "Vulture", "Platypus", 
        "Pirana", "Piranha", "Giant Centipede", "Quokka"
    ]
    
    # Load animals
    try:
        with open('animal_stats.json', 'r', encoding='utf-8') as f:
            animals = json.load(f)
    except FileNotFoundError:
        print("Error: animal_stats.json not found.")
        return

    print(f"Loaded {len(animals)} animals.")
    
    updated_count = 0
    
    for i, animal in enumerate(animals):
        name = animal.get('name', '')
        image = animal.get('image', '')
        
        # Check if we should update this animal
        should_update = False
        
        # 1. Is it in the target list?
        if name in target_list:
            should_update = True
            print(f"[{i+1}/{len(animals)}] {name} is in target list.")
            
        # 2. Is the image missing?
        elif not image or image.strip() == "":
            should_update = True
            print(f"[{i+1}/{len(animals)}] {name} has no image.")
            
        if should_update:
            query = f"{name} animal png"
            print(f"  🚀 Scraping for {name}...")
            
            result = scrape_with_all_methods(query)
            
            if result:
                print(f"  ✅ Found: {result[:60]}...")
                animal['image'] = result
                updated_count += 1
                
                # Save periodically (every 5 updates)
                if updated_count % 5 == 0:
                    with open('animal_stats.json', 'w', encoding='utf-8') as f:
                        json.dump(animals, f, indent=2, ensure_ascii=False)
                    print("  💾 Saved progress.")
            else:
                print(f"  ❌ Failed to find image for {name}")
            
            time.sleep(1) # Be nice
            
    # Final save
    with open('animal_stats.json', 'w', encoding='utf-8') as f:
        json.dump(animals, f, indent=2, ensure_ascii=False)
        
    print(f"\n✅ Finished! Updated {updated_count} animals.")

if __name__ == "__main__":
    main()
