'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
    alphaRange,
    findDuplicates,
    resolveAnimalImage,
    summarize
} = require('../scripts/assets/audit-animal-images');

test('animal image paths cannot leave the dedicated asset directory', () => {
    assert.throws(
        () => resolveAnimalImage('/images/animals/../../.env'),
        /escapes the animal image directory/
    );
    assert.throws(
        () => resolveAnimalImage('https://example.com/animal.png'),
        /must be local/
    );
    assert.match(
        resolveAnimalImage('/images/animals/african-lion.png?v=0123456789ab#subject'),
        /images[\\/]animals[\\/]african-lion\.png$/
    );
});

test('alpha range reads transparency bytes directly', () => {
    assert.deepEqual(alphaRange(Buffer.from([0, 64, 128, 255])), { minimum: 0, maximum: 255 });
    assert.deepEqual(alphaRange(Buffer.from([255, 255])), { minimum: 255, maximum: 255 });
    assert.throws(() => alphaRange(Buffer.alloc(0)), /empty/);
});

test('duplicate image bytes are grouped by checksum', () => {
    const duplicates = findDuplicates([
        { name: 'Baboon', sha256: 'same' },
        { name: 'Chimpanzee', sha256: 'same' },
        { name: 'Lion', sha256: 'different' }
    ]);

    assert.deepEqual(duplicates, [{
        sha256: 'same',
        names: ['Baboon', 'Chimpanzee']
    }]);
});

test('audit summary distinguishes transparency, decoding, and duplicate issues', () => {
    const report = summarize([
        {
            name: 'Lion',
            sha256: 'lion',
            bytes: 100,
            width: 800,
            height: 600,
            hasTransparentPixels: true,
            error: null
        },
        {
            name: 'Baboon',
            sha256: 'duplicate',
            bytes: 200,
            width: 500,
            height: 500,
            hasTransparentPixels: true,
            error: null
        },
        {
            name: 'Chimpanzee',
            sha256: 'duplicate',
            bytes: 200,
            width: 500,
            height: 500,
            hasTransparentPixels: true,
            error: null
        },
        {
            name: 'Bison',
            sha256: 'bison',
            bytes: 300,
            width: 640,
            height: 480,
            hasTransparentPixels: false,
            error: null
        },
        {
            name: 'Piranha',
            error: 'unsupported image format'
        }
    ]);

    assert.deepEqual(report.totals, {
        animals: 5,
        readable: 4,
        transparent: 3,
        unreadable: 1,
        notTransparent: 1,
        duplicateGroups: 1,
        undersized: 0,
        sourceBytes: 800
    });
    assert.deepEqual(
        report.records.find((record) => record.name === 'Bison').issues,
        ['not-transparent']
    );
    assert.deepEqual(
        report.records.find((record) => record.name === 'Piranha').issues,
        ['unreadable']
    );
});
