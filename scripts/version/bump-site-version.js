#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const packageJsonPath = path.join(repoRoot, 'package.json');
const packageLockPath = path.join(repoRoot, 'package-lock.json');
const routerPath = path.join(repoRoot, 'js', 'router.js');

const args = process.argv.slice(2);
const syncOnly = args.includes('--sync-only');

let bumpType = 'patch';
const bumpArgIndex = args.indexOf('--bump');
if (bumpArgIndex !== -1 && args[bumpArgIndex + 1]) {
    bumpType = args[bumpArgIndex + 1].trim().toLowerCase();
}

const allowedBumps = new Set(['patch', 'minor', 'major']);
if (!allowedBumps.has(bumpType)) {
    console.error(`Unsupported bump type: ${bumpType}`);
    process.exit(1);
}

function bumpSemver(version, type) {
    const match = String(version || '').trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
    if (!match) {
        throw new Error(`Invalid semver version: ${version}`);
    }

    const major = Number(match[1]);
    const minor = Number(match[2]);
    const patch = Number(match[3]);

    if (type === 'major') {
        return `${major + 1}.0.0`;
    }

    if (type === 'minor') {
        return `${major}.${minor + 1}.0`;
    }

    return `${major}.${minor}.${patch + 1}`;
}

function writeJson(filePath, jsonValue) {
    fs.writeFileSync(filePath, `${JSON.stringify(jsonValue, null, 2)}\n`, 'utf8');
}

function syncHtmlVersion(htmlContent, version, filePath) {
    const portalPattern = /(<span class="portal-version">)v\d+\.\d+\.\d+(<\/span>)/;
    const aboutPattern = /(<p class="about-version">Version )\d+\.\d+\.\d+/;

    if (!portalPattern.test(htmlContent)) {
        throw new Error(`Could not find portal version markup in ${path.relative(repoRoot, filePath)}`);
    }

    if (!aboutPattern.test(htmlContent)) {
        throw new Error(`Could not find about version markup in ${path.relative(repoRoot, filePath)}`);
    }

    let updated = htmlContent.replace(portalPattern, `$1v${version}$2`);
    updated = updated.replace(aboutPattern, `$1${version}`);
    updated = updated.replace(
        /((?:src|href)=["']\/[^"']+\.(?:js|css))(?:\?v=\d+\.\d+\.\d+)?(["'])/g,
        `$1?v=${version}$2`
    );

    return updated;
}

function syncRouterAssetRevision(version) {
    const routerSource = fs.readFileSync(routerPath, 'utf8');
    const revisionPattern = /(const ASSET_REVISION = ')[^']+(';)/;
    if (!revisionPattern.test(routerSource)) {
        throw new Error('Could not find ASSET_REVISION in js/router.js');
    }
    fs.writeFileSync(
        routerPath,
        routerSource.replace(revisionPattern, `$1${version}$2`),
        'utf8'
    );
}

function getGeneratedHtmlPaths() {
    const rootPages = fs.readdirSync(repoRoot, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
        .map((entry) => path.join(repoRoot, entry.name));
    const statsDir = path.join(repoRoot, 'stats');
    const animalPages = fs.existsSync(statsDir)
        ? fs.readdirSync(statsDir, { withFileTypes: true })
            .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
            .map((entry) => path.join(statsDir, entry.name))
        : [];

    return [...rootPages, ...animalPages];
}

function syncPackageLock(version) {
    if (!fs.existsSync(packageLockPath)) return;

    const packageLock = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));
    packageLock.version = version;
    if (packageLock.packages?.['']) {
        packageLock.packages[''].version = version;
    }
    writeJson(packageLockPath, packageLock);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const nextVersion = syncOnly
    ? String(packageJson.version || '').trim()
    : bumpSemver(packageJson.version, bumpType);

if (!nextVersion) {
    throw new Error('Unable to determine next version');
}

if (!syncOnly) {
    packageJson.version = nextVersion;
    writeJson(packageJsonPath, packageJson);
}

syncPackageLock(nextVersion);
syncRouterAssetRevision(nextVersion);

const htmlPaths = getGeneratedHtmlPaths();
htmlPaths.forEach((htmlPath) => {
    const html = fs.readFileSync(htmlPath, 'utf8');
    const updatedHtml = syncHtmlVersion(html, nextVersion, htmlPath);
    if (updatedHtml !== html) {
        fs.writeFileSync(htmlPath, updatedHtml, 'utf8');
    }
});

process.stdout.write(`${nextVersion} (${htmlPaths.length} HTML files synchronized)`);
