'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
    candidateScore,
    isAllowedLicense,
    resolveOutputDirectory,
    stripHtml
} = require('../scripts/assets/source-animal-images');

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

test('approved source registry is unique, traceable, and not mislabeled as live', () => {
    const registry = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/animal-image-sources.json')));
    const animals = JSON.parse(fs.readFileSync(path.join(__dirname, '../animal_stats.json')));
    const animalNames = new Set(animals.map((animal) => animal.name));
    const registeredNames = new Set();

    assert.equal(registry.schemaVersion, 1);
    for (const entry of registry.entries) {
        assert.ok(animalNames.has(entry.animal), `Unknown animal source: ${entry.animal}`);
        assert.ok(!registeredNames.has(entry.animal), `Duplicate animal source: ${entry.animal}`);
        registeredNames.add(entry.animal);
        assert.equal(entry.status, 'source-selected');
        assert.match(entry.sourcePage, /^https:\/\/commons\.wikimedia\.org\/wiki\/File/);
        assert.match(entry.licenseUrl, /^https:\/\//);
        assert.ok(entry.creator);
        assert.ok(entry.license);
        assert.ok(entry.sourceWidth >= 300 && entry.sourceHeight >= 300);
        assert.ok(entry.selectionNotes);
    }
});
