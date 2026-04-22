#!/usr/bin/env node
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '../..');
const SOURCE_DIR = path.join(ROOT, 'images/animals');
const OUTPUT_DIR = path.join(SOURCE_DIR, 'silhouettes');
const SUPPORTED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif']);

async function ensureDir(dirPath) {
    await fs.mkdir(dirPath, { recursive: true });
}

async function collectSourceImages(dirPath) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        if (!entry.isFile()) continue;

        const ext = path.extname(entry.name).toLowerCase();
        if (!SUPPORTED_EXTENSIONS.has(ext)) continue;

        files.push(path.join(dirPath, entry.name));
    }

    return files.sort((a, b) => a.localeCompare(b));
}

async function buildSilhouette(inputPath) {
    const fileName = path.basename(inputPath);
    const outputName = `${path.parse(fileName).name}.webp`;
    const outputPath = path.join(OUTPUT_DIR, outputName);

    try {
        const resized = sharp(inputPath)
            .rotate()
            .resize({ width: 320, height: 320, fit: 'inside', withoutEnlargement: true })
            .ensureAlpha();

        const metadata = await resized.metadata();
        if (!metadata.width || !metadata.height) {
            return null;
        }

        const { data: alphaChannel, info: alphaInfo } = await resized
            .extractChannel('alpha')
            .raw()
            .toBuffer({ resolveWithObject: true });

        await sharp({
            create: {
                width: metadata.width,
                height: metadata.height,
                channels: 3,
                background: { r: 255, g: 255, b: 255 }
            }
        })
            .joinChannel(alphaChannel, {
                raw: {
                    width: alphaInfo.width,
                    height: alphaInfo.height,
                    channels: alphaInfo.channels
                }
            })
            .webp({ quality: 82, alphaQuality: 100, effort: 4 })
            .toFile(outputPath);

        return outputName;
    } catch (error) {
        console.warn(`Skipping unsupported file: ${path.basename(inputPath)} (${error.message})`);
        return null;
    }
}

async function main() {
    await ensureDir(OUTPUT_DIR);

    const sourceImages = await collectSourceImages(SOURCE_DIR);
    const manifest = {
        generatedAt: new Date().toISOString(),
        count: 0,
        files: {}
    };

    for (const inputPath of sourceImages) {
        const originalName = path.basename(inputPath);
        const outputName = await buildSilhouette(inputPath);
        if (!outputName) continue;

        manifest.files[originalName] = outputName;
        manifest.count += 1;
    }

    const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
    await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

    console.log(`Generated ${manifest.count} silhouettes in ${path.relative(ROOT, OUTPUT_DIR)}.`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
