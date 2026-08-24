#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '../..');
const CACHE_ROOT = path.join(ROOT, '.cache');
const ANIMAL_ROOT = path.join(ROOT, 'images', 'animals');
const OPTIMIZED_ROOT = path.join(ANIMAL_ROOT, 'optimized');
const DATA_PATH = path.join(ROOT, 'animal_stats.json');
const SOURCE_REGISTRY_PATH = path.join(ROOT, 'data', 'animal-image-sources.json');
const OPTIMIZED_MANIFEST_PATH = path.join(OPTIMIZED_ROOT, 'manifest.json');
const WIDTHS = Object.freeze([320, 640, 960]);
const args = process.argv.slice(2);

function optionValue(name) {
    const index = args.indexOf(name);
    return index === -1 ? null : args[index + 1] || null;
}

function slugify(value) {
    return String(value)
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

function resolveInputDirectory(value) {
    if (!value) throw new Error('Provide --input-dir inside the ignored .cache directory.');
    const resolved = path.resolve(ROOT, value);
    const relative = path.relative(CACHE_ROOT, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new Error('Cutout input must stay inside the ignored .cache directory.');
    }
    return resolved;
}

function validateAlphaBounds({ width, height, alpha, threshold = 8 }) {
    if (!Buffer.isBuffer(alpha) || alpha.length !== width * height) {
        throw new Error('Alpha channel dimensions do not match the image.');
    }
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    let foregroundPixels = 0;
    let partialPixels = 0;
    let alphaMinimum = 255;
    let alphaMaximum = 0;

    for (let index = 0; index < alpha.length; index += 1) {
        const value = alpha[index];
        alphaMinimum = Math.min(alphaMinimum, value);
        alphaMaximum = Math.max(alphaMaximum, value);
        if (value > 0 && value < 255) partialPixels += 1;
        if (value <= threshold) continue;
        const x = index % width;
        const y = Math.floor(index / width);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        foregroundPixels += 1;
    }

    if (foregroundPixels === 0) throw new Error('Cutout contains no visible subject pixels.');
    const foregroundRatio = foregroundPixels / alpha.length;
    const minimumMargin = Math.max(2, Math.floor(Math.min(width, height) * 0.002));
    const touchesCanvas = minX < minimumMargin
        || minY < minimumMargin
        || maxX >= width - minimumMargin
        || maxY >= height - minimumMargin;
    if (touchesCanvas) throw new Error('Visible subject touches the canvas edge and may be clipped.');
    if (foregroundRatio < 0.015 || foregroundRatio > 0.9) {
        throw new Error(`Unexpected foreground coverage: ${(foregroundRatio * 100).toFixed(2)}%.`);
    }

    return {
        bounds: { minX, minY, maxX, maxY },
        alphaMinimum,
        alphaMaximum,
        foregroundRatio,
        partialAlphaRatio: partialPixels / alpha.length,
        touchesCanvas
    };
}

async function inspectCutout(filePath) {
    const bytes = await fs.readFile(filePath);
    const metadata = await sharp(bytes, { failOn: 'error' }).metadata();
    if (metadata.format !== 'png') throw new Error('Cutout must be a PNG fallback.');
    if (!metadata.hasAlpha) throw new Error('Cutout has no alpha channel.');
    if ((metadata.width || 0) < 600 || (metadata.height || 0) < 400) {
        throw new Error('Cutout must be at least 600×400 pixels.');
    }
    const { data: alpha, info } = await sharp(bytes)
        .extractChannel('alpha')
        .raw()
        .toBuffer({ resolveWithObject: true });
    const alphaMetrics = validateAlphaBounds({ width: info.width, height: info.height, alpha });
    if (alphaMetrics.alphaMinimum !== 0 || alphaMetrics.alphaMaximum !== 255) {
        throw new Error('Cutout must contain both fully transparent and fully opaque pixels.');
    }
    return {
        bytes,
        sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
        width: metadata.width,
        height: metadata.height,
        ...alphaMetrics
    };
}

function variantUrls(slug, sourceWidth, revision = null) {
    const widths = WIDTHS.filter((width) => width <= sourceWidth);
    if (!widths.includes(sourceWidth) && sourceWidth < WIDTHS.at(-1)) widths.push(sourceWidth);
    const stem = revision ? `${slug}-${revision}` : slug;
    return {
        avif: widths.map((width) => ({ src: `/images/animals/optimized/${stem}-${width}.avif`, width })),
        webp: widths.map((width) => ({ src: `/images/animals/optimized/${stem}-${width}.webp`, width }))
    };
}

async function renderVariants(bytes, slug, sourceWidth, revision) {
    const variants = variantUrls(slug, sourceWidth, revision);
    await fs.mkdir(OPTIMIZED_ROOT, { recursive: true });
    const output = { avif: [], webp: [] };
    for (const format of ['avif', 'webp']) {
        for (const variant of variants[format]) {
            const destination = path.join(ROOT, variant.src.slice(1));
            let pipeline = sharp(bytes).rotate().resize({
                width: variant.width,
                fit: 'inside',
                withoutEnlargement: true
            });
            pipeline = format === 'avif'
                ? pipeline.avif({ quality: 58, effort: 5, chromaSubsampling: '4:4:4' })
                : pipeline.webp({ quality: 84, alphaQuality: 100, effort: 6 });
            const info = await pipeline.toFile(destination);
            output[format].push({ ...variant, bytes: info.size });
        }
    }
    return output;
}

async function removeStaleVariants(slug, variants) {
    const activeFiles = new Set(Object.values(variants)
        .flat()
        .map((variant) => path.basename(variant.src)));
    const pattern = new RegExp(`^${slug}-(?:[a-f0-9]{12}-)?\\d+\\.(?:avif|webp)$`);
    const files = await fs.readdir(OPTIMIZED_ROOT);
    await Promise.all(files
        .filter((file) => pattern.test(file) && !activeFiles.has(file))
        .map((file) => fs.unlink(path.join(OPTIMIZED_ROOT, file))));
}

async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') return false;
        throw error;
    }
}

async function buildPlan(inputDirectory, registry, animals) {
    const entries = [];
    for (const source of registry.entries) {
        if (!['source-selected', 'active'].includes(source.status)) continue;
        const slug = slugify(source.animal);
        const input = path.join(inputDirectory, `${slug}.png`);
        const inputExists = await fileExists(input);
        if (!inputExists && source.status === 'active') continue;
        if (!inputExists) throw new Error(`${source.animal}: reviewed cutout is missing: ${input}`);
        try {
            const inspection = await inspectCutout(input);
            const animal = animals.find((candidate) => candidate.name === source.animal);
            if (!animal) throw new Error(`Animal dataset record missing: ${source.animal}`);
            entries.push({ source, animal, slug, input, inspection });
        } catch (error) {
            throw new Error(`${source.animal}: ${error.message}`);
        }
    }
    if (entries.length === 0) throw new Error('No source-selected registry entries are ready for promotion.');
    return entries;
}

async function applyPlan(plan, registry, animals) {
    let optimizedManifest = { schemaVersion: 1, animals: {} };
    try {
        optimizedManifest = JSON.parse(await fs.readFile(OPTIMIZED_MANIFEST_PATH, 'utf8'));
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }

    for (const item of plan) {
        const revision = item.inspection.sha256.slice(0, 12);
        const fallbackPath = path.join(ANIMAL_ROOT, `${item.slug}.png`);
        await fs.copyFile(item.input, fallbackPath);
        const variants = await renderVariants(item.inspection.bytes, item.slug, item.inspection.width, revision);
        const assetUrl = `/images/animals/${item.slug}.png?v=${revision}`;
        item.animal.image = assetUrl;

        Object.assign(item.source, {
            status: 'active',
            asset: assetUrl,
            assetSha256: item.inspection.sha256,
            assetWidth: item.inspection.width,
            assetHeight: item.inspection.height,
            activatedAt: new Date().toISOString().slice(0, 10),
            backgroundRemoval: 'Adobe Photoshop API select-subject cutout',
            reviewStatus: 'first-pass-reviewed',
            reviewNotes: 'Correct real animal and transparent background verified; minor natural edge color may remain.',
            variants
        });
        optimizedManifest.animals[item.slug] = {
            animal: item.source.animal,
            fallback: assetUrl,
            sourceSha256: item.inspection.sha256,
            width: item.inspection.width,
            height: item.inspection.height,
            variants
        };
    }

    registry.updatedAt = new Date().toISOString().slice(0, 10);
    await fs.mkdir(OPTIMIZED_ROOT, { recursive: true });
    await Promise.all([
        fs.writeFile(DATA_PATH, `${JSON.stringify(animals, null, 2)}\n`, 'utf8'),
        fs.writeFile(SOURCE_REGISTRY_PATH, `${JSON.stringify(registry, null, 2)}\n`, 'utf8'),
        fs.writeFile(OPTIMIZED_MANIFEST_PATH, `${JSON.stringify(optimizedManifest, null, 2)}\n`, 'utf8')
    ]);
    await Promise.all(plan.map((item) => removeStaleVariants(item.slug, item.source.variants)));
}

async function main() {
    const inputDirectory = resolveInputDirectory(optionValue('--input-dir'));
    const [registry, animals] = await Promise.all([
        fs.readFile(SOURCE_REGISTRY_PATH, 'utf8').then(JSON.parse),
        fs.readFile(DATA_PATH, 'utf8').then(JSON.parse)
    ]);
    const plan = await buildPlan(inputDirectory, registry, animals);
    const summary = plan.map((item) => ({
        animal: item.source.animal,
        input: path.relative(ROOT, item.input),
        width: item.inspection.width,
        height: item.inspection.height,
        sha256: item.inspection.sha256,
        foregroundPercent: Number((item.inspection.foregroundRatio * 100).toFixed(2)),
        partialAlphaPercent: Number((item.inspection.partialAlphaRatio * 100).toFixed(2)),
        variants: variantUrls(item.slug, item.inspection.width, item.inspection.sha256.slice(0, 12))
    }));
    const apply = args.includes('--apply');
    if (apply) await applyPlan(plan, registry, animals);
    console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', entries: summary }, null, 2));
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

module.exports = {
    resolveInputDirectory,
    slugify,
    validateAlphaBounds,
    variantUrls,
    buildPlan
};
