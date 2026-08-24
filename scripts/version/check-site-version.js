#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
const packageLock = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package-lock.json'), 'utf8'));
const version = String(packageJson.version || '').trim();

if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`Invalid package version: ${version}`);
}

if (packageLock.version !== version || packageLock.packages?.['']?.version !== version) {
    throw new Error('package.json and package-lock.json versions disagree');
}

const rootHtml = fs.readdirSync(repoRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => path.join(repoRoot, entry.name));
const statsRoot = path.join(repoRoot, 'stats');
const animalHtml = fs.readdirSync(statsRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => path.join(statsRoot, entry.name));
const htmlFiles = [...rootHtml, ...animalHtml];
const portalMarker = `<span class="portal-version">v${version}</span>`;
const aboutMarker = `<p class="about-version">Version ${version}`;
const mismatches = htmlFiles.filter((filePath) => {
    const html = fs.readFileSync(filePath, 'utf8');
    const localAssetUrls = [...html.matchAll(/(?:src|href)=["'](\/[^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g)]
        .map((match) => match[1]);
    const hasStaleAsset = localAssetUrls.some((url) => !url.endsWith(`?v=${version}`));
    return !html.includes(portalMarker) || !html.includes(aboutMarker) || hasStaleAsset;
});

if (mismatches.length > 0) {
    const relative = mismatches.slice(0, 10).map((filePath) => path.relative(repoRoot, filePath));
    throw new Error(`Version ${version} is missing from ${mismatches.length} HTML file(s): ${relative.join(', ')}`);
}

const routerSource = fs.readFileSync(path.join(repoRoot, 'js', 'router.js'), 'utf8');
if (!routerSource.includes(`const ASSET_REVISION = '${version}';`)) {
    throw new Error(`js/router.js asset revision does not match ${version}`);
}

console.log(`Version agreement passed (${version}, ${htmlFiles.length} HTML files).`);
