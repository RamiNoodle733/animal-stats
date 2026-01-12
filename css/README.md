# CSS Architecture

This project uses a modular CSS architecture with **BEM naming convention** and **CSS Custom Properties** (variables) for maintainability and scalability.

## File Structure

```
css/
├── main.css              # Import manifest - loads all modules
├── legacy.css            # Original styles (17K lines) - being migrated
├── variables.css         # Design tokens (colors, spacing, typography)
├── base.css              # Reset, typography, utility classes
│
├── layout/               # Layout-level components
│   ├── header.css        # Site header & navigation
│   └── grid.css          # Animal selection grid
│
├── components/           # Reusable UI components
│   ├── buttons.css       # All button variants
│   ├── cards.css         # Card components (animal cards, stat cards)
│   ├── stat-bars.css     # Stat bar components
│   └── modals.css        # Modals, overlays, panels
│
└── pages/                # Page-specific styles
    ├── compare.css       # Compare/Fight page
    ├── tournament.css    # Tournament page
    ├── community.css     # Community page
    └── rankings.css      # Rankings page
```

## Legacy CSS

The `legacy.css` file contains the original 17,000+ lines of CSS. This is being gradually migrated to the modular architecture. Once migration is complete, this file can be removed.

## BEM Naming Convention

We use BEM (Block Element Modifier) naming:

```css
/* Block */
.card { }

/* Element (part of block) */
.card__header { }
.card__body { }
.card__title { }

/* Modifier (variation) */
.card--elevated { }
.card--interactive { }
```

### Examples

```css
/* Button component */
.btn                    /* Base button */
.btn__icon              /* Icon inside button */
.btn--primary           /* Primary variant */
.btn--sm                /* Size modifier */

/* Fighter component */
.fighter                /* Base fighter card */
.fighter__name          /* Fighter's name element */
.fighter__display       /* Image display area */
.fighter--left          /* Left fighter (purple) */
.fighter--right         /* Right fighter (green) */

/* Stat bar component */
.stat-bar               /* Base stat bar */
.stat-bar__track        /* Background track */
.stat-bar__fill         /* Filled portion */
.stat-bar__fill--left   /* Left fighter variant */
```

## Design Tokens (CSS Variables)

All design values are defined in `variables.css`:

### Colors
```css
--color-primary: #00d4ff;      /* Cyan - main accent */
--color-secondary: #ff6b00;    /* Orange - action/CTA */
--color-gold: #ffd700;         /* Gold - premium */
--color-purple: #a855f7;       /* Purple - left fighter */
--color-green: #22c55e;        /* Green - right fighter */
```

### Typography
```css
--font-display: 'Bebas Neue';  /* Headings, labels */
--font-body: 'Inter';          /* Body text */
--text-sm: 0.875rem;           /* Small text */
--text-base: 1rem;             /* Base text */
--text-xl: 1.25rem;            /* Large text */
```

### Spacing
```css
--space-1: 0.25rem;    /* 4px */
--space-2: 0.5rem;     /* 8px */
--space-4: 1rem;       /* 16px */
--space-6: 1.5rem;     /* 24px */
```

## Usage

### In HTML
```html
<link rel="stylesheet" href="css/main.css">
```

### Component Example
```html
<button class="btn btn--primary btn--lg">
    <i class="btn__icon fas fa-bolt"></i>
    <span class="btn__text">Fight!</span>
</button>
```

### Card Example
```html
<div class="card card--bordered card--interactive">
    <div class="card__header">
        <h3 class="card__title">Lion</h3>
    </div>
    <div class="card__body">
        <img class="card__image" src="lion.png" alt="Lion">
    </div>
</div>
```

## Migration Guide

### From Old Classes to BEM

| Old Class | New Class |
|-----------|-----------|
| `.fighter-display` | `.fighter__display` |
| `.fighter-left` | `.fighter--left` |
| `.fight-btn` | `.btn--fight` |
| `.stat-bar-fill` | `.stat-bar__fill` |
| `.character-card` | `.animal-card` |

### Gradual Migration

The new CSS maintains **backward compatibility** with existing class names. You can migrate gradually:

1. Include both old and new CSS files
2. Update HTML components one at a time
3. Remove old CSS when migration is complete

## Best Practices

1. **Use variables** - Never hardcode colors, use `var(--color-*)` 
2. **Mobile-first** - Write base styles, then add `@media` for larger screens
3. **Single responsibility** - Each component file handles one component
4. **Avoid nesting** - Keep selectors flat (max 3 levels)
5. **Document** - Comment complex styles or magic numbers
