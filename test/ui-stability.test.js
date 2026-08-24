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

    assert.match(css, /width:\s*clamp\(210px,\s*30vh,\s*320px\)/);
    assert.match(css, /#compare-view:not\(\.active-view\)\s*\{\s*display:\s*none;/);
    assert.match(css, /#compare-view \.fighter-display\s*\{[\s\S]*?width:\s*124px !important;/);
    assert.match(css, /#compare-view \.fighter-image\s*\{[\s\S]*?max-width:\s*120px !important;/);
    assert.match(compare, /window\.app\.dom\.fightBtn = fightBtn;/);
    assert.match(compare, /fightBtn\.addEventListener\('click', window\.app\.startFight\);/);
    assert.match(main, /updateFightButton\(\)\s*\{\s*if \(!this\.dom\.fightBtn\) return;/);
});

test('animal search does not advertise itself as a credential field', () => {
    const html = read('index.html');
    const main = read('js/main.js');
    const search = html.match(/<input[^>]+id="search-input"[^>]*>/)?.[0] || '';

    assert.match(search, /name="animal-query"/);
    assert.match(search, /autocomplete="off"/);
    assert.doesNotMatch(search, /autocomplete="(?:new-password|username|current-password)"/);
    assert.match(main, /input\.matches\(':-webkit-autofill'\)/);
    assert.match(main, /if \(!isAutofilled\) return false;/);
});
