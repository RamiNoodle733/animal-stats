'use strict';

const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://animalbattlestats.com';
const SITE_NAME = 'Animal Battle Stats';
const ROOT = path.join(__dirname, '..');
const INDEX_PATH = path.join(ROOT, 'index.html');
const ANIMALS_PATH = path.join(ROOT, 'animal_stats.json');

let indexHtmlCache = null;
let animalsCache = null;

function readIndexHtml() {
    if (!indexHtmlCache) {
        indexHtmlCache = fs.readFileSync(INDEX_PATH, 'utf8');
    }
    return indexHtmlCache;
}

function slugify(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function getAnimals() {
    if (!animalsCache) {
        const animals = JSON.parse(fs.readFileSync(ANIMALS_PATH, 'utf8'));
        const ranked = animals
            .map((animal) => ({
                ...animal,
                slug: slugify(animal.name),
                totalStats: getTotalStats(animal)
            }))
            .sort((a, b) => b.totalStats - a.totalStats || a.name.localeCompare(b.name));

        animalsCache = ranked.map((animal, index) => ({
            ...animal,
            rank: index + 1
        }));
    }
    return animalsCache;
}

function getAnimalBySlug(slug) {
    return getAnimals().find((animal) => animal.slug === slug);
}

function getTotalStats(animal) {
    return ['attack', 'defense', 'agility', 'stamina', 'intelligence', 'special']
        .reduce((sum, key) => sum + (Number(animal[key]) || 0), 0);
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizePath(pathname) {
    let cleanPath = String(pathname || '/').split('?')[0].split('#')[0];
    if (!cleanPath.startsWith('/')) cleanPath = `/${cleanPath}`;
    cleanPath = cleanPath.replace(/\/+/g, '/');
    if (cleanPath.length > 1) cleanPath = cleanPath.replace(/\/+$/, '');
    return cleanPath || '/';
}

function getPublicUrls() {
    const fixedPaths = ['/', '/about', '/stats', '/compare', '/rankings', '/community', '/tournament'];
    const animalPaths = getAnimals().map((animal) => `/stats/${animal.slug}`);
    return [...fixedPaths, ...animalPaths].map((pathname) => ({
        loc: `${SITE_URL}${pathname === '/' ? '/' : pathname}`,
        pathname,
        lastmod: getLastmod(pathname)
    }));
}

function getLastmod(pathname) {
    if (pathname.startsWith('/stats/')) {
        const animal = getAnimalBySlug(pathname.slice('/stats/'.length));
        return toDateOnly(animal?.updatedAt || animal?.createdAt);
    }
    const newestAnimalUpdate = getAnimals()
        .map((animal) => animal.updatedAt || animal.createdAt)
        .filter(Boolean)
        .sort()
        .at(-1);
    return toDateOnly(newestAnimalUpdate) || new Date().toISOString().slice(0, 10);
}

function toDateOnly(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function truncate(value, maxLength = 155) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 1).replace(/\s+\S*$/, '')}.`;
}

function formatList(value) {
    return Array.isArray(value) ? value.filter(Boolean).join(', ') : (value || 'Unknown');
}

function formatNumber(value, suffix = '') {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return 'Unknown';
    return `${Number.isInteger(number) ? number : number.toFixed(1)}${suffix}`;
}

function buildPageMeta(pathname) {
    const cleanPath = normalizePath(pathname);
    const baseDescription = 'The animal powerscaling database. Compare matchups, rank the roster, and run tournaments to see who comes out on top.';

    if (cleanPath.startsWith('/stats/')) {
        const animal = getAnimalBySlug(cleanPath.slice('/stats/'.length));
        if (!animal) return null;
        const title = `${animal.name} Stats, Rank, Habitat, Diet, and Battle Profile | ${SITE_NAME}`;
        const description = truncate(`${animal.name} is ranked #${animal.rank} with attack ${animal.attack}, defense ${animal.defense}, agility ${animal.agility}, stamina ${animal.stamina}, intelligence ${animal.intelligence}, and special ${animal.special}. ${animal.description || ''}`);
        return {
            pathname: `/stats/${animal.slug}`,
            title,
            description,
            h1: `${animal.name} Stats and Battle Profile`,
            animal,
            jsonLd: buildAnimalJsonLd(animal, title, description)
        };
    }

    const pages = {
        '/': {
            title: `${SITE_NAME} - The Ultimate Animal Powerscaling Database`,
            description: baseDescription,
            h1: SITE_NAME
        },
        '/about': {
            title: `About | ${SITE_NAME}`,
            description: 'Learn how Animal Battle Stats compares wildlife combat stats, ranks animals, and powers hypothetical animal matchup debates.',
            h1: 'About Animal Battle Stats'
        },
        '/stats': {
            title: `Animal Stats Database | ${SITE_NAME}`,
            description: 'Browse attack, defense, agility, stamina, intelligence, special abilities, habitats, diets, and rankings for 225 animals.',
            h1: 'Animal Stats Database'
        },
        '/compare': {
            title: `Compare Animals - Who Would Win? | ${SITE_NAME}`,
            description: 'Compare two animals head-to-head using attack, defense, speed, intelligence, size, abilities, and battle profile data.',
            h1: 'Compare Animals'
        },
        '/rankings': {
            title: `Animal Power Rankings | ${SITE_NAME}`,
            description: 'Explore the strongest animals ranked by combat stats, community activity, battle records, and animal powerscaling data.',
            h1: 'Animal Power Rankings'
        },
        '/community': {
            title: `Community | ${SITE_NAME}`,
            description: 'Join Animal Battle Stats community discussions about animal matchups, rankings, comments, and wildlife battle debates.',
            h1: 'Animal Battle Stats Community'
        },
        '/tournament': {
            title: `Tournament Mode | ${SITE_NAME}`,
            description: 'Run animal battle tournaments and bracket-style matchups to crown the top combat contender from the wildlife roster.',
            h1: 'Animal Tournament Mode'
        }
    };

    const page = pages[cleanPath];
    if (!page) return null;
    return {
        pathname: cleanPath,
        ...page,
        jsonLd: buildPageJsonLd(cleanPath, page)
    };
}

function buildPageJsonLd(pathname, page) {
    const type = pathname === '/stats' || pathname === '/rankings' ? 'CollectionPage'
        : pathname === '/about' ? 'AboutPage'
            : pathname === '/compare' || pathname === '/tournament' ? 'WebApplication'
                : 'WebPage';
    return {
        '@context': 'https://schema.org',
        '@type': type,
        name: page.h1,
        headline: page.h1,
        description: page.description,
        url: `${SITE_URL}${pathname === '/' ? '/' : pathname}`,
        isPartOf: {
            '@type': 'WebSite',
            name: SITE_NAME,
            url: SITE_URL
        }
    };
}

function buildAnimalJsonLd(animal, title, description) {
    return {
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: title,
        description,
        url: `${SITE_URL}/stats/${animal.slug}`,
        about: {
            '@type': 'Thing',
            name: animal.name,
            alternateName: animal.scientific_name || undefined,
            description: animal.description || undefined
        },
        variableMeasured: [
            'attack', 'defense', 'agility', 'stamina', 'intelligence', 'special'
        ].map((stat) => ({
            '@type': 'PropertyValue',
            name: stat,
            value: animal[stat] || 0,
            maxValue: 100
        }))
    };
}

function buildCrawlerContent(meta) {
    const animals = getAnimals();
    const topAnimalLinks = animals.slice(0, 24)
        .map((animal) => `<li><a href="/stats/${animal.slug}">${escapeHtml(animal.name)}</a></li>`)
        .join('');

    if (meta.animal) {
        const animal = meta.animal;
        const related = animals
            .filter((candidate) => candidate.slug !== animal.slug && (candidate.type === animal.type || candidate.habitat === animal.habitat))
            .slice(0, 6);
        const relatedLinks = related.map((candidate) => `<li><a href="/stats/${candidate.slug}">${escapeHtml(candidate.name)}</a></li>`).join('');
        return `
<section id="seo-content" class="seo-content" aria-label="${escapeHtml(meta.h1)}">
  <h1>${escapeHtml(meta.h1)}</h1>
  <p>${escapeHtml(animal.description || `${animal.name} animal profile.`)}</p>
  <dl>
    <dt>Scientific name</dt><dd>${escapeHtml(animal.scientific_name || 'Unknown')}</dd>
    <dt>Rank</dt><dd>#${escapeHtml(animal.rank)}</dd>
    <dt>Type</dt><dd>${escapeHtml(animal.type || 'Unknown')}</dd>
    <dt>Class</dt><dd>${escapeHtml(animal.class || 'Unknown')}</dd>
    <dt>Habitat</dt><dd>${escapeHtml(animal.habitat || 'Unknown')}</dd>
    <dt>Diet</dt><dd>${escapeHtml(formatList(animal.diet))}</dd>
    <dt>Size</dt><dd>${escapeHtml(animal.size || 'Unknown')}</dd>
    <dt>Weight</dt><dd>${escapeHtml(formatNumber(animal.weight_kg, ' kg'))}</dd>
    <dt>Speed</dt><dd>${escapeHtml(formatNumber(Number(animal.speed_mps) * 3.6, ' km/h'))}</dd>
    <dt>Lifespan</dt><dd>${escapeHtml(formatNumber(animal.lifespan_years, ' years'))}</dd>
    <dt>Bite force</dt><dd>${escapeHtml(formatNumber(animal.bite_force_psi, ' psi'))}</dd>
  </dl>
  <h2>Battle Stats</h2>
  <ul>
    <li>Attack: ${escapeHtml(animal.attack || 0)}</li>
    <li>Defense: ${escapeHtml(animal.defense || 0)}</li>
    <li>Agility: ${escapeHtml(animal.agility || 0)}</li>
    <li>Stamina: ${escapeHtml(animal.stamina || 0)}</li>
    <li>Intelligence: ${escapeHtml(animal.intelligence || 0)}</li>
    <li>Special: ${escapeHtml(animal.special || 0)}</li>
  </ul>
  <p>Special abilities: ${escapeHtml(formatList(animal.special_abilities))}. Traits: ${escapeHtml(formatList(animal.unique_traits))}.</p>
  <nav aria-label="Animal profile links">
    <a href="/stats">All animal stats</a>
    <a href="/compare">Compare animals</a>
    <a href="/rankings">Animal rankings</a>
  </nav>
  <h2>Related Animals</h2>
  <ul>${relatedLinks}</ul>
</section>`;
    }

    return `
<section id="seo-content" class="seo-content" aria-label="${escapeHtml(meta.h1)}">
  <h1>${escapeHtml(meta.h1)}</h1>
  <p>${escapeHtml(meta.description)}</p>
  <nav aria-label="Public site pages">
    <a href="/stats">Stats</a>
    <a href="/compare">Compare</a>
    <a href="/rankings">Rankings</a>
    <a href="/community">Community</a>
    <a href="/tournament">Tournament</a>
    <a href="/about">About</a>
  </nav>
  <h2>Animal Directory</h2>
  <ul>${topAnimalLinks}</ul>
</section>`;
}

function stripTemplateH1s(html) {
    return html
        .replace(/<h1\b([^>]*)>/gi, '<div$1 data-original-heading="h1">')
        .replace(/<\/h1>/gi, '</div>');
}

function injectHead(html, meta) {
    const canonical = `${SITE_URL}${meta.pathname === '/' ? '/' : meta.pathname}`;
    let next = html
        .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(meta.title)}</title>`)
        .replace(/<meta name="description" content="[^"]*"\s*\/?>/i, `<meta name="description" content="${escapeHtml(meta.description)}">`)
        .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${canonical}">`)
        .replace(/<meta property="og:title" content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${escapeHtml(meta.title)}">`)
        .replace(/<meta property="og:description" content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${escapeHtml(meta.description)}">`)
        .replace(/<meta property="og:url" content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${canonical}">`)
        .replace(/<meta name="twitter:title" content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${escapeHtml(meta.title)}">`)
        .replace(/<meta name="twitter:description" content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${escapeHtml(meta.description)}">`);

    const fallbackAssets = `<script>document.documentElement.classList.add('js');</script>
<style>
html.js #seo-content{display:none!important}
#seo-content{padding:24px;max-width:960px;margin:0 auto;background:#fff;color:#111;font-family:Arial,sans-serif;line-height:1.5}
#seo-content a{color:#0645ad}
#seo-content dl{display:grid;grid-template-columns:max-content 1fr;gap:6px 16px}
#seo-content dt{font-weight:700}
</style>`;
    const jsonLd = `<script type="application/ld+json" id="seo-route-jsonld">${JSON.stringify(meta.jsonLd).replace(/</g, '\\u003c')}</script>`;
    next = next.replace('</head>', `${fallbackAssets}\n${jsonLd}\n</head>`);
    return next;
}

function injectCrawlerContent(html, meta) {
    const content = buildCrawlerContent(meta);
    return html.replace('<body>', `<body>\n${content}`);
}

function renderHtml(pathname) {
    const meta = buildPageMeta(pathname);
    if (!meta) return null;
    let html = stripTemplateH1s(readIndexHtml());
    html = injectHead(html, meta);
    html = injectCrawlerContent(html, meta);
    return html;
}

module.exports = {
    SITE_URL,
    SITE_NAME,
    slugify,
    normalizePath,
    getAnimals,
    getAnimalBySlug,
    getPublicUrls,
    buildPageMeta,
    renderHtml
};
