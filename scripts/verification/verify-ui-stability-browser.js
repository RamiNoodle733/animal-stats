#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = (process.argv[2] || 'http://127.0.0.1:3000').replace(/\/$/, '');
const screenshotDir = path.resolve(__dirname, '..', '..', '.cache', 'browser-verification');
const browserExecutable = process.env.ABS_BROWSER_EXECUTABLE || [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
].find((candidate) => fs.existsSync(candidate));

async function inspect(viewport) {
    const label = `${viewport.width}x${viewport.height}`;
    const browser = await chromium.launch({
        headless: true,
        ...(browserExecutable ? { executablePath: browserExecutable } : {})
    });
    const page = await browser.newPage({ viewport });
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    try {
        await page.goto(`${baseUrl}/compare?animal=saltwater-crocodile`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForFunction(() => window.app?.state?.animals?.length > 100, null, { timeout: 30000 });
        await page.waitForSelector('#matchupIntroOverlay', { state: 'attached', timeout: 10000 });
        await page.waitForFunction(() => window.app?.state?.compare?.left?.name === 'Saltwater Crocodile');

        const querySelected = await page.evaluate(() => window.app.state.compare.left.name);

        const inactiveOverlay = await page.locator('#matchupIntroOverlay').evaluate((overlay) => ({
            display: getComputedStyle(overlay).display,
            pointerEvents: getComputedStyle(overlay).pointerEvents,
            active: overlay.classList.contains('active')
        }));

        if (inactiveOverlay.display !== 'none' || inactiveOverlay.pointerEvents !== 'none' || inactiveOverlay.active) {
            throw new Error(`${label}: inactive Compare intro is not inert: ${JSON.stringify(inactiveOverlay)}`);
        }

        const autofillCleanup = await page.evaluate(() => {
            const input = document.getElementById('search-input');
            const originalMatches = input.matches.bind(input);
            const originalUser = window.Auth.user;
            input.value = 'SavedUsername';
            input.matches = (selector) => selector === ':-webkit-autofill';
            const cleared = window.app.clearAutofilledAnimalSearch();
            window.Auth.user = { username: 'SavedUsername', displayName: 'Saved Username' };
            window.app._animalSearchUserInteracted = false;
            input.value = 'SavedUsername';
            input.matches = () => false;
            const identityCleared = window.app.clearAutofilledAnimalSearch();
            window.app._animalSearchUserInteracted = true;
            input.value = 'SavedUsername';
            const manualPreserved = !window.app.clearAutofilledAnimalSearch() && input.value === 'SavedUsername';
            input.value = 'Yak';
            input.matches = () => false;
            const preserved = !window.app.clearAutofilledAnimalSearch() && input.value === 'Yak';
            input.matches = originalMatches;
            input.value = '';
            window.Auth.user = originalUser;
            window.app._animalSearchUserInteracted = false;
            return { cleared, identityCleared, manualPreserved, preserved };
        });
        if (!autofillCleanup.cleared || !autofillCleanup.identityCleared
            || !autofillCleanup.manualPreserved || !autofillCleanup.preserved) {
            throw new Error(`${label}: animal search autofill guard failed: ${JSON.stringify(autofillCleanup)}`);
        }

        await page.evaluate(() => {
            const left = window.app.state.animals.find((animal) => animal.name === 'Saltwater Crocodile');
            const right = window.app.state.animals.find((animal) => animal.name === 'Hippopotamus');
            if (!left || !right) throw new Error('Browser fixture animals are unavailable');
            window.app.setSelectingSide('left');
            window.app.selectFighter(left);
            window.app.selectFighter(right);
        });
        await page.waitForFunction(() => {
            const images = [...document.querySelectorAll('#compare-view .fighter-image')];
            return images.length === 2 && images.every((image) => (
                image.complete
                && getComputedStyle(image).display !== 'none'
                && image.dataset.subjectFit === 'true'
            ));
        }, null, { timeout: 10000 });

        const fighterFits = await page.locator('#compare-view .fighter-image').evaluateAll((images) => (
            images.map((image) => {
                const bounds = image.getBoundingClientRect();
                const display = image.closest('.fighter-display').getBoundingClientRect();
                const animal = image.id === 'animal-1-image'
                    ? window.app.state.compare.left
                    : window.app.state.compare.right;
                const asset = String(animal.imageSet?.fallback || animal.image || '').split(/[?#]/, 1)[0];
                const entry = window.ComparePageEnhancements.imageSubjects[asset];
                const scale = bounds.width / entry.width;
                const visibleWidth = entry.subject.width * scale;
                const visibleHeight = entry.subject.height * scale;
                return {
                    image: { width: bounds.width, height: bounds.height },
                    display: { width: display.width, height: display.height },
                    visible: { width: visibleWidth, height: visibleHeight },
                    occupancy: Math.max(visibleWidth / display.width, visibleHeight / display.height)
                };
            })
        ));
        if (fighterFits.some(({ occupancy }) => occupancy < 0.86 || occupancy > 0.94)) {
            throw new Error(`${label}: visible Compare animals do not fill their frames: ${JSON.stringify(fighterFits)}`);
        }

        await page.screenshot({ path: path.join(screenshotDir, `compare-stable-${label}.png`) });

        await page.locator('#fight-btn').click({ timeout: 5000 });
        await page.waitForFunction(() => document.getElementById('matchupIntroOverlay')?.classList.contains('active'));
        await page.evaluate(() => {
            window.ComparePageEnhancements._pendingResult = null;
            window.ComparePageEnhancements.skipIntro();
        });
        await page.waitForFunction(() => !document.getElementById('matchupIntroOverlay')?.classList.contains('active'));

        await page.evaluate(() => window.Router.navigate('/stats'));
        await page.waitForFunction(() => window.location.pathname === '/stats' && document.querySelector('#stats-view.active-view'));
        await page.locator('#toggle-grid-btn').click({ timeout: 5000 });

        const statsState = await page.evaluate(() => {
            const overlay = document.getElementById('matchupIntroOverlay');
            const visibleViews = [...document.querySelectorAll('.view-container')]
                .filter((view) => getComputedStyle(view).display !== 'none')
                .map((view) => view.id);
            return {
                path: location.pathname,
                gridHidden: document.querySelector('.character-grid-container')?.classList.contains('hidden'),
                visibleViews,
                overlayDisplay: overlay ? getComputedStyle(overlay).display : null,
                overlayPointerEvents: overlay ? getComputedStyle(overlay).pointerEvents : null
            };
        });

        if (!statsState.gridHidden || statsState.visibleViews.some((id) => id === 'compare-view')) {
            throw new Error(`${label}: Compare content leaked into Stats: ${JSON.stringify(statsState)}`);
        }
        if (statsState.overlayDisplay !== 'none' || statsState.overlayPointerEvents !== 'none') {
            throw new Error(`${label}: Compare overlay remained active in Stats: ${JSON.stringify(statsState)}`);
        }

        await page.screenshot({ path: path.join(screenshotDir, `stats-after-compare-${label}.png`) });
        if (pageErrors.length) throw new Error(`${label}: page errors: ${JSON.stringify(pageErrors)}`);

        return { label, querySelected, inactiveOverlay, autofillCleanup, fighterFits, statsState };
    } finally {
        await browser.close();
    }
}

async function main() {
    fs.mkdirSync(screenshotDir, { recursive: true });
    const checks = [];
    checks.push(await inspect({ width: 1440, height: 1000 }));
    checks.push(await inspect({ width: 1366, height: 768 }));
    checks.push(await inspect({ width: 390, height: 844 }));
    console.log(JSON.stringify({ success: true, baseUrl, checks }, null, 2));
}

main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
});
