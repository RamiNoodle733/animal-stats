'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

test('compare intro overlay is inert unless explicitly active', () => {
    const css = read('css/components/match-intro.css');
    const router = read('js/router.js');

    assert.match(css, /\.match-intro-overlay\s*\{[\s\S]*?display:\s*none;/);
    assert.match(css, /\.match-intro-overlay\s*\{[\s\S]*?pointer-events:\s*none;/);
    assert.match(css, /\.match-intro-overlay\.active\s*\{[\s\S]*?display:\s*flex;/);
    assert.match(css, /\.match-intro-overlay\.active\s*\{[\s\S]*?pointer-events:\s*auto;/);
    assert.match(router, /css\/components\/match-intro\.css/);
});

test('compare animals retain useful desktop and mobile display sizes', () => {
    const css = read('css/pages/compare.css');
    const compare = read('js/compare.js');
    const main = read('js/main.js');

    assert.match(css, /width:\s*clamp\(260px,\s*38vh,\s*420px\)/);
    assert.match(css, /#compare-view:not\(\.active-view\)\s*\{\s*display:\s*none;/);
    assert.match(css, /#compare-view \.fighter-display\s*\{[\s\S]*?width:\s*124px !important;/);
    assert.match(css, /#compare-view \.fighter-image\s*\{[\s\S]*?max-width:\s*120px !important;/);
    assert.match(css, /\.fighter-image\[data-subject-fit="true"\]/);
    assert.match(css, /width:\s*var\(--compare-subject-width\)/);
    assert.match(compare, /animal-image-dimensions\.json/);
    assert.match(compare, /applyFighterSubjectFit\(side, animal\)/);
    assert.match(compare, /window\.app\.dom\.fightBtn = fightBtn;/);
    assert.match(compare, /fightBtn\.addEventListener\('click', window\.app\.startFight\);/);
    assert.match(main, /updateFightButton\(\)\s*\{\s*if \(!this\.dom\.fightBtn\) return;/);
});

test('Compare honors reduced motion without removing its static design', () => {
    const css = read('css/pages/compare.css');
    assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/);
    assert.match(css, /#compare-view \.fighter-section:hover[\s\S]*?transform:\s*none !important/);
});

test('animal search does not advertise itself as a credential field', () => {
    const html = read('index.html');
    const main = read('js/main.js');
    const search = html.match(/<input[^>]+id="search-input"[^>]*>/)?.[0] || '';

    assert.match(search, /name="animal-query"/);
    assert.match(search, /autocomplete="off"/);
    assert.doesNotMatch(search, /autocomplete="(?:new-password|username|current-password)"/);
    assert.match(main, /input\.matches\(':-webkit-autofill'\)/);
    assert.match(main, /savedIdentity/);
    assert.match(main, /this\._animalSearchUserInteracted/);
});

test('inactive SPA routes cannot leak into the active page layout', () => {
    const css = read('css/legacy.css');
    assert.match(css, /\.view-container:not\(\.active-view\)\s*\{\s*display:\s*none !important;/);
});

test('Stats navigation remains in the original interactive application', () => {
    const router = read('js/router.js');

    assert.doesNotMatch(router, /normalizedUrl === '\/stats' \|\| normalizedUrl\.startsWith\('\/stats\/'\)/);
    assert.doesNotMatch(router, /link\.pathname === '\/stats' \|\| link\.pathname\.startsWith\('\/stats\/'\)/);
});
