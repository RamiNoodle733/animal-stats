import json
import math

def calculate_substats(animal):
    # Extract existing data
    weight = animal.get('weight_kg', 50)
    bite = animal.get('bite_force_psi', 100)
    speed_mps = animal.get('speed_mps', 10)
    
    old_attack = animal.get('attack', 50)
    old_defense = animal.get('defense', 50)
    old_agility = animal.get('agility', 50)
    old_stamina = animal.get('stamina', 50)
    old_intel = animal.get('intelligence', 50)
    old_special = animal.get('special_attack', 50)
    
    name = animal.get('name', '').lower()
    type_ = animal.get('type', '').lower()
    traits = " ".join(animal.get('unique_traits', [])).lower()
    
    # --- ATTACK (Raw Power + Natural Weapons) ---
    # Raw Power: Heavily influenced by weight and bite force
    # Logarithmic scale for weight to handle 6000kg vs 1kg
    weight_score = min(100, math.log(weight + 1, 10) * 25) 
    bite_score = min(100, math.log(bite + 1, 10) * 25)
    
    raw_power = (weight_score * 0.6) + (bite_score * 0.4)
    # Adjust based on old attack to keep character flavor
    raw_power = (raw_power + old_attack) / 2
    
    # Natural Weapons: Claws, teeth, horns. 
    # Predators usually high. Herbivores with horns high.
    natural_weapons = old_attack
    if 'carnivore' in str(animal.get('diet', [])).lower():
        natural_weapons += 10
    
    # --- DEFENSE (Armor + Resilience) ---
    # Armor: Physical protection
    armor = old_defense
    if 'shell' in traits or 'scales' in traits or 'thick skin' in traits or 'armadillo' in name or 'pangolin' in name or 'turtle' in name:
        armor += 15
    if type_ == 'mammal' and 'fur' not in traits and weight < 500:
        armor -= 10 # Soft skin
        
    # Resilience: Toughness/HP
    resilience = (old_defense + old_stamina) / 2
    if weight > 1000: resilience += 10
    
    # --- AGILITY (Speed + Maneuverability) ---
    # Speed: Based on mps
    # 30 m/s (Cheetah) is roughly 100
    speed_stat = min(100, (speed_mps / 33) * 100)
    
    # Maneuverability: Agility
    maneuverability = old_agility
    if weight > 2000: maneuverability -= 20 # Big things turn slow
    if type_ == 'bird' or type_ == 'insect': maneuverability += 10
    
    # --- STAMINA (Endurance + Recovery) ---
    endurance = old_stamina
    recovery = old_stamina - 5 # Recovery usually slightly lower than max output
    if 'reptile' in type_: recovery -= 15 # Cold blooded recovery slower
    
    # --- INTELLIGENCE (Tactics + Senses) ---
    tactics = old_intel
    if 'social' in traits or animal.get('isSocial'): tactics += 10
    
    senses = old_intel
    if 'nocturnal' in traits or animal.get('isNocturnal'): senses += 15
    if 'eagle' in name or 'hawk' in name or 'owl' in name: senses += 20
    
    # --- SPECIAL (Ferocity + Unique Abilities) ---
    ferocity = old_special
    if 'badger' in name or 'wolverine' in name or 'hippo' in name or 'boar' in name:
        ferocity += 25
    if 'herbivore' in str(animal.get('diet', [])).lower() and weight < 500:
        ferocity -= 10
        
    unique_abilities = old_special
    if 'venom' in traits or 'poison' in traits or 'electric' in traits:
        unique_abilities += 20

    # Clamp all to 0-100
    def clamp(val): return max(5, min(100, round(val)))
    
    substats = {
        "raw_power": clamp(raw_power),
        "natural_weapons": clamp(natural_weapons),
        "armor": clamp(armor),
        "resilience": clamp(resilience),
        "speed_stat": clamp(speed_stat),
        "maneuverability": clamp(maneuverability),
        "endurance": clamp(endurance),
        "recovery": clamp(recovery),
        "tactics": clamp(tactics),
        "senses": clamp(senses),
        "ferocity": clamp(ferocity),
        "unique_abilities": clamp(unique_abilities)
    }
    
    # Recalculate Main Stats
    new_main_stats = {
        "attack": round((substats["raw_power"] + substats["natural_weapons"]) / 2, 1),
        "defense": round((substats["armor"] + substats["resilience"]) / 2, 1),
        "agility": round((substats["speed_stat"] + substats["maneuverability"]) / 2, 1),
        "stamina": round((substats["endurance"] + substats["recovery"]) / 2, 1),
        "intelligence": round((substats["tactics"] + substats["senses"]) / 2, 1),
        "special_attack": round((substats["ferocity"] + substats["unique_abilities"]) / 2, 1)
    }
    
    return substats, new_main_stats

def main():
    print("🔄 Migrating Stats to New System...")
    
    try:
        with open('animal_stats.json', 'r', encoding='utf-8') as f:
            animals = json.load(f)
    except FileNotFoundError:
        print("❌ animal_stats.json not found!")
        return

    for animal in animals:
        substats, new_mains = calculate_substats(animal)
        
        # Update Main Stats
        animal.update(new_mains)
        
        # Add Substats
        animal['substats'] = substats
        
        # Generate Fight Profile Label
        # Find highest stat
        stats = {k: v for k, v in new_mains.items()}
        max_stat = max(stats, key=stats.get)
        
        profile_map = {
            'attack': 'Powerhouse',
            'defense': 'Tank',
            'agility': 'Speedster',
            'stamina': 'Endurance Runner',
            'intelligence': 'Tactician',
            'special_attack': 'Specialist'
        }
        
        # Refine profile based on secondary
        animal['fight_profile'] = profile_map.get(max_stat, 'Balanced')
        
        # Specific overrides
        if animal['substats']['armor'] > 90: animal['fight_profile'] = 'Armored Tank'
        if animal['substats']['speed_stat'] > 90: animal['fight_profile'] = 'Speed Demon'
        if animal['substats']['tactics'] > 90: animal['fight_profile'] = 'Mastermind'
        if animal['substats']['ferocity'] > 90: animal['fight_profile'] = 'Berserker'
        if 'Assassin' in animal.get('class', ''): animal['fight_profile'] = 'Assassin'

    # Save JSON
    with open('animal_stats.json', 'w', encoding='utf-8') as f:
        json.dump(animals, f, indent=2, ensure_ascii=False)
        
    # Save JS
    js_content = f"window.animalData = {json.dumps(animals, indent=2, ensure_ascii=False)}"
    with open('data.js', 'w', encoding='utf-8') as f:
        f.write(js_content)
        
    print(f"✅ Successfully updated {len(animals)} animals with new stats system!")

if __name__ == "__main__":
    main()
