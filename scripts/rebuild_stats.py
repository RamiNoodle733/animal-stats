
import json
import math

animals = [
    {
        "name": "African Elephant",
        "scientific_name": "Loxodonta africana",
        "habitat": "Savannas, forests",
        "size": "Colossal",
        "weight_kg": 6000,
        "height_cm": 320,
        "length_cm": 650,
        "speed_mps": 11.0, # 40 km/h
        "lifespan_years": 70,
        "bite_force_psi": 0, # Tusks are main weapon
        "description": "The largest land animal on Earth, possessing immense raw strength and high intelligence. Their thick skin and massive size make them nearly invulnerable to most predators.",
        "battle_profile": {
            "preferred_range": "Close",
            "primary_environment": "Open Savanna",
            "combat_style": "Tank",
            "strengths": ["Unmatched raw power", "Virtually impenetrable defense", "Intelligent and cooperative"],
            "weaknesses": ["Slow acceleration", "Large target", "Cannot jump or maneuver quickly"]
        },
        "stats": {
            "attack": {"raw_power": 100, "weapons": 85}, # Tusks/Trunk
            "defense": {"armor": 90, "resilience": 100},
            "agility": {"speed": 40, "maneuverability": 20},
            "stamina": {"endurance": 90, "recovery": 60},
            "intelligence": {"tactics": 85, "senses": 80},
            "special": {"ferocity": 60, "abilities": 70} # Size intimidation
        }
    },
    {
        "name": "Saltwater Crocodile",
        "scientific_name": "Crocodylus porosus",
        "habitat": "Rivers, estuaries, coasts",
        "size": "Extra Large",
        "weight_kg": 1000,
        "height_cm": 60,
        "length_cm": 520,
        "speed_mps": 8.0, # Land burst, faster in water
        "lifespan_years": 70,
        "bite_force_psi": 3700,
        "description": "The largest living reptile, an ambush predator with the strongest bite force of any animal today. It dominates the water's edge, dragging prey to a watery grave.",
        "battle_profile": {
            "preferred_range": "Close",
            "primary_environment": "Shallow Water",
            "combat_style": "Ambush Predator",
            "strengths": ["World's strongest bite", "Armored scales", "Explosive ambush speed"],
            "weaknesses": ["Sluggish on land", "Low stamina", "Vulnerable underbelly"]
        },
        "stats": {
            "attack": {"raw_power": 90, "weapons": 100}, # The Bite
            "defense": {"armor": 95, "resilience": 80},
            "agility": {"speed": 50, "maneuverability": 40}, # Water agility is higher
            "stamina": {"endurance": 40, "recovery": 50},
            "intelligence": {"tactics": 70, "senses": 85},
            "special": {"ferocity": 90, "abilities": 95} # Death Roll
        }
    },
    {
        "name": "Great White Shark",
        "scientific_name": "Carcharodon carcharias",
        "habitat": "Coastal ocean waters",
        "size": "Extra Large",
        "weight_kg": 1100,
        "height_cm": 150, # Dorsal fin height approx
        "length_cm": 460,
        "speed_mps": 15.0, # Burst speed
        "lifespan_years": 70,
        "bite_force_psi": 4000,
        "description": "The ultimate ocean predator, equipped with rows of serrated teeth and electromagnetic senses. It strikes from below with devastating force.",
        "battle_profile": {
            "preferred_range": "Close",
            "primary_environment": "Open Ocean",
            "combat_style": "Ambush Predator",
            "strengths": ["Devastating bite", "Sensory dominance (Electroreception)", "Hydrodynamic speed"],
            "weaknesses": ["Cannot stop or reverse easily", "Needs to keep moving", "Vulnerable gills"]
        },
        "stats": {
            "attack": {"raw_power": 85, "weapons": 95},
            "defense": {"armor": 60, "resilience": 80},
            "agility": {"speed": 75, "maneuverability": 60},
            "stamina": {"endurance": 85, "recovery": 70},
            "intelligence": {"tactics": 65, "senses": 95},
            "special": {"ferocity": 85, "abilities": 80}
        }
    },
    {
        "name": "Orca",
        "scientific_name": "Orcinus orca",
        "habitat": "All oceans",
        "size": "Extra Large",
        "weight_kg": 5500,
        "height_cm": 180,
        "length_cm": 800,
        "speed_mps": 15.0,
        "lifespan_years": 80,
        "bite_force_psi": 19000, # Estimated, higher than Croc but less concentrated pressure? Actually scientific estimates vary, but they are top tier.
        "description": "The apex predator of the ocean, combining immense size with pack intelligence. Orcas hunt everything from fish to blue whales.",
        "battle_profile": {
            "preferred_range": "Mid range",
            "primary_environment": "Open Ocean",
            "combat_style": "Controller",
            "strengths": ["Highest intelligence", "Pack coordination", "Massive size and power"],
            "weaknesses": ["High caloric needs", "Relies on water", "Skin vulnerable to scratches"]
        },
        "stats": {
            "attack": {"raw_power": 95, "weapons": 90},
            "defense": {"armor": 70, "resilience": 90},
            "agility": {"speed": 80, "maneuverability": 70},
            "stamina": {"endurance": 90, "recovery": 80},
            "intelligence": {"tactics": 100, "senses": 90},
            "special": {"ferocity": 80, "abilities": 95} # Echolocation/Tactics
        }
    },
    {
        "name": "Grizzly Bear",
        "scientific_name": "Ursus arctos horribilis",
        "habitat": "Forests, mountains",
        "size": "Large",
        "weight_kg": 360,
        "height_cm": 102, # Shoulder height
        "length_cm": 198,
        "speed_mps": 15.0, # 35 mph
        "lifespan_years": 25,
        "bite_force_psi": 1160,
        "description": "A massive omnivore with bone-crushing jaws and paws that can kill a moose in a single swipe. Extremely durable and aggressive when provoked.",
        "battle_profile": {
            "preferred_range": "Close",
            "primary_environment": "Forest",
            "combat_style": "Bruiser",
            "strengths": ["Incredible durability", "Versatile grappler", "High stamina"],
            "weaknesses": ["Poor eyesight", "Heavy build limits agility", "Overheats easily"]
        },
        "stats": {
            "attack": {"raw_power": 80, "weapons": 75}, # Claws/Bite
            "defense": {"armor": 75, "resilience": 95}, # Thick fur/fat/bone
            "agility": {"speed": 60, "maneuverability": 50},
            "stamina": {"endurance": 80, "recovery": 70},
            "intelligence": {"tactics": 70, "senses": 85}, # Smell is god tier
            "special": {"ferocity": 90, "abilities": 70}
        }
    },
    {
        "name": "Siberian Tiger",
        "scientific_name": "Panthera tigris altaica",
        "habitat": "Taiga forests",
        "size": "Large",
        "weight_kg": 300,
        "height_cm": 110,
        "length_cm": 300,
        "speed_mps": 22.0, # 50 mph bursts
        "lifespan_years": 15,
        "bite_force_psi": 1050,
        "description": "The largest of all big cats, a solitary hunter built for power and stealth. It can take down prey much larger than itself.",
        "battle_profile": {
            "preferred_range": "Close",
            "primary_environment": "Dense Forest",
            "combat_style": "Ambush Predator",
            "strengths": ["Explosive power", "Master of stealth", "Versatile weapons (claws/teeth)"],
            "weaknesses": ["Low stamina", "Solitary nature", "Not built for long chases"]
        },
        "stats": {
            "attack": {"raw_power": 85, "weapons": 90},
            "defense": {"armor": 50, "resilience": 70},
            "agility": {"speed": 75, "maneuverability": 80},
            "stamina": {"endurance": 50, "recovery": 60},
            "intelligence": {"tactics": 80, "senses": 90},
            "special": {"ferocity": 85, "abilities": 80}
        }
    },
    {
        "name": "African Lion",
        "scientific_name": "Panthera leo",
        "habitat": "Savannas, grasslands",
        "size": "Large",
        "weight_kg": 190,
        "height_cm": 120,
        "length_cm": 200,
        "speed_mps": 22.0,
        "lifespan_years": 14,
        "bite_force_psi": 650,
        "description": "The King of Beasts, known for its majestic mane and social pride structure. Males are built for fighting rivals, while females are expert cooperative hunters.",
        "battle_profile": {
            "preferred_range": "Close",
            "primary_environment": "Open Savanna",
            "combat_style": "Bruiser",
            "strengths": ["Combat experience", "Mane protects neck", "Cooperative fighting"],
            "weaknesses": ["Lower bite force than other big cats", "Relies on pride", "Low stamina"]
        },
        "stats": {
            "attack": {"raw_power": 75, "weapons": 80},
            "defense": {"armor": 55, "resilience": 75},
            "agility": {"speed": 70, "maneuverability": 70},
            "stamina": {"endurance": 55, "recovery": 60},
            "intelligence": {"tactics": 85, "senses": 75},
            "special": {"ferocity": 90, "abilities": 75} # Roar/Intimidation
        }
    },
    {
        "name": "Hippopotamus",
        "scientific_name": "Hippopotamus amphibius",
        "habitat": "Rivers, lakes",
        "size": "Extra Large",
        "weight_kg": 1500,
        "height_cm": 150,
        "length_cm": 400,
        "speed_mps": 8.0, # 30 km/h on land
        "lifespan_years": 40,
        "bite_force_psi": 1800,
        "description": "One of the most aggressive animals on Earth. Despite being herbivorous, their massive jaws and tusks can snap a crocodile in half.",
        "battle_profile": {
            "preferred_range": "Close",
            "primary_environment": "River",
            "combat_style": "Tank",
            "strengths": ["Massive bite damage", "Thick skin", "Extreme aggression"],
            "weaknesses": ["Limited agility on land", "Poor eyesight", "Must stay moist"]
        },
        "stats": {
            "attack": {"raw_power": 90, "weapons": 90},
            "defense": {"armor": 85, "resilience": 90},
            "agility": {"speed": 40, "maneuverability": 30},
            "stamina": {"endurance": 60, "recovery": 50},
            "intelligence": {"tactics": 50, "senses": 60},
            "special": {"ferocity": 100, "abilities": 60}
        }
    },
    {
        "name": "Polar Bear",
        "scientific_name": "Ursus maritimus",
        "habitat": "Arctic ice, coasts",
        "size": "Large",
        "weight_kg": 450,
        "height_cm": 130, # Shoulder
        "length_cm": 260,
        "speed_mps": 11.0,
        "lifespan_years": 25,
        "bite_force_psi": 1200,
        "description": "The largest land carnivore, perfectly adapted to the frozen north. They are tireless swimmers and powerful hunters of seals.",
        "battle_profile": {
            "preferred_range": "Close",
            "primary_environment": "Arctic Tundra",
            "combat_style": "Bruiser",
            "strengths": ["Massive strength", "Thick blubber protection", "Excellent swimmer"],
            "weaknesses": ["Overheats in warm climates", "Slow on land compared to cats", "High energy cost"]
        },
        "stats": {
            "attack": {"raw_power": 85, "weapons": 80},
            "defense": {"armor": 70, "resilience": 90},
            "agility": {"speed": 50, "maneuverability": 45},
            "stamina": {"endurance": 85, "recovery": 75},
            "intelligence": {"tactics": 75, "senses": 80},
            "special": {"ferocity": 80, "abilities": 70}
        }
    },
    {
        "name": "Cheetah",
        "scientific_name": "Acinonyx jubatus",
        "habitat": "Grasslands, savannas",
        "size": "Medium",
        "weight_kg": 50,
        "height_cm": 80,
        "length_cm": 130,
        "speed_mps": 33.0, # 120 km/h
        "lifespan_years": 12,
        "bite_force_psi": 475,
        "description": "The fastest land animal, built purely for speed. It sacrifices strength and defense for the ability to run down any prey.",
        "battle_profile": {
            "preferred_range": "Mid range",
            "primary_environment": "Open Savanna",
            "combat_style": "Skirmisher",
            "strengths": ["Unmatched speed", "Incredible acceleration", "Agile turning"],
            "weaknesses": ["Very fragile", "Overheats quickly", "Weak bite and claws"]
        },
        "stats": {
            "attack": {"raw_power": 40, "weapons": 50},
            "defense": {"armor": 20, "resilience": 30},
            "agility": {"speed": 100, "maneuverability": 90},
            "stamina": {"endurance": 30, "recovery": 40},
            "intelligence": {"tactics": 60, "senses": 80},
            "special": {"ferocity": 40, "abilities": 80} # Speed is the ability
        }
    },
    {
        "name": "Peregrine Falcon",
        "scientific_name": "Falco peregrinus",
        "habitat": "Cliffs, cities, open areas",
        "size": "Small",
        "weight_kg": 1.0,
        "height_cm": 40,
        "length_cm": 40,
        "speed_mps": 108.0, # 390 km/h dive
        "lifespan_years": 15,
        "bite_force_psi": 50, # Negligible, uses impact
        "description": "The fastest animal on the planet during its hunting stoop. It strikes birds in mid-air with the force of a bullet.",
        "battle_profile": {
            "preferred_range": "Long range",
            "primary_environment": "Sky",
            "combat_style": "Glass Cannon",
            "strengths": ["Ultimate dive speed", "Aerial superiority", "Impact force"],
            "weaknesses": ["Fragile bones", "Useless on ground", "Small size"]
        },
        "stats": {
            "attack": {"raw_power": 30, "weapons": 60}, # Impact force is high for size
            "defense": {"armor": 10, "resilience": 20},
            "agility": {"speed": 100, "maneuverability": 95},
            "stamina": {"endurance": 60, "recovery": 70},
            "intelligence": {"tactics": 70, "senses": 100}, # Vision
            "special": {"ferocity": 60, "abilities": 90}
        }
    },
    {
        "name": "Komodo Dragon",
        "scientific_name": "Varanus komodoensis",
        "habitat": "Islands, grasslands",
        "size": "Large",
        "weight_kg": 80,
        "height_cm": 50,
        "length_cm": 260,
        "speed_mps": 5.0,
        "lifespan_years": 30,
        "bite_force_psi": 600, # Weak bite, relies on tearing/venom
        "description": "The largest living lizard, a patient hunter with a venomous bite. It tracks wounded prey for miles until they succumb.",
        "battle_profile": {
            "preferred_range": "Close",
            "primary_environment": "Island Scrub",
            "combat_style": "Venomous Hunter",
            "strengths": ["Venomous anticoagulant", "Thick osteoderm armor", "Patient tracker"],
            "weaknesses": ["Slow metabolism", "Low stamina", "Weak bite force"]
        },
        "stats": {
            "attack": {"raw_power": 60, "weapons": 80}, # Venom/Teeth
            "defense": {"armor": 70, "resilience": 70},
            "agility": {"speed": 30, "maneuverability": 40},
            "stamina": {"endurance": 40, "recovery": 30},
            "intelligence": {"tactics": 60, "senses": 80},
            "special": {"ferocity": 70, "abilities": 95} # Venom
        }
    },
    {
        "name": "Gorilla",
        "scientific_name": "Gorilla beringei",
        "habitat": "Mountain forests",
        "size": "Large",
        "weight_kg": 180,
        "height_cm": 170,
        "length_cm": 170,
        "speed_mps": 11.0,
        "lifespan_years": 40,
        "bite_force_psi": 1300,
        "description": "A gentle giant until provoked, possessing immense upper body strength. Gorillas fight with crushing blows and powerful bites.",
        "battle_profile": {
            "preferred_range": "Close",
            "primary_environment": "Jungle",
            "combat_style": "Bruiser",
            "strengths": ["Incredible lifting strength", "High intelligence", "Strong bite"],
            "weaknesses": ["Thin skin", "Poor swimmer", "Bluff charges often"]
        },
        "stats": {
            "attack": {"raw_power": 80, "weapons": 60}, # Hands/Teeth
            "defense": {"armor": 40, "resilience": 70},
            "agility": {"speed": 40, "maneuverability": 60},
            "stamina": {"endurance": 70, "recovery": 60},
            "intelligence": {"tactics": 90, "senses": 80},
            "special": {"ferocity": 60, "abilities": 70}
        }
    },
    {
        "name": "Anaconda",
        "scientific_name": "Eunectes murinus",
        "habitat": "Swamps, rivers",
        "size": "Large",
        "weight_kg": 200,
        "height_cm": 30,
        "length_cm": 500,
        "speed_mps": 3.0, # Water speed higher
        "lifespan_years": 10,
        "bite_force_psi": 100, # Holding bite
        "description": "The heaviest snake in the world, a master of constriction. It coils around prey, suffocating them with immense pressure.",
        "battle_profile": {
            "preferred_range": "Close",
            "primary_environment": "Swamp",
            "combat_style": "Grappler",
            "strengths": ["Unmatched grappling", "Aquatic stealth", "Crushing constriction"],
            "weaknesses": ["Very slow on land", "Vulnerable head", "Needs to ambush"]
        },
        "stats": {
            "attack": {"raw_power": 70, "weapons": 60}, # Constriction
            "defense": {"armor": 30, "resilience": 60},
            "agility": {"speed": 20, "maneuverability": 40},
            "stamina": {"endurance": 50, "recovery": 40},
            "intelligence": {"tactics": 50, "senses": 70},
            "special": {"ferocity": 60, "abilities": 85} # Constriction
        }
    },
    {
        "name": "Leopard",
        "scientific_name": "Panthera pardus",
        "habitat": "Forests, grasslands",
        "size": "Medium",
        "weight_kg": 70,
        "height_cm": 70,
        "length_cm": 140,
        "speed_mps": 16.0,
        "lifespan_years": 15,
        "bite_force_psi": 310,
        "description": "The most adaptable big cat, capable of hauling heavy prey up trees. They are masters of stealth and ambush.",
        "battle_profile": {
            "preferred_range": "Close",
            "primary_environment": "Tree Canopy/Ground",
            "combat_style": "Ambush Predator",
            "strengths": ["Climbing ability", "Pound-for-pound strength", "Stealth"],
            "weaknesses": ["Smaller than lions/tigers", "Avoids direct confrontation", "Light build"]
        },
        "stats": {
            "attack": {"raw_power": 60, "weapons": 75},
            "defense": {"armor": 30, "resilience": 50},
            "agility": {"speed": 70, "maneuverability": 90},
            "stamina": {"endurance": 60, "recovery": 70},
            "intelligence": {"tactics": 80, "senses": 90},
            "special": {"ferocity": 60, "abilities": 75}
        }
    },
    {
        "name": "Jaguar",
        "scientific_name": "Panthera onca",
        "habitat": "Rainforests, wetlands",
        "size": "Medium",
        "weight_kg": 100,
        "height_cm": 75,
        "length_cm": 170,
        "speed_mps": 22.0,
        "lifespan_years": 15,
        "bite_force_psi": 1500,
        "description": "The tank of the big cat world, with the strongest bite relative to size. It kills by piercing the skull or shell of its prey.",
        "battle_profile": {
            "preferred_range": "Close",
            "primary_environment": "Jungle",
            "combat_style": "Bruiser",
            "strengths": ["Skull-crushing bite", "Excellent swimmer", "Dense muscle build"],
            "weaknesses": ["Lower endurance", "Slower than other cats", "Short limbs"]
        },
        "stats": {
            "attack": {"raw_power": 75, "weapons": 95}, # Bite is insane
            "defense": {"armor": 45, "resilience": 65},
            "agility": {"speed": 60, "maneuverability": 70},
            "stamina": {"endurance": 50, "recovery": 60},
            "intelligence": {"tactics": 75, "senses": 85},
            "special": {"ferocity": 80, "abilities": 80}
        }
    },
    {
        "name": "Honey Badger",
        "scientific_name": "Mellivora capensis",
        "habitat": "Grasslands, forests",
        "size": "Small",
        "weight_kg": 12,
        "height_cm": 28,
        "length_cm": 70,
        "speed_mps": 8.0,
        "lifespan_years": 24,
        "bite_force_psi": 200, # Strong for size
        "description": "Notorious for its fearlessness and loose, thick skin. It will attack animals ten times its size and is immune to many venoms.",
        "battle_profile": {
            "preferred_range": "Close",
            "primary_environment": "Scrubland",
            "combat_style": "Berserker",
            "strengths": ["Fearless aggression", "Loose tough skin", "Venom resistance"],
            "weaknesses": ["Small size", "Limited reach", "Overconfidence"]
        },
        "stats": {
            "attack": {"raw_power": 40, "weapons": 60},
            "defense": {"armor": 60, "resilience": 90}, # Hard to kill
            "agility": {"speed": 40, "maneuverability": 60},
            "stamina": {"endurance": 90, "recovery": 80},
            "intelligence": {"tactics": 60, "senses": 80},
            "special": {"ferocity": 100, "abilities": 90} # Venom immunity
        }
    },
    {
        "name": "Wolverine",
        "scientific_name": "Gulo gulo",
        "habitat": "Boreal forests, tundra",
        "size": "Small",
        "weight_kg": 18,
        "height_cm": 40,
        "length_cm": 80,
        "speed_mps": 13.0,
        "lifespan_years": 10,
        "bite_force_psi": 300,
        "description": "A stocky and muscular carnivore, known for its ferocity and strength out of proportion to its size. It can crush frozen bones.",
        "battle_profile": {
            "preferred_range": "Close",
            "primary_environment": "Snow Forest",
            "combat_style": "Berserker",
            "strengths": ["Incredible stamina", "Bone-crushing bite", "Frost resistance"],
            "weaknesses": ["Small stature", "Poor eyesight", "Ground-bound"]
        },
        "stats": {
            "attack": {"raw_power": 45, "weapons": 65},
            "defense": {"armor": 50, "resilience": 85},
            "agility": {"speed": 50, "maneuverability": 60},
            "stamina": {"endurance": 95, "recovery": 85},
            "intelligence": {"tactics": 65, "senses": 80},
            "special": {"ferocity": 95, "abilities": 70}
        }
    },
    {
        "name": "Cape Buffalo",
        "scientific_name": "Syncerus caffer",
        "habitat": "Savannas, grasslands",
        "size": "Large",
        "weight_kg": 800,
        "height_cm": 150,
        "length_cm": 300,
        "speed_mps": 16.0,
        "lifespan_years": 20,
        "bite_force_psi": 0,
        "description": "Known as 'The Black Death', these bovines are extremely aggressive and vengeful. Their fused horns form a bulletproof shield.",
        "battle_profile": {
            "preferred_range": "Close",
            "primary_environment": "Grassland",
            "combat_style": "Tank",
            "strengths": ["Fused horn shield (Boss)", "Herd defense", "Aggressive charge"],
            "weaknesses": ["Poor vision", "Predictable attacks", "Heavy build"]
        },
        "stats": {
            "attack": {"raw_power": 75, "weapons": 80}, # Horns
            "defense": {"armor": 70, "resilience": 85},
            "agility": {"speed": 50, "maneuverability": 40},
            "stamina": {"endurance": 80, "recovery": 60},
            "intelligence": {"tactics": 60, "senses": 60},
            "special": {"ferocity": 90, "abilities": 60}
        }
    },
    {
        "name": "Bottlenose Dolphin",
        "scientific_name": "Tursiops truncatus",
        "habitat": "Temperate oceans",
        "size": "Medium",
        "weight_kg": 300,
        "height_cm": 100,
        "length_cm": 300,
        "speed_mps": 10.0,
        "lifespan_years": 45,
        "bite_force_psi": 200, # Not a biter, a rammer
        "description": "Highly intelligent marine mammals that use complex teamwork and echolocation. They can kill sharks by ramming their soft underbellies.",
        "battle_profile": {
            "preferred_range": "Mid range",
            "primary_environment": "Coastal Ocean",
            "combat_style": "Skirmisher",
            "strengths": ["High intelligence", "Echolocation", "Agile swimmer"],
            "weaknesses": ["Soft skin", "Relies on pod", "Physically weaker than sharks"]
        },
        "stats": {
            "attack": {"raw_power": 50, "weapons": 40}, # Ramming
            "defense": {"armor": 20, "resilience": 50},
            "agility": {"speed": 60, "maneuverability": 90},
            "stamina": {"endurance": 80, "recovery": 80},
            "intelligence": {"tactics": 95, "senses": 95},
            "special": {"ferocity": 40, "abilities": 80} # Sonar
        }
    },
    {
        "name": "Chimpanzee",
        "scientific_name": "Pan troglodytes",
        "habitat": "Forests, woodlands",
        "size": "Medium",
        "weight_kg": 60,
        "height_cm": 120,
        "length_cm": 120,
        "speed_mps": 11.0,
        "lifespan_years": 40,
        "bite_force_psi": 1300, # Surprisingly high
        "description": "Our closest relatives, capable of extreme violence and coordinated warfare. They are fast, strong for their size, and use tools.",
        "battle_profile": {
            "preferred_range": "Close",
            "primary_environment": "Forest",
            "combat_style": "Skirmisher",
            "strengths": ["Tool use", "Agile climber", "Vicious bite"],
            "weaknesses": ["Small size", "Thin skin", "Emotional instability"]
        },
        "stats": {
            "attack": {"raw_power": 55, "weapons": 50},
            "defense": {"armor": 20, "resilience": 50},
            "agility": {"speed": 50, "maneuverability": 80},
            "stamina": {"endurance": 70, "recovery": 70},
            "intelligence": {"tactics": 95, "senses": 85},
            "special": {"ferocity": 80, "abilities": 85} # Tools
        }
    },
    {
        "name": "Mantis Shrimp",
        "scientific_name": "Odontodactylus scyllarus",
        "habitat": "Coral reefs",
        "size": "Tiny",
        "weight_kg": 0.1,
        "height_cm": 5,
        "length_cm": 15,
        "speed_mps": 23.0, # Strike speed, not swim speed
        "lifespan_years": 20,
        "bite_force_psi": 0, # Punch force is the key
        "description": "A colorful crustacean with the fastest punch in the animal kingdom. Its strike boils the water and can crack aquarium glass.",
        "battle_profile": {
            "preferred_range": "Close",
            "primary_environment": "Reef",
            "combat_style": "Glass Cannon",
            "strengths": ["Supersonic punch", "Complex vision", "Hard shell"],
            "weaknesses": ["Tiny size", "Short lifespan", "Vulnerable during molt"]
        },
        "stats": {
            "attack": {"raw_power": 10, "weapons": 90}, # Relative to size it's 100, but absolute...
            "defense": {"armor": 30, "resilience": 10},
            "agility": {"speed": 40, "maneuverability": 60},
            "stamina": {"endurance": 20, "recovery": 30},
            "intelligence": {"tactics": 40, "senses": 90},
            "special": {"ferocity": 80, "abilities": 90} # Cavitation
        }
    },
    {
        "name": "Cassowary",
        "scientific_name": "Casuarius casuarius",
        "habitat": "Rainforests",
        "size": "Medium",
        "weight_kg": 60,
        "height_cm": 170,
        "length_cm": 170,
        "speed_mps": 14.0,
        "lifespan_years": 40,
        "bite_force_psi": 0,
        "description": "Often called the world's most dangerous bird. It has a dagger-like claw on its foot capable of disemboweling predators.",
        "battle_profile": {
            "preferred_range": "Close",
            "primary_environment": "Rainforest",
            "combat_style": "Striker",
            "strengths": ["Razor sharp kick", "Helmet (casque) protection", "Fast sprinter"],
            "weaknesses": ["Flightless", "Fragile legs", "Temperamental"]
        },
        "stats": {
            "attack": {"raw_power": 50, "weapons": 80}, # The Claw
            "defense": {"armor": 30, "resilience": 40},
            "agility": {"speed": 60, "maneuverability": 70},
            "stamina": {"endurance": 60, "recovery": 50},
            "intelligence": {"tactics": 40, "senses": 60},
            "special": {"ferocity": 80, "abilities": 60}
        }
    },
    {
        "name": "King Cobra",
        "scientific_name": "Ophiophagus hannah",
        "habitat": "Forests, grasslands",
        "size": "Medium",
        "weight_kg": 6,
        "height_cm": 30,
        "length_cm": 400,
        "speed_mps": 5.0,
        "lifespan_years": 20,
        "bite_force_psi": 0,
        "description": "The longest venomous snake in the world. It feeds primarily on other snakes and delivers a massive dose of neurotoxin.",
        "battle_profile": {
            "preferred_range": "Mid range",
            "primary_environment": "Forest Floor",
            "combat_style": "Venomous Hunter",
            "strengths": ["Potent neurotoxin", "Long strike range", "Intimidating hood"],
            "weaknesses": ["Fragile body", "Vulnerable to mongooses", "Slow digestion"]
        },
        "stats": {
            "attack": {"raw_power": 20, "weapons": 95}, # Venom
            "defense": {"armor": 10, "resilience": 20},
            "agility": {"speed": 40, "maneuverability": 60},
            "stamina": {"endurance": 30, "recovery": 30},
            "intelligence": {"tactics": 60, "senses": 70},
            "special": {"ferocity": 70, "abilities": 100} # Venom
        }
    },
    {
        "name": "Bald Eagle",
        "scientific_name": "Haliaeetus leucocephalus",
        "habitat": "Coasts, lakes, rivers",
        "size": "Small",
        "weight_kg": 5,
        "height_cm": 90,
        "length_cm": 90,
        "speed_mps": 30.0, # Dive speed
        "lifespan_years": 20,
        "bite_force_psi": 400, # Beak/Talons grip
        "description": "A powerful raptor with a white head and tail. It uses massive talons to snatch fish and small mammals from the water or land.",
        "battle_profile": {
            "preferred_range": "Long range",
            "primary_environment": "Sky",
            "combat_style": "Sky Hunter",
            "strengths": ["Grip strength", "Flight", "Vision"],
            "weaknesses": ["Hollow bones", "Ground combat", "Lightweight"]
        },
        "stats": {
            "attack": {"raw_power": 30, "weapons": 60},
            "defense": {"armor": 10, "resilience": 20},
            "agility": {"speed": 80, "maneuverability": 80},
            "stamina": {"endurance": 50, "recovery": 60},
            "intelligence": {"tactics": 60, "senses": 95},
            "special": {"ferocity": 50, "abilities": 70}
        }
    },
    {
        "name": "Harpy Eagle",
        "scientific_name": "Harpia harpyja",
        "habitat": "Tropical rainforests",
        "size": "Medium",
        "weight_kg": 9,
        "height_cm": 100,
        "length_cm": 100,
        "speed_mps": 22.0,
        "lifespan_years": 30,
        "bite_force_psi": 530, # Talon grip pressure
        "description": "The most powerful eagle in the Americas, with talons larger than a grizzly bear's claws. It hunts monkeys and sloths in the canopy.",
        "battle_profile": {
            "preferred_range": "Mid range",
            "primary_environment": "Canopy",
            "combat_style": "Sky Hunter",
            "strengths": ["Massive talons", "Silent flight", "Lifting power"],
            "weaknesses": ["Slow flight speed", "Forest dependent", "Low stamina"]
        },
        "stats": {
            "attack": {"raw_power": 40, "weapons": 80},
            "defense": {"armor": 15, "resilience": 30},
            "agility": {"speed": 60, "maneuverability": 90},
            "stamina": {"endurance": 40, "recovery": 50},
            "intelligence": {"tactics": 70, "senses": 90},
            "special": {"ferocity": 70, "abilities": 75}
        }
    },
    {
        "name": "Rhinoceros",
        "scientific_name": "Diceros bicornis",
        "habitat": "Grasslands, savannas",
        "size": "Extra Large",
        "weight_kg": 1400,
        "height_cm": 160,
        "length_cm": 350,
        "speed_mps": 15.0,
        "lifespan_years": 40,
        "bite_force_psi": 0,
        "description": "A prehistoric-looking tank with thick skin and a deadly horn. Rhinos are nearsighted but will charge anything that smells like a threat.",
        "battle_profile": {
            "preferred_range": "Close",
            "primary_environment": "Savanna",
            "combat_style": "Tank",
            "strengths": ["Horn impalement", "Thick armor", "Charge power"],
            "weaknesses": ["Terrible eyesight", "Poor turning", "Predictable"]
        },
        "stats": {
            "attack": {"raw_power": 85, "weapons": 85},
            "defense": {"armor": 80, "resilience": 85},
            "agility": {"speed": 45, "maneuverability": 30},
            "stamina": {"endurance": 60, "recovery": 50},
            "intelligence": {"tactics": 40, "senses": 50},
            "special": {"ferocity": 80, "abilities": 60}
        }
    },
    {
        "name": "Moose",
        "scientific_name": "Alces alces",
        "habitat": "Boreal forests",
        "size": "Large",
        "weight_kg": 600,
        "height_cm": 200,
        "length_cm": 300,
        "speed_mps": 15.0,
        "lifespan_years": 20,
        "bite_force_psi": 0,
        "description": "The largest species of deer, towering over most predators. Males grow massive antlers for fighting rivals and defending against wolves.",
        "battle_profile": {
            "preferred_range": "Close",
            "primary_environment": "Forest/Swamp",
            "combat_style": "Bruiser",
            "strengths": ["Size and height", "Antler defense", "Powerful kick"],
            "weaknesses": ["High center of gravity", "Heat sensitivity", "Panic prone"]
        },
        "stats": {
            "attack": {"raw_power": 65, "weapons": 70},
            "defense": {"armor": 40, "resilience": 70},
            "agility": {"speed": 50, "maneuverability": 40},
            "stamina": {"endurance": 70, "recovery": 60},
            "intelligence": {"tactics": 50, "senses": 70},
            "special": {"ferocity": 60, "abilities": 50}
        }
    },
    {
        "name": "Gray Wolf",
        "scientific_name": "Canis lupus",
        "habitat": "Forests, tundra",
        "size": "Medium",
        "weight_kg": 50,
        "height_cm": 80,
        "length_cm": 150,
        "speed_mps": 16.0,
        "lifespan_years": 13,
        "bite_force_psi": 400,
        "description": "The ultimate endurance hunter. Wolves use complex pack tactics to wear down prey much larger than themselves over long distances.",
        "battle_profile": {
            "preferred_range": "Mid range",
            "primary_environment": "Forest",
            "combat_style": "Pack Hunter",
            "strengths": ["Endless stamina", "Pack tactics", "Crushing bite"],
            "weaknesses": ["Individual weakness", "Light build", "Relies on numbers"]
        },
        "stats": {
            "attack": {"raw_power": 50, "weapons": 60},
            "defense": {"armor": 30, "resilience": 60},
            "agility": {"speed": 60, "maneuverability": 70},
            "stamina": {"endurance": 100, "recovery": 90},
            "intelligence": {"tactics": 95, "senses": 90},
            "special": {"ferocity": 60, "abilities": 80} # Pack buff
        }
    },
    {
        "name": "Hyena",
        "scientific_name": "Crocuta crocuta",
        "habitat": "Savannas",
        "size": "Medium",
        "weight_kg": 70,
        "height_cm": 85,
        "length_cm": 150,
        "speed_mps": 17.0,
        "lifespan_years": 20,
        "bite_force_psi": 1100,
        "description": "Often misunderstood as scavengers, spotted hyenas are highly successful hunters with jaws that can crush bone.",
        "battle_profile": {
            "preferred_range": "Mid range",
            "primary_environment": "Savanna",
            "combat_style": "Pack Hunter",
            "strengths": ["Bone-crushing jaws", "High stamina", "Numbers"],
            "weaknesses": ["Sloping back limits agility", "Hated by lions", "Scavenger reputation"]
        },
        "stats": {
            "attack": {"raw_power": 60, "weapons": 80},
            "defense": {"armor": 40, "resilience": 70},
            "agility": {"speed": 55, "maneuverability": 60},
            "stamina": {"endurance": 90, "recovery": 80},
            "intelligence": {"tactics": 90, "senses": 85},
            "special": {"ferocity": 70, "abilities": 70}
        }
    },
    {
        "name": "Cougar",
        "scientific_name": "Puma concolor",
        "habitat": "Mountains, forests",
        "size": "Medium",
        "weight_kg": 70,
        "height_cm": 70,
        "length_cm": 200,
        "speed_mps": 20.0,
        "lifespan_years": 13,
        "bite_force_psi": 350,
        "description": "Also known as the mountain lion, it has the largest range of any land mammal in the Americas. It is a powerful jumper and silent stalker.",
        "battle_profile": {
            "preferred_range": "Close",
            "primary_environment": "Mountain",
            "combat_style": "Ambush Predator",
            "strengths": ["Leaping ability", "Stealth", "Adaptability"],
            "weaknesses": ["Lighter build", "Solitary", "Avoids injury"]
        },
        "stats": {
            "attack": {"raw_power": 55, "weapons": 65},
            "defense": {"armor": 30, "resilience": 50},
            "agility": {"speed": 70, "maneuverability": 85},
            "stamina": {"endurance": 60, "recovery": 60},
            "intelligence": {"tactics": 75, "senses": 85},
            "special": {"ferocity": 60, "abilities": 75}
        }
    },
    {
        "name": "Lynx",
        "scientific_name": "Lynx lynx",
        "habitat": "Boreal forests",
        "size": "Small",
        "weight_kg": 25,
        "height_cm": 65,
        "length_cm": 100,
        "speed_mps": 22.0,
        "lifespan_years": 15,
        "bite_force_psi": 200,
        "description": "A medium-sized cat with distinctive ear tufts and large paws that act as snowshoes. It is a specialist hunter of hares.",
        "battle_profile": {
            "preferred_range": "Close",
            "primary_environment": "Snow Forest",
            "combat_style": "Ambush Predator",
            "strengths": ["Snow mobility", "Hearing", "Reflexes"],
            "weaknesses": ["Small size", "Specialized diet", "Low raw power"]
        },
        "stats": {
            "attack": {"raw_power": 35, "weapons": 55},
            "defense": {"armor": 20, "resilience": 40},
            "agility": {"speed": 65, "maneuverability": 90},
            "stamina": {"endurance": 50, "recovery": 60},
            "intelligence": {"tactics": 70, "senses": 90},
            "special": {"ferocity": 50, "abilities": 70}
        }
    },
    {
        "name": "Snow Leopard",
        "scientific_name": "Panthera uncia",
        "habitat": "Mountain ranges",
        "size": "Medium",
        "weight_kg": 50,
        "height_cm": 60,
        "length_cm": 120,
        "speed_mps": 18.0,
        "lifespan_years": 15,
        "bite_force_psi": 300,
        "description": "The ghost of the mountains, perfectly camouflaged against rocky slopes. Its long tail provides balance for incredible leaps.",
        "battle_profile": {
            "preferred_range": "Close",
            "primary_environment": "High Altitude",
            "combat_style": "Ambush Predator",
            "strengths": ["Mountain agility", "Camouflage", "Leaping"],
            "weaknesses": ["Small for a big cat", "Rare", "Low oxygen environment"]
        },
        "stats": {
            "attack": {"raw_power": 50, "weapons": 65},
            "defense": {"armor": 30, "resilience": 50},
            "agility": {"speed": 60, "maneuverability": 95},
            "stamina": {"endurance": 70, "recovery": 70},
            "intelligence": {"tactics": 75, "senses": 85},
            "special": {"ferocity": 50, "abilities": 80}
        }
    },
    {
        "name": "Walrus",
        "scientific_name": "Odobenus rosmarus",
        "habitat": "Arctic seas",
        "size": "Extra Large",
        "weight_kg": 1200,
        "height_cm": 150,
        "length_cm": 350,
        "speed_mps": 9.0,
        "lifespan_years": 40,
        "bite_force_psi": 0,
        "description": "A massive marine mammal with long tusks used for hauling out onto ice and fighting. Their thick skin is nearly impervious to cold and claws.",
        "battle_profile": {
            "preferred_range": "Close",
            "primary_environment": "Ice Floe",
            "combat_style": "Tank",
            "strengths": ["Tusk weapons", "Thick blubber", "Bulk"],
            "weaknesses": ["Clumsy on land", "Slow", "Poor vision"]
        },
        "stats": {
            "attack": {"raw_power": 70, "weapons": 75},
            "defense": {"armor": 80, "resilience": 85},
            "agility": {"speed": 30, "maneuverability": 30},
            "stamina": {"endurance": 60, "recovery": 50},
            "intelligence": {"tactics": 50, "senses": 50},
            "special": {"ferocity": 60, "abilities": 60}
        }
    },
    {
        "name": "Box Jellyfish",
        "scientific_name": "Chironex fleckeri",
        "habitat": "Tropical coastal waters",
        "size": "Small",
        "weight_kg": 2,
        "height_cm": 30,
        "length_cm": 300, # Tentacles
        "speed_mps": 2.0,
        "lifespan_years": 1,
        "bite_force_psi": 0,
        "description": "One of the most venomous creatures on Earth. Its tentacles are covered in millions of explosive cells that deliver instant pain and death.",
        "battle_profile": {
            "preferred_range": "Close",
            "primary_environment": "Ocean",
            "combat_style": "Passive Killer",
            "strengths": ["Instant neurotoxin", "Hard to see", "360 degree threat"],
            "weaknesses": ["Fragile jelly body", "No brain", "Slow"]
        },
        "stats": {
            "attack": {"raw_power": 0, "weapons": 100}, # Venom is the weapon
            "defense": {"armor": 0, "resilience": 10},
            "agility": {"speed": 10, "maneuverability": 20},
            "stamina": {"endurance": 30, "recovery": 20},
            "intelligence": {"tactics": 0, "senses": 20},
            "special": {"ferocity": 0, "abilities": 100} # Venom
        }
    },
    {
        "name": "Blue Whale",
        "scientific_name": "Balaenoptera musculus",
        "habitat": "All major oceans",
        "size": "Colossal",
        "weight_kg": 150000,
        "height_cm": 500,
        "length_cm": 3000,
        "speed_mps": 13.0,
        "lifespan_years": 90,
        "bite_force_psi": 0,
        "description": "The largest animal to ever exist. While peaceful filter feeders, their sheer bulk makes them virtually immune to predation as adults.",
        "battle_profile": {
            "preferred_range": "Close",
            "primary_environment": "Deep Ocean",
            "combat_style": "Titan",
            "strengths": ["Unfathomable size", "Thick skin", "Tail slap"],
            "weaknesses": ["Passive nature", "Slow acceleration", "No teeth"]
        },
        "stats": {
            "attack": {"raw_power": 90, "weapons": 10}, # Tail slap is strong but no weapons
            "defense": {"armor": 80, "resilience": 100},
            "agility": {"speed": 50, "maneuverability": 10},
            "stamina": {"endurance": 90, "recovery": 80},
            "intelligence": {"tactics": 50, "senses": 60},
            "special": {"ferocity": 10, "abilities": 50}
        }
    },
    {
        "name": "Electric Eel",
        "scientific_name": "Electrophorus electricus",
        "habitat": "Amazon river systems",
        "size": "Medium",
        "weight_kg": 20,
        "height_cm": 15,
        "length_cm": 200,
        "speed_mps": 3.0,
        "lifespan_years": 15,
        "bite_force_psi": 0,
        "description": "Not a true eel, but a knifefish capable of generating 860 volts of electricity. It can stun prey or deter predators from a distance.",
        "battle_profile": {
            "preferred_range": "Close",
            "primary_environment": "Murky River",
            "combat_style": "Electric",
            "strengths": ["High voltage shock", "Electroreception", "No contact needed"],
            "weaknesses": ["Slow swimmer", "Needs air", "Recharge time"]
        },
        "stats": {
            "attack": {"raw_power": 10, "weapons": 90}, # Shock
            "defense": {"armor": 10, "resilience": 40},
            "agility": {"speed": 20, "maneuverability": 30},
            "stamina": {"endurance": 40, "recovery": 30},
            "intelligence": {"tactics": 40, "senses": 80},
            "special": {"ferocity": 50, "abilities": 100} # Electricity
        }
    },
    {
        "name": "Octopus",
        "scientific_name": "Octopus vulgaris",
        "habitat": "Coral reefs",
        "size": "Small",
        "weight_kg": 10,
        "height_cm": 30,
        "length_cm": 100,
        "speed_mps": 10.0,
        "lifespan_years": 3,
        "bite_force_psi": 0, # Beak is strong but small
        "description": "The most intelligent invertebrate. It can solve puzzles, change color and texture instantly, and squeeze through tiny gaps.",
        "battle_profile": {
            "preferred_range": "Close",
            "primary_environment": "Reef",
            "combat_style": "Trickster",
            "strengths": ["Camouflage", "Grappling arms", "Ink cloud"],
            "weaknesses": ["Soft body", "Short lifespan", "Exhausts easily"]
        },
        "stats": {
            "attack": {"raw_power": 20, "weapons": 50},
            "defense": {"armor": 0, "resilience": 30},
            "agility": {"speed": 40, "maneuverability": 90},
            "stamina": {"endurance": 30, "recovery": 40},
            "intelligence": {"tactics": 90, "senses": 90},
            "special": {"ferocity": 30, "abilities": 95} # Camo/Ink
        }
    },
    {
        "name": "Bison",
        "scientific_name": "Bison bison",
        "habitat": "Grasslands",
        "size": "Large",
        "weight_kg": 900,
        "height_cm": 180,
        "length_cm": 300,
        "speed_mps": 17.0,
        "lifespan_years": 20,
        "bite_force_psi": 0,
        "description": "The largest land mammal in North America. Massive heads and shoulder humps power their devastating charges.",
        "battle_profile": {
            "preferred_range": "Close",
            "primary_environment": "Prairie",
            "combat_style": "Tank",
            "strengths": ["Charge momentum", "Thick skull", "Herd protection"],
            "weaknesses": ["Heavy front", "Predictable", "Slow turning"]
        },
        "stats": {
            "attack": {"raw_power": 70, "weapons": 70},
            "defense": {"armor": 60, "resilience": 80},
            "agility": {"speed": 50, "maneuverability": 30},
            "stamina": {"endurance": 80, "recovery": 60},
            "intelligence": {"tactics": 50, "senses": 60},
            "special": {"ferocity": 70, "abilities": 50}
        }
    }
]

# Helper to calculate main stats and letter grades
def calculate_stats(animal):
    # Calculate main stats as average of substats
    main_stats = {}
    for stat, substats in animal['stats'].items():
        avg = sum(substats.values()) / len(substats)
        main_stats[stat] = round(avg, 1)
    
    return main_stats

def get_grade(value):
    if value >= 90: return 'S'
    if value >= 80: return 'A'
    if value >= 65: return 'B'
    if value >= 50: return 'C'
    return 'D'

# Process and format for JSON
final_data = []
original_data = json.load(open('animal_stats.json', 'r'))
original_map = {a['name']: a for a in original_data}

for animal in animals:
    # Merge with original image/type data if needed, or just use new structure
    # We need to keep 'image', 'type', 'class' (maybe update class), 'unique_traits', 'special_abilities'
    # The prompt says "Rebuild the entire data set", but we should preserve images.
    
    orig = original_map.get(animal['name'])
    if not orig:
        print(f"Warning: {animal['name']} not found in original file")
        continue
        
    main_stats = calculate_stats(animal)
    
    # Construct final object
    obj = {
        "name": animal['name'],
        "scientific_name": animal['scientific_name'],
        "habitat": animal['habitat'],
        "size": animal['size'],
        "weight_kg": animal['weight_kg'],
        "height_cm": animal['height_cm'],
        "length_cm": animal['length_cm'],
        "speed_mps": animal['speed_mps'],
        "lifespan_years": animal['lifespan_years'],
        "bite_force_psi": animal['bite_force_psi'],
        "description": animal['description'],
        "battle_profile": animal['battle_profile'],
        
        # Main Stats
        "attack": main_stats['attack'],
        "defense": main_stats['defense'],
        "agility": main_stats['agility'],
        "stamina": main_stats['stamina'],
        "intelligence": main_stats['intelligence'],
        "special_attack": main_stats['special'], # Renamed to match old schema key or new? Prompt says "Special". Old was "special_attack". Let's keep "special_attack" for compatibility but display as "Special"
        
        # Substats
        "substats": {
            "raw_power": animal['stats']['attack']['raw_power'],
            "natural_weapons": animal['stats']['attack']['weapons'],
            "armor": animal['stats']['defense']['armor'],
            "resilience": animal['stats']['defense']['resilience'],
            "speed_stat": animal['stats']['agility']['speed'],
            "maneuverability": animal['stats']['agility']['maneuverability'],
            "endurance": animal['stats']['stamina']['endurance'],
            "recovery": animal['stats']['stamina']['recovery'],
            "tactics": animal['stats']['intelligence']['tactics'],
            "senses": animal['stats']['intelligence']['senses'],
            "ferocity": animal['stats']['special']['ferocity'],
            "unique_abilities": animal['stats']['special']['abilities']
        },
        
        # Legacy/UI fields
        "image": orig.get('image', ''),
        "type": orig.get('type', 'Unknown'),
        "class": animal['battle_profile']['combat_style'], # Update class to match combat style
        "unique_traits": orig.get('unique_traits', []),
        "special_abilities": orig.get('special_abilities', []),
        "isNocturnal": orig.get('isNocturnal', False),
        "isSocial": orig.get('isSocial', False),
        "diet": orig.get('diet', []),
        
        # Recalculate Size Score (Simple mass based log scale or similar? Or just keep old?)
        # Prompt: "Recalculate Size Score... consistent with roster"
        # Let's make size score relative to Blue Whale (100) and Mantis Shrimp (0)
        # Logarithmic scale is best for mass.
    }
    
    # Size Score Calculation
    # Blue Whale: 150,000 kg -> 100
    # Mantis Shrimp: 0.1 kg -> 1
    # Log10(150000) = 5.17
    # Log10(0.1) = -1
    # Let's just use a simple heuristic for now or keep it simple.
    # Actually, let's use a root curve.
    # Max weight 150,000.
    # Score = (Weight / 150000) ^ 0.2 * 100
    # 150000 -> 1 * 100 = 100
    # 6000 (Elephant) -> 0.04 ^ 0.2 = 0.52 -> 52
    # 100 (Human) -> 0.0006 ^ 0.2 = 0.22 -> 22
    # 0.1 -> 0.0000006 ^ 0.2 = 0.05 -> 5
    # This seems decent.
    
    import math
    if animal['weight_kg'] > 0:
        ratio = animal['weight_kg'] / 150000
        score = (ratio ** 0.2) * 100
        obj['size_score'] = round(score, 1)
    else:
        obj['size_score'] = 1.0

    final_data.append(obj)

with open('animal_stats.json', 'w') as f:
    json.dump(final_data, f, indent=2)

print("Stats rebuilt successfully.")
