#!/usr/bin/env python3
"""
Download missing animal images from alternative sources.
These are images that failed to download from the original sources.
"""

import requests
import os
from pathlib import Path

IMAGES_DIR = Path(__file__).parent.parent.parent / "images" / "animals"

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
}

# Alternative image URLs for the failed downloads
# These are from sources that allow downloads
MISSING_IMAGES = {
    'baboon': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Papio_anubis_%28Serengeti%2C_2009%29.jpg/1200px-Papio_anubis_%28Serengeti%2C_2009%29.jpg',
    'bactrian-camel': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Bactrian.camel.sideon.arp.jpg/1200px-Bactrian.camel.sideon.arp.jpg',
    'bison': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/American_bison_k5680-1.jpg/1200px-American_bison_k5680-1.jpg',
    'honey-badger': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Honey_badger.jpg/1200px-Honey_badger.jpg',
    'musk-ox': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Ovibos_moschatus_qtl3.jpg/1200px-Ovibos_moschatus_qtl3.jpg',
    'piranha': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Piranha-fish-teeth.jpg/1200px-Piranha-fish-teeth.jpg',
    'puffin': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Puffin_%28Fratercula_arctica%29.jpg/1200px-Puffin_%28Fratercula_arctica%29.jpg',
    'yak': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Bos_grunniens_at_Letdar_on_Annapurna_Circuit.jpg/1200px-Bos_grunniens_at_Letdar_on_Annapurna_Circuit.jpg',
    'zebra': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Plains_Zebra_Equus_quagga.jpg/1200px-Plains_Zebra_Equus_quagga.jpg',
}

def download_image(url, save_path):
    """Download an image from URL."""
    try:
        response = requests.get(url, headers=HEADERS, timeout=30)
        response.raise_for_status()
        
        with open(save_path, 'wb') as f:
            f.write(response.content)
        
        return True
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def main():
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    
    print("📥 Downloading missing animal images from Wikipedia...\n")
    
    success = 0
    failed = 0
    
    for slug, url in MISSING_IMAGES.items():
        # Determine extension from URL
        if '.jpg' in url.lower():
            ext = '.jpg'
        elif '.png' in url.lower():
            ext = '.png'
        else:
            ext = '.jpg'
        
        save_path = IMAGES_DIR / f"{slug}{ext}"
        
        print(f"⬇️  {slug}...")
        
        if download_image(url, save_path):
            file_size = save_path.stat().st_size / 1024
            print(f"  ✅ Saved ({file_size:.1f} KB)")
            success += 1
        else:
            failed += 1
    
    print(f"\n✅ Downloaded: {success}")
    print(f"❌ Failed: {failed}")

if __name__ == "__main__":
    main()
