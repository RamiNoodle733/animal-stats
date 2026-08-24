'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

test('Community exposes a semantic command-center navigation shell', () => {
    const html = read('index.html');

    assert.match(html, /class="community-overview"/);
    assert.match(html, />Community Command Center</);
    assert.match(html, /class="community-tab-bar" role="tablist"/);
    assert.match(html, /data-tab="chat" role="tab" aria-selected="true"/);
    assert.match(html, /data-tab="feed" role="tab" aria-selected="false"/);
    assert.match(html, /data-tab="map" role="tab" aria-selected="false"/);
    assert.match(html, /data-tab="hub" role="tab" aria-selected="false"/);
    assert.match(html, /id="globe-open-map-btn"/);
    assert.match(html, /id="community-channel-title"/);
    assert.match(html, /id="community-channel-description"/);
});

test('Community route state keeps tabs, channel labels, and responsive images synchronized', () => {
    const manager = read('js/community-manager.js');

    assert.match(manager, /tab\.setAttribute\('aria-selected', String\(isActive\)\)/);
    assert.match(manager, /classList\.toggle\('map-tab-active', normalizedTab === 'map'\)/);
    assert.match(manager, /classList\.toggle\('hub-tab-active', normalizedTab === 'hub'\)/);
    assert.match(manager, /title: 'Battle Discussion'/);
    assert.match(manager, /title: 'Arena Activity'/);
    assert.match(manager, /CoreUtils\.applyResponsiveAnimalImage/);
    assert.match(manager, /\(max-width: 480px\) 35vw, 130px/);
});

test('Community route CSS loads after legacy mobile overrides and preserves isolated mobile surfaces', () => {
    const router = read('js/router.js');
    const css = read('css/pages/community-v2.css');

    assert.match(router, /stylesAfterMobile:\s*\[versionedAsset\('\/css\/pages\/community-v2\.css'\)\]/);
    assert.match(router, /mobileOverrides\.after\(link\)/);
    assert.match(css, /grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\) !important/);
    assert.match(css, /#community-view \.community-tab-btn\.active\s*\{[\s\S]*?background:[^;]+!important/);
    assert.match(css, /#community-view\.map-tab-active \.hub-only-module,[\s\S]*?#community-view\.hub-tab-active \.map-primary-module\s*\{\s*display:\s*none !important/);
    assert.match(css, /#community-view \.community-sidebar-column\.mobile-sidebar-active,[\s\S]*?position:\s*static !important/);
});
