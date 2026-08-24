#!/usr/bin/env node
'use strict';

require('dotenv').config({ path: '.env.local' });

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const repoRoot = path.resolve(__dirname, '..', '..');
const args = new Set(process.argv.slice(2));

function getArg(name) {
    const index = process.argv.indexOf(name);
    return index === -1 ? null : process.argv[index + 1];
}

function assertOutsideRepository(targetPath) {
    const relative = path.relative(repoRoot, targetPath);
    if (!relative || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
        throw new Error('Backups must be written outside the Git repository.');
    }
}

function serializeForBackup(value) {
    return JSON.stringify(value, (_key, item) => {
        if (item?._bsontype === 'ObjectId') return item.toString();
        if (item instanceof Date) return item.toISOString();
        return item;
    });
}

async function backupCollection(database, collectionName, backupDirectory) {
    const target = path.join(backupDirectory, `${collectionName}.jsonl`);
    const descriptor = fs.openSync(target, 'wx');
    const hash = crypto.createHash('sha256');
    let count = 0;

    try {
        const cursor = database.collection(collectionName).find({}).sort({ _id: 1 });
        for await (const document of cursor) {
            const line = `${serializeForBackup(document)}\n`;
            fs.writeSync(descriptor, line);
            hash.update(line);
            count += 1;
        }
    } finally {
        fs.closeSync(descriptor);
    }

    return { collection: collectionName, file: target, count, sha256: hash.digest('hex') };
}

function isRepairCandidate(group, cached, validateCoordinateResult, resolverVersion) {
    if (!cached) return true;
    const validation = validateCoordinateResult(cached.coordinates, group);
    return !validation.valid
        || cached.validationStatus !== 'valid'
        || Number(cached.resolverVersion || 1) < resolverVersion;
}

async function main() {
    const apply = args.has('--apply');
    const requestedLimit = Number.parseInt(getArg('--limit') || '', 10);
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : Infinity;
    const backupRoot = getArg('--backup-dir') ? path.resolve(getArg('--backup-dir')) : null;

    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required in .env.local.');
    if (apply && !backupRoot) throw new Error('--apply requires an explicit --backup-dir outside the repository.');
    if (backupRoot) assertOutsideRepository(backupRoot);

    const {
        resolveCoordinates,
        validateCoordinateResult,
        GEO_RESOLVER_VERSION
    } = require('../../lib/activity-logger');
    const SiteActivity = require('../../lib/models/SiteActivity');
    const GeoLocation = require('../../lib/models/GeoLocation');
    const { connectToDatabase } = require('../../lib/mongodb');

    await connectToDatabase();
    const database = mongoose.connection.db;
    const beforeActivityCount = await SiteActivity.countDocuments({});
    const beforeLocationCount = await GeoLocation.countDocuments({});
    const groups = await SiteActivity.aggregate([
        { $match: { locationKey: { $type: 'string', $ne: '' } } },
        {
            $group: {
                _id: '$locationKey',
                city: { $first: '$city' },
                region: { $first: '$region' },
                country: { $first: '$country' },
                raw: { $first: '$locationRaw' },
                events: { $sum: 1 }
            }
        },
        { $sort: { events: -1 } }
    ]);
    const cachedLocations = await GeoLocation.find({ key: { $in: groups.map((group) => group._id) } }).lean();
    const cacheByKey = new Map(cachedLocations.map((location) => [location.key, location]));
    const candidates = groups.filter((group) => (
        isRepairCandidate(group, cacheByKey.get(group._id), validateCoordinateResult, GEO_RESOLVER_VERSION)
    ));

    console.log(JSON.stringify({
        mode: apply ? 'apply' : 'dry-run',
        activityCount: beforeActivityCount,
        cachedLocationCount: beforeLocationCount,
        distinctLocationCount: groups.length,
        repairCandidateCount: candidates.length,
        candidates: candidates.slice(0, 25).map((item) => ({ key: item._id, events: item.events }))
    }, null, 2));

    if (!apply) {
        console.log('Dry run complete. No database records were changed.');
        return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDirectory = path.join(backupRoot, `animal-battle-stats-activity-${timestamp}`);
    fs.mkdirSync(backupDirectory, { recursive: false });
    const backupManifest = [];
    for (const collectionName of ['siteactivity', 'geolocationcache']) {
        backupManifest.push(await backupCollection(database, collectionName, backupDirectory));
    }
    fs.writeFileSync(
        path.join(backupDirectory, 'manifest.json'),
        `${JSON.stringify({ createdAt: new Date().toISOString(), collections: backupManifest }, null, 2)}\n`,
        { flag: 'wx' }
    );
    console.log(`Verified backup written to ${backupDirectory}`);

    let repaired = 0;
    let unresolved = 0;
    let updatedEvents = 0;
    for (const group of candidates.slice(0, limit)) {
        const location = { city: group.city, region: group.region, country: group.country, raw: group.raw };
        const coordinates = await resolveCoordinates(location, group._id, { forceRefresh: true });
        if (coordinates.validationStatus !== 'valid') {
            unresolved += 1;
            continue;
        }

        const update = await SiteActivity.updateMany(
            { locationKey: group._id },
            {
                $set: {
                    'coordinates.lat': coordinates.lat,
                    'coordinates.lng': coordinates.lng,
                    'coordinates.source': coordinates.source
                }
            }
        );
        repaired += 1;
        updatedEvents += update.modifiedCount;
        await new Promise((resolve) => setTimeout(resolve, 125));
    }

    const afterActivityCount = await SiteActivity.countDocuments({});
    if (afterActivityCount !== beforeActivityCount) {
        throw new Error(`Activity count changed from ${beforeActivityCount} to ${afterActivityCount}; investigate immediately.`);
    }

    console.log(JSON.stringify({
        repairedLocations: repaired,
        unresolvedLocations: unresolved,
        updatedEvents,
        beforeActivityCount,
        afterActivityCount,
        backupDirectory
    }, null, 2));
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect().catch(() => {});
    });
