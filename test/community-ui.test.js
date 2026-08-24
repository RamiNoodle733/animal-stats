'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

test('Community centers location analytics and conversations without the Daily Matchup', () => {
    const html = read('index.html');

    assert.match(html, /class="community-overview"/);
    assert.match(html, />Community Activity Map</);
    assert.match(html, /class="community-tab-bar" role="tablist"/);
    assert.match(html, /data-tab="map" role="tab" aria-selected="true"/);
    assert.match(html, /data-tab="feed" role="tab" aria-selected="false"/);
    assert.match(html, /data-tab="chat" role="tab" aria-selected="false"/);
    assert.match(html, /Comments &amp; Activity/);
    assert.match(html, /> COMMUNITY TOTALS</);
    assert.doesNotMatch(html, /DAILY MATCHUP/);
    assert.doesNotMatch(html, /data-tab="hub"/);
    assert.doesNotMatch(html, /id="leaderboard-list"/);
    assert.match(html, /id="globe-open-map-btn"/);
    assert.match(html, /id="community-channel-title"/);
    assert.match(html, /id="community-channel-description"/);
});

test('Community route state keeps tabs, channel labels, and responsive images synchronized', () => {
    const manager = read('js/community-manager.js');

    assert.match(manager, /tab\.setAttribute\('aria-selected', String\(isActive\)\)/);
    assert.match(manager, /classList\.toggle\('map-tab-active', normalizedTab === 'map'\)/);
    assert.match(manager, /if \(rawTab === 'hub'\) return 'map'/);
    assert.match(manager, /title: 'Animal & Matchup Discussion'/);
    assert.match(manager, /title: 'Community Conversations'/);
    assert.doesNotMatch(manager, /this\.loadDailyMatchup\(\)/);
    assert.doesNotMatch(manager, /this\.startMatchupCountdown\(\)/);
    assert.doesNotMatch(manager, /this\.loadLeaderboard\(\)/);
});

test('Community route CSS loads after legacy mobile overrides and preserves isolated mobile surfaces', () => {
    const router = read('js/router.js');
    const css = read('css/pages/community-v2.css');

    assert.match(router, /stylesAfterMobile:\s*\[versionedAsset\('\/css\/pages\/community-v2\.css'\)\]/);
    assert.match(router, /mobileOverrides\.after\(link\)/);
    assert.match(css, /grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\) !important/);
    assert.match(css, /#community-view \.community-tab-btn\.active\s*\{[\s\S]*?background:[^;]+!important/);
    assert.match(css, /#community-view \.community-sidebar-column\.mobile-sidebar-active,[\s\S]*?position:\s*static !important/);
});
