# Animal Battle Stats

**Interactive Fighting Game-Style Animal Statistics Webapp** 

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen)](animalbattlestats.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Animals](https://img.shields.io/badge/Animals-225-orange)](#)
[![API](https://img.shields.io/badge/API-MongoDB-green)](DEPLOYMENT.md)

A web application that presents animal statistics in an engaging fighting game-style interface. Compare stats, view animals in a character select screen, and pit them against each other in VS battles!

## 🎮 Live Demo

**[https://animalbattlestats.com](https://animalbattlestats.com)**

## ✨ Features

### 🎮 Fighting Game Interface
- **Character Select Screen**: Stats view with centered character display and flanking stat panels
- **VS Battle Mode**: Compare two fighters head-to-head with dramatic VS badge
- **Photographic Animal Cutouts**: Animal assets are being standardized on real photos with genuine transparency and traceable sources
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices

### 📊 Comprehensive Stats
- **225 Animals**: From Megalodon to Red-Eyed Tree Frog
- **Combat Stats**: Attack, Defense, Agility, Stamina, Intelligence, Special Attack
- **Detailed Substats**: Raw Power, Armor, Speed, Tactics, and more
- **Scientific Data**: Weight, speed, lifespan, bite force, and more

### 🔐 User System
- **Account Creation**: Sign up with email and password
- **User Authentication**: Secure JWT-based login
- **Future Features**: Voting on stats, comments, fight predictions

### 🚀 Backend API
- **MongoDB Database**: Persistent storage with MongoDB Atlas
- **RESTful API**: Vercel serverless functions
- **Search & Filter**: Advanced querying capabilities

## 🚀 Quick Start

### Live Site
Visit [animalbattlestats.com](https://animalbattlestats.com) directly.

### Local Development
```bash
# Clone the repository
git clone https://github.com/RamiNoodle733/animal-battle-stats.git
cd animal-battle-stats

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your MongoDB URI and JWT secret

# Seed database (optional - if starting fresh)
npm run seed

# Start development server
npm run dev
```

### Animal image quality gate

New or replacement animal artwork must be a real photograph of the correct animal with genuine transparent pixels. Cartoons, illustrations, generated or stylized animals, 3D renders, watermarked previews, opaque backgrounds, and reused files for different species are not accepted.

Run `npm run assets:audit` to inspect decoding, transparency, dimensions, byte size, and exact duplicates. Add `-- --strict` when validating a replacement-ready set. The audit can also produce labeled visual-review sheets because photographic authenticity cannot be proven from file metadata alone:

```bash
npm run assets:audit -- --report .cache/image-audit/report.json --contact-sheets .cache/image-audit
```

Candidate photos are sourced into the ignored `.cache` directory and never replace a live asset automatically. The sourcing command accepts only reusable Commons licenses, records creator/license/source metadata, and generates one review sheet per animal:

```bash
npm run assets:source -- --animal "Yak" --animal "Piranha" --limit 6
```

Only visually approved sources are recorded in `data/animal-image-sources.json`. A registry entry marked `source-selected` is not yet a live asset; it must still pass transparent-cutout and edge-quality review. Keep reviewed cutouts in the ignored `.cache` directory, inspect the dry run, and promote them explicitly:

```bash
npm run assets:promote -- --input-dir .cache/reviewed-cutouts
npm run assets:promote -- --input-dir .cache/reviewed-cutouts --apply
```

Promotion verifies PNG transparency, opaque subject pixels, safe edge padding, dimensions, and foreground coverage. It then records the checksum and review state, updates the canonical dataset, and generates transparent AVIF/WebP variants plus `images/animals/optimized/manifest.json`. Fallback URLs and variant filenames use content fingerprints so immutable browser/CDN caching cannot preserve an older animal. Re-running the same reviewed input is safe and deterministic.

After the new static files are deployed, synchronize only the registered active image paths into MongoDB. The command is a dry run unless `--apply` is supplied, updates no other animal fields, and verifies every applied value:

```bash
npm run assets:sync-images -- --env-file .cache/production.env
npm run assets:sync-images -- --env-file .cache/production.env --apply
```

## 📁 Project Structure

```
animal-battle-stats/
├── index.html              # Main HTML (single-page app)
├── manifest.json           # PWA manifest
├── vercel.json             # Vercel deployment config
│
├── css/                    # Stylesheets (modular architecture)
│   ├── main.css            # Import manifest
│   ├── legacy.css          # Original styles (being migrated)
│   ├── variables.css       # Design tokens
│   ├── base.css            # Reset & utilities
│   ├── components/         # Reusable UI components
│   │   ├── buttons.css
│   │   ├── cards.css
│   │   ├── modals.css
│   │   └── stat-bars.css
│   ├── layout/             # Layout components
│   │   ├── header.css
│   │   └── grid.css
│   └── pages/              # Page-specific styles
│       ├── compare.css
│       ├── community.css
│       ├── rankings.css
│       ├── stats.css
│       └── tournament.css
│
├── js/                     # Client-side JavaScript
│   ├── core.js             # Shared utilities & config
│   ├── main.js             # Core app + Stats page (~2,500 lines)
│   ├── rankings.js         # Rankings page (~1,850 lines)
│   ├── tournament.js       # Tournament system (~1,900 lines)
│   ├── community-manager.js # Community page (~1,300 lines)
│   ├── router.js           # Client-side routing
│   ├── auth.js             # Authentication UI
│   ├── compare.js          # Compare page enhancements
│   └── community.js        # Community page enhancements
│
├── api/                    # Serverless API functions (Vercel)
│   ├── animals.js          # Animals CRUD
│   ├── animals/[id].js     # Single animal operations
│   ├── auth.js             # Authentication
│   ├── battles.js          # Battle results
│   ├── chat.js             # Community chat
│   ├── comments.js         # Animal comments
│   ├── community.js        # Community features
│   ├── rankings.js         # Power rankings
│   ├── search.js           # Search API
│   ├── stats.js            # Site statistics
│   └── votes.js            # Voting system
│
├── lib/                    # Shared backend utilities
│   ├── mongodb.js          # Database connection
│   ├── auth.js             # JWT utilities
│   ├── discord.js          # Discord integration
│   ├── xpSystem.js         # XP/leveling system
│   └── models/             # Mongoose models
│       ├── Animal.js
│       ├── BattleStats.js
│       ├── ChatMessage.js
│       ├── Comment.js
│       ├── RankHistory.js
│       ├── SiteStats.js
│       ├── User.js
│       ├── Vote.js
│       └── XpClaim.js
│
├── scripts/                # Admin/development scripts
│   ├── migrations/         # Database migrations
│   ├── data-tools/         # Data manipulation tools
│   └── image-tools/        # Image processing tools
│
├── images/                 # Static images
└── animal_stats.json       # Backup animal data
```

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/animals` | GET | Get all animals |
| `/api/animals` | POST | Create new animal |
| `/api/animals/[id]` | GET/PUT/DELETE | Single animal operations |
| `/api/search` | GET/POST | Search animals |
| `/api/random` | GET | Random animal(s) |
| `/api/stats` | GET | Database statistics |
| `/api/health` | GET | Health check |
| `/api/auth/signup` | POST | Create account |
| `/api/auth/login` | POST | Login |
| `/api/auth/me` | GET | Get current user |

## 🛠️ Technologies

**Frontend**: HTML5, CSS3, JavaScript, Chart.js, Font Awesome  
**Backend**: Vercel Serverless Functions, MongoDB Atlas, Mongoose  
**Auth**: JWT, bcryptjs

## � Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - Detailed codebase structure & development guidelines
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment instructions
- [IMAGE_UPDATER_README.md](IMAGE_UPDATER_README.md) - Image processing tools

## �📝 License

MIT License - see [LICENSE](LICENSE) for details.
