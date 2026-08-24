'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');
const sharp = require('sharp');

const {
    buildPlan,
    resolveInputDirectory,
    validateAlphaBounds,
    variantUrls
} = require('../scripts/assets/promote-animal-cutouts');

function alphaFixture(width, height, bounds) {
    const alpha = Buffer.alloc(width * height);
    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
        for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
            alpha[y * width + x] = 255;
        }
    }
    alpha[bounds.minY * width + bounds.minX] = 128;
    return alpha;
}

test('promotion input is restricted to ignored cache data', () => {
    assert.match(resolveInputDirectory('.cache/reviewed-cutouts'), /[\\/]\.cache[\\/]reviewed-cutouts$/);
    assert.throws(() => resolveInputDirectory('images/animals'), /must stay inside/);
    assert.throws(() => resolveInputDirectory(null), /Provide --input-dir/);
});

test('alpha bounds accept a padded subject and report partial edges', () => {
    const result = validateAlphaBounds({
        width: 100,
        height: 100,
        alpha: alphaFixture(100, 100, { minX: 20, minY: 10, maxX: 79, maxY: 89 })
    });
    assert.equal(result.touchesCanvas, false);
    assert.ok(result.foregroundRatio > 0.4);
    assert.ok(result.partialAlphaRatio > 0);
});

test('alpha bounds reject clipped and empty cutouts', () => {
    assert.throws(() => validateAlphaBounds({
        width: 100,
        height: 100,
        alpha: alphaFixture(100, 100, { minX: 0, minY: 10, maxX: 70, maxY: 80 })
    }), /touches the canvas edge/);
    assert.throws(() => validateAlphaBounds({
        width: 100,
        height: 100,
        alpha: Buffer.alloc(10_000)
    }), /no visible subject/);
});

test('responsive variant widths never enlarge a cutout', () => {
    assert.deepEqual(variantUrls('yak', 960).webp.map((item) => item.width), [320, 640, 960]);
    assert.deepEqual(variantUrls('yak', 700).avif.map((item) => item.width), [320, 640, 700]);
    assert.equal(
        variantUrls('yak', 960, '0123456789ab').avif[0].src,
        '/images/animals/optimized/yak-0123456789ab-320.avif'
    );
});

test('an active reviewed cutout can be validated again without mutation', async () => {
    const cacheRoot = path.resolve(__dirname, '../.cache');
    await fs.mkdir(cacheRoot, { recursive: true });
    const inputDirectory = await fs.mkdtemp(path.join(cacheRoot, 'promotion-test-'));

    try {
        const subject = await sharp({
            create: {
                width: 500,
                height: 300,
                channels: 4,
                background: { r: 120, g: 80, b: 40, alpha: 1 }
            }
        }).png().toBuffer();
        await sharp({
            create: {
                width: 600,
                height: 400,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            }
        })
            .composite([{ input: subject, left: 50, top: 50 }])
            .png()
            .toFile(path.join(inputDirectory, 'yak.png'));
        const registry = { entries: [{ animal: 'Yak', status: 'active' }] };
        const animals = [{ name: 'Yak', image: '/images/animals/yak.png' }];
        const plan = await buildPlan(inputDirectory, registry, animals);
        assert.equal(plan.length, 1);
        assert.equal(plan[0].source, registry.entries[0]);
        assert.equal(plan[0].animal, animals[0]);
        assert.equal(plan[0].inspection.width, 600);
        assert.equal(plan[0].inspection.height, 400);
    } finally {
        assert.match(inputDirectory, /[\\/]\.cache[\\/]promotion-test-/);
        await fs.rm(inputDirectory, { recursive: true, force: true });
    }
});
