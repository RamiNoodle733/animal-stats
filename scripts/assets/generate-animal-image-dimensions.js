#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const { resolveAnimalImage } = require('./audit-animal-images');

const ROOT = path.resolve(__dirname, '../..');
const DATA_PATH = path.join(ROOT, 'animal_stats.json');
const OUTPUT_PATH = path.join(ROOT, 'data', 'animal-image-dimensions.json');

function assetPath(value) {
    return String(value || '').split(/[?#]/, 1)[0];
}

async function mapWithConcurrency(items, limit, task) {
    const results = new Array(items.length);
    let nextIndex = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (nextIndex < items.length) {
            const index = nextIndex;
            nextIndex += 1;
            results[index] = await task(items[index], index);
        }
    });
    await Promise.all(workers);
    return results;
}

async function buildRegistry(animals) {
    const seenAssets = new Set();
    const records = animals.map((animal) => {
        const asset = assetPath(animal.image);
        if (seenAssets.has(asset)) {
            throw new Error(`Multiple animals use the same source image: ${asset}`);
        }
        seenAssets.add(asset);
        return { animal, asset };
    });

    const entries = await mapWithConcurrency(records, 6, async ({ asset }) => {
        const absolutePath = resolveAnimalImage(asset);
        const contents = await fs.readFile(absolutePath);
        const metadata = await sharp(contents, { failOn: 'error' }).metadata();
        if (!metadata.width || !metadata.height) {
            throw new Error(`Image has no usable dimensions: ${asset}`);
        }

        let subject = {
            left: 0,
            top: 0,
            width: metadata.width,
            height: metadata.height
        };

        if (metadata.hasAlpha) {
            const { info } = await sharp(contents, { failOn: 'error' })
                .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
                .toBuffer({ resolveWithObject: true });
            const left = Math.max(0, -(info.trimOffsetLeft || 0));
            const top = Math.max(0, -(info.trimOffsetTop || 0));
            if (info.width > 0 && info.height > 0
                && left + info.width <= metadata.width
                && top + info.height <= metadata.height) {
                subject = {
                    left,
                    top,
                    width: info.width,
                    height: info.height
                };
            }
        }

        return [asset, {
            width: metadata.width,
            height: metadata.height,
            subject,
            sha256: crypto.createHash('sha256').update(contents).digest('hex')
        }];
    });

    return { schemaVersion: 2, images: Object.fromEntries(entries) };
}

async function main() {
    const animals = JSON.parse(await fs.readFile(DATA_PATH, 'utf8'));
    const registry = await buildRegistry(animals);
    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
    console.log(`Recorded intrinsic dimensions for ${Object.keys(registry.images).length} animal images.`);
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

module.exports = { assetPath, buildRegistry };
