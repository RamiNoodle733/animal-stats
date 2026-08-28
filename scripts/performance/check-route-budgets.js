#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { transformSync } = require('esbuild');

const repoRoot = path.resolve(__dirname, '..', '..');
const htmlFiles = [
    'index.html',
    'about.html',
    'stats.html',
    'compare.html',
    'rankings.html',
    'community.html',
    'tournament.html',
    ...fs.readdirSync(path.join(repoRoot, 'stats'))
        .filter((name) => name.endsWith('.html'))
        .map((name) => `stats/${name}`)
];

const routeAssets = Object.freeze({
    home: {
        scripts: ['js/homepage.js', 'js/social.js'],
        styles: ['css/pages/homepage.css']
    },
    stats: { scripts: [], styles: [] },
    rankings: { scripts: ['js/rankings.js'], styles: ['css/pages/rankings.css'] },
    tournament: {
        scripts: ['js/tournament.js'],
        styles: ['tournament-v4.css']
    },
    community: {
        scripts: ['js/community-globe.js', 'js/community-manager.js', 'js/community.js'],
        styles: [
            'community-page.css',
            'css/pages/community-globe.css',
            'css/pages/community-v2.css'
        ]
    },
    compare: {
        scripts: ['js/compare.js'],
        styles: ['css/components/match-intro.css', 'compare-page.css']
    },
    battlepoints: {
        scripts: ['js/battlepoints.js'],
        styles: ['css/pages/battlepoints.css']
    }
});

const budgets = Object.freeze({
    initialJavaScriptGzip: 60 * 1024,
    initialStylesGzip: 65 * 1024,
    staticPageJavaScriptGzip: 50 * 1024,
    staticPageStylesGzip: 30 * 1024,
    routeJavaScriptGzip: 24 * 1024,
    routeStylesGzip: 18 * 1024,
    interactiveTotalJavaScriptGzip: 150 * 1024
});

const forbiddenInitialAssets = [
    '/js/homepage.js',
    '/js/social.js',
    '/css/pages/homepage.css',
    '/js/rankings.js',
    '/js/tournament.js',
    '/js/community-globe.js',
    '/js/community-manager.js',
    '/js/community.js',
    '/js/battlepoints.js',
    '/js/compare.js',
    '/tournament-v4.css',
    '/compare-page.css',
    '/css/pages/rankings.css',
    '/community-page.css',
    '/css/pages/community.css',
    '/css/pages/community-globe.css',
    '/css/pages/battlepoints.css'
];

function localPathFromUrl(url) {
    if (!url.startsWith('/') || url.startsWith('//')) return null;
    return url.slice(1).split(/[?#]/)[0];
}

function collectInitialAssets(html) {
    const scripts = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)]
        .map((match) => localPathFromUrl(match[1]))
        .filter(Boolean);
    const styles = [...html.matchAll(/<link(?=[^>]+rel=["']stylesheet["'])[^>]+href=["']([^"']+)["']/gi)]
        .map((match) => localPathFromUrl(match[1]))
        .filter(Boolean);
    return {
        scripts: [...new Set(scripts)],
        styles: [...new Set(styles)]
    };
}

function measure(files) {
    return files.reduce((total, relativePath) => {
        const absolutePath = path.join(repoRoot, relativePath);
        if (!fs.existsSync(absolutePath)) {
            throw new Error(`Performance manifest references missing asset: ${relativePath}`);
        }
        const content = fs.readFileSync(absolutePath);
        const extension = path.extname(relativePath).toLowerCase();
        let deployed = content;

        if (extension === '.css' || extension === '.js') {
            const text = content[0] === 0xff && content[1] === 0xfe
                ? content.subarray(2).toString('utf16le')
                : content.toString('utf8');
            deployed = transformSync(text, {
                loader: extension === '.css' ? 'css' : 'js',
                target: 'es2020',
                legalComments: 'none',
                minifyWhitespace: true,
                minifySyntax: true,
                minifyIdentifiers: extension === '.css'
            }).code;
        }

        total.raw += deployed.length;
        total.gzip += zlib.gzipSync(deployed, { level: 9 }).length;
        return total;
    }, { raw: 0, gzip: 0 });
}

function formatKb(bytes) {
    return `${(bytes / 1024).toFixed(1)} KB`;
}

function assertWithin(label, actual, maximum) {
    if (actual > maximum) {
        throw new Error(`${label} is ${formatKb(actual)}; budget is ${formatKb(maximum)}`);
    }
}

const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
const initial = collectInitialAssets(indexHtml);
const initialJs = measure(initial.scripts);
const initialCss = measure(initial.styles);

const animalStaticAssets = fs.readdirSync(path.join(repoRoot, 'stats'))
    .filter((name) => name.endsWith('.html'))
    .map((name) => ({ name, assets: collectInitialAssets(fs.readFileSync(path.join(repoRoot, 'stats', name), 'utf8')) }));

for (const { name, assets } of animalStaticAssets) {
    const scripts = measure(assets.scripts);
    const styles = measure(assets.styles);
    assertWithin(`stats/${name} static JavaScript`, scripts.gzip, budgets.staticPageJavaScriptGzip);
    assertWithin(`stats/${name} static styles`, styles.gzip, budgets.staticPageStylesGzip);
}

const aboutStaticAssets = collectInitialAssets(fs.readFileSync(path.join(repoRoot, 'about.html'), 'utf8'));
assertWithin('about.html static JavaScript', measure(aboutStaticAssets.scripts).gzip, budgets.staticPageJavaScriptGzip);
assertWithin('about.html static styles', measure(aboutStaticAssets.styles).gzip, budgets.staticPageStylesGzip);
for (const htmlFile of htmlFiles) {
    const html = fs.readFileSync(path.join(repoRoot, htmlFile), 'utf8');
    for (const forbidden of forbiddenInitialAssets) {
        if (html.includes(`src="${forbidden}`) || html.includes(`href="${forbidden}`)) {
            throw new Error(`${htmlFile} eagerly loads route-only asset ${forbidden}`);
        }
    }
    if (html.includes('three@0.165.0')) {
        throw new Error(`${htmlFile} still downloads the unused Three.js renderer`);
    }
}

const routerSource = fs.readFileSync(path.join(repoRoot, 'js', 'router.js'), 'utf8');
if (!routerSource.includes('insertBefore(link, mobileOverrides || null)')) {
    throw new Error('Route styles must be inserted before the mobile override stylesheet');
}
if (!routerSource.includes('document.head.appendChild(link)')) {
    throw new Error('Final route layout layers must support loading after mobile overrides');
}
if (routerSource.includes('three@0.165.0')) {
    throw new Error('The route loader still references the unused Three.js renderer');
}

assertWithin('Initial local JavaScript', initialJs.gzip, budgets.initialJavaScriptGzip);
assertWithin('Initial local styles', initialCss.gzip, budgets.initialStylesGzip);

const rows = [];
rows.push({
    route: 'about-static',
    initialJsGzip: formatKb(measure(aboutStaticAssets.scripts).gzip),
    routeJsGzip: formatKb(0),
    initialCssGzip: formatKb(measure(aboutStaticAssets.styles).gzip),
    routeCssGzip: formatKb(0)
});
const representativeStaticAssets = animalStaticAssets[0]?.assets || { scripts: [], styles: [] };
rows.push({
    route: 'animal-static',
    initialJsGzip: formatKb(measure(representativeStaticAssets.scripts).gzip),
    routeJsGzip: formatKb(0),
    initialCssGzip: formatKb(measure(representativeStaticAssets.styles).gzip),
    routeCssGzip: formatKb(0)
});
for (const [route, assets] of Object.entries(routeAssets)) {
    const scripts = measure(assets.scripts);
    const styles = measure(assets.styles);
    assertWithin(`${route} route JavaScript`, scripts.gzip, budgets.routeJavaScriptGzip);
    assertWithin(`${route} route styles`, styles.gzip, budgets.routeStylesGzip);
    assertWithin(`${route} interactive JavaScript total`, initialJs.gzip + scripts.gzip, budgets.interactiveTotalJavaScriptGzip);
    rows.push({
        route,
        initialJsGzip: formatKb(initialJs.gzip),
        routeJsGzip: formatKb(scripts.gzip),
        initialCssGzip: formatKb(initialCss.gzip),
        routeCssGzip: formatKb(styles.gzip)
    });
}

console.table(rows);
console.log(`Initial asset budgets passed (${initial.scripts.length} local scripts, ${initial.styles.length} local styles).`);
console.log(`${animalStaticAssets.length} Astro animal pages passed the 50 KB static JavaScript target.`);
