# Animal Battle Stats - Architecture Documentation

## Overview

Animal Battle Stats is a web application for comparing animal statistics, running tournaments, and community interaction. The codebase follows a modular architecture with clear separation between pages and shared utilities.

---

## Directory Structure

```
animal-stats/
├── api/                    # Serverless API endpoints (Vercel)
│   ├── animals.js          # Animal CRUD operations
│   ├── auth.js             # Authentication endpoints
│   ├── battles.js          # Battle/fight endpoints
│   ├── chat.js             # Community chat
│   ├── comments.js         # Animal comments
│   ├── community.js        # Community features
│   ├── random.js           # Random animal selection
│   ├── rankings.js         # Power rankings & voting
│   ├── search.js           # Animal search
│   ├── stats.js            # Site statistics
│   └── votes.js            # Voting system
│
├── css/                    # Stylesheets (modular BEM architecture)
│   ├── main.css            # Main entry point (imports all modules)
│   ├── legacy.css          # Legacy styles (~17K lines, being migrated)
│   ├── variables.css       # CSS custom properties (colors, spacing)
│   ├── base.css            # Base element styles (reset, typography)
│   ├── components/         # Reusable UI components
│   │   ├── buttons.css     # Button variants
│   │   ├── cards.css       # Card components
│   │   ├── modals.css      # Modal dialogs
│   │   └── stat-bars.css   # Animated stat bars
│   ├── layout/             # Layout components
│   │   ├── header.css      # Site header
│   │   └── grid.css        # Grid system
│   └── pages/              # Page-specific styles
│       ├── stats.css       # Stats page
│       ├── compare.css     # Compare page
│       ├── rankings.css    # Rankings page
│       ├── community.css   # Community page
│       └── tournament.css  # Tournament modal
│
├── js/                     # JavaScript modules
│   ├── core.js             # ✨ Shared utilities & configuration
│   ├── router.js           # URL routing (SPA navigation)
│   ├── auth.js             # Authentication UI & state
│   ├── main.js             # Core app + Stats page (AnimalStatsApp)
│   ├── rankings.js         # Rankings page (RankingsManager)
│   ├── tournament.js       # Tournament system (TournamentManager)
│   ├── community-manager.js # Community page (CommunityManager)
│   ├── compare.js          # Compare page enhancements
│   └── community.js        # Community page enhancements
│
├── lib/                    # Backend shared libraries
│   ├── auth.js             # Auth utilities (JWT, validation)
│   ├── discord.js          # Discord webhook integration
│   ├── mongodb.js          # Database connection
│   ├── xpSystem.js         # XP/leveling system
│   └── models/             # Mongoose models
│       ├── Animal.js       # Animal schema
│       ├── BattleStats.js  # Battle statistics
│       ├── ChatMessage.js  # Chat messages
│       ├── Comment.js      # Animal comments
│       ├── RankHistory.js  # Ranking history
│       ├── SiteStats.js    # Site-wide stats
│       ├── Vote.js         # User votes
│       └── XpClaim.js      # XP claims tracking
│
├── scripts/                # Development & migration scripts
│   ├── migrations/         # Database migrations
│   ├── data-tools/         # Data import/export tools
│   └── image-tools/        # Image processing scripts
│
├── images/                 # Static images
├── index.html              # Main HTML entry point
├── manifest.json           # PWA manifest
├── vercel.json             # Vercel configuration
└── package.json            # Dependencies
```

---

## JavaScript Architecture

### Core Files

#### `js/core.js` - Shared Utilities (~290 lines)
Provides global utilities used across all modules:
- `formatNumber(num)` - Format numbers with commas
- `formatStat(num)` - Format stats with decimals
- `escapeHtml(text)` - XSS prevention
- `formatTimeAgo(date)` - Relative time formatting
- `debounce(fn, wait)` - Input debouncing
- `apiRequest(endpoint)` - API helper
- `authApiRequest(endpoint)` - Authenticated API helper
- `API_CONFIG` - API endpoints configuration
- `FALLBACK_IMAGE` - Placeholder image SVG
- `window.AppState` - Shared application state
- `window.EventBus` - Cross-module communication

#### `js/router.js` - URL Routing (~240 lines)
SPA router handling:
- Route definitions for all pages
- Browser history management
- URL slug generation
- Navigation helpers

#### `js/auth.js` - Authentication (~1,150 lines)
User authentication UI:
- Login/signup forms
- Session management
- User stats bar updates
- Profile management

### Page Managers

#### `js/main.js` - Core App + Stats Page (~2,500 lines)
**Contains:** `AnimalStatsApp` class
- App initialization and state management
- Router integration
- Animal data fetching
- Stats view rendering
- Compare page base functionality
- Grid filtering and sorting

#### `js/rankings.js` - Rankings Page (~1,850 lines)
**Contains:** `RankingsManager` class
- Power rankings display
- Vote handling (upvotes/downvotes)
- Comments system
- Rank detail panel
- Tournament history for animals

#### `js/tournament.js` - Tournament System (~1,900 lines)
**Contains:** `TournamentManager` class
- Bracket generation (4/8/16/32 animals)
- Match simulation with intro animations
- Prediction system ("Guess the Majority")
- ELO rating updates
- Results tracking and podium display

#### `js/community-manager.js` - Community Page (~1,300 lines)
**Contains:** `CommunityManager` class
- Chat messages
- Activity feed
- Daily matchup voting
- User presence

### Enhancement Files

#### `js/compare.js` - Compare Page Enhancements (~920 lines)
Tournament-style visual enhancements:
- Fighter card layout
- Intro animations
- Result overlays
- Stat comparison displays

#### `js/community.js` - Community Page Enhancements
Real-time features:
- Heartbeat tracking
- Online users indicator
- Chat polling enhancements

---

## CSS Architecture

### BEM Naming Convention
Classes follow Block-Element-Modifier pattern:
```css
.block {}
.block__element {}
.block--modifier {}
```

### CSS Variables
Defined in `css/variables.css`:
```css
--color-primary: #ff0033;
--color-accent: #00d4ff;
--spacing-sm: 8px;
--spacing-md: 16px;
/* ... */
```

### Import Order (main.css)
```css
@import 'variables.css';     /* 1. Variables first */
@import 'base.css';          /* 2. Base styles */
@import 'layout/header.css'; /* 3. Layout */
@import 'layout/grid.css';
@import 'components/...';    /* 4. Components */
@import 'pages/...';         /* 5. Pages last */
```

---

## API Structure

All API endpoints are serverless functions (Vercel) in `/api/`:

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/animals` | GET, POST | Animal CRUD |
| `/api/search` | GET | Animal search |
| `/api/random` | GET | Random animal |
| `/api/rankings` | GET, POST | Power rankings |
| `/api/votes` | GET, POST | Vote handling |
| `/api/comments` | GET, POST | Comments |
| `/api/chat` | GET, POST | Chat messages |
| `/api/community` | GET, POST | Community data |
| `/api/stats` | GET | Site statistics |
| `/api/auth` | POST | Authentication |

---

## Data Flow

```
┌──────────────────────────────────────────────────────────┐
│                    FRONTEND                               │
│  ┌─────────┐   ┌──────────┐   ┌──────────────────────┐  │
│  │ Router  │──▶│ main.js  │──▶│ Page Managers        │  │
│  │         │   │          │   │ - RankingsManager    │  │
│  │         │   │          │   │ - TournamentManager  │  │
│  │         │   │          │   │ - CommunityManager   │  │
│  └─────────┘   └──────────┘   └──────────────────────┘  │
│        │              │                    │             │
│        │              ▼                    │             │
│        │        ┌──────────┐               │             │
│        │        │ core.js  │◀──────────────┘             │
│        │        │ (utils)  │                             │
│        │        └──────────┘                             │
└────────┼─────────────┼───────────────────────────────────┘
         │             │
         ▼             ▼
┌──────────────────────────────────────────────────────────┐
│                     API Layer                             │
│  /api/animals  /api/rankings  /api/chat  /api/auth      │
└──────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│                    MongoDB Atlas                          │
│  Collections: animals, votes, comments, users, chat...   │
└──────────────────────────────────────────────────────────┘
```

---

## Adding New Features

### Adding a New Page
1. Create CSS file: `css/pages/newpage.css`
2. Add import to `css/main.css`
3. Add HTML view in `index.html` with `id="newpage-view"`
4. Add class in `main.js` (or separate file)
5. Register route in `js/router.js`
6. Add nav button in header

### Adding a New Component
1. Create CSS file: `css/components/newcomponent.css`
2. Add import to `css/main.css`
3. Use BEM naming: `.c-newcomponent__element`

### Adding API Endpoint
1. Create file in `/api/newfeature.js`
2. Export handler function
3. Use lib functions for DB access

---

## Development Guidelines

### JavaScript
- Use `'use strict'` in all files
- Expose managers on `window` for debugging
- Use `async/await` for API calls
- Add JSDoc comments for public methods

### CSS
- Use BEM naming convention
- Define colors in variables.css
- Page styles go in css/pages/
- Component styles go in css/components/

### API
- Always validate input
- Use try/catch for all DB operations
- Return consistent JSON structure
- Log errors for debugging

---

## Future Improvements

### Planned Refactoring
1. **Split main.js into modules** - When ready, extract:
   - `js/stats.js` - Stats page
   - `js/rankings.js` - Rankings page  
   - `js/tournament.js` - Tournament modal
   - `js/community-manager.js` - Community page

2. **Convert to ES Modules** - Use import/export

3. **TypeScript Migration** - Add type safety

4. **Component Library** - Extract reusable components

---

## Quick Reference

### Global Objects
```javascript
window.app              // AnimalStatsApp instance
window.rankingsManager  // RankingsManager instance
window.tournamentManager // TournamentManager instance
window.communityManager // CommunityManager instance
window.Auth             // Authentication module
window.Router           // Router instance
window.CoreUtils        // Utility functions
window.AppState         // Shared state
window.EventBus         // Event system
```

### Key DOM IDs
```
#stats-view      - Stats page container
#compare-view    - Compare page container
#rankings-view   - Rankings page container
#community-view  - Community page container
#tournament-modal - Tournament overlay
#home-view       - Home/landing page
```
