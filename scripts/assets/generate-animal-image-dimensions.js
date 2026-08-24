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

async function buildRegistry(animals) {
    const images = {};
    for (const animal of animals) {
        const asset = assetPath(animal.image);
        if (images[asset]) {
            throw new Error(`Multiple animals use the same source image: ${asset}`);
        }

        const absolutePath = resolveAnimalImage(asset);
        const contents = await fs.readFile(absolutePath);
        const metadata = await sharp(contents, { failOn: 'error' }).metadata();
        if (!metadata.width || !metadata.height) {
            throw new Error(`Image has no usable dimensions: ${asset}`);
        }

        images[asset] = {
            width: metadata.width,
            height: metadata.height,
            sha256: crypto.createHash('sha256').update(contents).digest('hex')
        };
    }

    return { schemaVersion: 1, images };
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
