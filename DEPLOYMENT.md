# Deployment Guide - Animal Battle Stats

This document provides comprehensive instructions for deploying the Animal Battle Stats application with MongoDB backend on Vercel.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Vercel                                   │
│  ┌─────────────────┐     ┌─────────────────────────────────┐   │
│  │   Static Files  │     │    Serverless Functions (API)   │   │
│  │  - index.html   │     │  - /api/animals                 │   │
│  │  - styles.css   │ ──► │  - /api/animals/[id]            │   │
│  │  - script.js    │     │  - /api/search                  │   │
│  │  - data.js      │     │  - /api/stats                   │   │
│  └─────────────────┘     │  - /api/random                  │   │
│                          │  - /api/health                  │   │
│                          └──────────────┬──────────────────┘   │
│                                         │                       │
└─────────────────────────────────────────┼───────────────────────┘
                                          │
                                          ▼
                              ┌───────────────────────┐
                              │    MongoDB Atlas      │
                              │   (Cloud Database)    │
                              │                       │
                              │  Collection: animals  │
                              └───────────────────────┘
```

## 📋 Prerequisites

1. **Node.js** (v18.0.0 or higher)
2. **npm** (comes with Node.js)
3. **Git** (for version control)
4. **MongoDB Atlas Account** (free tier works fine)
5. **Vercel Account** (free tier works fine)

## 🚀 Quick Start

### Step 1: Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/RamiNoodle733/animal-battle-stats.git
cd animal-battle-stats

# Install dependencies
npm install
```

### Step 2: Set Up MongoDB Atlas

1. **Create a MongoDB Atlas Account**
   - Go to [MongoDB Atlas](https://cloud.mongodb.com/)
   - Sign up for a free account

2. **Create a Cluster**
   - Click "Build a Cluster"
   - Choose "Shared" (FREE tier)
   - Select your preferred cloud provider and region
   - Click "Create Cluster" (takes 1-3 minutes)

3. **Configure Database Access**
   - Go to "Database Access" in the left sidebar
   - Click "Add New Database User"
   - Create a username and password (save these!)
   - Set privileges to "Read and write to any database"
   - Click "Add User"

4. **Configure Network Access**
   - Go to "Network Access" in the left sidebar
   - Click "Add IP Address"
   - For development: Click "Allow Access from Anywhere" (0.0.0.0/0)
   - For production: Add specific Vercel IP ranges
   - Click "Confirm"

5. **Get Connection String**
   - Go to "Database" and click "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Replace `<database>` with `animal-stats`

   Example:
   ```
   mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/animal-stats?retryWrites=true&w=majority
   ```

### Step 3: Configure Environment Variables

1. **Create Local Environment File**
   ```bash
   # Copy the example file
   cp .env.example .env.local
   
   # Edit .env.local and add your credentials
   MONGODB_URI=mongodb+srv://your_username:your_password@cluster.mongodb.net/animal-stats?retryWrites=true&w=majority
   JWT_SECRET=your-secret-key-here
   ```

### Step 4: Seed the Database

```bash
# Run the seed script to populate MongoDB with animal data
npm run seed
```

You should see output like:
```
🚀 Starting database seed...
📡 Connecting to MongoDB...
✅ Connected to MongoDB successfully!
📂 Reading animal_stats.json...
✅ Found 200+ animals in JSON file
💾 Seeding database...
   Processed: 200/200
📈 Seed Summary:
   ✅ Created: 200 animals
🎉 Database seeding completed successfully!
```

### Step 5: Test Locally

```bash
# Start local development server
npm run dev

# Or use Vercel CLI
vercel dev
```

Open http://localhost:3000 in your browser.

### Step 6: Deploy to Vercel

#### Option A: Deploy via Vercel Dashboard (Recommended)

1. Go to [Vercel](https://vercel.com/)
2. Sign in with GitHub
3. Click "New Project"
4. Import your GitHub repository
5. Configure Environment Variables:
   - Add `MONGODB_URI` with your connection string
6. Click "Deploy"

#### Option B: Deploy via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# For production deployment
vercel --prod
```

**Important:** Add environment variable in Vercel:
```bash
vercel env add MONGODB_URI
```

## 📡 API Endpoints

Once deployed, you'll have access to these API endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/animals` | GET | Get all animals (with filters) |
| `/api/animals` | POST | Create a new animal |
| `/api/animals/[id]` | GET | Get a single animal by ID or name |
| `/api/animals/[id]` | PUT | Update an animal |
| `/api/animals/[id]` | DELETE | Delete an animal |
| `/api/search` | GET/POST | Advanced search with filters |
| `/api/random` | GET | Get random animal(s) |
| `/api/stats` | GET | Get database statistics |
| `/api/health` | GET | Health check endpoint |

### Query Parameters for `/api/animals`

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Text search across name, scientific_name, description |
| `type` | string | Filter by animal type (Mammal, Bird, Reptile, etc.) |
| `class` | string | Filter by combat class (Tank, Hunter, etc.) |
| `size` | string | Filter by size (Tiny, Small, Medium, Large, Colossal) |
| `biome` | string | Filter by habitat |
| `sort` | string | Sort field (name, attack, defense, agility, stamina, intelligence, special, total) |
| `order` | string | Sort order (asc, desc) |
| `limit` | number | Number of results (default: 500) |
| `skip` | number | Pagination offset |

### Example API Calls

```bash
# Get all animals
curl https://animalbattlestats.com/api/animals

# Search for animals
curl https://animalbattlestats.com/api/animals?search=lion

# Filter by type and sort
curl https://animalbattlestats.com/api/animals?type=Mammal&sort=attack&order=desc

# Get a specific animal
curl https://animalbattlestats.com/api/animals/African%20Lion

# Get random animal
curl https://animalbattlestats.com/api/random

# Get 2 random animals
curl https://animalbattlestats.com/api/random?count=2

# Health check
curl https://animalbattlestats.com/api/health
```

## 🔧 Configuration Files

### `vercel.json`

Configures Vercel deployment:
- API routes handling
- CORS headers
- Function timeouts
- Environment variables

### `package.json`

Defines:
- Project metadata
- Dependencies (MongoDB, Mongoose)
- npm scripts (dev, seed)

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret key for JWT authentication |
| `NODE_ENV` | No | Environment (development/production) |

## 🛠️ Development

### Project Structure

```
animal-stats/
├── api/                    # Serverless API functions
│   ├── animals.js          # GET all, POST new animal
│   ├── animals/
│   │   └── [id].js         # GET, PUT, DELETE by ID
│   ├── health.js           # Health check
│   ├── random.js           # Random animal(s)
│   ├── search.js           # Advanced search
│   └── stats.js            # Database statistics
├── lib/                    # Shared utilities
│   ├── mongodb.js          # Database connection
│   └── models/
│       └── Animal.js       # Mongoose model
├── scripts/                # Utility scripts
│   └── seed-database.js    # Database seeder
├── index.html              # Frontend HTML
├── styles.css              # Frontend styles
├── script.js               # Frontend JavaScript
├── data.js                 # Fallback local data
├── animal_stats.json       # Source data (JSON)
├── package.json            # Node.js config
├── vercel.json             # Vercel config
├── .env.example            # Environment template
└── .gitignore              # Git ignore rules
```

### Local Development Commands

```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Seed database
npm run seed
```

## 🔒 Security Best Practices

1. **Never commit `.env.local`** - It contains your database credentials
2. **Use environment variables** - Store secrets in Vercel dashboard
3. **Restrict MongoDB IP access** - In production, whitelist Vercel IPs
4. **Use read-only user** - For public endpoints, create a read-only database user

## 🐛 Troubleshooting

### Common Issues

**1. "MONGODB_URI is not defined"**
- Ensure `.env.local` exists with correct variable
- In Vercel, check Environment Variables in project settings

**2. "MongoNetworkError: connection timed out"**
- Check MongoDB Atlas Network Access settings
- Ensure 0.0.0.0/0 is whitelisted (for development)

**3. "Cannot find module 'mongoose'"**
- Run `npm install` to install dependencies

**4. API returns empty data**
- Run `npm run seed` to populate database
- Check MongoDB Atlas for data

**5. CORS errors**
- API endpoints have CORS headers configured in `vercel.json`
- Check browser console for specific errors

### Debug Mode

Add console logs to API functions:
```javascript
console.log('Request received:', req.method, req.url);
console.log('Query params:', req.query);
```

View logs in Vercel Dashboard → Functions → Logs

## 📊 Monitoring

### Vercel Dashboard
- View deployments and build logs
- Monitor function invocations
- Check error rates

### MongoDB Atlas
- Monitor database operations
- View slow queries
- Set up alerts

## 🔄 Updating Data

### Add New Animal via API

```bash
curl -X POST https://animalbattlestats.com/api/animals \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Animal",
    "scientific_name": "Species name",
    "type": "Mammal",
    "attack": 50,
    "defense": 50,
    "agility": 50,
    "stamina": 50,
    "intelligence": 50,
    "special_attack": 50
  }'
```

### Update Existing Animal

```bash
curl -X PUT https://animalbattlestats.com/api/animals/New%20Animal \
  -H "Content-Type: application/json" \
  -d '{
    "attack": 75,
    "description": "Updated description"
  }'
```

### Re-seed Database

If you update `animal_stats.json`:
```bash
npm run seed
```

This will update existing animals and add new ones.

## 📝 License

MIT License - See LICENSE file for details.

---

**Questions?** Open an issue on GitHub or check the README.md for more information.
