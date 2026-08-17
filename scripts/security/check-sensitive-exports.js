#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const forbiddenPathPatterns = [
    /(^|\/)site-activity[^/]*(\/|$)/i,
    /(^|\/)activity-exports?(\/|$)/i,
    /(^|\/)sensitive-exports?(\/|$)/i,
    /(^|\/)[^/]*site-activity[^/]*\.csv$/i
];
const forbiddenHeaderPatterns = [
    /(^|,)\s*(ip|ip_address|email|username|session(id|_id)?|user_agent|referr?er)\s*(,|$)/i
];

function trackedFiles() {
    return execFileSync('git', ['ls-files', '-z'], { cwd: repoRoot })
        .toString('utf8')
        .split('\0')
        .filter(Boolean);
}

function gitOutput(args, options = {}) {
    return execFileSync('git', args, {
        cwd: repoRoot,
        encoding: 'utf8',
        maxBuffer: 16 * 1024 * 1024,
        ...options
    });
}

function isForbiddenPath(relativePath) {
    const normalized = relativePath.replace(/\\/g, '/');
    return forbiddenPathPatterns.some((pattern) => pattern.test(normalized));
}

function inspectCsvHeader(relativePath) {
    if (!relativePath.toLowerCase().endsWith('.csv')) return false;

    const absolutePath = path.join(repoRoot, relativePath);
    if (!fs.existsSync(absolutePath)) return false;

    const descriptor = fs.openSync(absolutePath, 'r');
    const buffer = Buffer.alloc(8192);
    const bytesRead = fs.readSync(descriptor, buffer, 0, buffer.length, 0);
    fs.closeSync(descriptor);
    const firstLine = buffer.subarray(0, bytesRead).toString('utf8').split(/\r?\n/, 1)[0];

    return forbiddenHeaderPatterns.some((pattern) => pattern.test(firstLine));
}

function getRevisionRanges() {
    const ranges = [];

    for (let index = 0; index < process.argv.length; index += 1) {
        if (process.argv[index] !== '--rev-range') continue;
        const value = String(process.argv[index + 1] || '').trim();
        if (!value) throw new Error('--rev-range requires a Git revision or range');
        ranges.push(value);
        index += 1;
    }

    return ranges;
}

function inspectCsvBlobHeader(objectId) {
    const contents = execFileSync('git', ['cat-file', 'blob', objectId], {
        cwd: repoRoot,
        maxBuffer: 16 * 1024 * 1024
    });
    const firstLine = contents.subarray(0, 8192).toString('utf8').split(/\r?\n/, 1)[0];
    return forbiddenHeaderPatterns.some((pattern) => pattern.test(firstLine));
}

function revisionViolations(revisionRange) {
    const objectLines = gitOutput(['rev-list', '--objects', revisionRange])
        .split(/\r?\n/)
        .filter(Boolean);
    const violations = [];
    const inspectedCsvObjects = new Set();

    for (const line of objectLines) {
        const separator = line.indexOf(' ');
        if (separator === -1) continue;

        const objectId = line.slice(0, separator);
        const relativePath = line.slice(separator + 1);

        if (isForbiddenPath(relativePath)) {
            violations.push(`${relativePath} (object ${objectId.slice(0, 12)})`);
            continue;
        }

        if (!relativePath.toLowerCase().endsWith('.csv') || inspectedCsvObjects.has(objectId)) {
            continue;
        }

        inspectedCsvObjects.add(objectId);
        if (inspectCsvBlobHeader(objectId)) {
            violations.push(`${relativePath} (object ${objectId.slice(0, 12)})`);
        }
    }

    return violations;
}

const tracked = trackedFiles();
const presentTrackedFiles = tracked.filter((file) => fs.existsSync(path.join(repoRoot, file)));
const revisionRanges = getRevisionRanges();
const violations = presentTrackedFiles.filter((file) => isForbiddenPath(file) || inspectCsvHeader(file));

revisionRanges.forEach((revisionRange) => {
    revisionViolations(revisionRange).forEach((violation) => violations.push(violation));
});

if (violations.length > 0) {
    console.error('Sensitive analytics export guard failed. Remove these tracked files:');
    violations.forEach((file) => console.error(`  - ${file}`));
    process.exit(1);
}

const rangeSummary = revisionRanges.length > 0
    ? ` and ${revisionRanges.length} outgoing revision range(s)`
    : '';
console.log(`Sensitive analytics export guard passed (${presentTrackedFiles.length} tracked files${rangeSummary} checked).`);
