#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const packageJsonPath = path.join(repoRoot, 'package.json');
const indexHtmlPath = path.join(repoRoot, 'index.html');

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

function syncIndexVersion(indexContent, version) {
    const portalPattern = /(<span class="portal-version">)v\d+\.\d+\.\d+(<\/span>)/;
    const aboutPattern = /(<p class="about-version">Version )\d+\.\d+\.\d+/;

    if (!portalPattern.test(indexContent)) {
        throw new Error('Could not find portal version markup in index.html');
    }

    if (!aboutPattern.test(indexContent)) {
        throw new Error('Could not find about version markup in index.html');
    }

    let updated = indexContent.replace(portalPattern, `$1v${version}$2`);
    updated = updated.replace(aboutPattern, `$1${version}`);

    return updated;
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

const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
const updatedIndexHtml = syncIndexVersion(indexHtml, nextVersion);
if (updatedIndexHtml !== indexHtml) {
    fs.writeFileSync(indexHtmlPath, updatedIndexHtml, 'utf8');
}

process.stdout.write(nextVersion);
