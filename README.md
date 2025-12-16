# Animal Battle Stats

**Interactive Fighting Game-Style Animal Statistics Webapp** 

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen)](animalbattlestats.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Animals](https://img.shields.io/badge/Animals-225-orange)](#)
[![API](https://img.shields.io/badge/API-MongoDB-green)](DEPLOYMENT.md)

A web application that presents animal statistics in an engaging fighting game-style interface. Compare stats, view animals in a character select screen, and pit them against each other in VS battles!

## 🎮 Live Demo

**[https://animal-battle-stats.vercel.app](https://animal-battle-stats.vercel.app)**

## ✨ Features

### 🎮 Fighting Game Interface
- **Character Select Screen**: Stats view with centered character display and flanking stat panels
- **VS Battle Mode**: Compare two fighters head-to-head with dramatic VS badge
- **Transparent PNG Images**: All animals feature clean, background-free images
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
Visit [animal-battle-stats.vercel.app](https://animal-battle-stats.vercel.app) directly.

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

## 📁 Project Structure

```
animal-battle-stats/
├── api/                    # Serverless API functions
│   ├── animals.js          # GET all, POST new animal
│   ├── animals/[id].js     # GET, PUT, DELETE by ID
│   ├── auth/               # Authentication endpoints
│   │   ├── login.js
│   │   ├── signup.js
│   │   └── me.js
│   ├── health.js           # Health check
│   ├── random.js           # Random animal(s)
│   ├── search.js           # Advanced search
│   └── stats.js            # Database statistics
├── lib/                    # Shared utilities
│   ├── mongodb.js          # Database connection
│   └── models/
│       └── Animal.js       # Mongoose animal model
├── models/
│   └── User.js             # Mongoose user model
├── scripts/
│   └── seed-database.js    # Database seeder
├── index.html              # Main HTML
├── styles.css              # Styles
├── script.js               # Main app logic
├── auth.js                 # Authentication UI
├── data.js                 # Local fallback data
├── package.json            # Dependencies
└── vercel.json             # Vercel config
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

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.
