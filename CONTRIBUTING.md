# Contributing to Animal Battle Stats

Thanks for your interest in contributing! We're looking for help improving the accuracy of our animal data.

## Current Need: Accurate Physical Stats

We need contributors to research and fill in accurate **weight**, **speed**, and **bite force** data for our 225+ animals.

### What We Need

For each animal in `animal_stats.json`, verify and update:

| Field | Unit | Notes |
|-------|------|-------|
| `weight_kg` | kilograms | Use adult average. For ranges, use midpoint |
| `speed_mps` | meters per second | Top speed. Convert from km/h ÷ 3.6 or mph ÷ 2.237 |
| `bite_force_psi` | PSI | Use 0 if no bite (e.g., elephants) or no reliable data exists |

### How to Contribute

1. **Fork this repository**
2. **Pick an animal** from the open issues or choose one that needs data
3. **Research the stats** using reliable sources (scientific papers, wildlife databases, reputable encyclopedias)
4. **Edit `animal_stats.json`** - find your animal and update the three fields
5. **Add your sources** in the PR description
6. **Submit a Pull Request**

### Source Requirements

Every stat change must include a source in your PR description. Acceptable sources:
- Scientific papers / journals
- Wildlife databases (Animal Diversity Web, IUCN, etc.)
- Reputable encyclopedias (Britannica, National Geographic)
- Zoo/sanctuary official data

**Not acceptable**: Wikipedia (unless citing its sources), random websites, AI-generated estimates

### Example PR Description

```
## Animal: Gray Wolf

### Changes
- weight_kg: 45 (was 40)
- speed_mps: 17.8 (was 15) 
- bite_force_psi: 400 (was 398)

### Sources
- Weight: Animal Diversity Web - https://animaldiversity.org/accounts/Canis_lupus/
- Speed: National Geographic - https://nationalgeographic.com/animals/mammals/g/gray-wolf/
- Bite Force: Journal of Zoology study - https://doi.org/xxxxx
```

### Guidelines

- **One animal per PR** (makes review easier)
- **Don't guess** - if you can't find reliable data, leave it unchanged
- **Use adult values** - not juveniles
- **Metric units only** - convert if needed
- **Keep JSON valid** - test that the file still parses

### Questions?

Open an issue or join our [Discord](https://discord.gg/BAaJFCXNTN).
