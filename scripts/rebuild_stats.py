"""Heuristic stat rebuilder for the entire animal roster."""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Dict, List, Tuple

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "animal_stats.json"

SIZE_BASE = {
    "Tiny": 8.0,
    "Small": 22.0,
    "Medium": 45.0,
    "Large": 68.0,
    "Extra Large": 82.0,
    "Colossal": 98.0,
}

TYPE_ALIAS = {
    "Marsupial": "Mammal",
    "Arthropod": "Invertebrate",
}

TYPE_TRAITS = {
    "Mammal": {"raw_power": 3, "resilience": 4, "endurance": 5, "recovery": 5, "tactics": 8, "senses": 4},
    "Bird": {"speed_stat": 10, "maneuverability": 13, "senses": 10, "armor": -8, "resilience": -4},
    "Reptile": {"armor": 10, "resilience": 5, "speed_stat": -4, "maneuverability": -3, "ferocity": 4},
    "Fish": {"speed_stat": 4, "maneuverability": 4, "unique_abilities": 3},
    "Amphibian": {"maneuverability": 2, "unique_abilities": 4, "armor": -5},
    "Insect": {"maneuverability": 12, "speed_stat": 6, "armor": -8, "raw_power": -15, "unique_abilities": 6},
    "Arachnid": {"maneuverability": 6, "unique_abilities": 8, "natural_weapons": 5, "armor": -4},
    "Crustacean": {"armor": 6, "unique_abilities": 5, "maneuverability": -4},
    "Cephalopod": {"maneuverability": 10, "senses": 10, "unique_abilities": 12, "armor": -12},
    "Cnidarian": {"unique_abilities": 20, "armor": -15, "raw_power": -18, "resilience": -10},
    "Invertebrate": {"maneuverability": 6, "unique_abilities": 4, "armor": -6},
}

INTELLIGENCE_BASE = {
    "Mammal": 66,
    "Bird": 60,
    "Reptile": 42,
    "Fish": 38,
    "Amphibian": 35,
    "Insect": 25,
    "Arachnid": 25,
    "Crustacean": 32,
    "Cephalopod": 82,
    "Cnidarian": 20,
    "Invertebrate": 34,
}

SENSE_BASE = {
    "Mammal": 60,
    "Bird": 70,
    "Reptile": 48,
    "Fish": 55,
    "Amphibian": 45,
    "Insect": 58,
    "Arachnid": 52,
    "Crustacean": 48,
    "Cephalopod": 65,
    "Cnidarian": 30,
    "Invertebrate": 50,
}

STYLE_KEYWORD_BONUSES: List[Tuple[str, Dict[str, float]]] = [
    ("tank", {"armor": 12, "resilience": 10, "speed_stat": -6, "maneuverability": -6}),
    ("bruiser", {"raw_power": 8, "ferocity": 6, "armor": 4}),
    ("ambush", {"maneuverability": 8, "speed_stat": 6, "tactics": 4}),
    ("skirmisher", {"speed_stat": 6, "maneuverability": 6, "endurance": 4}),
    ("pack", {"tactics": 10, "recovery": 6, "ferocity": 4}),
    ("controller", {"tactics": 8, "unique_abilities": 8}),
    ("glass cannon", {"natural_weapons": 10, "ferocity": 6, "armor": -10}),
    ("grappler", {"raw_power": 6, "resilience": 6}),
    ("berserker", {"ferocity": 12, "raw_power": 5, "tactics": -4}),
    ("venom", {"natural_weapons": 8, "unique_abilities": 12}),
    ("electric", {"unique_abilities": 12, "natural_weapons": 4}),
    ("trickster", {"tactics": 6, "unique_abilities": 6, "maneuverability": 4}),
    ("runner", {"speed_stat": 8, "endurance": 5}),
    ("speed", {"speed_stat": 6, "maneuverability": 4}),
    ("titan", {"raw_power": 10, "resilience": 10, "maneuverability": -8}),
]

KEYWORD_GROUPS: List[Tuple[Tuple[str, ...], Dict[str, float]]] = [
    (("venom", "venomous", "toxin", "poison", "sting"), {"natural_weapons": 9, "unique_abilities": 18, "ferocity": 4}),
    (("electric", "shock", "volt", "electro"), {"unique_abilities": 15, "natural_weapons": 6}),
    (("camouflage", "stealth", "invisible", "invisibility", "blend"), {"senses": 6, "unique_abilities": 8, "maneuverability": 4}),
    (("armor", "armored", "shell", "carapace", "scales", "plated", "plate", "thick skin"), {"armor": 12, "resilience": 6}),
    (("horn", "tusk", "antler", "spike", "spiked", "gore"), {"raw_power": 4, "natural_weapons": 8, "ferocity": 3}),
    (("claw", "talon", "hooked"), {"natural_weapons": 6, "ferocity": 2}),
    (("acid", "acidic"), {"unique_abilities": 8, "natural_weapons": 4}),
    (("fire", "flame", "lava", "heat"), {"unique_abilities": 10, "ferocity": 4}),
    (("ice", "frost", "snow"), {"resilience": 5, "unique_abilities": 4}),
    (("echolocation", "sonar"), {"senses": 12, "tactics": 6}),
    (("pack", "teamwork", "cooperative", "coordination"), {"tactics": 8, "recovery": 6}),
    (("fearless", "aggressive", "relentless", "berserk"), {"ferocity": 10}),
]

DIET_BONUS = {
    "Carnivore": {"raw_power": 4, "natural_weapons": 5, "ferocity": 8},
    "Omnivore": {"tactics": 3, "endurance": 2},
    "Herbivore": {"resilience": 4, "endurance": 4, "ferocity": -4},
}

MEAT_KEYWORDS = ("meat", "fish", "prey", "carrion", "insect", "animal", "bird", "mammal", "reptile", "amphibian")
PLANT_KEYWORDS = ("plant", "grass", "leaves", "leaf", "bamboo", "root", "fruit", "nectar", "algae", "plankton", "flowers")


def clamp(value: float) -> float:
    return max(0.0, min(100.0, value))


def linear_scale(value: float, minimum: float, maximum: float) -> float:
    if maximum <= minimum:
        return 50.0
    value = max(minimum, min(maximum, value))
    return clamp((value - minimum) / (maximum - minimum) * 100)


def log_scale(value: float, minimum: float, maximum: float, floor: float = 1e-3) -> float:
    minimum = max(minimum, floor)
    maximum = max(maximum, minimum + floor)
    value = max(value, floor)
    return clamp((math.log(value) - math.log(minimum)) / (math.log(maximum) - math.log(minimum)) * 100)


def sqrt_scale(value: float, minimum: float, maximum: float) -> float:
    return linear_scale(math.sqrt(value), math.sqrt(minimum), math.sqrt(maximum))


def determine_diet(diet_list: List[str]) -> str:
    if not diet_list:
        return "Omnivore"
    normalized = [entry.lower() for entry in diet_list]
    if any("varied" in entry or "omn" in entry for entry in normalized):
        return "Omnivore"

    has_meat = any(any(keyword in entry for keyword in MEAT_KEYWORDS) for entry in normalized)
    has_plants = any(any(keyword in entry for keyword in PLANT_KEYWORDS) for entry in normalized)

    if has_meat and has_plants:
        return "Omnivore"
    if has_meat:
        return "Carnivore"
    if has_plants:
        return "Herbivore"
    return "Omnivore"


def build_text_blob(animal: Dict) -> str:
    battle = animal.get("battle_profile") or {}
    parts: List[str] = []
    if animal.get("description"):
        parts.append(str(animal["description"]))
    for field in ("unique_traits", "special_abilities"):
        parts.extend(str(item) for item in (animal.get(field) or []))
    parts.extend(str(item) for item in (battle.get("strengths") or []))
    if battle.get("combat_style"):
        parts.append(battle["combat_style"])
    return " ".join(parts).lower()


class HeuristicStatEngine:
    def __init__(self, animals: List[Dict]):
        self.animals = animals
        self.ranges = self._build_ranges()

    def _build_ranges(self) -> Dict[str, Tuple[float, float]]:
        def collect(key: str, default_min: float, default_max: float) -> Tuple[float, float]:
            values = [float(entry[key]) for entry in self.animals if isinstance(entry.get(key), (int, float)) and entry.get(key, 0) > 0]
            if not values:
                return default_min, default_max
            return min(values), max(values)

        return {
            "weight": collect("weight_kg", 0.05, 150000.0),
            "height": collect("height_cm", 1.0, 500.0),
            "length": collect("length_cm", 5.0, 3000.0),
            "speed": collect("speed_mps", 0.1, 110.0),
            "bite": collect("bite_force_psi", 1.0, 40000.0),
            "lifespan": collect("lifespan_years", 1.0, 150.0),
        }

    def rebuild(self) -> List[Dict]:
        return [self._process_animal(animal) for animal in self.animals]

    def _process_animal(self, animal: Dict) -> Dict:
        context = self._build_context(animal)
        substats = self._compute_substats(context)
        main_stats = self._compute_main_stats(context, substats)

        updated = dict(animal)
        updated.update(main_stats)
        updated["substats"] = substats
        updated["size_score"] = self._compute_size_score(context)

        battle = animal.get("battle_profile") or {}
        if battle.get("combat_style"):
            updated["class"] = battle["combat_style"]

        return updated

    def _build_context(self, animal: Dict) -> Dict:
        battle = animal.get("battle_profile") or {}
        raw_type = animal.get("type", "Unknown")
        normalized_type = TYPE_ALIAS.get(raw_type, raw_type)
        size_label = animal.get("size", "Medium")
        size_bonus = SIZE_BASE.get(size_label, 45.0)

        weight = max(float(animal.get("weight_kg") or self.ranges["weight"][0]), self.ranges["weight"][0])
        length = max(float(animal.get("length_cm") or self.ranges["length"][0]), self.ranges["length"][0])
        height = max(float(animal.get("height_cm") or self.ranges["height"][0]), self.ranges["height"][0])
        speed = max(float(animal.get("speed_mps") or self.ranges["speed"][0]), self.ranges["speed"][0])
        bite = max(float(animal.get("bite_force_psi") or 0.0), 0.0)
        lifespan = max(float(animal.get("lifespan_years") or self.ranges["lifespan"][0]), self.ranges["lifespan"][0])

        habitat = (animal.get("habitat") or "").lower()
        is_aquatic = any(keyword in habitat for keyword in ("ocean", "sea", "river", "lake", "swamp", "reef", "coast", "wetland", "marsh"))
        is_flying = normalized_type == "Bird" or "sky" in habitat

        context = {
            "animal": animal,
            "battle": battle,
            "type": normalized_type,
            "size_label": size_label,
            "size_bonus": size_bonus,
            "mass_score": log_scale(weight, *self.ranges["weight"]),
            "length_score": linear_scale(length, *self.ranges["length"]),
            "height_score": linear_scale(height, *self.ranges["height"]),
            "speed_score": sqrt_scale(speed, *self.ranges["speed"]),
            "bite_score": log_scale(max(bite, 1.0), max(self.ranges["bite"][0], 1.0), max(self.ranges["bite"][1], 1.0)),
            "lifespan_score": log_scale(lifespan, *self.ranges["lifespan"]),
            "diet": determine_diet(animal.get("diet") or []),
            "style": (battle.get("combat_style") or "").lower(),
            "text": build_text_blob(animal),
            "is_social": bool(animal.get("isSocial")),
            "is_nocturnal": bool(animal.get("isNocturnal")),
            "is_aquatic": is_aquatic,
            "is_flying": is_flying,
            "special_count": len(animal.get("special_abilities") or []),
            "unique_traits_count": len(animal.get("unique_traits") or []),
        }
        context["mass_inverse"] = clamp(100.0 - context["mass_score"])
        return context

    def _compute_substats(self, ctx: Dict) -> Dict[str, float]:
        diet = ctx["diet"]
        style = ctx["style"]

        raw_power = (
            0.55 * ctx["mass_score"] +
            0.2 * ctx["length_score"] +
            0.15 * ctx["bite_score"] +
            0.1 * ctx["size_bonus"]
        )
        if diet == "Carnivore":
            raw_power += 6
        elif diet == "Herbivore":
            raw_power -= 2

        natural_weapons = (
            0.45 * ctx["bite_score"] +
            0.25 * ctx["speed_score"] +
            0.2 * ctx["size_bonus"] +
            0.1 * ctx["length_score"]
        )
        if diet != "Herbivore":
            natural_weapons += 4
        if ctx["is_flying"]:
            natural_weapons += 3

        armor = (
            0.5 * ctx["mass_score"] +
            0.2 * ctx["height_score"] +
            0.2 * ctx["lifespan_score"] +
            0.1 * ctx["size_bonus"]
        )
        if ctx["size_label"] in ("Tiny", "Small"):
            armor -= 10
        if ctx["is_aquatic"]:
            armor += 4

        resilience = (
            0.35 * armor +
            0.3 * ctx["lifespan_score"] +
            0.2 * ctx["size_bonus"] +
            0.15 * ctx["mass_score"]
        )
        if ctx["is_social"]:
            resilience += 4

        speed_stat = (
            0.7 * ctx["speed_score"] +
            0.2 * (100 - 0.6 * ctx["mass_score"]) +
            0.1 * ctx["length_score"]
        )
        if ctx["is_flying"]:
            speed_stat += 8
        if "runner" in style or "speed" in style:
            speed_stat += 6
        if ctx["is_aquatic"]:
            speed_stat += 5

        maneuverability = (
            0.45 * ctx["speed_score"] +
            0.35 * ctx["mass_inverse"] +
            0.2 * ctx["height_score"]
        )
        if ctx["is_flying"]:
            maneuverability += 10
        if ctx["is_aquatic"]:
            maneuverability += 6

        sprinter_penalty = ctx["speed_score"] * 0.35
        endurance = (
            0.35 * ctx["mass_score"] +
            0.35 * ctx["lifespan_score"] +
            0.3 * (100 - sprinter_penalty)
        )
        if diet == "Herbivore":
            endurance += 4
        elif diet == "Carnivore":
            endurance -= 3
        if "endurance" in style or "migrator" in style:
            endurance += 8
        if ctx["is_social"]:
            endurance += 3

        recovery = (
            0.45 * ctx["lifespan_score"] +
            0.3 * (100 - 0.5 * ctx["mass_score"]) +
            0.25 * (ctx["is_social"] * 10 + ctx["special_count"] * 2)
        )
        if ctx["is_aquatic"]:
            recovery += 2

        type_intel = INTELLIGENCE_BASE.get(ctx["type"], 50)
        tactics = type_intel + 0.2 * ctx["lifespan_score"] + 0.1 * ctx["speed_score"]
        if ctx["is_social"]:
            tactics += 6
        if any(keyword in style for keyword in ("controller", "engineer", "tool")):
            tactics += 8

        sense_base = SENSE_BASE.get(ctx["type"], 55)
        senses = (
            sense_base +
            0.25 * ctx["lifespan_score"] +
            0.25 * (100 - ctx["mass_score"] / 2) +
            0.25 * ctx["speed_score"]
        )
        if ctx["is_nocturnal"]:
            senses += 10
        if ctx["is_aquatic"]:
            senses += 4
        if ctx["is_flying"]:
            senses += 6

        ferocity = (
            25 +
            0.3 * ctx["size_bonus"] +
            0.25 * ctx["mass_score"]
        )
        if diet == "Carnivore":
            ferocity += 8
        elif diet == "Omnivore":
            ferocity += 2
        else:
            ferocity -= 3
        if any(keyword in style for keyword in ("berserker", "aggressor", "slayer")):
            ferocity += 10

        unique_abilities = 30 + ctx["special_count"] * 4 + ctx["unique_traits_count"] * 1.5 + 0.2 * senses
        if any(keyword in style for keyword in ("trickster", "controller", "mage")):
            unique_abilities += 6

        substats = {
            "raw_power": raw_power,
            "natural_weapons": natural_weapons,
            "armor": armor,
            "resilience": resilience,
            "speed_stat": speed_stat,
            "maneuverability": maneuverability,
            "endurance": endurance,
            "recovery": recovery,
            "tactics": tactics,
            "senses": senses,
            "ferocity": ferocity,
            "unique_abilities": unique_abilities,
        }

        self._apply_adjustments(substats, TYPE_TRAITS.get(ctx["type"], {}))
        self._apply_adjustments(substats, DIET_BONUS.get(diet, {}))
        for keyword, bonus in STYLE_KEYWORD_BONUSES:
            if keyword in style:
                self._apply_adjustments(substats, bonus)

        text = ctx["text"]
        for keywords, bonus in KEYWORD_GROUPS:
            if any(term in text for term in keywords):
                self._apply_adjustments(substats, bonus)

        if ctx["is_social"]:
            self._apply_adjustments(substats, {"tactics": 4, "recovery": 4})
        if ctx["is_nocturnal"]:
            self._apply_adjustments(substats, {"senses": 4})

        return {key: round(clamp(value), 1) for key, value in substats.items()}

    @staticmethod
    def _apply_adjustments(target: Dict[str, float], adjustments: Dict[str, float]) -> None:
        for stat, delta in adjustments.items():
            if stat in target:
                target[stat] += delta

    def _compute_main_stats(self, ctx: Dict, substats: Dict[str, float]) -> Dict[str, float]:
        attack = clamp(
            0.35 * substats["raw_power"] +
            0.35 * substats["natural_weapons"] +
            0.15 * ctx["bite_score"] +
            0.15 * substats["ferocity"]
        )

        defense = clamp(
            0.45 * substats["armor"] +
            0.35 * substats["resilience"] +
            0.2 * ctx["size_bonus"]
        )

        agility = clamp(
            0.5 * substats["speed_stat"] +
            0.3 * substats["maneuverability"] +
            0.2 * ctx["mass_inverse"]
        )

        stamina = clamp(
            0.45 * substats["endurance"] +
            0.35 * substats["recovery"] +
            0.2 * substats["resilience"]
        )

        intelligence = clamp(
            0.6 * substats["tactics"] +
            0.25 * substats["senses"] +
            0.15 * (50 + 0.5 * ctx["lifespan_score"])
        )

        special_attack = clamp(
            0.4 * substats["unique_abilities"] +
            0.2 * substats["ferocity"] +
            0.2 * substats["natural_weapons"] +
            0.2 * substats["tactics"]
        )

        return {
            "attack": round(attack, 1),
            "defense": round(defense, 1),
            "agility": round(agility, 1),
            "stamina": round(stamina, 1),
            "intelligence": round(intelligence, 1),
            "special_attack": round(special_attack, 1),
        }

    def _compute_size_score(self, ctx: Dict) -> float:
        score = 0.6 * ctx["mass_score"] + 0.2 * ctx["length_score"] + 0.2 * ctx["height_score"]
        return round(clamp(score), 1)


def main() -> None:
    with DATA_PATH.open("r", encoding="utf-8") as handle:
        animals = json.load(handle)

    engine = HeuristicStatEngine(animals)
    rebuilt = engine.rebuild()

    with DATA_PATH.open("w", encoding="utf-8") as handle:
        json.dump(rebuilt, handle, indent=2, ensure_ascii=False)

    print(f"Rebuilt stats for {len(rebuilt)} animals.")


if __name__ == "__main__":
    main()
