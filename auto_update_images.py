#!/usr/bin/env python3
"""
Automatic Image URL Updater for Animal Stats
==============================================

This script automatically updates image URLs for animals in animal_stats.json.
It uses Wikimedia Commons URLs which:
- Appear in top Google Image search results
- Are reliable and fast-loading
- Have transparent backgrounds or clean images
- Are public domain/free to use

USAGE:
------
To update all animals:
    python auto_update_images.py

To update specific animals:
    python auto_update_images.py "African Elephant" "Lion" "Tiger"

To add a new animal:
    1. Add the animal to animal_stats.json
    2. Add its image URL to the ANIMAL_IMAGES dict below
    3. Run: python auto_update_images.py
"""

import json
import sys

# IMAGE URL DATABASE
# These are direct image URLs from Wikimedia Commons, which appear in top Google results
# When adding new animals, search "[animal name] png wikimedia" and add the direct image URL here

ANIMAL_IMAGES = {
    # Mammals - Big Cats
    "African Lion": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Lion_waiting_in_Namibia.jpg/1200px-Lion_waiting_in_Namibia.jpg",
    "Siberian Tiger": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Siberischer_tiger_de_edit02.jpg/1200px-Siberischer_tiger_de_edit02.jpg",
    "Bengal Tiger": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Walking_tiger_female.jpg/1200px-Walking_tiger_female.jpg",
    "Jaguar": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Standing_jaguar.jpg/1200px-Standing_jaguar.jpg",
    "Leopard": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/African_leopard_male_%28Panthera_pardus_pardus%29.jpg/1200px-African_leopard_male_%28Panthera_pardus_pardus%29.jpg",
    "Snow Leopard": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Irbis4.JPG/1200px-Irbis4.JPG",
    "Cheetah": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/TheCheethcat.jpg/1200px-TheCheethcat.jpg",
    "Cougar": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Mountain_Lion_in_Glacier_National_Park.jpg/1200px-Mountain_Lion_in_Glacier_National_Park.jpg",
    "Mountain Lion": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Mountain_Lion_in_Glacier_National_Park.jpg/1200px-Mountain_Lion_in_Glacier_National_Park.jpg",
    "Puma": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Mountain_Lion_in_Glacier_National_Park.jpg/1200px-Mountain_Lion_in_Glacier_National_Park.jpg",
    "Lynx": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Lynx_lynx_poing.jpg/1200px-Lynx_lynx_poing.jpg",
    
    # Mammals - Bears
    "Grizzly Bear": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Grizzlybear55.jpg/1200px-Grizzlybear55.jpg",
    "Polar Bear": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Polar_Bear_-_Alaska_%28cropped%29.jpg/1200px-Polar_Bear_-_Alaska_%28cropped%29.jpg",
    "Brown Bear": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Grizzlybear55.jpg/1200px-Grizzlybear55.jpg",
    "Black Bear": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/01_Schwarzb%C3%A4r.jpg/1200px-01_Schwarzb%C3%A4r.jpg",
    "Sloth Bear": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Sloth_Bear_Washington_DC.JPG/1200px-Sloth_Bear_Washington_DC.JPG",
    
    # Mammals - Elephants & Large Herbivores
    "African Elephant": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/African_Bush_Elephant.jpg/1200px-African_Bush_Elephant.jpg",
    "Hippopotamus": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Hippo_pod_edit.jpg/1200px-Hippo_pod_edit.jpg",
    "Rhinoceros": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/White_Rhino.JPG/1200px-White_Rhino.JPG",
    "Cape Buffalo": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Buffle_d%27Afrique_RNCF.jpg/1200px-Buffle_d%27Afrique_RNCF.jpg",
    "Bison": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Bison_bonasus_%28Linnaeus_1758%29.jpg/1200px-Bison_bonasus_%28Linnaeus_1758%29.jpg",
    "Moose": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Moose_superior.jpg/1200px-Moose_superior.jpg",
    "Giraffe": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Giraffe_Mikumi_National_Park.jpg/1200px-Giraffe_Mikumi_National_Park.jpg",
    "Zebra": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Plains_Zebra_Equus_quagga.jpg/1200px-Plains_Zebra_Equus_quagga.jpg",
    
    # Mammals - Primates
    "Gorilla": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Gorille_des_plaines_de_l%27ouest_%C3%A0_l%27Espace_Zoologique.jpg/1200px-Gorille_des_plaines_de_l%27ouest_%C3%A0_l%27Espace_Zoologique.jpg",
    "Chimpanzee": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Schimpanse_Zoo_Leipzig.jpg/1200px-Schimpanse_Zoo_Leipzig.jpg",
    "Orangutan": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Orang_Utan%2C_Semenggok_Forest_Reserve%2C_Sarawak%2C_Borneo%2C_Malaysia.JPG/1200px-Orang_Utan%2C_Semenggok_Forest_Reserve%2C_Sarawak%2C_Borneo%2C_Malaysia.JPG",
    
    # Mammals - Wolves & Canines
    "Gray Wolf": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Eurasian_wolf_2.jpg/1200px-Eurasian_wolf_2.jpg",
    "Red Fox": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Vulpes_vulpes_laying_in_snow.jpg/1200px-Vulpes_vulpes_laying_in_snow.jpg",
    "Coyote": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Canis_latrans_Yellowstone.jpg/1200px-Canis_latrans_Yellowstone.jpg",
    
    # Reptiles - Crocodiles
    "Saltwater Crocodile": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Crocodylus-porosus-2.jpg/1200px-Crocodylus-porosus-2.jpg",
    "Nile Crocodile": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Nile_crocodile_head.jpg/1200px-Nile_crocodile_head.jpg",
    "American Alligator": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/American_Alligator.jpg/1200px-American_Alligator.jpg",
    "Alligator": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/American_Alligator.jpg/1200px-American_Alligator.jpg",
    "Komodo Dragon": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Komodo_dragon_%28Varanus_komodoensis%29.jpg/1200px-Komodo_dragon_%28Varanus_komodoensis%29.jpg",
    
    # Reptiles - Snakes
    "King Cobra": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Ophiophagus_hannah_2.jpg/1200px-Ophiophagus_hannah_2.jpg",
    "Anaconda": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Sucuri_verde.jpg/1200px-Sucuri_verde.jpg",
    "Python": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Python_molurus_molurus_2.jpg/1200px-Python_molurus_molurus_2.jpg",
    
    # Birds
    "Bald Eagle": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/About_to_Launch_%2826075320352%29.jpg/1200px-About_to_Launch_%2826075320352%29.jpg",
    "Golden Eagle": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Golden_Eagle_%28Aquila_chrysaetos%29_%2820074906710%29.jpg/1200px-Golden_Eagle_%28Aquila_chrysaetos%29_%2820074906710%29.jpg",
    "Harpy Eagle": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Harpia_harpyja_-Belize_Zoo-8a_%281%29.jpg/1200px-Harpia_harpyja_-Belize_Zoo-8a_%281%29.jpg",
    "Peregrine Falcon": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Peregrine_Falcon_%28Falco_peregrinus%29_-_geograph.org.uk_-_2612809.jpg/1200px-Peregrine_Falcon_%28Falco_peregrinus%29_-_geograph.org.uk_-_2612809.jpg",
    "Cassowary": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Casuarius_casuarius_Southern_Cassowary_PNG_by_Nick_Hobgood.jpg/1200px-Casuarius_casuarius_Southern_Cassowary_PNG_by_Nick_Hobgood.jpg",
    "Ostrich": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Common_ostrich_Struthio_camelus.jpg/1200px-Common_ostrich_Struthio_camelus.jpg",
    "Secretary Bird": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Sagittarius_serpentarius_%28Mus%C3%A9e_des_Confluences%29.jpg/1200px-Sagittarius_serpentarius_%28Mus%C3%A9e_des_Confluences%29.jpg",
    
    # Marine Animals
    "Great White Shark": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/White_shark.jpg/1200px-White_shark.jpg",
    "Orca": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Killerwhales_jumping.jpg/1200px-Killerwhales_jumping.jpg",
    "Bottlenose Dolphin": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Tursiops_truncatus_01.jpg/1200px-Tursiops_truncatus_01.jpg",
    "Blue Whale": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Blauwal.jpg/1200px-Blauwal.jpg",
    "Walrus": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Pacific_Walrus_-_Bull_%288247646168%29.jpg/1200px-Pacific_Walrus_-_Bull_%288247646168%29.jpg",
    "Octopus": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Octopus3.jpg/1200px-Octopus3.jpg",
    
    # Other Animals
    "Wolverine": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Wolverine_on_rock.jpg/1200px-Wolverine_on_rock.jpg",
    "Honey Badger": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Mellivora_capensis_1838.jpg/1200px-Mellivora_capensis_1838.jpg",
    "Hyena": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Crocuta_crocuta_-_Etosha%2C_2014.jpg/1200px-Crocuta_crocuta_-_Etosha%2C_2014.jpg",
    "Kangaroo": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Macropus_giganteus_-_04.jpg/1200px-Macropus_giganteus_-_04.jpg",
    "Platypus": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Platypus-sketch.jpg/1200px-Platypus-sketch.jpg",
    "Tasmanian Devil": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Tas_devil_head_on.JPG/1200px-Tas_devil_head_on.JPG",
    "Wild Boar": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Sus_scrofa_-Barcelona_Zoo%2C_Spain-8a.jpg/1200px-Sus_scrofa_-Barcelona_Zoo%2C_Spain-8a.jpg",
    "Elk": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Cervus_canadensis2.jpg/1200px-Cervus_canadensis2.jpg",
    "Reindeer": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Rangifer_tarandus_%28Norwegian_zoo%29.jpg/1200px-Rangifer_tarandus_%28Norwegian_zoo%29.jpg",
    "Raccoon": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Procyon_lotor_%28Common_raccoon%29.jpg/1200px-Procyon_lotor_%28Common_raccoon%29.jpg",
    
    # Additional Animals
    "Mantis Shrimp": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/OdontodactylusScyllarus2.jpg/1200px-OdontodactylusScyllarus2.jpg",
    "Box Jellyfish": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Avispa_marina_%28Chironex_fleckeri%29%2C_Acuario_de_Sídney%2C_Australia%2C_2017-06-22%2C_DD_07.jpg/1200px-Avispa_marina_%28Chironex_fleckeri%29%2C_Acuario_de_Sídney%2C_Australia%2C_2017-06-22%2C_DD_07.jpg",
    "Electric Eel": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Electric_eel_at_boston_aquarium.jpg/1200px-Electric_eel_at_boston_aquarium.jpg",
    "Shoebill": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Schuhschnabel_%2801%29%2C_crop.jpg/1200px-Schuhschnabel_%2801%29%2C_crop.jpg",
    "Piranha": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Piranha_fish.jpg/1200px-Piranha_fish.jpg",
    "Porcupine": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Erethizon_dorsatum5.jpg/1200px-Erethizon_dorsatum5.jpg",
    "Badger": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Badger-badger.jpg/1200px-Badger-badger.jpg",
    "Anteater": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Tamandua_mexicana_in_Costa_Rica_2.jpg/1200px-Tamandua_mexicana_in_Costa_Rica_2.jpg",
    "Pangolin": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Tree_Pangolin.JPG/1200px-Tree_Pangolin.JPG",
    "Armadillo": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Nine-banded_Armadillo.jpg/1200px-Nine-banded_Armadillo.jpg",
    "Sloth": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Bradypus.jpg/1200px-Bradypus.jpg",
    "Red Panda": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Red_Panda_%2824986761703%29.jpg/1200px-Red_Panda_%2824986761703%29.jpg",
    "Meerkat": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Meerkat_Pup.JPG/1200px-Meerkat_Pup.JPG",
    "Mongoose": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Herpestes_javanicus_1.jpg/1200px-Herpestes_javanicus_1.jpg",
    "Opossum": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Opossum_2.jpg/1200px-Opossum_2.jpg",
    "Skunk": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Skunk_in_yard.jpg/1200px-Skunk_in_yard.jpg",
    "Wildebeest": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Wildebeest_Masai_Mara.jpg/1200px-Wildebeest_Masai_Mara.jpg",
    "Gazelle": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Thomson%27s_Gazelle.jpg/1200px-Thomson%27s_Gazelle.jpg",
    "Impala": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Impala_Aepyceros_melampus.jpg/1200px-Impala_Aepyceros_melampus.jpg",
    "Warthog": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Common_Warthog%2C_Phacochoerus_africanus_Phacochoerus_africanus_at_Kruger_Park_%2811983525703%29.jpg/1200px-thumbnail.jpg",
    "Emu": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Emu-wild.jpg/1200px-Emu-wild.jpg",
    "Vulture": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Vulture_in_flight.jpg/1200px-Vulture_in_flight.jpg",
    "Stork": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/White_Stork_%28Ciconia_ciconia%29_..._%2831270153923%29.jpg/1200px-White_Stork_%28Ciconia_ciconia%29_..._%2831270153923%29.jpg",
    "Flamingo": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Flamingo_%282898334451%29.jpg/1200px-Flamingo_%282898334451%29.jpg",
    "Pelican": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Brown-Pelican-5185-2.jpg/1200px-Brown-Pelican-5185-2.jpg",
    "Swan": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Mute_swan_Vrhnika.jpg/1200px-Mute_swan_Vrhnika.jpg",
    "Goose": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Anser_anser_1_%28Piotr_Kuczynski%29.jpg/1200px-Anser_anser_1_%28Piotr_Kuczynski%29.jpg",
    "Camel": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/07._Camel_Profile%2C_near_Silverton%2C_NSW%2C_07.07.2007.jpg/1200px-07._Camel_Profile%2C_near_Silverton%2C_NSW%2C_07.07.2007.jpg",
    "Llama": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Llama_lying_down.jpg/1200px-Llama_lying_down.jpg",
    "Alpaca": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Vicugna_pacos_01_by_Line1.JPG/1200px-Vicugna_pacos_01_by_Line1.JPG",
    "Bighorn Sheep": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Bighorn_Sheep_%287523903530%29.jpg/1200px-Bighorn_Sheep_%287523903530%29.jpg",
    "Mountain Goat": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Mountain_Goat_USFWS.jpg/1200px-Mountain_Goat_USFWS.jpg",
    "Ibex": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Ibex_in_the_Judean_Desert.jpg/1200px-Ibex_in_the_Judean_Desert.jpg",
    "Yak": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Bos_grunniens_at_Yundrok_Yumtso_Lake.jpg/1200px-Bos_grunniens_at_Yundrok_Yumtso_Lake.jpg",
    "Musk Ox": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Ovibos_moschatus_qtl3.jpg/1200px-Ovibos_moschatus_qtl3.jpg",
    "Fennec Fox": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Fennec_Fox_Vulpes_zerda.jpg/1200px-Fennec_Fox_Vulpes_zerda.jpg",
    "Arctic Fox": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Polarfuchs_1_2004-11-17.jpg/1200px-Polarfuchs_1_2004-11-17.jpg",
    "Dingo": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Canis_lupus_dingo_-_cleland_wildlife_park.jpg/1200px-Canis_lupus_dingo_-_cleland_wildlife_park.jpg",
    "Jackal": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Black-backed_Jackal_Masai_Mara.jpg/1200px-Black-backed_Jackal_Masai_Mara.jpg",
    "Beaver": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/American_Beaver.jpg/1200px-American_Beaver.jpg",
    "Otter": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/River_otter_swimming.JPG/1200px-River_otter_swimming.JPG",
    "Sea Otter": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Sea_otter_cropped.jpg/1200px-Sea_otter_cropped.jpg",
    "Seal": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Harbor_Seal_NOAA.jpg/1200px-Harbor_Seal_NOAA.jpg",
    "Sea Lion": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/California_sea_lion_in_La_Jolla_%2870568%29.jpg/1200px-California_sea_lion_in_La_Jolla_%2870568%29.jpg",
    "Manatee": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/FL_fig04.jpg/1200px-FL_fig04.jpg",
}


def load_animals():
    """Load the animal_stats.json file."""
    try:
        with open('animal_stats.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print("❌ Error: animal_stats.json not found!")
        print("   Make sure you're running this script from the project directory.")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ Error: Invalid JSON in animal_stats.json: {e}")
        sys.exit(1)


def save_animals(animals):
    """Save the updated animals back to animal_stats.json."""
    with open('animal_stats.json', 'w', encoding='utf-8') as f:
        json.dump(animals, f, indent=2, ensure_ascii=False)


def update_images(animals, specific_animals=None):
    """Update image URLs for animals."""
    updated = 0
    missing = []
    
    for animal in animals:
        name = animal['name']
        
        # If specific animals are specified, only update those
        if specific_animals and name not in specific_animals:
            continue
        
        if name in ANIMAL_IMAGES:
            animal['image'] = ANIMAL_IMAGES[name]
            print(f"✓ Updated: {name}")
            updated += 1
        else:
            print(f"⚠ Missing URL for: {name}")
            missing.append(name)
    
    return updated, missing


def main():
    print("🔍 Animal Stats Image Updater")
    print("=" * 50)
    print()
    
    # Check if specific animals are specified
    specific_animals = sys.argv[1:] if len(sys.argv) > 1 else None
    
    if specific_animals:
        print(f"📋 Updating specific animals: {', '.join(specific_animals)}")
    else:
        print("📋 Updating all animals...")
    print()
    
    # Load animals
    animals = load_animals()
    print(f"✅ Loaded {len(animals)} animals from animal_stats.json")
    print()
    
    # Update images
    updated, missing = update_images(animals, specific_animals)
    
    # Save changes
    if updated > 0:
        save_animals(animals)
        print()
        print(f"💾 Saved changes to animal_stats.json")
        print(f"✅ Updated {updated} animal(s)")
        
        if missing:
            print()
            print(f"⚠ {len(missing)} animal(s) need image URLs added to the script:")
            for name in missing:
                print(f"   - {name}")
            print()
            print("To add missing animals:")
            print("1. Search: '[animal name] wikimedia commons'")
            print("2. Copy the direct image URL")
            print("3. Add it to ANIMAL_IMAGES dict in this script")
    else:
        print()
        print("ℹ No animals were updated.")
        if specific_animals:
            print("Make sure the animal names match exactly (case-sensitive).")
    
    print()
    print("Done! 🎉")


if __name__ == "__main__":
    main()
