#!/usr/bin/env node
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '../..');
const CACHE_ROOT = path.join(ROOT, '.cache');
const DATA_PATH = path.join(ROOT, 'animal_stats.json');
const DEFAULT_OUTPUT = '.cache/image-candidates';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const USER_AGENT = 'AnimalBattleStatsAssetReview/1.0 (https://animalbattlestats.com/about)';
const args = process.argv.slice(2);

function wait(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchWithRetry(url, options = {}) {
    const delays = [0, 1_500, 4_000, 8_000];
    let lastResponse = null;
    for (let attempt = 0; attempt < delays.length; attempt += 1) {
        if (delays[attempt] > 0) await wait(delays[attempt]);
        const response = await fetch(url, options);
        lastResponse = response;
        if (response.ok || (response.status !== 429 && response.status < 500)) return response;
        const retryAfter = Number(response.headers.get('retry-after'));
        if (Number.isFinite(retryAfter) && retryAfter > 0) {
            await wait(Math.min(retryAfter * 1_000, 15_000));
        }
    }
    return lastResponse;
}

function optionValues(name) {
    const values = [];
    for (let index = 0; index < args.length; index += 1) {
        if (args[index] === name && args[index + 1]) values.push(args[index + 1]);
    }
    return values;
}

function optionValue(name, fallback = null) {
    return optionValues(name).at(-1) || fallback;
}

function parseQueryOverrides(values) {
    const overrides = new Map();
    for (const value of values) {
        const separator = value.indexOf('=');
        if (separator <= 0 || separator === value.length - 1) {
            throw new Error(`Invalid --query value: ${value}. Use "Animal Name=Commons search terms".`);
        }
        const animal = value.slice(0, separator).trim().toLowerCase();
        const query = value.slice(separator + 1).trim();
        if (!animal || !query) throw new Error(`Invalid --query value: ${value}.`);
        const queries = overrides.get(animal) || [];
        queries.push(query);
        overrides.set(animal, queries);
    }
    return overrides;
}

function parseSourcePageOverrides(values) {
    const overrides = new Map();
    for (const value of values) {
        const separator = value.indexOf('=');
        if (separator <= 0 || separator === value.length - 1) {
            throw new Error(`Invalid --source-page value: ${value}. Use "Animal Name=https://commons.wikimedia.org/wiki/File:...".`);
        }
        const animal = value.slice(0, separator).trim().toLowerCase();
        const sourcePage = value.slice(separator + 1).trim();
        let parsed;
        try {
            parsed = new URL(sourcePage);
        } catch {
            throw new Error(`Invalid Commons source page: ${sourcePage}`);
        }
        const title = decodeURIComponent(parsed.pathname.replace(/^\/wiki\//, '')).replaceAll('_', ' ');
        if (parsed.protocol !== 'https:' || parsed.hostname !== 'commons.wikimedia.org' || !title.startsWith('File:')) {
            throw new Error(`Invalid Commons source page: ${sourcePage}`);
        }
        const sources = overrides.get(animal) || [];
        sources.push({ sourcePage, title });
        overrides.set(animal, sources);
    }
    return overrides;
}

function slugify(value) {
    return String(value)
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

function stripHtml(value) {
    return String(value || '')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

function escapeXml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');
}

function resolveOutputDirectory(value = DEFAULT_OUTPUT) {
    const resolved = path.resolve(ROOT, value);
    const relative = path.relative(CACHE_ROOT, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new Error('Candidate output must stay inside the ignored .cache directory.');
    }
    return resolved;
}

function metadataValue(metadata, name) {
    return stripHtml(metadata?.[name]?.value);
}

function isAllowedLicense(candidate) {
    const license = `${candidate.licenseShortName} ${candidate.usageTerms}`.toLowerCase();
    if (/noncommercial|non-commercial|no derivatives|no-derivatives|fair use|all rights reserved/.test(license)) {
        return false;
    }
    return /public domain|cc0|pdm|cc[- ]by(?:[- ]sa)?[- ]?(?:2\.0|2\.5|3\.0|4\.0)/.test(license);
}

function candidateScore(candidate, animal) {
    const license = `${candidate.licenseShortName} ${candidate.usageTerms}`.toLowerCase();
    const text = `${candidate.title} ${candidate.description}`.toLowerCase();
    const scientific = String(animal.scientific_name || '').toLowerCase();
    const common = animal.name.toLowerCase();
    const megapixels = ((candidate.width || 0) * (candidate.height || 0)) / 1_000_000;
    let score = Math.min(megapixels, 20);

    if (/public domain|cc0|pdm/.test(license)) score += 12;
    else if (/cc[- ]by[- ]?4\.0/.test(license)) score += 10;
    else if (/cc[- ]by[- ]sa[- ]?4\.0/.test(license)) score += 8;
    else score += 5;

    if (scientific && text.includes(scientific)) score += 12;
    if (text.includes(common)) score += 8;
    if (candidate.mime === 'image/jpeg') score += 4;
    if (/featured picture|quality image|valued image/.test(text)) score += 4;
    if (/illustration|drawing|diagram|logo|icon|skeleton|skull|fossil|taxiderm|museum specimen/.test(text)) {
        score -= 30;
    }
    return score;
}

function normalizePage(page) {
    const info = page.imageinfo?.[0];
    if (!info || !info.url || !info.mime?.startsWith('image/')) return null;
    const metadata = info.extmetadata || {};
    return {
        pageId: page.pageid,
        title: page.title,
        sourcePage: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replaceAll(' ', '_'))}`,
        originalUrl: info.url,
        thumbnailUrl: info.thumburl || info.url,
        mime: info.mime,
        width: info.width || null,
        height: info.height || null,
        bytes: info.size || null,
        artist: metadataValue(metadata, 'Artist') || metadataValue(metadata, 'Credit'),
        credit: metadataValue(metadata, 'Credit'),
        description: metadataValue(metadata, 'ImageDescription') || metadataValue(metadata, 'ObjectName'),
        dateCreated: metadataValue(metadata, 'DateTimeOriginal') || metadataValue(metadata, 'DateTime'),
        licenseShortName: metadataValue(metadata, 'LicenseShortName'),
        licenseUrl: metadataValue(metadata, 'LicenseUrl'),
        usageTerms: metadataValue(metadata, 'UsageTerms'),
        attributionRequired: metadataValue(metadata, 'AttributionRequired')
    };
}

async function searchCommons(query, limit) {
    const parameters = new URLSearchParams({
        action: 'query',
        format: 'json',
        formatversion: '2',
        generator: 'search',
        gsrsearch: query,
        gsrnamespace: '6',
        gsrlimit: String(Math.max(limit * 4, 24)),
        prop: 'imageinfo',
        iiprop: 'url|mime|size|extmetadata',
        iiurlwidth: '900',
        origin: '*'
    });
    const response = await fetchWithRetry(`${COMMONS_API}?${parameters}`, {
        headers: { 'User-Agent': USER_AGENT }
    });
    if (!response.ok) throw new Error(`Commons search failed with HTTP ${response.status}.`);
    const payload = await response.json();
    return (payload.query?.pages || []).map(normalizePage).filter(Boolean);
}

async function fetchCommonsSource(source) {
    const parameters = new URLSearchParams({
        action: 'query',
        format: 'json',
        formatversion: '2',
        titles: source.title,
        prop: 'imageinfo',
        iiprop: 'url|mime|size|extmetadata',
        iiurlwidth: '900',
        origin: '*'
    });
    const response = await fetchWithRetry(`${COMMONS_API}?${parameters}`, {
        headers: { 'User-Agent': USER_AGENT }
    });
    if (!response.ok) throw new Error(`Commons source lookup failed with HTTP ${response.status}.`);
    const payload = await response.json();
    const candidate = (payload.query?.pages || []).map(normalizePage).find(Boolean);
    if (!candidate) throw new Error(`Commons source page did not resolve to an image: ${source.sourcePage}`);
    return { ...candidate, exactSource: true };
}

async function findCandidates(animal, limit, queryOverrides = [], sourcePageOverrides = []) {
    const searches = [...new Set([
        ...queryOverrides,
        `"${animal.scientific_name}" filetype:bitmap`,
        `"${animal.name}" animal filetype:bitmap`
    ])];
    const [searched, exact] = await Promise.all([
        Promise.all(searches.map((query) => searchCommons(query, limit))),
        Promise.all(sourcePageOverrides.map(fetchCommonsSource))
    ]);
    const results = [...exact, ...searched.flat()];
    const unique = new Map(results.map((candidate) => [candidate.pageId, candidate]));
    return [...unique.values()]
        .filter(isAllowedLicense)
        .map((candidate) => ({
            ...candidate,
            score: Number((candidateScore(candidate, animal) + (candidate.exactSource ? 1_000 : 0)).toFixed(3))
        }))
        .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
        .slice(0, limit);
}

function extensionForMime(mime) {
    if (mime === 'image/png') return '.png';
    if (mime === 'image/webp') return '.webp';
    return '.jpg';
}

async function downloadCandidate(candidate, directory, index) {
    const response = await fetchWithRetry(candidate.thumbnailUrl, {
        headers: { 'User-Agent': USER_AGENT }
    });
    if (!response.ok) throw new Error(`Image download failed with HTTP ${response.status}.`);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) throw new Error('Commons returned a non-image candidate.');
    const sourceSlug = slugify(candidate.title.replace(/^File:/, '')).slice(0, 96);
    const filename = `${String(index + 1).padStart(2, '0')}-${sourceSlug}${extensionForMime(candidate.mime)}`;
    await fs.writeFile(path.join(directory, filename), Buffer.from(await response.arrayBuffer()));
    return filename;
}

async function renderContactSheet(animal, candidates, directory) {
    const columns = 3;
    const cellWidth = 330;
    const cellHeight = 280;
    const rows = Math.ceil(candidates.length / columns);
    const width = columns * cellWidth;
    const height = Math.max(rows, 1) * cellHeight;
    const labels = [`<rect width="100%" height="100%" fill="#0d1019"/>`];
    const overlays = [];

    for (let index = 0; index < candidates.length; index += 1) {
        const candidate = candidates[index];
        const column = index % columns;
        const row = Math.floor(index / columns);
        const x = column * cellWidth;
        const y = row * cellHeight;
        const thumbnail = await sharp(path.join(directory, candidate.localFile))
            .rotate()
            .resize({ width: 300, height: 205, fit: 'contain', background: '#e8ebf1' })
            .png()
            .toBuffer();
        overlays.push({ input: thumbnail, left: x + 15, top: y + 12 });
        labels.push(`<rect x="${x + 7}" y="${y + 6}" width="316" height="266" rx="10" fill="none" stroke="#56f2c4" stroke-width="2"/>`);
        labels.push(`<text x="${x + 16}" y="${y + 236}" fill="#f6f8ff" font-family="Arial, sans-serif" font-size="14" font-weight="700">${index + 1}. ${escapeXml(candidate.title.replace(/^File:/, '').slice(0, 38))}</text>`);
        labels.push(`<text x="${x + 16}" y="${y + 255}" fill="#9eabc5" font-family="Arial, sans-serif" font-size="11">${escapeXml(candidate.licenseShortName)} · score ${candidate.score}</text>`);
    }

    const svg = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${labels.join('')}</svg>`);
    await sharp(svg)
        .composite(overlays)
        .webp({ quality: 88, effort: 4 })
        .toFile(path.join(directory, `${slugify(animal.name)}-candidates.webp`));
}

async function sourceAnimal(animal, outputRoot, limit, queryOverrides = [], sourcePageOverrides = []) {
    const directory = path.join(outputRoot, slugify(animal.name));
    await fs.mkdir(directory, { recursive: true });
    const candidates = await findCandidates(animal, limit, queryOverrides, sourcePageOverrides);
    const sourced = [];
    for (let index = 0; index < candidates.length; index += 1) {
        const candidate = candidates[index];
        if (index > 0) await wait(700);
        sourced.push({
            ...candidate,
            localFile: await downloadCandidate(candidate, directory, index)
        });
    }
    await renderContactSheet(animal, sourced, directory);
    const manifest = {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        animal: {
            name: animal.name,
            scientificName: animal.scientific_name
        },
        source: 'Wikimedia Commons',
        searchQueries: queryOverrides,
        exactSourcePages: sourcePageOverrides.map((source) => source.sourcePage),
        candidates: sourced
    };
    await fs.writeFile(path.join(directory, 'candidates.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    return { animal: animal.name, candidates: sourced.length, directory: path.relative(ROOT, directory) };
}

async function main() {
    const names = optionValues('--animal');
    if (names.length === 0) throw new Error('Provide at least one --animal "Name" option.');
    const limit = Math.min(Math.max(Number(optionValue('--limit', '9')) || 9, 1), 12);
    const queryOverrides = parseQueryOverrides(optionValues('--query'));
    const sourcePageOverrides = parseSourcePageOverrides(optionValues('--source-page'));
    const outputRoot = resolveOutputDirectory(optionValue('--output', DEFAULT_OUTPUT));
    const animals = JSON.parse(await fs.readFile(DATA_PATH, 'utf8'));
    const byName = new Map(animals.map((animal) => [animal.name.toLowerCase(), animal]));
    const selected = names.map((name) => {
        const animal = byName.get(name.toLowerCase());
        if (!animal) throw new Error(`Unknown animal: ${name}`);
        return animal;
    });

    const results = [];
    for (const animal of selected) {
        results.push(await sourceAnimal(
            animal,
            outputRoot,
            limit,
            queryOverrides.get(animal.name.toLowerCase()) || [],
            sourcePageOverrides.get(animal.name.toLowerCase()) || []
        ));
    }
    console.log(JSON.stringify({ output: path.relative(ROOT, outputRoot), results }, null, 2));
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

module.exports = {
    candidateScore,
    isAllowedLicense,
    normalizePage,
    parseQueryOverrides,
    parseSourcePageOverrides,
    resolveOutputDirectory,
    slugify,
    stripHtml
};
