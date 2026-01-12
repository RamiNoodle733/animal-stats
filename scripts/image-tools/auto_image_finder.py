#!/usr/bin/env python3
"""
AUTOMATIC IMAGE FINDER - Gets the ACTUAL first Google/Bing image result for each animal!

This uses Bing Image Search API (free tier: 1000 searches/month)
Or falls back to web scraping if no API key available.
"""

import json
import os
import time

# Method 1: Try Bing Image Search API (recommended - most reliable)
def search_bing_images(query, api_key=None):
    """Search Bing for images and return the first result URL"""
    if not api_key:
        print(f"  ⚠ No Bing API key - skipping Bing search for: {query}")
        return None
    
    import requests
    
    search_url = "https://api.bing.microsoft.com/v7.0/images/search"
    headers = {"Ocp-Apim-Subscription-Key": api_key}
    params = {
        "q": query,
        "imageType": "Transparent",  # Prefer transparent images
        "count": 1
    }
    
    try:
        response = requests.get(search_url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        results = response.json()
        
        if results.get("value"):
            first_image = results["value"][0]
            return first_image.get("contentUrl") or first_image.get("thumbnailUrl")
    except Exception as e:
        print(f"  ⚠ Bing API error for {query}: {e}")
    
    return None


# Method 2: Web scraping fallback (less reliable, may break)
def search_google_images_scrape(query):
    """Scrape Google Images for the first result (fallback method)"""
    try:
        import requests
        from bs4 import BeautifulSoup
        import re
        
        # Google Images search URL
        # tbm=isch: image search
        # tbs=ic:trans: transparent images only
        url = f"https://www.google.com/search?q={query}&tbm=isch&tbs=ic:trans"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Try to find image URLs in the page
        # Google Images embeds image URLs in JavaScript
        scripts = soup.find_all('script')
        for script in scripts:
            if script.string and 'AF_initDataCallback' in script.string:
                # Look for image URLs in the script
                urls = re.findall(r'https://[^"]+\.(?:png|jpg|jpeg|webp)', script.string)
                if urls:
                    # Filter out small thumbnails and icons
                    for url in urls:
                        if 'encrypted' not in url and len(url) > 50:
                            return url
        
    except Exception as e:
        print(f"  ⚠ Scraping error for {query}: {e}")
    
    return None


def auto_find_images(use_bing_api=True):
    """Automatically find images for all animals"""
    
    # Check for Bing API key
    bing_api_key = os.environ.get('BING_SEARCH_API_KEY')
    
    if use_bing_api and not bing_api_key:
        print("\n" + "="*60)
        print("🔑 BING IMAGE SEARCH API SETUP (Recommended)")
        print("="*60)
        print("To get the ACTUAL first Google/Bing results automatically:")
        print("\n1. Go to: https://portal.azure.com/")
        print("2. Create a free Azure account (if you don't have one)")
        print("3. Search for 'Bing Search v7' and create a resource")
        print("4. Copy your API key")
        print("5. Set environment variable: $env:BING_SEARCH_API_KEY='your-key'")
        print("\nFree tier includes: 1000 searches/month")
        print("\nFalling back to web scraping (less reliable)...\n")
        bing_api_key = None
        time.sleep(3)
    
    # Load animals
    with open('animal_stats.json', 'r', encoding='utf-8') as f:
        animals = json.load(f)
    
    print(f"\n✅ Loaded {len(animals)} animals")
    print("🔍 Searching for REAL first image results...\n")
    
    updated = 0
    failed = []
    
    for i, animal in enumerate(animals, 1):
        name = animal.get('name', '')
        query = f"{name} animal png"
        
        print(f"[{i}/{len(animals)}] Searching: {query}")
        
        # Try Bing API first
        image_url = None
        if bing_api_key:
            image_url = search_bing_images(query, bing_api_key)
            if image_url:
                print(f"  ✅ Found via Bing API: {image_url[:80]}...")
        
        # Fallback to scraping
        if not image_url:
            print(f"  🔄 Trying web scraping...")
            image_url = search_google_images_scrape(query)
            if image_url:
                print(f"  ✅ Found via scraping: {image_url[:80]}...")
        
        # Update if found
        if image_url:
            animal['image'] = image_url
            updated += 1
        else:
            print(f"  ❌ Failed to find image")
            failed.append(name)
        
        # Be nice to servers - small delay
        time.sleep(0.5)
    
    # Save results
    if updated > 0:
        with open('animal_stats.json', 'w', encoding='utf-8') as f:
            json.dump(animals, f, indent=2, ensure_ascii=False)
        
        print(f"\n" + "="*60)
        print(f"✅ SUCCESS! Updated {updated}/{len(animals)} animals")
        print("="*60)
        
        if failed:
            print(f"\n⚠ Could not find images for {len(failed)} animals:")
            for name in failed:
                print(f"  - {name}")
    else:
        print("\n❌ No images were updated. Try setting up Bing API key.")


def main():
    print("\n" + "="*60)
    print("🎯 AUTOMATIC IMAGE FINDER - Gets REAL Google/Bing Results!")
    print("="*60)
    
    # Check if required packages are installed
    try:
        import requests
        from bs4 import BeautifulSoup
    except ImportError:
        print("\n⚠ Missing required packages. Installing...")
        import subprocess
        subprocess.check_call(['pip', 'install', 'requests', 'beautifulsoup4'])
        print("✅ Packages installed!")
    
    auto_find_images()


if __name__ == "__main__":
    main()
