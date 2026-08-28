#!/usr/bin/env node
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const port = Number(process.argv[2]) || 3000;
const contentRoot = process.argv[3] ? path.resolve(repoRoot, process.argv[3]) : repoRoot;
const productionOrigin = 'https://animalbattlestats.com';
const allowedExtensions = new Set([
    '.html', '.css', '.js', '.json', '.geojson', '.png', '.jpg', '.jpeg',
    '.webp', '.avif', '.svg', '.gif', '.ico', '.woff', '.woff2', '.ttf'
]);

const fixedRoutes = new Map([
    ['/', 'index.html'],
    ['/about', 'about.html'],
    ['/stats', 'stats.html'],
    ['/compare', 'compare.html'],
    ['/rankings', 'rankings.html'],
    ['/community', 'community.html'],
    ['/tournament', 'tournament.html']
]);

const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.geojson': 'application/geo+json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.svg': 'image/svg+xml',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
};

function sendJson(res, status, body) {
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify(body));
}

function resolveRoute(pathname) {
    if (fixedRoutes.has(pathname)) return fixedRoutes.get(pathname);
    if (pathname.startsWith('/community/')) return 'community.html';
    if (pathname.startsWith('/profile/') || ['/profile', '/login', '/signup', '/forgot-password', '/reset-password', '/battlepoints'].includes(pathname)) {
        return 'index.html';
    }
    if (pathname.startsWith('/stats/')) return `${pathname.slice(1)}.html`;
    return pathname.replace(/^\/+/, '');
}

function resolveSafeFile(relativePath) {
    const normalized = path.normalize(relativePath);
    const absolute = path.resolve(contentRoot, normalized);
    const relative = path.relative(contentRoot, absolute);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return null;
    if (!allowedExtensions.has(path.extname(absolute).toLowerCase())) return null;
    if (/^(?:api|lib|scripts|test|node_modules|\.git|\.vercel)(?:[\\/]|$)/i.test(relative)) return null;
    return absolute;
}

async function proxyPublicGet(req, res, requestUrl) {
    if (req.method !== 'GET') {
        return sendJson(res, 200, { success: true, localPreview: true, writeBlocked: true });
    }

    const target = new URL(`${requestUrl.pathname}${requestUrl.search}`, productionOrigin);
    const response = await fetch(target, {
        headers: { Accept: req.headers.accept || 'application/json' },
        signal: AbortSignal.timeout(20000)
    });
    const body = Buffer.from(await response.arrayBuffer());
    res.writeHead(response.status, {
        'Content-Type': response.headers.get('content-type') || 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
    });
    res.end(body);
}

const server = http.createServer(async (req, res) => {
    try {
        const requestUrl = new URL(req.url, `http://127.0.0.1:${port}`);
        if (requestUrl.pathname.startsWith('/api/')) {
            await proxyPublicGet(req, res, requestUrl);
            return;
        }

        const absolute = resolveSafeFile(resolveRoute(requestUrl.pathname));
        if (!absolute || !fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
            sendJson(res, 404, { success: false, error: 'Preview resource not found' });
            return;
        }

        const extension = path.extname(absolute).toLowerCase();
        res.writeHead(200, {
            'Content-Type': contentTypes[extension] || 'application/octet-stream',
            'Cache-Control': 'no-store'
        });
        fs.createReadStream(absolute).pipe(res);
    } catch (error) {
        sendJson(res, 500, { success: false, error: error.message });
    }
});

server.listen(port, '127.0.0.1', () => {
    console.log(`Read-only preview listening on http://127.0.0.1:${port}`);
});
