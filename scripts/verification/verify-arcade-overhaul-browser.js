#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = (process.argv[2] || 'http://127.0.0.1:3000').replace(/\/$/, '');
const screenshotDir = path.resolve(__dirname, '..', '..', '.cache', 'browser-verification', 'arcade-v2.10.0');
const browserExecutable = process.env.ABS_BROWSER_EXECUTABLE || [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
].find((candidate) => fs.existsSync(candidate));

const viewports = [
    { width: 1440, height: 1000 },
    { width: 1366, height: 768 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 320, height: 568 }
];

function assert(condition, message, details = null) {
    if (!condition) throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
}

async function waitForApp(page) {
    await page.waitForFunction(() => (
        window.app
        && document.getElementById('app-loading-screen')?.classList.contains('hidden')
    ), null, { timeout: 30000 });
}

async function inspectRoute(page, route, expected) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForApp(page);
    if (expected) {
        await page.waitForFunction((selector) => {
            const element = document.querySelector(selector);
            return element && getComputedStyle(element).display !== 'none';
        }, expected, { timeout: 30000 });
    }
    return page.evaluate(() => ({
        path: location.pathname,
        overflow: document.documentElement.scrollWidth - innerWidth,
        pageScroll: document.documentElement.scrollHeight - innerHeight,
        visibleViews: [...document.querySelectorAll('.view-container')]
            .filter((element) => getComputedStyle(element).display !== 'none')
            .map((element) => element.id)
    }));
}

async function inspectViewport(browser, viewport) {
    const label = `${viewport.width}x${viewport.height}`;
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(`${page.url()}: ${error.message}`));
    await page.addInitScript(() => localStorage.removeItem('abs_audio_prefs'));

    try {
        const home = await inspectRoute(page, '/', '#home-view.active-view');
        const homeState = await page.evaluate(() => {
            const tournament = document.getElementById('portal-tournament-btn');
            const nav = document.getElementById('portal-nav');
            return {
                tournamentFirst: Boolean(tournament && nav && (tournament.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING)),
                tournamentLabel: tournament?.textContent.trim(),
                audioDownloaded: Boolean(document.querySelector('script[data-audio-manager]'))
            };
        });
        assert(home.overflow <= 1 && home.pageScroll <= 1 && homeState.tournamentFirst && /PLAY TOURNAMENT/.test(homeState.tournamentLabel), `${label} home title screen failed`, { home, homeState });
        assert(!homeState.audioDownloaded, `${label} first-time muted sound loaded eagerly`, homeState);

        const community = await inspectRoute(page, '/community/map', '#community-view.active-view');
        const communityState = await page.evaluate(() => ({
            removedCopyPresent: /FIELD NETWORK|Network online|COMMAND CENTER|\bHUD\b/.test(document.getElementById('community-view')?.innerText || ''),
            metrics: document.querySelectorAll('.globe-totals-grid .globe-total-card').length,
            drawerClosed: !document.getElementById('community-more-stats')?.open,
            privacyVisible: document.querySelector('.community-privacy-note')?.getBoundingClientRect().height > 0,
            chartLoaded: Boolean(document.querySelector('script[data-community-charts]'))
        }));
        assert(community.overflow <= 1 && community.pageScroll <= 1 && !communityState.removedCopyPresent && communityState.metrics === 4
            && communityState.drawerClosed && communityState.privacyVisible && !communityState.chartLoaded,
        `${label} Community map hierarchy failed`, { community, communityState });

        const stats = await inspectRoute(page, '/stats', '#stats-view.active-view');
        await page.locator('#toggle-grid-btn').click();
        const statsState = await page.evaluate(() => ({
            gridHidden: document.querySelector('.character-grid-container')?.classList.contains('hidden'),
            compareVisible: getComputedStyle(document.getElementById('compare-view')).display !== 'none',
            statCount: document.querySelectorAll('#stats-view .stat-row, #stats-view .stat-bar-container').length
        }));
        assert(stats.overflow <= 1 && stats.pageScroll <= 1 && statsState.gridHidden && !statsState.compareVisible && statsState.statCount >= 6, `${label} Stats composition failed`, { stats, statsState });

        const compare = await inspectRoute(page, '/compare', '#compare-view.active-view');
        const compareState = await page.evaluate(() => {
            const button = document.getElementById('fight-btn');
            const sound = document.getElementById('audio-toggle-btn-mobile');
            const buttonBounds = button?.getBoundingClientRect();
            const soundBounds = sound?.getBoundingClientRect();
            return {
                label: button?.textContent.trim(),
                disabled: button?.disabled,
                fightWidth: buttonBounds?.width,
                fightHeight: buttonBounds?.height,
                soundWidth: soundBounds?.width,
                soundHeight: soundBounds?.height,
                soundPressed: sound?.getAttribute('aria-pressed')
            };
        });
        assert(compare.overflow <= 1 && compare.pageScroll <= 1 && compareState.disabled && /SELECT 2 ANIMALS/.test(compareState.label), `${label} Compare disabled action failed`, { compare, compareState });
        if (viewport.width <= 640) {
            assert(compareState.fightWidth >= viewport.width - 24 && compareState.fightHeight >= 52, `${label} mobile Fight dock is not prominent`, compareState);
            assert(compareState.soundWidth >= 44 && compareState.soundHeight >= 44 && compareState.soundPressed === 'false', `${label} mobile sound control failed`, compareState);
        } else {
            assert(compareState.fightWidth >= 180 && compareState.fightWidth <= 225 && compareState.fightHeight >= 52, `${label} desktop Fight control failed`, compareState);
        }

        const rankings = await inspectRoute(page, '/rankings', '#rankings-view.active-view');
        const rankingsState = await page.evaluate(() => ({
            hero: document.querySelector('.rankings-hero-banner')?.getBoundingClientRect().height,
            playLabel: document.getElementById('hero-tournament-btn')?.textContent.trim(),
            searchVisible: [...document.querySelectorAll('#rankings-view #rankings-search, #rankings-view #rankings-search-mobile')]
                .some((input) => input.getBoundingClientRect().height > 0)
        }));
        assert(rankings.overflow <= 1 && rankings.pageScroll <= 1 && rankingsState.hero > 70 && rankingsState.searchVisible
            && /PLAY TOURNAMENT/.test(rankingsState.playLabel), `${label} Rankings game hub failed`, { rankings, rankingsState });

        if (viewport.width === 1440) {
            await page.waitForSelector('#rankings-list .ranking-row', { timeout: 30000 });
            const rankingInteraction = await page.evaluate(() => {
                const row = document.querySelector('#rankings-list .ranking-row');
                const name = row?.querySelector('.row-animal-name')?.textContent?.trim() || '';
                const search = [...document.querySelectorAll('#rankings-search, #rankings-search-mobile')]
                    .find((input) => input.getBoundingClientRect().height > 0);
                search.value = name;
                search.dispatchEvent(new Event('input', { bubbles: true }));
                return { name, visibleRows: [...document.querySelectorAll('#rankings-list .ranking-row')]
                    .filter((item) => getComputedStyle(item).display !== 'none').length };
            });
            assert(rankingInteraction.name && rankingInteraction.visibleRows === 1,
                `${label} Rankings search failed`, rankingInteraction);
            await page.locator('#rankings-list .ranking-row .row-vote-btn').first().click();
            await page.waitForFunction(() => location.pathname === '/login'
                && getComputedStyle(document.getElementById('login-view')).display !== 'none');
        }

        if (viewport.width === 1440) await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto(`${baseUrl}/tournament`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await waitForApp(page);
        await page.waitForFunction(() => document.getElementById('tournament-modal')?.classList.contains('show'));
        const tournamentState = await page.evaluate(() => ({
            setupVisible: getComputedStyle(document.getElementById('tournament-setup')).display !== 'none',
            sizes: document.querySelectorAll('.t-size-btn, .t-bracket-card').length,
            overflow: document.documentElement.scrollWidth - innerWidth,
            pageScroll: document.documentElement.scrollHeight - innerHeight
        }));
        assert(tournamentState.setupVisible && tournamentState.sizes >= 3 && tournamentState.overflow <= 1
            && tournamentState.pageScroll <= 1, `${label} Tournament setup failed`, tournamentState);

        if (viewport.width === 1440) {
            await page.locator('.t-bracket-card[data-size="8"]').click();
            assert(!(await page.locator('#start-tournament-btn').isDisabled()), `${label} Tournament start did not enable`);
            await page.locator('#start-tournament-btn').click();
            for (let match = 0; match < 7; match += 1) {
                await page.waitForFunction(() => window.tournamentManager?.isMatchReady === true
                    && window.tournamentManager?.isVotingLocked === false, null, { timeout: 10000 });
                const previous = await page.evaluate(() => window.tournamentManager.completedMatches);
                await page.locator('#tournament-fighter-1').click();
                await page.waitForFunction((completed) => (
                    window.tournamentManager?.completedMatches > completed
                    || getComputedStyle(document.getElementById('tournament-results')).display !== 'none'
                ), previous, { timeout: 10000 });
            }
            await page.waitForFunction(() => getComputedStyle(document.getElementById('tournament-results')).display !== 'none', null, { timeout: 10000 });
            const result = await page.evaluate(() => ({
                champion: document.getElementById('champion-name')?.textContent?.trim(),
                matches: document.getElementById('result-matches')?.textContent?.trim(),
                bracket: document.getElementById('result-bracket')?.textContent?.trim()
            }));
            assert(result.champion && result.matches === '7' && result.bracket === '8', `${label} Tournament completion failed`, result);
            tournamentState.completed = result;
            await page.emulateMedia({ reducedMotion: 'no-preference' });
        }

        const login = await inspectRoute(page, '/login', '#login-view');
        const signup = await inspectRoute(page, '/signup', '#signup-view');
        await page.goto(`${baseUrl}/about`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        const about = await page.evaluate(() => ({
            title: document.querySelector('h1')?.textContent,
            overflow: document.documentElement.scrollWidth - innerWidth
        }));
        await page.goto(`${baseUrl}/profile`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await waitForApp(page);
        await page.waitForFunction(() => location.pathname === '/login' && getComputedStyle(document.getElementById('login-view')).display !== 'none');
        const profileRedirect = await page.evaluate(() => ({ path: location.pathname, overflow: document.documentElement.scrollWidth - innerWidth }));
        const battlepoints = await inspectRoute(page, '/battlepoints', '#battlepoints-view.active-view');
        const battlepointsState = await page.evaluate(() => ({
            text: document.querySelector('.bp-unavailable-content')?.innerText,
            fakePacks: document.querySelectorAll('.bp-packs-preview').length
        }));
        assert(login.overflow <= 1 && signup.overflow <= 1 && /rules behind the ratings|About Animal Battle Stats/i.test(about.title) && about.overflow <= 1 && profileRedirect.path === '/login'
            && profileRedirect.overflow <= 1 && battlepoints.overflow <= 1
            && /Coming later/i.test(battlepointsState.text) && battlepointsState.fakePacks === 0,
        `${label} supporting route surfaces failed`, { login, signup, about, profileRedirect, battlepoints, battlepointsState });

        await page.goto(`${baseUrl}/stats/african-elephant`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForFunction(() => {
            const image = document.querySelector('.animal-picture img');
            return image && getComputedStyle(image).objectFit === 'contain'
                && image.getBoundingClientRect().width <= innerWidth;
        }, null, { timeout: 10000 });
        const staticState = await page.evaluate(() => ({
            title: document.querySelector('h1')?.textContent,
            picture: document.querySelector('.animal-picture img')?.getBoundingClientRect().height,
            overflow: document.documentElement.scrollWidth - innerWidth
        }));
        assert(/African Elephant/i.test(staticState.title) && staticState.picture > 150 && staticState.overflow <= 1, `${label} static animal page failed`, staticState);

        if (viewport.width === 1440 || viewport.width === 390) {
            for (const [route, name] of [['/', 'home'], ['/rankings', 'rankings'], ['/tournament', 'tournament'], ['/community/map', 'community-map']]) {
                await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
                await page.waitForTimeout(350);
                await page.screenshot({ path: path.join(screenshotDir, `${name}-${label}.png`), fullPage: false });
            }
        }

        assert(pageErrors.length === 0, `${label} browser errors`, pageErrors);
        return { label, homeState, communityState, statsState, compareState, rankingsState, tournamentState, battlepointsState, staticState };
    } finally {
        await context.close();
    }
}

async function verifySavedAudioPreference(browser) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    try {
        await page.addInitScript(() => localStorage.setItem('abs_audio_prefs', JSON.stringify({ enabled: true, volume: 0.35 })));
        await page.goto(`${baseUrl}/compare`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await waitForApp(page);
        await page.waitForSelector('script[data-audio-manager]', { state: 'attached', timeout: 10000 });
        await page.waitForFunction(() => document.getElementById('audio-toggle-btn-mobile')?.getAttribute('aria-pressed') === 'true');
        const state = await page.evaluate(() => ({
            pressed: document.getElementById('audio-toggle-btn-mobile')?.getAttribute('aria-pressed'),
            label: document.getElementById('audio-toggle-btn-mobile')?.getAttribute('aria-label'),
            enabled: window.AudioManager?.isEnabled()
        }));
        assert(state.pressed === 'true' && state.enabled === true && /Disable|Mute/.test(state.label), 'Saved audio preference failed', state);
        return state;
    } finally {
        await context.close();
    }
}

async function main() {
    fs.mkdirSync(screenshotDir, { recursive: true });
    const browser = await chromium.launch({
        headless: true,
        ...(browserExecutable ? { executablePath: browserExecutable } : {})
    });
    try {
        const checks = [];
        for (const viewport of viewports) checks.push(await inspectViewport(browser, viewport));
        const savedAudio = await verifySavedAudioPreference(browser);
        console.log(JSON.stringify({ success: true, baseUrl, savedAudio, checks }, null, 2));
    } finally {
        await browser.close();
    }
}

main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
});
