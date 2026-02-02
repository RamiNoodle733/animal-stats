# Contributing to Animal Battle Stats

Thanks for your interest in contributing! We need help building an accurate animal database from the ground up.

## Current Need: Accurate Physical Stats for ALL 225+ Animals

Our database currently has **placeholder or estimated values** for weight, speed, and bite force. **Every animal needs real, sourced data.**

This is a full database overhaul - not spot-checking. If you want to help make this project accurate, this is the task.

### Fields That Need Real Data

| Field | Unit | Notes |
|-------|------|-------|
| `weight_kg` | kilograms | Adult average. For ranges, use midpoint |
| `speed_mps` | meters per second | Top speed. Convert: km/h ÷ 3.6, or mph ÷ 2.237 |
| `bite_force_psi` | PSI | Use 0 if no bite (e.g., elephants) or no reliable data exists |

### How to Contribute

1. **Fork this repository**
2. **Claim animals** - comment on the open issue to claim which animals you'll research
3. **Research the stats** using reliable sources
4. **Edit `animal_stats.json`** - update the three fields for your claimed animals
5. **List your sources** in the PR description
6. **Submit a Pull Request**

### Source Requirements

Every stat **must** have a source. Acceptable:
- Scientific papers / journals
- Wildlife databases (Animal Diversity Web, IUCN, etc.)
- Encyclopedias (Britannica, National Geographic)
- Zoo/sanctuary official data

**Not acceptable**: Wikipedia (unless citing its primary source), random websites, AI-generated numbers

### Example PR Description

```
## Animals: Gray Wolf, Red Fox

### Gray Wolf
| Field | New Value | Source |
|-------|-----------|--------|
| weight_kg | 45 | [Animal Diversity Web](https://animaldiversity.org/accounts/Canis_lupus/) |
| speed_mps | 17.8 | [National Geographic](https://nationalgeographic.com/animals/mammals/g/gray-wolf/) |
| bite_force_psi | 400 | [Journal of Zoology](https://doi.org/xxxxx) |

### Red Fox
| Field | New Value | Source |
|-------|-----------|--------|
| weight_kg | 6.8 | [Source URL] |
| speed_mps | 13.4 | [Source URL] |
| bite_force_psi | 92 | [Source URL] |
```

### Guidelines

- **Claim animals first** - comment on the issue so work isn't duplicated
- **Multiple animals per PR is encouraged** - the more the better
- **Don't guess** - if you can't find data, skip that field and note it
- **Adult values only** - not juveniles
- **Metric units** - convert if needed
- **Keep JSON valid** - make sure the file still parses

### Questions?

Open an issue or join our [Discord](https://discord.gg/BAaJFCXNTN).
