'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const sharp = require('sharp');

const {
    candidateScore,
    isAllowedLicense,
    resolveOutputDirectory,
    stripHtml
} = require('../scripts/assets/source-animal-images');
const { slugify } = require('../scripts/assets/promote-animal-cutouts');

test('image sourcing accepts reusable licenses and rejects restricted licenses', () => {
    assert.equal(isAllowedLicense({ licenseShortName: 'CC BY-SA 4.0', usageTerms: '' }), true);
    assert.equal(isAllowedLicense({ licenseShortName: 'Public domain', usageTerms: '' }), true);
    assert.equal(isAllowedLicense({ licenseShortName: 'CC BY-NC 4.0', usageTerms: 'NonCommercial' }), false);
    assert.equal(isAllowedLicense({ licenseShortName: 'Fair use', usageTerms: '' }), false);
});

test('photo candidates outrank illustrations and unrelated files', () => {
    const animal = { name: 'Yak', scientific_name: 'Bos grunniens' };
    const photo = {
        title: 'File:Bos grunniens yak.jpg',
        description: 'Photograph of a yak',
        licenseShortName: 'CC BY 4.0',
        usageTerms: '',
        mime: 'image/jpeg',
        width: 3000,
        height: 2000
    };
    const illustration = {
        ...photo,
        title: 'File:Yak illustration.jpg',
        description: 'Historical illustration and drawing'
    };
    assert.ok(candidateScore(photo, animal) > candidateScore(illustration, animal));
});

test('candidate output cannot enter tracked project directories', () => {
    assert.match(resolveOutputDirectory('.cache/image-candidates'), /[\\/]\.cache[\\/]image-candidates$/);
    assert.throws(() => resolveOutputDirectory('images/animals'), /must stay inside/);
    assert.throws(() => resolveOutputDirectory(path.resolve('..')), /must stay inside/);
});

test('Commons HTML metadata is reduced to readable text', () => {
    assert.equal(stripHtml('<a href="/wiki/User:Example">Example</a> &amp; Team<br/>Photo'), 'Example & Team Photo');
});

test('approved source registry is unique, traceable, and active assets are verified', async () => {
    const registry = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/animal-image-sources.json')));
    const animals = JSON.parse(fs.readFileSync(path.join(__dirname, '../animal_stats.json')));
    const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../images/animals/optimized/manifest.json')));
    const animalNames = new Set(animals.map((animal) => animal.name));
    const registeredNames = new Set();

    assert.equal(registry.schemaVersion, 1);
    assert.equal(manifest.schemaVersion, 1);
    for (const entry of registry.entries) {
        assert.ok(animalNames.has(entry.animal), `Unknown animal source: ${entry.animal}`);
        assert.ok(!registeredNames.has(entry.animal), `Duplicate animal source: ${entry.animal}`);
        registeredNames.add(entry.animal);
        assert.ok(['source-selected', 'active'].includes(entry.status), `Invalid source status: ${entry.status}`);
        assert.match(entry.sourcePage, /^https:\/\/commons\.wikimedia\.org\/wiki\/File/);
        assert.match(entry.licenseUrl, /^https:\/\//);
        assert.ok(entry.creator);
        assert.ok(entry.license);
        assert.ok(entry.sourceWidth >= 300 && entry.sourceHeight >= 300);
        assert.ok(entry.selectionNotes);

        if (entry.status !== 'active') continue;
        const animal = animals.find((candidate) => candidate.name === entry.animal);
        const assetPath = path.join(__dirname, '..', entry.asset.split(/[?#]/, 1)[0].replace(/^\//, ''));
        const assetBytes = fs.readFileSync(assetPath);
        const metadata = await sharp(assetBytes).metadata();
        const manifestEntry = manifest.animals[slugify(entry.animal)];

        assert.equal(animal.image, entry.asset);
        assert.match(entry.asset, /^\/images\/animals\/[a-z0-9-]+\.png\?v=[a-f0-9]{12}$/);
        assert.equal(crypto.createHash('sha256').update(assetBytes).digest('hex'), entry.assetSha256);
        assert.equal(metadata.format, 'png');
        assert.equal(metadata.hasAlpha, true);
        assert.equal(metadata.width, entry.assetWidth);
        assert.equal(metadata.height, entry.assetHeight);
        assert.match(entry.assetSha256, /^[a-f0-9]{64}$/);
        assert.match(entry.activatedAt, /^\d{4}-\d{2}-\d{2}$/);
        assert.ok(entry.backgroundRemoval);
        assert.ok(entry.reviewStatus);
        assert.ok(entry.reviewNotes);
        assert.equal(manifestEntry.fallback, entry.asset);
        assert.equal(manifestEntry.sourceSha256, entry.assetSha256);
        assert.equal(manifestEntry.width, entry.assetWidth);
        assert.equal(manifestEntry.height, entry.assetHeight);

        for (const format of ['avif', 'webp']) {
            assert.ok(entry.variants[format].length > 0);
            assert.deepEqual(entry.variants[format], manifestEntry.variants[format]);
            const widths = entry.variants[format].map((variant) => variant.width);
            assert.deepEqual(widths, [...new Set(widths)].sort((a, b) => a - b));
            for (const variant of entry.variants[format]) {
                const variantPath = path.join(__dirname, '..', variant.src.replace(/^\//, ''));
                const variantStats = fs.statSync(variantPath);
                const variantMetadata = await sharp(variantPath).metadata();
                assert.equal(variantStats.size, variant.bytes);
                assert.equal(variantMetadata.format, format === 'avif' ? 'heif' : 'webp');
                if (format === 'avif') assert.equal(variantMetadata.compression, 'av1');
                assert.equal(variantMetadata.width, variant.width);
                assert.equal(variantMetadata.hasAlpha, true);
                assert.ok(variant.bytes < assetBytes.length);
            }
        }
    }
});
