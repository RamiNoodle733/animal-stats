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

function assert(condition, message, details) {
    if (!condition) throw new Error(`${message}: ${JSON.stringify(details)}`);
}

async function openCommunity(page) {
    await page.goto(`${baseUrl}/community/chat`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => (
        window.communityManager
        && document.querySelector('#community-view.active-view')
        && document.querySelectorAll('.community-tab-btn').length === 3
    ), null, { timeout: 30000 });
    await page.waitForFunction(() => (
        !document.querySelector('#feed-posts-container .feed-loading-indicator')
        && !document.querySelector('#feed-posts-container .feed-skeleton-card')
    ), null, { timeout: 30000 }).catch(() => {});
}

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
        await openCommunity(page);
        const chat = await page.evaluate(() => {
            const bar = document.querySelector('.community-tab-bar');
            const barBounds = bar.getBoundingClientRect();
            const tabs = [...bar.querySelectorAll('.community-tab-btn')].map((tab) => {
                const bounds = tab.getBoundingClientRect();
                return {
                    tab: tab.dataset.tab,
                    left: Math.round(bounds.left),
                    right: Math.round(bounds.right),
                    width: Math.round(bounds.width),
                    visible: bounds.width > 0 && bounds.height > 0,
                    selected: tab.getAttribute('aria-selected')
                };
            });
            const sidebar = document.querySelector('.community-sidebar-column').getBoundingClientRect();
            const feed = document.querySelector('.community-feed-column').getBoundingClientRect();
            const links = [...document.querySelectorAll('link[rel="stylesheet"]')].map((link) => link.href);
            return {
                path: location.pathname,
                title: document.getElementById('community-channel-title')?.textContent,
                overviewVisible: document.querySelector('.community-overview')?.getBoundingClientRect().height > 0,
                bar: { left: Math.round(barBounds.left), right: Math.round(barBounds.right) },
                tabs,
                sidebar: { left: sidebar.left, right: sidebar.right, width: sidebar.width },
                feed: { left: feed.left, right: feed.right, width: feed.width },
                bodyOverflow: document.documentElement.scrollWidth - innerWidth,
                mobileStylesIndex: links.findIndex((href) => href.includes('/css/mobile.css')),
                communityV2Index: links.findIndex((href) => href.includes('/css/pages/community-v2.css'))
            };
        });

        assert(chat.path === '/community/chat', `${label} did not open chat`, chat);
        assert(chat.overviewVisible && chat.title === 'Animal & Matchup Discussion', `${label} Community heading failed`, chat);
        assert(chat.communityV2Index > chat.mobileStylesIndex && chat.mobileStylesIndex >= 0, `${label} final Community CSS order failed`, chat);
        const visibleTabs = chat.tabs.filter((tab) => tab.visible);
        assert(visibleTabs.length === 3, `${label} Community tab count is wrong`, chat);
        assert(visibleTabs.every((tab) => tab.left >= chat.bar.left - 1 && tab.right <= chat.bar.right + 1), `${label} Community tabs clip or overflow`, chat);
        assert(chat.bodyOverflow <= 1, `${label} Community page scrolls horizontally`, chat);
        if (viewport.width > 900) {
            assert(chat.sidebar.width >= 300 && chat.feed.width > chat.sidebar.width && chat.feed.left > chat.sidebar.right, `${label} desktop columns are not coherent`, chat);
        }
        await page.screenshot({ path: path.join(screenshotDir, `community-chat-${label}.png`) });

        await page.locator('.community-tab-btn[data-tab="feed"]').click();
        await page.waitForFunction(() => location.pathname === '/community/feed' && document.getElementById('community-channel-title')?.textContent === 'Community Conversations');
        const feedTitle = await page.locator('#community-channel-title').textContent();

        await page.locator('.community-tab-btn[data-tab="map"]').click();
        await page.waitForFunction(() => (
            location.pathname === '/community/map'
            && document.getElementById('community-view')?.classList.contains('map-tab-active')
        ));
        await page.waitForTimeout(250);
        const map = await page.evaluate(() => {
            const sidebar = document.querySelector('.community-sidebar-column');
            const feed = document.querySelector('.community-feed-column');
            const stage = document.querySelector('.globe-stage').getBoundingClientRect();
            const mapTab = document.querySelector('.community-tab-btn[data-tab="map"]');
            return {
                path: location.pathname,
                sidebarDisplay: getComputedStyle(sidebar).display,
                feedDisplay: getComputedStyle(feed).display,
                stage: { width: stage.width, height: stage.height },
                mapSelected: mapTab.getAttribute('aria-selected'),
                summaryVisible: document.querySelector('.community-summary-module')?.getBoundingClientRect().height > 0,
                dailyMatchupExists: Boolean(document.querySelector('.daily-matchup-module')),
                bodyOverflow: document.documentElement.scrollWidth - innerWidth
            };
        });
        assert(map.sidebarDisplay !== 'none' && map.feedDisplay === 'none', `${label} Map surface mode failed`, map);
        assert(map.stage.width > 250 && map.stage.height >= 240 && map.mapSelected === 'true', `${label} Map stage is not usable`, map);
        assert(map.summaryVisible && !map.dailyMatchupExists, `${label} Community focus modules are wrong`, map);
        assert(map.bodyOverflow <= 1, `${label} Map page scrolls horizontally`, map);
        await page.screenshot({ path: path.join(screenshotDir, `community-map-${label}.png`) });

        assert(pageErrors.length === 0, `${label} browser errors`, pageErrors);
        return { label, chat, feedTitle, map };
    } finally {
        await browser.close();
    }
}

async function main() {
    fs.mkdirSync(screenshotDir, { recursive: true });
    const checks = [];
    checks.push(await inspect({ width: 1440, height: 1000 }));
    checks.push(await inspect({ width: 768, height: 1024 }));
    checks.push(await inspect({ width: 390, height: 844 }));
    console.log(JSON.stringify({ success: true, baseUrl, checks }, null, 2));
}

main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
});
