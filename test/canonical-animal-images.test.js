'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const animals = require('../animal_stats.json');
const {
    applyCanonicalAnimalImage,
    applyCanonicalAnimalImages,
    getCanonicalAnimalImage,
    getCanonicalAnimalImageSet
} = require('../lib/animal-images');

test('active image registry overrides stale database paths', () => {
    const result = applyCanonicalAnimalImage({
        _id: 'yak-id',
        name: 'Yak',
        image: '/images/animals/yak.jpg'
    });
    assert.equal(result.image, '/images/animals/yak.png?v=bdcc998cd5a2');
    assert.equal(result.imageSet.fallback, result.image);
    assert.equal(result.imageSet.avif.length, 3);
    assert.equal(result.imageSet.webp.length, 3);
});

test('canonical image lookup is case-insensitive and matches the dataset', () => {
    const datasetYak = animals.find((animal) => animal.name === 'Yak');
    assert.equal(getCanonicalAnimalImage('  yAK  '), datasetYak.image);
    assert.equal(getCanonicalAnimalImage('Unknown Animal', '/fallback.png'), '/fallback.png');
    assert.equal(getCanonicalAnimalImageSet('Unknown Animal'), null);
});

test('animals without active replacements remain unchanged', () => {
    const bison = { name: 'Bison', image: '/images/animals/bison.jpg' };
    assert.equal(applyCanonicalAnimalImage(bison), bison);
    assert.deepEqual(applyCanonicalAnimalImages([bison]), [bison]);
    assert.deepEqual(applyCanonicalAnimalImages(null), []);
});

test('mongoose-like documents are serialized before an active override', () => {
    const document = {
        name: 'Piranha',
        image: '/images/animals/piranha.jpg',
        toObject() {
            return { _id: 'piranha-id', name: this.name, image: this.image };
        }
    };
    const result = applyCanonicalAnimalImage(document);
    assert.deepEqual(Object.keys(result).sort(), ['_id', 'image', 'imageSet', 'name']);
    assert.equal(result.image, '/images/animals/piranha.png?v=a8f74973c4a9');
});
