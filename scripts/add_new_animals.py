import json
import os
import time
import random

# Import image search functions from the existing script
try:
    from auto_image_finder import search_google_images_scrape, search_bing_images
except ImportError:
    # Fallback if import fails (e.g. if running in a different way)
    def search_google_images_scrape(query):
        print(f"  (Mock) Searching for {query}...")
        return None
    def search_bing_images(query, key): return None

def get_new_animals():
    return [
        # --- PRIMATES ---
        {"name": "Ring-tailed Lemur", "scientific_name": "Lemur catta", "class": "Scout", "type": "Mammal", "stats": [40, 35, 85, 65, 60, 45]},
        {"name": "Baboon", "scientific_name": "Papio", "class": "Fighter", "type": "Mammal", "stats": [65, 55, 60, 75, 70, 60]},
        {"name": "Gibbon", "scientific_name": "Hylobatidae", "class": "Scout", "type": "Mammal", "stats": [45, 40, 95, 70, 75, 50]},
        {"name": "Spider Monkey", "scientific_name": "Ateles", "class": "Scout", "type": "Mammal", "stats": [40, 35, 90, 60, 70, 45]},
        {"name": "Howler Monkey", "scientific_name": "Alouatta", "class": "Bard", "type": "Mammal", "stats": [50, 45, 65, 60, 65, 75]},
        {"name": "Capuchin Monkey", "scientific_name": "Cebinae", "class": "Rogue", "type": "Mammal", "stats": [35, 30, 80, 55, 85, 50]},
        {"name": "Proboscis Monkey", "scientific_name": "Nasalis larvatus", "class": "Civilian", "type": "Mammal", "stats": [40, 40, 50, 50, 60, 30]},
        {"name": "Japanese Macaque", "scientific_name": "Macaca fuscata", "class": "Survivor", "type": "Mammal", "stats": [50, 50, 60, 70, 75, 40]},
        
        # --- BIG CATS & FELINES ---
        {"name": "Serval", "scientific_name": "Leptailurus serval", "class": "Assassin", "type": "Mammal", "stats": [60, 40, 90, 65, 60, 70]},
        {"name": "Ocelot", "scientific_name": "Leopardus pardalis", "class": "Rogue", "type": "Mammal", "stats": [55, 45, 80, 60, 65, 50]},
        {"name": "Bobcat", "scientific_name": "Lynx rufus", "class": "Fighter", "type": "Mammal", "stats": [65, 50, 75, 65, 60, 55]},
        {"name": "Black Panther", "scientific_name": "Panthera pardus", "class": "Assassin", "type": "Mammal", "stats": [85, 70, 85, 80, 75, 80]},
        
        # --- CANINES ---
        {"name": "African Wild Dog", "scientific_name": "Lycaon pictus", "class": "Hunter", "type": "Mammal", "stats": [70, 50, 75, 95, 80, 65]},
        {"name": "Maned Wolf", "scientific_name": "Chrysocyon brachyurus", "class": "Scout", "type": "Mammal", "stats": [60, 45, 70, 75, 60, 50]},
        {"name": "Arctic Wolf", "scientific_name": "Canis lupus arctos", "class": "Hunter", "type": "Mammal", "stats": [75, 65, 70, 90, 80, 60]},
        {"name": "Dhole", "scientific_name": "Cuon alpinus", "class": "Fighter", "type": "Mammal", "stats": [65, 50, 75, 85, 70, 55]},
        
        # --- BEARS & MUSTELIDS ---
        {"name": "Sun Bear", "scientific_name": "Helarctos malayanus", "class": "Fighter", "type": "Mammal", "stats": [70, 65, 50, 70, 60, 55]},
        {"name": "Spectacled Bear", "scientific_name": "Tremarctos ornatus", "class": "Tank", "type": "Mammal", "stats": [75, 70, 45, 75, 65, 50]},
        {"name": "Black Bear", "scientific_name": "Ursus americanus", "class": "Tank", "type": "Mammal", "stats": [80, 75, 55, 80, 70, 60]},
        {"name": "Sea Otter", "scientific_name": "Enhydra lutris", "class": "Civilian", "type": "Mammal", "stats": [40, 35, 60, 50, 75, 45]}, # Note: Check if duplicate
        {"name": "Ferret", "scientific_name": "Mustela putorius furo", "class": "Rogue", "type": "Mammal", "stats": [45, 30, 80, 60, 65, 40]},
        {"name": "Stoat", "scientific_name": "Mustela erminea", "class": "Assassin", "type": "Mammal", "stats": [55, 30, 90, 70, 60, 50]},
        
        # --- UNGULATES (Hoofed) ---
        {"name": "Kudu", "scientific_name": "Tragelaphus", "class": "Scout", "type": "Mammal", "stats": [50, 45, 75, 70, 50, 40]},
        {"name": "Oryx", "scientific_name": "Oryx gazella", "class": "Fighter", "type": "Mammal", "stats": [65, 60, 65, 80, 50, 55]},
        {"name": "Sable Antelope", "scientific_name": "Hippotragus niger", "class": "Fighter", "type": "Mammal", "stats": [70, 65, 60, 75, 50, 60]},
        {"name": "Pronghorn", "scientific_name": "Antilocapra americana", "class": "Speedster", "type": "Mammal", "stats": [40, 35, 98, 85, 50, 45]},
        {"name": "Bongo", "scientific_name": "Tragelaphus eurycerus", "class": "Stealth", "type": "Mammal", "stats": [50, 45, 65, 60, 50, 55]},
        {"name": "Black Rhinoceros", "scientific_name": "Diceros bicornis", "class": "Tank", "type": "Mammal", "stats": [85, 90, 40, 80, 45, 75]},
        {"name": "Wild Horse", "scientific_name": "Equus ferus", "class": "Runner", "type": "Mammal", "stats": [55, 50, 80, 90, 60, 50]},
        {"name": "Donkey", "scientific_name": "Equus africanus asinus", "class": "Worker", "type": "Mammal", "stats": [45, 50, 50, 95, 55, 40]},
        {"name": "Bactrian Camel", "scientific_name": "Camelus bactrianus", "class": "Survivor", "type": "Mammal", "stats": [55, 60, 45, 100, 55, 50]},
        {"name": "Guanaco", "scientific_name": "Lama guanicoe", "class": "Survivor", "type": "Mammal", "stats": [45, 40, 65, 80, 50, 45]},
        
        # --- MARSUPIALS ---
        {"name": "Koala", "scientific_name": "Phascolarctos cinereus", "class": "Civilian", "type": "Mammal", "stats": [30, 40, 20, 30, 35, 25]},
        {"name": "Wombat", "scientific_name": "Vombatidae", "class": "Tank", "type": "Mammal", "stats": [50, 75, 40, 60, 45, 50]},
        {"name": "Sugar Glider", "scientific_name": "Petaurus breviceps", "class": "Glider", "type": "Mammal", "stats": [25, 20, 85, 40, 55, 60]},
        {"name": "Wallaby", "scientific_name": "Macropodidae", "class": "Jumper", "type": "Mammal", "stats": [45, 40, 75, 60, 45, 50]},
        {"name": "Quoll", "scientific_name": "Dasyurus", "class": "Hunter", "type": "Mammal", "stats": [55, 40, 70, 60, 50, 45]},
        
        # --- RODENTS & SMALL MAMMALS ---
        {"name": "Capybara", "scientific_name": "Hydrochoerus hydrochaeris", "class": "Chill", "type": "Mammal", "stats": [30, 40, 45, 60, 55, 80]}, # Check dupes
        {"name": "Porcupine", "scientific_name": "Erethizontidae", "class": "Defender", "type": "Mammal", "stats": [45, 85, 30, 50, 45, 70]}, # Check dupes
        {"name": "Beaver", "scientific_name": "Castor", "class": "Builder", "type": "Mammal", "stats": [45, 55, 40, 70, 75, 60]}, # Check dupes
        {"name": "Hedgehog", "scientific_name": "Erinaceinae", "class": "Defender", "type": "Mammal", "stats": [30, 80, 35, 45, 40, 65]},
        {"name": "Flying Squirrel", "scientific_name": "Pteromyini", "class": "Glider", "type": "Mammal", "stats": [25, 20, 90, 40, 50, 55]},
        {"name": "Naked Mole Rat", "scientific_name": "Heterocephalus glaber", "class": "Survivor", "type": "Mammal", "stats": [30, 30, 30, 90, 50, 60]},
        {"name": "Armadillo", "scientific_name": "Cingulata", "class": "Tank", "type": "Mammal", "stats": [40, 85, 35, 60, 40, 55]}, # Check dupes
        {"name": "Pangolin", "scientific_name": "Pholidota", "class": "Tank", "type": "Mammal", "stats": [45, 90, 30, 55, 45, 60]}, # Check dupes
        
        # --- BIRDS ---
        {"name": "Great Horned Owl", "scientific_name": "Bubo virginianus", "class": "Hunter", "type": "Bird", "stats": [70, 40, 75, 60, 80, 70]},
        {"name": "Barn Owl", "scientific_name": "Tyto alba", "class": "Hunter", "type": "Bird", "stats": [60, 35, 70, 55, 75, 65]},
        {"name": "Red-tailed Hawk", "scientific_name": "Buteo jamaicensis", "class": "Hunter", "type": "Bird", "stats": [65, 40, 80, 65, 70, 60]},
        {"name": "Golden Eagle", "scientific_name": "Aquila chrysaetos", "class": "Hunter", "type": "Bird", "stats": [80, 50, 85, 75, 75, 70]},
        {"name": "Osprey", "scientific_name": "Pandion haliaetus", "class": "Fisher", "type": "Bird", "stats": [65, 40, 80, 60, 70, 65]},
        {"name": "Vulture", "scientific_name": "Cathartidae", "class": "Scavenger", "type": "Bird", "stats": [50, 55, 60, 90, 60, 50]}, # Check dupes
        {"name": "Condor", "scientific_name": "Gymnogyps californianus", "class": "Scavenger", "type": "Bird", "stats": [55, 60, 65, 95, 65, 55]},
        {"name": "Albatross", "scientific_name": "Diomedeidae", "class": "Traveler", "type": "Bird", "stats": [45, 40, 70, 100, 60, 50]},
        {"name": "Puffin", "scientific_name": "Fratercula", "class": "Fisher", "type": "Bird", "stats": [35, 30, 65, 50, 55, 45]},
        {"name": "Toucan", "scientific_name": "Ramphastidae", "class": "Civilian", "type": "Bird", "stats": [35, 30, 55, 45, 55, 40]}, # Check dupes
        {"name": "Macaw", "scientific_name": "Ara", "class": "Bard", "type": "Bird", "stats": [40, 35, 60, 50, 85, 55]},
        {"name": "Cockatoo", "scientific_name": "Cacatuidae", "class": "Bard", "type": "Bird", "stats": [45, 40, 55, 50, 80, 60]},
        {"name": "Hummingbird", "scientific_name": "Trochilidae", "class": "Speedster", "type": "Bird", "stats": [20, 10, 100, 30, 50, 70]},
        {"name": "Peacock", "scientific_name": "Pavo cristatus", "class": "Bard", "type": "Bird", "stats": [40, 35, 45, 40, 45, 80]},
        {"name": "Cassowary", "scientific_name": "Casuarius", "class": "Fighter", "type": "Bird", "stats": [85, 60, 75, 70, 50, 65]}, # Check dupes
        {"name": "Kiwi", "scientific_name": "Apteryx", "class": "Scout", "type": "Bird", "stats": [30, 30, 40, 50, 45, 40]},
        {"name": "Kookaburra", "scientific_name": "Dacelo", "class": "Bard", "type": "Bird", "stats": [40, 30, 60, 50, 55, 55]},
        {"name": "Magpie", "scientific_name": "Pica pica", "class": "Thief", "type": "Bird", "stats": [35, 30, 70, 55, 90, 50]},
        {"name": "Raven", "scientific_name": "Corvus corax", "class": "Mage", "type": "Bird", "stats": [45, 35, 65, 60, 95, 60]},
        {"name": "Crow", "scientific_name": "Corvus brachyrhynchos", "class": "Scout", "type": "Bird", "stats": [40, 30, 60, 55, 90, 50]},
        
        # --- REPTILES ---
        {"name": "Green Anaconda", "scientific_name": "Eunectes murinus", "class": "Grappler", "type": "Reptile", "stats": [85, 70, 40, 80, 50, 75]}, # Check dupes
        {"name": "Reticulated Python", "scientific_name": "Malayopython reticulatus", "class": "Grappler", "type": "Reptile", "stats": [80, 65, 45, 75, 50, 70]},
        {"name": "Boa Constrictor", "scientific_name": "Boa constrictor", "class": "Grappler", "type": "Reptile", "stats": [75, 60, 40, 70, 45, 65]},
        {"name": "Gaboon Viper", "scientific_name": "Bitis gabonica", "class": "Assassin", "type": "Reptile", "stats": [90, 50, 55, 40, 45, 85]},
        {"name": "Rattlesnake", "scientific_name": "Crotalus", "class": "Assassin", "type": "Reptile", "stats": [85, 45, 60, 50, 50, 80]},
        {"name": "Gila Monster", "scientific_name": "Heloderma suspectum", "class": "Tank", "type": "Reptile", "stats": [70, 75, 30, 60, 45, 75]},
        {"name": "Monitor Lizard", "scientific_name": "Varanus", "class": "Fighter", "type": "Reptile", "stats": [75, 65, 65, 70, 60, 60]},
        {"name": "Iguana", "scientific_name": "Iguana iguana", "class": "Civilian", "type": "Reptile", "stats": [45, 50, 55, 60, 45, 40]},
        {"name": "Chameleon", "scientific_name": "Chamaeleonidae", "class": "Stealth", "type": "Reptile", "stats": [35, 40, 45, 40, 55, 90]},
        {"name": "Gecko", "scientific_name": "Gekkonidae", "class": "Climber", "type": "Reptile", "stats": [30, 30, 70, 45, 45, 60]},
        {"name": "Snapping Turtle", "scientific_name": "Chelydra serpentina", "class": "Tank", "type": "Reptile", "stats": [75, 90, 20, 60, 40, 65]},
        {"name": "Leatherback Sea Turtle", "scientific_name": "Dermochelys coriacea", "class": "Tank", "type": "Reptile", "stats": [60, 85, 50, 95, 55, 50]},
        {"name": "Galapagos Tortoise", "scientific_name": "Chelonoidis niger", "class": "Tank", "type": "Reptile", "stats": [40, 95, 10, 100, 50, 40]}, # Check dupes
        
        # --- AMPHIBIANS ---
        {"name": "Bullfrog", "scientific_name": "Lithobates catesbeianus", "class": "Jumper", "type": "Amphibian", "stats": [40, 35, 65, 50, 35, 45]},
        {"name": "Red-Eyed Tree Frog", "scientific_name": "Agalychnis callidryas", "class": "Climber", "type": "Amphibian", "stats": [25, 20, 75, 40, 40, 55]},
        {"name": "Poison Dart Frog", "scientific_name": "Dendrobatidae", "class": "Toxic", "type": "Amphibian", "stats": [20, 15, 60, 40, 35, 100]}, # Check dupes
        {"name": "Salamander", "scientific_name": "Caudata", "class": "Survivor", "type": "Amphibian", "stats": [30, 30, 40, 50, 35, 50]},
        {"name": "Hellbender", "scientific_name": "Cryptobranchus alleganiensis", "class": "Tank", "type": "Amphibian", "stats": [45, 50, 30, 60, 35, 40]},
        
        # --- MARINE LIFE ---
        {"name": "Manta Ray", "scientific_name": "Mobula birostris", "class": "Glider", "type": "Fish", "stats": [50, 60, 75, 80, 65, 55]},
        {"name": "Stingray", "scientific_name": "Myliobatoidei", "class": "Stealth", "type": "Fish", "stats": [65, 55, 60, 60, 50, 70]},
        {"name": "Sawfish", "scientific_name": "Pristidae", "class": "Fighter", "type": "Fish", "stats": [75, 65, 55, 70, 45, 60]},
        {"name": "Barracuda", "scientific_name": "Sphyraena", "class": "Hunter", "type": "Fish", "stats": [80, 45, 90, 65, 50, 60]},
        {"name": "Marlin", "scientific_name": "Istiophoridae", "class": "Speedster", "type": "Fish", "stats": [85, 50, 95, 75, 50, 65]},
        {"name": "Sailfish", "scientific_name": "Istiophorus", "class": "Speedster", "type": "Fish", "stats": [80, 45, 100, 70, 50, 60]},
        {"name": "Tuna", "scientific_name": "Thunnini", "class": "Speedster", "type": "Fish", "stats": [60, 55, 90, 95, 45, 50]},
        {"name": "Anglerfish", "scientific_name": "Lophiiformes", "class": "Lure", "type": "Fish", "stats": [75, 40, 30, 50, 35, 85]},
        {"name": "Lionfish", "scientific_name": "Pterois", "class": "Toxic", "type": "Fish", "stats": [65, 60, 40, 50, 40, 90]},
        {"name": "Moray Eel", "scientific_name": "Muraenidae", "class": "Fighter", "type": "Fish", "stats": [75, 60, 50, 60, 45, 65]},
        {"name": "Giant Squid", "scientific_name": "Architeuthis dux", "class": "Grappler", "type": "Invertebrate", "stats": [85, 50, 60, 70, 75, 80]},
        {"name": "Colossal Squid", "scientific_name": "Mesonychoteuthis hamiltoni", "class": "Grappler", "type": "Invertebrate", "stats": [90, 55, 55, 75, 70, 85]},
        {"name": "Cuttlefish", "scientific_name": "Sepiida", "class": "Mage", "type": "Invertebrate", "stats": [50, 45, 65, 50, 85, 95]},
        {"name": "Nautilus", "scientific_name": "Nautilidae", "class": "Tank", "type": "Invertebrate", "stats": [40, 80, 30, 60, 40, 50]},
        {"name": "Coconut Crab", "scientific_name": "Birgus latro", "class": "Tank", "type": "Invertebrate", "stats": [80, 85, 30, 70, 45, 60]},
        {"name": "King Crab", "scientific_name": "Paralithodes camtschaticus", "class": "Tank", "type": "Invertebrate", "stats": [70, 80, 25, 65, 40, 55]},
        {"name": "Lobster", "scientific_name": "Nephropidae", "class": "Tank", "type": "Invertebrate", "stats": [65, 85, 35, 60, 40, 50]},
        {"name": "Mantis Shrimp", "scientific_name": "Stomatopoda", "class": "Striker", "type": "Invertebrate", "stats": [95, 60, 85, 60, 55, 90]}, # Check dupes
        
        # --- INSECTS & ARACHNIDS ---
        {"name": "Praying Mantis", "scientific_name": "Mantodea", "class": "Fighter", "type": "Insect", "stats": [80, 50, 75, 60, 55, 70]},
        {"name": "Hercules Beetle", "scientific_name": "Dynastes hercules", "class": "Tank", "type": "Insect", "stats": [75, 90, 30, 70, 35, 50]},
        {"name": "Stag Beetle", "scientific_name": "Lucanidae", "class": "Fighter", "type": "Insect", "stats": [70, 85, 35, 65, 35, 50]},
        {"name": "Bullet Ant", "scientific_name": "Paraponera clavata", "class": "Soldier", "type": "Insect", "stats": [85, 45, 60, 80, 50, 90]},
        {"name": "Army Ant", "scientific_name": "Dorylus", "class": "Swarm", "type": "Insect", "stats": [60, 40, 50, 90, 60, 70]},
        {"name": "Monarch Butterfly", "scientific_name": "Danaus plexippus", "class": "Civilian", "type": "Insect", "stats": [10, 10, 60, 80, 30, 40]},
        {"name": "Dragonfly", "scientific_name": "Anisoptera", "class": "Ace", "type": "Insect", "stats": [65, 30, 100, 60, 55, 50]},
        {"name": "Hornet", "scientific_name": "Vespa", "class": "Soldier", "type": "Insect", "stats": [75, 40, 80, 65, 55, 85]},
        {"name": "Tarantula Hawk", "scientific_name": "Pepsis", "class": "Slayer", "type": "Insect", "stats": [90, 50, 75, 70, 45, 95]},
        {"name": "Black Widow", "scientific_name": "Latrodectus", "class": "Assassin", "type": "Arachnid", "stats": [85, 30, 60, 50, 55, 95]},
        {"name": "Huntsman Spider", "scientific_name": "Sparassidae", "class": "Speedster", "type": "Arachnid", "stats": [65, 35, 90, 60, 50, 60]},
        {"name": "Deathstalker Scorpion", "scientific_name": "Leiurus quinquestriatus", "class": "Assassin", "type": "Arachnid", "stats": [80, 60, 65, 70, 40, 95]},
        {"name": "Camel Spider", "scientific_name": "Solifugae", "class": "Berserker", "type": "Arachnid", "stats": [70, 45, 85, 65, 35, 60]},
    ]

def generate_full_stats(animal):
    """Fill in missing fields with reasonable defaults or calculations"""
    # Map stats array to named fields if present
    if "stats" in animal:
        s = animal["stats"]
        animal["attack"] = s[0]
        animal["defense"] = s[1]
        animal["agility"] = s[2]
        animal["stamina"] = s[3]
        animal["intelligence"] = s[4]
        animal["special_attack"] = s[5]
        del animal["stats"]
    
    # Defaults
    defaults = {
        "habitat": "Varied",
        "size": "Medium",
        "weight_kg": 50,
        "height_cm": 50,
        "length_cm": 100,
        "speed_mps": 10,
        "lifespan_years": 15,
        "isNocturnal": False,
        "isSocial": True,
        "diet": ["Varied"],
        "bite_force_psi": 100,
        "size_score": 50,
        "unique_traits": ["Distinctive appearance", "Adapted to environment"],
        "special_abilities": ["Survival Instinct", "Quick Reflexes"]
    }
    
    for k, v in defaults.items():
        if k not in animal:
            animal[k] = v
            
    return animal

def main():
    print("🦁 ANIMAL ADDER & IMAGE FETCHER 🦁")
    
    # 1. Load existing animals
    json_path = 'animal_stats.json'
    if os.path.exists(json_path):
        with open(json_path, 'r', encoding='utf-8') as f:
            existing_animals = json.load(f)
    else:
        existing_animals = []
    
    existing_names = {a['name'].lower() for a in existing_animals}
    print(f"Loaded {len(existing_animals)} existing animals.")
    
    # 2. Get new candidates
    candidates = get_new_animals()
    new_animals = []
    
    for cand in candidates:
        if cand['name'].lower() not in existing_names:
            full_animal = generate_full_stats(cand)
            new_animals.append(full_animal)
        else:
            print(f"Skipping duplicate: {cand['name']}")
            
    print(f"\nFound {len(new_animals)} NEW animals to add.")
    
    if not new_animals:
        print("No new animals to process.")
        return

    # 3. Fetch images for NEW animals only
    print("\n📸 Fetching images for NEW animals...")
    
    # Check for Bing Key
    bing_key = os.environ.get('BING_SEARCH_API_KEY')
    if not bing_key:
        print("Note: No BING_SEARCH_API_KEY found. Using scraping fallback (slower/less reliable).")
    
    for i, animal in enumerate(new_animals, 1):
        name = animal['name']
        query = f"{name} animal png"
        print(f"[{i}/{len(new_animals)}] Finding image for: {name}...")
        
        image_url = None
        
        # Try Bing
        if bing_key:
            image_url = search_bing_images(query, bing_key)
        
        # Try Scrape
        if not image_url:
            image_url = search_google_images_scrape(query)
            
        if image_url:
            print(f"  ✅ Found: {image_url[:60]}...")
            animal['image'] = image_url
        else:
            print("  ❌ No image found. Using placeholder.")
            animal['image'] = "https://via.placeholder.com/300?text=" + name.replace(" ", "+")
            
        time.sleep(1.0) # Be polite
        
    # 4. Merge and Save
    all_animals = existing_animals + new_animals
    
    # Save JSON
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(all_animals, f, indent=2, ensure_ascii=False)
    print(f"\n💾 Saved {len(all_animals)} animals to {json_path}")
    
    # Save JS
    js_content = f"window.animalData = {json.dumps(all_animals, indent=2, ensure_ascii=False)}"
    with open('data.js', 'w', encoding='utf-8') as f:
        f.write(js_content)
    print("💾 Updated data.js")
    
    print("\n🎉 Done! Added:")
    for a in new_animals:
        print(f" - {a['name']}")

if __name__ == "__main__":
    main()
