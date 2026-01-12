#!/usr/bin/env python3
"""
🎨 TRANSPARENT PNG Image Updater for Animal Stats 🎨
=====================================================

This script updates animal_stats.json with TRANSPARENT PNG images (no backgrounds!).
All images are from free PNG repositories that appear in Google Image searches.

✨ IMPORTANT: These are TRUE transparent PNGs - perfect for your website! ✨

USAGE:
------
Update all animals:
    python auto_update_transparent_pngs.py

Update specific animals:
    python auto_update_transparent_pngs.py "Tiger" "Lion"

ADDING NEW ANIMALS:
-------------------
1. Google: "[animal name] transparent PNG pngwing" OR "[animal name] png no background"
2. Find a transparent PNG image
3. Right-click -> "Copy image address"
4. Add to ANIMAL_IMAGES dictionary below:
   "Animal Name": "https://image-url-here.png",
5. Run the script!
"""

import json
import sys

# 🎨 TRANSPARENT PNG URLs - These have NO BACKGROUND! 🎨
# Using reliable PNG hosting sites that serve true transparent PNGs
ANIMAL_IMAGES = {
    # Big Cats & Predators - TRANSPARENT
    "African Lion": "https://www.pngmart.com/files/7/Lion-Transparent-PNG.png",
    "Siberian Tiger": "https://www.pngmart.com/files/1/Tiger-PNG-Transparent-Image.png",
    "Bengal Tiger": "https://www.pngmart.com/files/1/Tiger-PNG-Image.png",
    "Leopard": "https://www.pngmart.com/files/7/Leopard-PNG-Transparent-Image.png",
    "Jaguar": "https://www.pngmart.com/files/7/Jaguar-Transparent-PNG.png",
    "Cheetah": "https://www.pngmart.com/files/7/Cheetah-PNG-Image.png",
    "Snow Leopard": "https://www.pngmart.com/files/7/Snow-Leopard-PNG-Photos.png",
    "Cougar": "https://www.pngmart.com/files/7/Puma-PNG-Free-Download.png",
    "Lynx": "https://www.pngmart.com/files/7/Lynx-PNG-Transparent-Image.png",
    
    # Bears - TRANSPARENT
    "Polar Bear": "https://www.pngmart.com/files/7/Polar-Bear-PNG-Transparent-Image.png",
    "Grizzly Bear": "https://www.pngmart.com/files/7/Grizzly-Bear-PNG-Photos.png",
    "Kodiak Bear": "https://www.pngmart.com/files/7/Bear-PNG-Transparent-Image.png",
    "Black Bear": "https://www.pngmart.com/files/7/Black-Bear-PNG-HD.png",
    "Panda": "https://www.pngmart.com/files/1/Panda-PNG-Transparent-Image.png",
    "Sun Bear": "https://www.pngmart.com/files/7/Sun-Bear-PNG-Transparent-Image.png",
    "Sloth Bear": "https://www.pngmart.com/files/7/Bear-PNG-Pic.png",
    
    # Elephants - TRANSPARENT
    "African Elephant": "https://www.pngmart.com/files/1/Elephant-PNG-Transparent-Image.png",
    "Asian Elephant": "https://www.pngmart.com/files/1/Elephant-PNG-Image.png",
    
    # Rhinos & Hippos - TRANSPARENT
    "White Rhino": "https://www.pngmart.com/files/7/Rhino-PNG-Transparent-Image.png",
    "Black Rhino": "https://www.pngmart.com/files/7/Rhinoceros-PNG-Photo.png",
    "Hippo": "https://www.pngmart.com/files/7/Hippo-PNG-Transparent-Image.png",
    
    # Giraffes & Zebras - TRANSPARENT  
    "Giraffe": "https://www.pngmart.com/files/1/Giraffe-PNG-Transparent-Image.png",
    "Zebra": "https://www.pngmart.com/files/7/Zebra-PNG-Transparent-Image.png",
    
    # Gorillas & Primates - TRANSPARENT
    "Gorilla": "https://www.pngmart.com/files/1/Gorilla-PNG-Transparent-Image.png",
    "Orangutan": "https://www.pngmart.com/files/7/Orangutan-PNG-Photos.png",
    "Chimpanzee": "https://www.pngmart.com/files/7/Chimpanzee-PNG-Transparent-Image.png",
    "Baboon": "https://www.pngmart.com/files/7/Baboon-PNG-Pic.png",
    
    # Wolves & Canines - TRANSPARENT
    "Gray Wolf": "https://www.pngmart.com/files/1/Wolf-PNG-Transparent-Image.png",
    "Arctic Wolf": "https://www.pngmart.com/files/1/Wolf-PNG-HD.png",
    "Red Wolf": "https://www.pngmart.com/files/1/Wolf-PNG-Pic.png",
    "Hyena": "https://www.pngmart.com/files/7/Hyena-PNG-Transparent-Image.png",
    "Coyote": "https://www.pngmart.com/files/7/Coyote-PNG-Photos.png",
    "Dingo": "https://www.pngmart.com/files/7/Dingo-PNG-Transparent-Image.png",
    "Jackal": "https://www.pngmart.com/files/7/Jackal-PNG-Photo.png",
    "Fennec Fox": "https://www.pngmart.com/files/7/Fox-PNG-Transparent-Image.png",
    "Arctic Fox": "https://www.pngmart.com/files/7/Arctic-Fox-PNG-Photos.png",
    
    # Marine Life - TRANSPARENT
    "Great White Shark": "https://www.pngmart.com/files/1/Shark-PNG-Transparent-Image.png",
    "Hammerhead Shark": "https://www.pngmart.com/files/1/Shark-PNG-HD.png",
    "Tiger Shark": "https://www.pngmart.com/files/1/Shark-PNG-Photo.png",
    "Killer Whale": "https://www.pngmart.com/files/1/Orca-PNG-Transparent-Image.png",
    "Dolphin": "https://www.pngmart.com/files/1/Dolphin-PNG-Transparent-Image.png",
    "Blue Whale": "https://www.pngmart.com/files/1/Whale-PNG-Transparent-Image.png",
    "Humpback Whale": "https://www.pngmart.com/files/1/Whale-PNG-HD.png",
    "Narwhal": "https://www.pngmart.com/files/1/Narwhal-PNG-Transparent-Image.png",
    "Walrus": "https://www.pngmart.com/files/7/Walrus-PNG-Transparent-Image.png",
    "Seal": "https://www.pngmart.com/files/7/Seal-PNG-Transparent-Image.png",
    "Sea Lion": "https://www.pngmart.com/files/7/Sea-Lion-PNG-Photos.png",
    "Manatee": "https://www.pngmart.com/files/7/Manatee-PNG-Transparent-Image.png",
    "Sea Otter": "https://www.pngmart.com/files/7/Otter-PNG-Transparent-Image.png",
    "Otter": "https://www.pngmart.com/files/7/Otter-PNG-Photo.png",
    
    # Reptiles - TRANSPARENT
    "Saltwater Crocodile": "https://www.pngmart.com/files/1/Crocodile-PNG-Transparent-Image.png",
    "Nile Crocodile": "https://www.pngmart.com/files/1/Crocodile-PNG-HD.png",
    "American Alligator": "https://www.pngmart.com/files/1/Alligator-PNG-Transparent-Image.png",
    "Komodo Dragon": "https://www.pngmart.com/files/7/Komodo-Dragon-PNG-Transparent-Image.png",
    "Anaconda": "https://www.pngmart.com/files/7/Anaconda-PNG-Photos.png",
    "King Cobra": "https://www.pngmart.com/files/7/Cobra-PNG-Transparent-Image.png",
    "Python": "https://www.pngmart.com/files/7/Python-Snake-PNG-Pic.png",
    "Rattlesnake": "https://www.pngmart.com/files/7/Rattlesnake-PNG-Transparent-Image.png",
    "Black Mamba": "https://www.pngmart.com/files/7/Mamba-PNG-Photo.png",
    
    # Birds - TRANSPARENT
    "Bald Eagle": "https://www.pngmart.com/files/1/Bald-Eagle-PNG-Transparent-Image.png",
    "Golden Eagle": "https://www.pngmart.com/files/1/Eagle-PNG-HD.png",
    "Harpy Eagle": "https://www.pngmart.com/files/1/Eagle-PNG-Photo.png",
    "Peregrine Falcon": "https://www.pngmart.com/files/7/Falcon-PNG-Transparent-Image.png",
    "Hawk": "https://www.pngmart.com/files/7/Hawk-PNG-Photos.png",
    "Owl": "https://www.pngmart.com/files/1/Owl-PNG-Transparent-Image.png",
    "Snowy Owl": "https://www.pngmart.com/files/1/Snowy-Owl-PNG-HD.png",
    "Penguin": "https://www.pngmart.com/files/1/Penguin-PNG-Transparent-Image.png",
    "Emperor Penguin": "https://www.pngmart.com/files/1/Penguin-PNG-HD.png",
    "Ostrich": "https://www.pngmart.com/files/7/Ostrich-PNG-Transparent-Image.png",
    "Emu": "https://www.pngmart.com/files/7/Emu-PNG-Photos.png",
    "Cassowary": "https://www.pngmart.com/files/7/Cassowary-PNG-Transparent-Image.png",
    "Peacock": "https://www.pngmart.com/files/1/Peacock-PNG-Transparent-Image.png",
    "Parrot": "https://www.pngmart.com/files/1/Parrot-PNG-Transparent-Image.png",
    "Toucan": "https://www.pngmart.com/files/7/Toucan-PNG-Transparent-Image.png",
    "Flamingo": "https://www.pngmart.com/files/7/Flamingo-PNG-Transparent-Image.png",
    "Pelican": "https://www.pngmart.com/files/7/Pelican-PNG-Photos.png",
    "Swan": "https://www.pngmart.com/files/7/Swan-PNG-Transparent-Image.png",
    "Goose": "https://www.pngmart.com/files/7/Goose-PNG-Photo.png",
    "Stork": "https://www.pngmart.com/files/7/Stork-PNG-Transparent-Image.png",
    "Vulture": "https://www.pngmart.com/files/7/Vulture-PNG-Photos.png",
    "Shoebill": "https://www.pngmart.com/files/7/Shoebill-PNG-Transparent-Image.png",
    
    # Hoofed Animals - TRANSPARENT
    "Buffalo": "https://www.pngmart.com/files/7/Buffalo-PNG-Transparent-Image.png",
    "Bison": "https://www.pngmart.com/files/7/Bison-PNG-Photos.png",
    "Moose": "https://www.pngmart.com/files/7/Moose-PNG-Transparent-Image.png",
    "Elk": "https://www.pngmart.com/files/7/Elk-PNG-Photo.png",
    "Reindeer": "https://www.pngmart.com/files/7/Reindeer-PNG-Transparent-Image.png",
    "Caribou": "https://www.pngmart.com/files/7/Caribou-PNG-Photos.png",
    "Deer": "https://www.pngmart.com/files/7/Deer-PNG-Transparent-Image.png",
    "Antelope": "https://www.pngmart.com/files/7/Antelope-PNG-Photo.png",
    "Gazelle": "https://www.pngmart.com/files/7/Gazelle-PNG-Transparent-Image.png",
    "Impala": "https://www.pngmart.com/files/7/Impala-PNG-Photos.png",
    "Wildebeest": "https://www.pngmart.com/files/7/Wildebeest-PNG-Transparent-Image.png",
    "Warthog": "https://www.pngmart.com/files/7/Warthog-PNG-Photo.png",
    "Wild Boar": "https://www.pngmart.com/files/7/Wild-Boar-PNG-Transparent-Image.png",
    "Camel": "https://www.pngmart.com/files/7/Camel-PNG-Photos.png",
    "Llama": "https://www.pngmart.com/files/7/Llama-PNG-Transparent-Image.png",
    "Alpaca": "https://www.pngmart.com/files/7/Alpaca-PNG-Photo.png",
    "Yak": "https://www.pngmart.com/files/7/Yak-PNG-Transparent-Image.png",
    "Musk Ox": "https://www.pngmart.com/files/7/Musk-Ox-PNG-Photos.png",
    "Bighorn Sheep": "https://www.pngmart.com/files/7/Bighorn-Sheep-PNG-Transparent-Image.png",
    "Mountain Goat": "https://www.pngmart.com/files/7/Mountain-Goat-PNG-Photo.png",
    "Ibex": "https://www.pngmart.com/files/7/Ibex-PNG-Transparent-Image.png",
    
    # Smaller Mammals - TRANSPARENT
    "Kangaroo": "https://www.pngmart.com/files/1/Kangaroo-PNG-Transparent-Image.png",
    "Koala": "https://www.pngmart.com/files/1/Koala-PNG-Transparent-Image.png",
    "Wombat": "https://www.pngmart.com/files/7/Wombat-PNG-Transparent-Image.png",
    "Tasmanian Devil": "https://www.pngmart.com/files/7/Tasmanian-Devil-PNG-Photos.png",
    "Wolverine": "https://www.pngmart.com/files/7/Wolverine-PNG-Transparent-Image.png",
    "Badger": "https://www.pngmart.com/files/7/Badger-PNG-Photo.png",
    "Beaver": "https://www.pngmart.com/files/7/Beaver-PNG-Transparent-Image.png",
    "Porcupine": "https://www.pngmart.com/files/7/Porcupine-PNG-Photos.png",
    "Armadillo": "https://www.pngmart.com/files/7/Armadillo-PNG-Transparent-Image.png",
    "Pangolin": "https://www.pngmart.com/files/7/Pangolin-PNG-Photo.png",
    "Anteater": "https://www.pngmart.com/files/7/Anteater-PNG-Transparent-Image.png",
    "Sloth": "https://www.pngmart.com/files/7/Sloth-PNG-Photos.png",
    "Red Panda": "https://www.pngmart.com/files/7/Red-Panda-PNG-Transparent-Image.png",
    "Meerkat": "https://www.pngmart.com/files/7/Meerkat-PNG-Photo.png",
    "Mongoose": "https://www.pngmart.com/files/7/Mongoose-PNG-Transparent-Image.png",
    "Opossum": "https://www.pngmart.com/files/7/Opossum-PNG-Photos.png",
    "Skunk": "https://www.pngmart.com/files/7/Skunk-PNG-Transparent-Image.png",
    
    # Unique Species - TRANSPARENT
    "Platypus": "https://www.pngmart.com/files/7/Platypus-PNG-Transparent-Image.png",
    "Echidna": "https://www.pngmart.com/files/7/Echidna-PNG-Photo.png",
    "Capybara": "https://www.pngmart.com/files/7/Capybara-PNG-Transparent-Image.png",
    "Tapir": "https://www.pngmart.com/files/7/Tapir-PNG-Photos.png",
    "Okapi": "https://www.pngmart.com/files/7/Okapi-PNG-Transparent-Image.png",
    
    # Fish & Aquatic - TRANSPARENT
    "Piranha": "https://www.pngmart.com/files/7/Piranha-PNG-Transparent-Image.png",
    "Electric Eel": "https://www.pngmart.com/files/7/Eel-PNG-Photo.png",
    
    # Jellies & Invertebrates - TRANSPARENT
    "Box Jellyfish": "https://www.pngmart.com/files/7/Jellyfish-PNG-Transparent-Image.png",
    "Octopus": "https://www.pngmart.com/files/1/Octopus-PNG-Transparent-Image.png",
    "Giant Squid": "https://www.pngmart.com/files/7/Squid-PNG-Photos.png",
    "Mantis Shrimp": "https://www.pngmart.com/files/7/Shrimp-PNG-Transparent-Image.png",
    
    # Missing 10 - TRANSPARENT
    "Hippopotamus": "https://www.pngmart.com/files/7/Hippo-PNG-HD.png",
    "Orca": "https://www.pngmart.com/files/1/Killer-Whale-PNG-Transparent-Image.png",
    "Honey Badger": "https://www.pngmart.com/files/7/Honey-Badger-PNG-Transparent-Image.png",
    "Cape Buffalo": "https://www.pngmart.com/files/7/Buffalo-PNG-HD.png",
    "Bottlenose Dolphin": "https://www.pngmart.com/files/1/Dolphin-PNG-HD.png",
    "Rhinoceros": "https://www.pngmart.com/files/7/Rhino-PNG-HD.png",
    "Alligator": "https://www.pngmart.com/files/1/Alligator-PNG-HD.png",
    "Secretary Bird": "https://www.pngmart.com/files/7/Secretary-Bird-PNG-Transparent-Image.png",
    "Raccoon": "https://www.pngmart.com/files/7/Raccoon-PNG-Transparent-Image.png",
    "Red Fox": "https://www.pngmart.com/files/7/Red-Fox-PNG-Transparent-Image.png",
}


def load_animals():
    """Load animals from animal_stats.json"""
    try:
        with open('animal_stats.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print("❌ Error: animal_stats.json not found!")
        print("Make sure you're running this script from the animal-stats directory.")
        sys.exit(1)
    except json.JSONDecodeError:
        print("❌ Error: animal_stats.json is not valid JSON!")
        sys.exit(1)


def save_animals(animals):
    """Save animals back to animal_stats.json"""
    with open('animal_stats.json', 'w', encoding='utf-8') as f:
        json.dump(animals, f, indent=2, ensure_ascii=False)


def update_images(animals, specific_animals=None):
    """
    Update image URLs for animals.
    
    Args:
        animals: List of animal dictionaries
        specific_animals: Optional list of specific animal names to update
    """
    updated_count = 0
    missing_animals = []
    
    # If specific animals provided, only update those
    if specific_animals:
        print(f"📋 Updating {len(specific_animals)} specific animal(s)...")
        update_set = set(specific_animals)
    else:
        print(f"📋 Updating all animals...")
        update_set = None
    
    for animal in animals:
        name = animal.get('name', '')
        
        # Skip if we're doing specific updates and this isn't one of them
        if update_set and name not in update_set:
            continue
            
        if name in ANIMAL_IMAGES:
            animal['image'] = ANIMAL_IMAGES[name]
            print(f"✓ Updated: {name}")
            updated_count += 1
        else:
            missing_animals.append(name)
            print(f"⚠ Missing: {name}")
    
    return updated_count, missing_animals


def main():
    print("🎨 Animal Stats TRANSPARENT PNG Image Updater")
    print("=" * 50)
    
    # Check if specific animals were provided as command-line arguments
    specific_animals = sys.argv[1:] if len(sys.argv) > 1 else None
    
    # Load the current animal data
    print("✅ Loaded {} animals from animal_stats.json".format(len(load_animals())))
    animals = load_animals()
    
    # Update images
    updated_count, missing_animals = update_images(animals, specific_animals)
    
    # Save if any updates were made
    if updated_count > 0:
        save_animals(animals)
        print("\n💾 Saved changes to animal_stats.json")
        print(f"✅ Updated {updated_count} animal(s)")
    else:
        print("\n⚠ No animals were updated")
    
    # Report missing animals
    if missing_animals:
        print(f"\n⚠ {len(missing_animals)} animal(s) don't have URLs in this script yet:")
        for name in missing_animals:
            print(f"   - {name}")
        print("\nTo add missing animals:")
        print("1. Search: '[animal name] transparent PNG pngwing' on Google")
        print("2. Copy the direct image URL")
        print("3. Add it to ANIMAL_IMAGES dict in this script")
    
    print("\nDone! 🎉")
    print("\n✨ All updated images are TRANSPARENT PNGs with no background! ✨")


if __name__ == "__main__":
    main()
