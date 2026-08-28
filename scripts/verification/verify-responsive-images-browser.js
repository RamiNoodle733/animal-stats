#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = (process.argv[2] || 'http://127.0.0.1:4173').replace(/\/$/, '');
const screenshotDir = path.resolve(__dirname, '..', '..', '.cache', 'browser-verification');
const browserExecutable = process.env.ABS_BROWSER_EXECUTABLE || [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
].find((candidate) => fs.existsSync(candidate));

async function inspectPage(page, route, viewport) {
    const consoleErrors = [];
    const pageErrors = [];
    const httpErrors = [];
    page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('response', (response) => {
        if (response.status() >= 400) httpErrors.push({ status: response.status(), url: response.url() });
    });

    await page.setViewportSize(viewport);
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#character-grid .character-card', { timeout: 30000 });
    await page.locator('#search-input').fill('Yak');
    await page.waitForFunction(() => (
        window.app?.state?.filters?.search === 'yak'
        && document.querySelectorAll('#character-grid .character-card').length > 0
    ), null, { timeout: 10000 });

    const yakCard = page.locator('#character-grid .character-card').filter({ hasText: 'Yak' }).first();
    await yakCard.waitFor({ state: 'visible', timeout: 10000 });
    await yakCard.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => {
        const image = [...document.querySelectorAll('#character-grid .character-card')]
            .find((card) => card.textContent.includes('Yak'))
            ?.querySelector('img.character-card-image');
        return Boolean(image?.complete && image.currentSrc);
    }, null, { timeout: 10000 });
    const result = await yakCard.evaluate((card) => {
        const picture = card.querySelector('picture.responsive-animal-picture');
        const image = card.querySelector('img.character-card-image');
        const overlay = document.querySelector('[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay');
        const bounds = image?.getBoundingClientRect();
        return {
            bodyTextLength: document.body.innerText.trim().length,
            hasOverlay: Boolean(overlay),
            hasPicture: Boolean(picture),
            pictureDisplay: picture ? getComputedStyle(picture).display : null,
            imageWidth: bounds?.width || 0,
            imageHeight: bounds?.height || 0,
            currentSrc: image?.currentSrc || '',
            hasAvifSource: Boolean(picture?.querySelector('source[type="image/avif"]')),
            hasWebpSource: Boolean(picture?.querySelector('source[type="image/webp"]'))
        };
    });

    const label = `${viewport.width}x${viewport.height}`;
    await page.screenshot({ path: path.join(screenshotDir, `responsive-images-${label}.png`), fullPage: false });

    if (result.bodyTextLength < 100 || result.hasOverlay || !result.hasPicture) {
        throw new Error(`${label}: page content or responsive picture failed: ${JSON.stringify(result)}`);
    }
    if (result.pictureDisplay !== 'contents' || result.imageWidth <= 0 || result.imageHeight <= 0) {
        throw new Error(`${label}: responsive picture changed layout: ${JSON.stringify(result)}`);
    }
    if (!result.hasAvifSource || !result.hasWebpSource || !/\.(?:avif|webp)(?:\?|$)/.test(result.currentSrc)) {
        throw new Error(`${label}: optimized image format was not selected: ${JSON.stringify(result)}`);
    }
    const unexpectedHttpErrors = httpErrors.filter(({ status, url }) => (
        status !== 401 || !/\/api\/(?:auth|profile)(?:\?|$)/.test(url)
    ));
    const unexpectedConsoleErrors = consoleErrors.filter((message) => (
        !(
            message === 'Failed to load resource: the server responded with a status of 401 (Unauthorized)'
            && unexpectedHttpErrors.length === 0
        )
        // Chart.js is an optional, lazy Community dependency. A blocked public CDN
        // must not turn the unrelated Stats image-layout check into a false failure.
        && !/Failed to load script: https:\/\/cdn\.jsdelivr\.net\/npm\/chart\.js/.test(message)
        && message !== 'Failed to load resource: net::ERR_CONNECTION_CLOSED'
        && message !== 'Failed to load resource: net::ERR_CONNECTION_RESET'
    ));
    if (unexpectedConsoleErrors.length || pageErrors.length || unexpectedHttpErrors.length) {
        throw new Error(`${label}: browser errors: ${JSON.stringify({ consoleErrors, pageErrors, httpErrors })}`);
    }

    return { label, ...result, expectedUnauthenticatedResponses: httpErrors.length };
}

async function main() {
    fs.mkdirSync(screenshotDir, { recursive: true });
    const browser = await chromium.launch({
        headless: true,
        ...(browserExecutable ? { executablePath: browserExecutable } : {})
    });
    try {
        const desktop = await inspectPage(await browser.newPage(), '/stats', { width: 1440, height: 1000 });
        const mobile = await inspectPage(await browser.newPage(), '/stats', { width: 390, height: 844 });
        console.log(JSON.stringify({ success: true, baseUrl, checks: [desktop, mobile] }, null, 2));
    } finally {
        await browser.close();
    }
}

main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
});
