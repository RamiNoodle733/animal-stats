#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '../..');
const DATA_PATH = path.join(ROOT, 'animal_stats.json');
const ANIMAL_IMAGE_ROOT = path.join(ROOT, 'images', 'animals');
const args = process.argv.slice(2);

function argumentValue(name) {
    const index = args.indexOf(name);
    return index === -1 ? null : args[index + 1] || null;
}

function escapeXml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');
}

function relativeAssetPath(absolutePath) {
    return path.relative(ROOT, absolutePath).replaceAll('\\', '/');
}

function resolveAnimalImage(imageUrl) {
    if (typeof imageUrl !== 'string' || !imageUrl.startsWith('/images/animals/')) {
        throw new Error(`Image URL must be local under /images/animals/: ${imageUrl}`);
    }

    const pathname = imageUrl.split(/[?#]/, 1)[0];
    const resolved = path.resolve(ROOT, pathname.slice(1));
    const relative = path.relative(ANIMAL_IMAGE_ROOT, resolved);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new Error(`Image URL escapes the animal image directory: ${imageUrl}`);
    }
    return resolved;
}

function alphaRange(alpha) {
    if (!Buffer.isBuffer(alpha) || alpha.length === 0) throw new Error('Alpha channel is empty.');
    let minimum = 255;
    let maximum = 0;
    for (const value of alpha) {
        minimum = Math.min(minimum, value);
        maximum = Math.max(maximum, value);
    }
    return { minimum, maximum };
}

async function inspectAnimal(animal) {
    let absolutePath;
    try {
        absolutePath = resolveAnimalImage(animal.image);
        const contents = await fs.readFile(absolutePath);
        const pipeline = sharp(contents, { failOn: 'error' });
        const metadata = await pipeline.metadata();
        let alphaMinimum = null;
        let alphaMaximum = null;

        if (metadata.hasAlpha) {
            const alpha = await sharp(contents)
                .extractChannel('alpha')
                .raw()
                .toBuffer();
            const range = alphaRange(alpha);
            alphaMinimum = range.minimum;
            alphaMaximum = range.maximum;
        }

        return {
            name: animal.name,
            image: animal.image,
            file: relativeAssetPath(absolutePath),
            sha256: crypto.createHash('sha256').update(contents).digest('hex'),
            bytes: contents.length,
            format: metadata.format || null,
            width: metadata.width || null,
            height: metadata.height || null,
            hasAlpha: Boolean(metadata.hasAlpha),
            alphaMinimum,
            alphaMaximum,
            hasTransparentPixels: alphaMinimum !== null && alphaMinimum < 255,
            error: null
        };
    } catch (error) {
        return {
            name: animal.name,
            image: animal.image,
            file: absolutePath ? relativeAssetPath(absolutePath) : null,
            error: error.message
        };
    }
}

function findDuplicates(records) {
    const byHash = new Map();
    for (const record of records) {
        if (!record.sha256) continue;
        const group = byHash.get(record.sha256) || [];
        group.push(record.name);
        byHash.set(record.sha256, group);
    }

    return [...byHash.entries()]
        .filter(([, names]) => names.length > 1)
        .map(([sha256, names]) => ({ sha256, names }));
}

function summarize(records) {
    const duplicates = findDuplicates(records);
    const duplicateNames = new Set(duplicates.flatMap((group) => group.names));
    const unreadable = records.filter((record) => record.error);
    const opaque = records.filter((record) => !record.error && !record.hasTransparentPixels);
    const undersized = records.filter((record) => (
        !record.error && (record.width < 300 || record.height < 300)
    ));

    const reviewedRecords = records.map((record) => ({
        ...record,
        issues: [
            ...(record.error ? ['unreadable'] : []),
            ...(!record.error && !record.hasTransparentPixels ? ['not-transparent'] : []),
            ...(duplicateNames.has(record.name) ? ['duplicate-content'] : []),
            ...(!record.error && (record.width < 300 || record.height < 300) ? ['under-300px'] : [])
        ]
    }));

    return {
        schemaVersion: 1,
        totals: {
            animals: records.length,
            readable: records.length - unreadable.length,
            transparent: records.length - unreadable.length - opaque.length,
            unreadable: unreadable.length,
            notTransparent: opaque.length,
            duplicateGroups: duplicates.length,
            undersized: undersized.length,
            sourceBytes: records.reduce((sum, record) => sum + (record.bytes || 0), 0)
        },
        duplicateGroups: duplicates,
        records: reviewedRecords
    };
}

function issueColor(record) {
    if (record.issues.includes('unreadable')) return '#ff4d6a';
    if (record.issues.length > 0) return '#ffbd59';
    return '#56f2c4';
}

async function renderContactSheets(report, outputDirectory) {
    const columns = 5;
    const rows = 5;
    const cellWidth = 260;
    const cellHeight = 220;
    const thumbWidth = 224;
    const thumbHeight = 166;
    const pageSize = columns * rows;
    const sheetCount = Math.ceil(report.records.length / pageSize);

    await fs.mkdir(outputDirectory, { recursive: true });

    for (let sheetIndex = 0; sheetIndex < sheetCount; sheetIndex += 1) {
        const records = report.records.slice(sheetIndex * pageSize, (sheetIndex + 1) * pageSize);
        const overlays = [];
        const labels = [];

        for (let index = 0; index < records.length; index += 1) {
            const record = records[index];
            const column = index % columns;
            const row = Math.floor(index / columns);
            const left = column * cellWidth + 18;
            const top = row * cellHeight + 12;

            labels.push(`<rect x="${column * cellWidth + 8}" y="${row * cellHeight + 6}" width="244" height="208" rx="10" fill="#1a1f2e" stroke="${issueColor(record)}" stroke-width="2"/>`);
            labels.push(`<text x="${column * cellWidth + 18}" y="${row * cellHeight + 199}" fill="#f6f8ff" font-family="Arial, sans-serif" font-size="14" font-weight="700">${escapeXml(record.name)}</text>`);
            if (record.issues.length > 0) {
                labels.push(`<text x="${column * cellWidth + 18}" y="${row * cellHeight + 214}" fill="${issueColor(record)}" font-family="Arial, sans-serif" font-size="10">${escapeXml(record.issues.join(', '))}</text>`);
            }

            if (record.error || !record.file) continue;
            const thumbnail = await sharp(path.join(ROOT, record.file))
                .rotate()
                .resize({
                    width: thumbWidth,
                    height: thumbHeight,
                    fit: 'contain',
                    background: { r: 236, g: 238, b: 244, alpha: 1 },
                    withoutEnlargement: true
                })
                .png()
                .toBuffer();
            overlays.push({ input: thumbnail, left, top });
        }

        const labelSvg = Buffer.from(`<svg width="${columns * cellWidth}" height="${rows * cellHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0d1019"/>${labels.join('')}</svg>`);
        const outputPath = path.join(outputDirectory, `sheet-${String(sheetIndex + 1).padStart(2, '0')}.webp`);
        await sharp(labelSvg)
            .composite(overlays)
            .webp({ quality: 88, effort: 4 })
            .toFile(outputPath);
    }

    return sheetCount;
}

async function main() {
    const animals = JSON.parse(await fs.readFile(DATA_PATH, 'utf8'));
    const records = [];
    for (const animal of animals) {
        records.push(await inspectAnimal(animal));
    }

    const report = summarize(records);
    const reportPath = argumentValue('--report');
    const contactSheetPath = argumentValue('--contact-sheets');

    if (reportPath) {
        const absoluteReportPath = path.resolve(ROOT, reportPath);
        await fs.mkdir(path.dirname(absoluteReportPath), { recursive: true });
        await fs.writeFile(absoluteReportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    }

    let sheetCount = 0;
    if (contactSheetPath) {
        sheetCount = await renderContactSheets(report, path.resolve(ROOT, contactSheetPath));
    }

    console.log(JSON.stringify({
        ...report.totals,
        duplicateAnimals: report.duplicateGroups.map((group) => group.names),
        report: reportPath,
        contactSheets: sheetCount
    }, null, 2));

    const hasBlockingIssues = report.totals.unreadable > 0
        || report.totals.notTransparent > 0
        || report.totals.duplicateGroups > 0;
    if (args.includes('--strict') && hasBlockingIssues) {
        process.exitCode = 1;
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

module.exports = {
    alphaRange,
    findDuplicates,
    resolveAnimalImage,
    summarize
};
