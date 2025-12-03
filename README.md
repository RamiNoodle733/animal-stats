# Animal Battle Stats

**Interactive Fighting Game-Style Animal Statistics Webapp** 

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen)](https://raminoodle733.github.io/animal-battle-stats/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Animals](https://img.shields.io/badge/Animals-200+-orange)](animal_stats.json)
[![API](https://img.shields.io/badge/API-MongoDB-green)](DEPLOYMENT.md)

A cutting-edge web application that presents scientifically accurate animal statistics in an engaging fighting game-style interface. Compare stats, view animals in a character select screen, and pit them against each other in VS battles!

## 🎮 Live Demo
**[Click here to view the live site: https://raminoodle733.github.io/animal-battle-stats/](https://raminoodle733.github.io/animal-battle-stats/)**

## ✨ Features

### 🎮 Fighting Game Interface
- **Character Select Screen**: Stats view with centered character display and flanking stat panels
- **VS Battle Mode**: Compare two fighters head-to-head with dramatic VS badge
- **Transparent PNG Images**: All animals feature clean, background-free images
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Glowing Effects**: Cyan and gold accents with pulsing animations
- **Scrollable Character Grid**: Quick access to all animals at the bottom

### 📊 Comprehensive Stats
- **200+ Animals**: From African Elephants to Sea Otters
- **Combat Stats**: Attack, Defense, Agility, Stamina, Intelligence, Special Attack
- **Deep Substats**: Detailed breakdown including Raw Power, Armor, Speed, Tactics, and more
- **Scientific Data**: Weight, speed, lifespan, bite force, and more
- **Special Abilities**: Unique attacks and traits for each animal
- **Class System**: Apex Predators, Tanks, Speed Demons, and more

### 🔧 Interactive Features
- **Stats Mode**: View detailed stats for any animal with centered character display
- **Compare Mode**: Select two fighters for head-to-head comparison
- **Stat Visualization**: Gradient-filled bars with dynamic colors based on values
- **Fight Simulation**: Simulate battles between animals with calculated outcomes
- **Smooth Animations**: Floating character models and pulsing effects

### 🚀 Backend API (NEW!)
- **MongoDB Database**: Persistent storage for animal data
- **RESTful API**: Full CRUD operations via Vercel serverless functions
- **Search & Filter**: Advanced querying capabilities
- **Fallback Mode**: Works offline with local data

## 🚀 Quick Start

### Option 1: Live Demo
Visit the [live demo](https://raminoodle733.github.io/animal-battle-stats/) directly in your browser.

### Option 2: Local Setup (Static)
```bash
# Clone the repository
git clone https://github.com/RamiNoodle733/animal-battle-stats.git
cd animal-battle-stats

# Open index.html in your browser
# Or use a simple server:
python -m http.server 8000
```

### Option 3: Full Stack Setup (with MongoDB)
```bash
# Clone and install
git clone https://github.com/RamiNoodle733/animal-battle-stats.git
cd animal-battle-stats
npm install

# Configure MongoDB (see DEPLOYMENT.md)
cp .env.example .env.local
# Edit .env.local with your MongoDB URI

# Seed database
npm run seed

# Start development server
npm run dev
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for full deployment instructions.

## 📁 Project Structure

```
animal-battle-stats/
├── api/                    # Serverless API functions
│   ├── animals.js          # GET all, POST new animal
│   ├── animals/[id].js     # GET, PUT, DELETE by ID
│   ├── health.js           # Health check
│   ├── random.js           # Random animal(s)
│   ├── search.js           # Advanced search
│   └── stats.js            # Database statistics
├── lib/                    # Shared utilities
│   ├── mongodb.js          # Database connection
│   └── models/Animal.js    # Mongoose model
├── scripts/                # Utility scripts
│   └── seed-database.js    # Database seeder
├── index.html              # Main HTML structure
├── styles.css              # Fighting game aesthetic styles
├── script.js               # Interactive functionality
├── data.js                 # Local fallback data
├── animal_stats.json       # Complete animal database
├── package.json            # Node.js config
├── vercel.json             # Vercel deployment config
└── DEPLOYMENT.md           # Full deployment guide
```

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/animals` | GET | Get all animals (with filters) |
| `/api/animals` | POST | Create a new animal |
| `/api/animals/[id]` | GET/PUT/DELETE | Single animal operations |
| `/api/search` | GET/POST | Advanced search |
| `/api/random` | GET | Get random animal(s) |
| `/api/stats` | GET | Database statistics |
| `/api/health` | GET | Health check |

## 🎨 Design Philosophy

The interface is inspired by classic fighting games like Street Fighter and Mortal Kombat:
- **Character select screen** layout for Stats view
- **VS battle screen** for Compare mode
- **Centered character models** with flanking stat panels
- **Dramatic colors**: Cyan (#00d4ff) and orange (#ff6b00) with gold accents
- **Glowing effects** and **pulsing animations**
- **Bebas Neue** font for that fighting game feel

## 🛠️ Technologies

### Frontend
- **Pure HTML5/CSS3/JavaScript** - No frameworks required
- **Font Awesome 6.4.0** - Icons for stats
- **Google Fonts** - Bebas Neue and Inter fonts
- **Chart.js** - Radar chart for comparisons

### Backend
- **Vercel** - Serverless functions hosting
- **MongoDB Atlas** - Cloud database
- **Mongoose** - MongoDB ODM

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
