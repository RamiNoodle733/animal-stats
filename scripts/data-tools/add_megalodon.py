
import json
import requests
from bs4 import BeautifulSoup
import re
import os

def search_google_images_scrape(query):
    """Scrape Google Images for the first result (fallback method)"""
    try:
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

def add_megalodon():
    image_url = search_google_images_scrape("Megalodon animal png")
    if not image_url:
        image_url = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Megalodon_scale.svg/1200px-Megalodon_scale.svg.png" # Fallback
    
    print(f"Found image: {image_url}")

    megalodon = {
        "name": "Megalodon",
        "scientific_name": "Otodus megalodon",
        "habitat": "Ancient Oceans",
        "size": "Colossal",
        "weight_kg": 60000,
        "height_cm": 400,
        "length_cm": 1800,
        "speed_mps": 13.0,
        "lifespan_years": 100,
        "isNocturnal": False,
        "isSocial": False,
        "diet": ["Whales", "Large Fish", "Sharks"],
        "attack": 99.0,
        "defense": 90.0,
        "agility": 45.0,
        "intelligence": 60.0,
        "stamina": 85.0,
        "special_attack": 95.0,
        "size_score": 100.0,
        "bite_force_psi": 40000,
        "class": "Titan",
        "type": "Fish",
        "unique_traits": ["Largest shark ever", "Bone-crushing bite", "Apex predator of all time"],
        "special_abilities": ["Ancient Terror", "Whale Hunter"],
        "image": image_url,
        "substats": {
            "raw_power": 100,
            "natural_weapons": 100,
            "armor": 85,
            "resilience": 95,
            "speed_stat": 50,
            "maneuverability": 40,
            "endurance": 85,
            "recovery": 85,
            "tactics": 60,
            "senses": 80,
            "ferocity": 100,
            "unique_abilities": 90
        }
    }

    with open('animal_stats.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Check if already exists
    for animal in data:
        if animal['name'] == "Megalodon":
            print("Megalodon already exists, updating...")
            data.remove(animal)
            break
            
    data.append(megalodon)
    
    with open('animal_stats.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print("Megalodon added successfully!")

if __name__ == "__main__":
    add_megalodon()
