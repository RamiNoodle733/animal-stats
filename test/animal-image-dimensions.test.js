'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const animals = JSON.parse(fs.readFileSync(path.join(root, 'animal_stats.json'), 'utf8'));
const registry = JSON.parse(fs.readFileSync(path.join(root, 'data/animal-image-dimensions.json'), 'utf8'));

test('intrinsic image registry covers every canonical animal asset', async () => {
    assert.equal(registry.schemaVersion, 2);
    assert.equal(Object.keys(registry.images).length, animals.length);

    for (const animal of animals) {
        const asset = animal.image.split(/[?#]/, 1)[0];
        const dimensions = registry.images[asset];
        assert.ok(dimensions, `missing dimensions for ${animal.name}`);
        const metadata = await sharp(path.join(root, asset.slice(1))).metadata();
        assert.equal(dimensions.width, metadata.width, `${animal.name} width`);
        assert.equal(dimensions.height, metadata.height, `${animal.name} height`);
        assert.ok(dimensions.subject.width > 0, `${animal.name} subject width`);
        assert.ok(dimensions.subject.height > 0, `${animal.name} subject height`);
        assert.ok(dimensions.subject.left >= 0, `${animal.name} subject left`);
        assert.ok(dimensions.subject.top >= 0, `${animal.name} subject top`);
        assert.ok(
            dimensions.subject.left + dimensions.subject.width <= dimensions.width,
            `${animal.name} subject horizontal bounds`
        );
        assert.ok(
            dimensions.subject.top + dimensions.subject.height <= dimensions.height,
            `${animal.name} subject vertical bounds`
        );
    }
});

test('transparent padding is excluded from known animal subject bounds', () => {
    const crocodile = registry.images['/images/animals/saltwater-crocodile.png'];
    assert.deepEqual(crocodile.subject, {
        left: 92,
        top: 235,
        width: 785,
        height: 147
    });
    assert.ok(crocodile.subject.height < crocodile.height / 2);
});
