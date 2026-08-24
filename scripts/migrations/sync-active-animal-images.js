#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const REGISTRY_PATH = path.join(ROOT, 'data', 'animal-image-sources.json');
const DATA_PATH = path.join(ROOT, 'animal_stats.json');
const args = process.argv.slice(2);

function optionValue(name) {
    const index = args.indexOf(name);
    return index === -1 ? null : args[index + 1] || null;
}

function buildTargets(registry, animals) {
    const animalsByName = new Map(animals.map((animal) => [animal.name, animal]));
    const targets = [];
    for (const entry of registry.entries || []) {
        if (entry.status !== 'active') continue;
        const animal = animalsByName.get(entry.animal);
        if (!animal) throw new Error(`Canonical animal record missing: ${entry.animal}`);
        if (!entry.asset || animal.image !== entry.asset) {
            throw new Error(`Active asset does not match the canonical dataset: ${entry.animal}`);
        }
        const localAssetPath = path.join(ROOT, entry.asset.split(/[?#]/, 1)[0].replace(/^\//, ''));
        if (!fs.existsSync(localAssetPath)) throw new Error(`Active asset file missing: ${entry.asset}`);
        targets.push({ name: entry.animal, image: entry.asset });
    }
    if (targets.length === 0) throw new Error('No active animal image sources are registered.');
    return targets.sort((left, right) => left.name.localeCompare(right.name));
}

function buildMigrationPlan(records, targets) {
    const recordsByName = new Map();
    for (const record of records) {
        if (recordsByName.has(record.name)) throw new Error(`Duplicate database animal: ${record.name}`);
        recordsByName.set(record.name, record);
    }

    const missing = [];
    const unchanged = [];
    const changes = [];
    for (const target of targets) {
        const record = recordsByName.get(target.name);
        if (!record) {
            missing.push(target.name);
            continue;
        }
        if (record.image === target.image) {
            unchanged.push(target.name);
            continue;
        }
        changes.push({
            id: record._id,
            name: target.name,
            before: record.image ?? null,
            after: target.image
        });
    }
    return { missing, unchanged, changes };
}

async function main() {
    const environmentPath = path.resolve(ROOT, optionValue('--env-file') || '.env.local');
    require('dotenv').config({ path: environmentPath, quiet: true });
    if (!process.env.MONGODB_URI) {
        throw new Error(`MONGODB_URI is required. Provide it through ${environmentPath} or the process environment.`);
    }

    const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
    const animals = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    const targets = buildTargets(registry, animals);
    const apply = args.includes('--apply');
    const { connectToDatabase } = require('../../lib/mongodb');
    const Animal = require('../../lib/models/Animal');
    const mongoose = require('mongoose');

    try {
        await connectToDatabase();
        const records = await Animal.find({ name: { $in: targets.map((target) => target.name) } })
            .select('_id name image')
            .lean();
        const plan = buildMigrationPlan(records, targets);
        if (plan.missing.length > 0) {
            throw new Error(`Database animals missing: ${plan.missing.join(', ')}`);
        }

        console.log(JSON.stringify({
            mode: apply ? 'apply' : 'dry-run',
            targets: targets.length,
            unchanged: plan.unchanged.length,
            changes: plan.changes.map(({ name, before, after }) => ({ name, before, after }))
        }, null, 2));

        if (!apply || plan.changes.length === 0) return;
        const result = await Animal.bulkWrite(plan.changes.map((change) => ({
            updateOne: {
                filter: { _id: change.id, image: change.before },
                update: { $set: { image: change.after } }
            }
        })), { ordered: true });
        if (result.matchedCount !== plan.changes.length || result.modifiedCount !== plan.changes.length) {
            throw new Error('Concurrent database change detected; no completion claim can be made. Re-run the dry run.');
        }

        const verificationRecords = await Animal.find({ name: { $in: targets.map((target) => target.name) } })
            .select('_id name image')
            .lean();
        const verification = buildMigrationPlan(verificationRecords, targets);
        if (verification.missing.length > 0 || verification.changes.length > 0) {
            throw new Error('Post-update verification failed.');
        }
        console.log(JSON.stringify({ verified: true, activeImages: verification.unchanged.length }, null, 2));
    } finally {
        await mongoose.disconnect();
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    });
}

module.exports = { buildMigrationPlan, buildTargets };
