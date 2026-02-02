---
name: "🐾 Data Entry: Animal Stats"
about: "Help verify weight, speed, and bite force for animals"
title: "Data: [Animal Name] - Verify weight/speed/bite force"
labels: ["help wanted", "good first issue", "data"]
assignees: []
---

## Animal
**Name:** [Animal name here]

## Current Values
| Field | Current Value | Needs Verification |
|-------|---------------|-------------------|
| weight_kg | | ⬜ |
| speed_mps | | ⬜ |
| bite_force_psi | | ⬜ |

## Task
Research and verify the above stats using reliable sources. Update `animal_stats.json` with accurate values.

## Requirements
- [ ] Find reliable source(s) for each stat
- [ ] Update values in `animal_stats.json`
- [ ] List sources in PR description
- [ ] Ensure JSON is still valid

## Helpful Resources
- [Animal Diversity Web](https://animaldiversity.org/)
- [IUCN Red List](https://www.iucnredlist.org/)
- [National Geographic Animals](https://www.nationalgeographic.com/animals)

## Notes
- Use adult average values
- Speed should be in meters per second (km/h ÷ 3.6)
- If no reliable bite force data exists, use 0
