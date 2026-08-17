#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const outputRoot = path.join(repoRoot, 'dist');

const rootFiles = Object.freeze([
    'index.html',
    'about.html',
    'community.html',
    'compare.html',
    'rankings.html',
    'stats.html',
    'tournament.html',
    'community-page.css',
    'compare-page.css',
    'tournament-v4.css',
    'manifest.json',
    'robots.txt',
    'sitemap.xml',
    'animal_stats.json'
]);

const directoryExtensions = Object.freeze({
    css: new Set(['.css']),
    js: new Set(['.js']),
    data: new Set(['.geojson', '.json']),
    images: new Set(['.jpg', '.jpeg', '.png', '.svg', '.webp', '.avif', '.gif', '.json']),
    stats: new Set(['.html'])
});

function assertSafeOutputPath(targetPath) {
    const resolved = path.resolve(targetPath);
    const relative = path.relative(outputRoot, resolved);

    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new Error(`Unsafe deployment output path: ${targetPath}`);
    }

    if (/site-activity|activity-exports?|sensitive-exports?/i.test(relative)) {
        throw new Error(`Sensitive export path rejected from deployment: ${relative}`);
    }
}

function copyFile(relativePath) {
    const source = path.join(repoRoot, relativePath);
    const destination = path.join(outputRoot, relativePath);

    if (!fs.existsSync(source) || !fs.statSync(source).isFile()) {
        throw new Error(`Required deployment file is missing: ${relativePath}`);
    }

    assertSafeOutputPath(destination);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
}

function copyAllowedDirectory(directory, allowedExtensions) {
    const sourceRoot = path.join(repoRoot, directory);
    if (!fs.existsSync(sourceRoot)) {
        throw new Error(`Required deployment directory is missing: ${directory}`);
    }

    const pending = [sourceRoot];
    while (pending.length > 0) {
        const current = pending.pop();
        const entries = fs.readdirSync(current, { withFileTypes: true });

        for (const entry of entries) {
            const absolutePath = path.join(current, entry.name);
            if (entry.isSymbolicLink()) continue;
            if (entry.isDirectory()) {
                pending.push(absolutePath);
                continue;
            }
            if (!entry.isFile()) continue;

            const extension = path.extname(entry.name).toLowerCase();
            if (!allowedExtensions.has(extension)) continue;

            copyFile(path.relative(repoRoot, absolutePath));
        }
    }
}

if (path.dirname(outputRoot) !== repoRoot || path.basename(outputRoot) !== 'dist') {
    throw new Error(`Refusing to clear unexpected output directory: ${outputRoot}`);
}

execFileSync(process.execPath, [
    path.join(repoRoot, 'scripts', 'security', 'check-sensitive-exports.js'),
    '--workspace'
], {
    cwd: repoRoot,
    stdio: 'inherit'
});
execFileSync(process.execPath, [path.join(repoRoot, 'scripts', 'version', 'check-site-version.js')], {
    cwd: repoRoot,
    stdio: 'inherit'
});

fs.rmSync(outputRoot, { recursive: true, force: true });
fs.mkdirSync(outputRoot, { recursive: true });

rootFiles.forEach(copyFile);
Object.entries(directoryExtensions).forEach(([directory, extensions]) => {
    copyAllowedDirectory(directory, extensions);
});

const deployedFiles = [];
const pending = [outputRoot];
while (pending.length > 0) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const absolutePath = path.join(current, entry.name);
        if (entry.isDirectory()) pending.push(absolutePath);
        if (entry.isFile()) deployedFiles.push(path.relative(outputRoot, absolutePath).replace(/\\/g, '/'));
    }
}

const forbidden = deployedFiles.filter((file) => (
    /site-activity|activity-exports?|sensitive-exports?/i.test(file)
    || file.toLowerCase().endsWith('.csv')
));

if (forbidden.length > 0) {
    throw new Error(`Forbidden files reached deployment output: ${forbidden.join(', ')}`);
}

console.log(`Production allowlist built ${deployedFiles.length} files into dist/.`);
