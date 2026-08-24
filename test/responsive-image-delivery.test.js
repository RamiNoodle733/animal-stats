'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadCoreUtils() {
    const source = fs.readFileSync(path.join(__dirname, '../js/core.js'), 'utf8');
    const document = {
        addEventListener() {},
        getElementById() { return null; },
        querySelector() { return null; },
        createElement() {
            let text = '';
            return {
                set textContent(value) { text = String(value); },
                get innerHTML() {
                    return text
                        .replaceAll('&', '&amp;')
                        .replaceAll('<', '&lt;')
                        .replaceAll('>', '&gt;')
                        .replaceAll('"', '&quot;')
                        .replaceAll("'", '&#39;');
                }
            };
        }
    };
    const window = {
        location: { hostname: 'animalbattlestats.com', pathname: '/stats' },
        addEventListener() {}
    };
    vm.runInNewContext(source, {
        AbortSignal,
        Blob,
        clearTimeout,
        console,
        document,
        fetch: async () => { throw new Error('Unexpected fetch'); },
        localStorage: { getItem() { return null; } },
        navigator: {},
        setTimeout,
        window
    });
    return window.CoreUtils;
}

const activeAnimal = {
    name: 'Yak & <Yak>',
    image: '/images/animals/yak.png?v=bdcc998cd5a2',
    imageSet: {
        fallback: '/images/animals/yak.png?v=bdcc998cd5a2',
        width: 960,
        height: 640,
        avif: [
            { src: '/images/animals/optimized/yak-bdcc998cd5a2-320.avif', width: 320 },
            { src: '/images/animals/optimized/yak-bdcc998cd5a2-960.avif', width: 960 }
        ],
        webp: [
            { src: '/images/animals/optimized/yak-bdcc998cd5a2-320.webp', width: 320 },
            { src: '/images/animals/optimized/yak-bdcc998cd5a2-960.webp', width: 960 }
        ]
    }
};

test('responsive animal markup prefers AVIF, then WebP, then PNG', () => {
    const core = loadCoreUtils();
    const html = core.buildAnimalPicture(activeAnimal, {
        className: 'animal-card-image',
        sizes: '(max-width: 600px) 50vw, 320px'
    });
    assert.match(html, /^<picture class="responsive-animal-picture">/);
    assert.match(html, /type="image\/avif"/);
    assert.match(html, /yak-bdcc998cd5a2-320\.avif 320w/);
    assert.match(html, /type="image\/webp"/);
    assert.match(html, /yak-bdcc998cd5a2-960\.webp 960w/);
    assert.match(html, /yak\.png\?v=bdcc998cd5a2/);
    assert.match(html, /width="960" height="640"/);
    assert.match(html, /alt="Yak &amp; &lt;Yak&gt;"/);
});

test('unsafe or incomplete responsive metadata falls back safely', () => {
    const core = loadCoreUtils();
    assert.equal(core.isSafeAnimalImageUrl('https://example.com/yak.png'), false);
    assert.equal(core.isSafeAnimalImageUrl('/images/animals/../../secret.png'), false);
    assert.equal(core.isSafeAnimalImageUrl('/images/animals/yak.png?v=wrong'), false);
    assert.equal(core.isSafeAnimalImageUrl('/images/animals/yak.png?v=bdcc998cd5a2'), true);

    const html = core.buildAnimalPicture({ name: 'Unknown', image: 'javascript:alert(1)' });
    assert.doesNotMatch(html, /<picture>/);
    assert.doesNotMatch(html, /javascript:/);
    assert.match(html, /data:image\/svg\+xml/);

    const missingDimensions = core.buildAnimalPicture({
        ...activeAnimal,
        imageSet: { ...activeAnimal.imageSet, width: 0 }
    });
    assert.doesNotMatch(missingDimensions, /<picture/);
});

test('existing image elements receive responsive WebP candidates and safe fallback behavior', () => {
    const core = loadCoreUtils();
    let removedSources = 0;
    const removedAttributes = [];
    const image = {
        style: { removeProperty() {} },
        parentElement: {
            tagName: 'PICTURE',
            querySelectorAll() {
                return [{ remove() { removedSources += 1; } }, { remove() { removedSources += 1; } }];
            }
        },
        removeAttribute(name) { removedAttributes.push(name); }
    };

    core.applyResponsiveAnimalImage(image, activeAnimal, '320px');
    assert.equal(image.src, activeAnimal.imageSet.fallback);
    assert.match(image.srcset, /\.webp 320w/);
    assert.equal(image.sizes, '320px');
    assert.equal(image.width, 960);
    image.onerror();
    assert.equal(image.src, core.FALLBACK_IMAGE);
    assert.equal(removedSources, 2);
    assert.deepEqual(removedAttributes, ['srcset', 'sizes', 'data-subject-fit']);
});

test('animal cache revision changes with the responsive response contract', () => {
    const source = fs.readFileSync(path.join(__dirname, '../js/main.js'), 'utf8');
    assert.match(source, /abs_animals_cache_v2/);
    assert.doesNotMatch(source, /abs_animals_cache_v1/);
});
