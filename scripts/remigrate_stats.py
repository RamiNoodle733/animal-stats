import json
import math

def calculate_substats(animal):
    # Extract existing data
    weight = animal.get('weight_kg', 50)
    bite = animal.get('bite_force_psi', 100)
    speed_mps = animal.get('speed_mps', 10)
    
    # Use existing main stats as a baseline if they exist, otherwise default to 50
    # We trust the manual entry for the "vibe" of the animal
    old_attack = animal.get('attack', 50)
    old_defense = animal.get('defense', 50)
    old_agility = animal.get('agility', 50)
    old_stamina = animal.get('stamina', 50)
    old_intel = animal.get('intelligence', 50)
    old_special = animal.get('special_attack', 50)
    
    name = animal.get('name', '').lower()
    type_ = animal.get('type', '').lower()
    traits = " ".join(animal.get('unique_traits', [])).lower()
    diet = str(animal.get('diet', [])).lower()
    
    # --- ATTACK (Raw Power + Natural Weapons) ---
    # Raw Power: Heavily influenced by weight and bite force
    # Logarithmic scale for weight to handle 6000kg vs 1kg
    # 6000kg (Elephant) -> log10(6001) ~ 3.77 * 25 ~ 94
    # 50kg (Wolf) -> log10(51) ~ 1.7 * 25 ~ 42
    weight_score = min(100, math.log(weight + 1, 10) * 25) 
    bite_score = min(100, math.log(bite + 1, 10) * 25)
    
    # Raw Power is a mix of mass and bite/strike force
    raw_power = (weight_score * 0.7) + (bite_score * 0.3)
    
    # Natural Weapons: Claws, teeth, horns. 
    # Base it on the old attack stat but boost for predators or armed herbivores
    natural_weapons = old_attack
    if 'carnivore' in diet:
        natural_weapons = min(100, natural_weapons + 10)
    if 'horn' in traits or 'tusk' in traits or 'antler' in traits:
        natural_weapons = min(100, natural_weapons + 15)
    
    # --- DEFENSE (Armor + Resilience) ---
    # Armor: Physical protection
    armor = old_defense
    if 'shell' in traits or 'scales' in traits or 'thick skin' in traits or 'armadillo' in name or 'pangolin' in name or 'turtle' in name or 'crocodile' in name:
        armor = min(100, armor + 20)
    elif type_ == 'mammal' and 'fur' not in traits and weight < 500 and 'thick skin' not in traits:
        armor = max(10, armor - 10) # Soft skin
        
    # Resilience: Toughness/HP/Will to survive
    resilience = (old_defense + old_stamina) / 2
    if weight > 1000: resilience = min(100, resilience + 10)
    if 'badger' in name or 'wolverine' in name: resilience = min(100, resilience + 30) # They don't die
    
    # --- AGILITY (Speed + Maneuverability) ---
    # Speed: Based on mps
    # 30 m/s (Cheetah) is roughly 100
    speed_stat = min(100, (speed_mps / 30) * 100)
    
    # Maneuverability: Agility
    maneuverability = old_agility
    if weight > 2000: maneuverability = max(5, maneuverability - 20) # Big things turn slow
    if type_ == 'bird' or type_ == 'insect': maneuverability = min(100, maneuverability + 15)
    if 'cat' in name or 'feline' in traits or 'leopard' in name: maneuverability = min(100, maneuverability + 10)
    
    # --- STAMINA (Endurance + Recovery) ---
    endurance = old_stamina
    if 'canine' in traits or 'wolf' in name or 'dog' in name: endurance = min(100, endurance + 15) # Pursuit predators
    
    recovery = old_stamina - 10 # Recovery usually slightly lower than max output
    if 'reptile' in type_: recovery = max(5, recovery - 15) # Cold blooded recovery slower
    if 'mammal' in type_: recovery = min(100, recovery + 10)
    
    # --- INTELLIGENCE (Tactics + Senses) ---
    tactics = old_intel
    if 'social' in traits or animal.get('isSocial'): tactics = min(100, tactics + 10)
    if 'primate' in type_ or 'dolphin' in name or 'orca' in name or 'elephant' in name: tactics = min(100, tactics + 20)
    
    senses = old_intel
    if 'nocturnal' in traits or animal.get('isNocturnal'): senses = min(100, senses + 15)
    if 'eagle' in name or 'hawk' in name or 'owl' in name or 'vulture' in name: senses = min(100, senses + 25)
    if 'shark' in name: senses = min(100, senses + 20)
    
    # --- SPECIAL (Ferocity + Unique Abilities) ---
    ferocity = old_special
    if 'badger' in name or 'wolverine' in name or 'hippo' in name or 'boar' in name:
        ferocity = min(100, ferocity + 30)
    if 'predator' not in diet and weight < 500 and 'boar' not in name and 'hippo' not in name:
        ferocity = max(5, ferocity - 10)
        
    unique_abilities = old_special
    if 'venom' in traits or 'poison' in traits or 'electric' in traits:
        unique_abilities = min(100, unique_abilities + 25)
    if 'camouflage' in traits: unique_abilities = min(100, unique_abilities + 15)

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
    
    # Recalculate Main Stats based on the user's formula (Average of substats)
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
    print("🔄 Re-Migrating Stats to Deep Stat System (Clean Version)...")
    
    try:
        with open('animal_stats.json', 'r', encoding='utf-8') as f:
            animals = json.load(f)
    except FileNotFoundError:
        print("❌ animal_stats.json not found!")
        return

    for animal in animals:
        # Remove old fight_profile if it exists
        if 'fight_profile' in animal:
            del animal['fight_profile']
            
        substats, new_mains = calculate_substats(animal)
        
        # Update Main Stats
        animal.update(new_mains)
        
        # Add Substats
        animal['substats'] = substats

    # Save JSON
    with open('animal_stats.json', 'w', encoding='utf-8') as f:
        json.dump(animals, f, indent=2, ensure_ascii=False)
        
    # Save JS
    js_content = f"window.animalData = {json.dumps(animals, indent=2, ensure_ascii=False)}"
    with open('data.js', 'w', encoding='utf-8') as f:
        f.write(js_content)
        
    print(f"✅ Successfully updated {len(animals)} animals with new stats system (No classes)!")

if __name__ == "__main__":
    main()
