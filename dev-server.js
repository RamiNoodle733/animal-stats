/**
 * Local development server that mimics Vercel's serverless function routing.
 * Serves static files and routes /api/* to the serverless function handlers.
 *
 * Usage: node dev-server.js
 */

require('dotenv').config({ path: '.env.local' });

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API route handler - dynamically loads serverless functions
function createApiHandler(handlerPath) {
    return async (req, res) => {
        try {
            // Clear require cache in dev for hot reload
            delete require.cache[require.resolve(handlerPath)];
            const handler = require(handlerPath);
            await handler(req, res);
        } catch (error) {
            console.error(`API Error [${req.path}]:`, error.message);
            if (!res.headersSent) {
                res.status(500).json({ success: false, error: error.message });
            }
        }
    };
}

// Register API routes matching Vercel file-based routing
const apiDir = path.join(__dirname, 'api');

// Dynamic route: /api/animals/:id
const dynamicAnimalHandler = path.join(apiDir, 'animals', '[id].js');
if (fs.existsSync(dynamicAnimalHandler)) {
    app.all('/api/animals/:id', (req, res, next) => {
        req.query.id = req.params.id;
        createApiHandler(dynamicAnimalHandler)(req, res);
    });
}

// Top-level API routes
const apiFiles = fs.readdirSync(apiDir).filter(f => f.endsWith('.js'));
for (const file of apiFiles) {
    const route = `/api/${file.replace('.js', '')}`;
    const handlerPath = path.join(apiDir, file);
    app.all(route, createApiHandler(handlerPath));
}

// Static files (CSS, JS, images, etc.)
app.use(express.static(__dirname, {
    extensions: ['html'],
    index: 'index.html'
}));

// SPA catch-all: serve index.html for all non-API, non-static routes
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api/')) {
        res.sendFile(path.join(__dirname, 'index.html'));
    } else {
        next();
    }
});

app.listen(PORT, () => {
    console.log(`\n🚀 Dev server running at http://localhost:${PORT}`);
    console.log(`   Frontend: http://localhost:${PORT}/`);
    console.log(`   API:      http://localhost:${PORT}/api/animals`);
    console.log(`   Health:   http://localhost:${PORT}/api/animals?action=health`);
    console.log(`\n   Press Ctrl+C to stop\n`);
});
