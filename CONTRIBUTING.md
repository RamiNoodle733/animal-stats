# Contributing to Animal Battle Stats

Thanks for your interest in contributing! We need help building an accurate animal database.

## Current Need: Accurate Physical Stats for ALL 225+ Animals

Our database currently has **placeholder or estimated values** for weight, speed, and bite force. **Every animal needs real data.**

Check [DATA_PROGRESS.md](./DATA_PROGRESS.md) to see which animals still need work.

### Fields That Need Real Data

| Field | Unit | Notes |
|-------|------|-------|
| `weight_kg` | kilograms | Adult average. For ranges, use midpoint |
| `speed_mps` | meters per second | Top speed. Convert: km/h ÷ 3.6, or mph ÷ 2.237 |
| `bite_force_psi` | PSI | Use 0 if no bite (e.g., elephants) or no reliable data exists |

### How to Contribute

1. **Fork this repository**
2. **Pick any animal** from [DATA_PROGRESS.md](./DATA_PROGRESS.md) that isn't checked
3. **Research the stats** 
4. **Edit `animal_stats.json`** - update the three fields
5. **Submit a Pull Request**

### Example PR

```
## Animals Updated: Gray Wolf, Red Fox

### Gray Wolf
- weight_kg: 45
- speed_mps: 17.8
- bite_force_psi: 400

### Red Fox  
- weight_kg: 6.8
- speed_mps: 13.4
- bite_force_psi: 92
```

### Guidelines

- **Multiple animals per PR is encouraged** - the more the better
- **Don't guess** - if you can't find data, skip that field
- **Adult values only** - not juveniles
- **Metric units** - convert if needed
- **Keep JSON valid** - make sure the file still parses

### Animal image requirements

- Use a real photograph of the named animal, not an illustration, cartoon, generated/stylized substitute, or 3D render.
- The background must contain genuine transparency; a white or checkerboard background baked into the pixels does not qualify.
- Do not submit watermarked previews or reuse one animal's file for another species.
- Record the original source page, creator, and reuse license for every replacement.
- Run `npm run assets:audit -- --strict` and visually review the generated contact sheet before submitting.
- Keep cutout inputs under `.cache`, run `npm run assets:promote -- --input-dir .cache/<folder>` first, and add `--apply` only after reviewing the dry-run report. Promotion creates the PNG fallback, responsive AVIF/WebP files, and provenance manifest together.

### Questions?

Open an issue or join our [Discord](https://discord.gg/BAaJFCXNTN).
