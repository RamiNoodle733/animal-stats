'use strict';

const crypto = require('crypto');
const { connectToDatabase } = require('./mongodb');
const {
    resolveCoordinates,
    GEO_RESOLVER_VERSION
} = require('./activity-logger');
const GeoLocation = require('./models/GeoLocation');
const SiteActivity = require('./models/SiteActivity');
const GeoLocationRepairBackup = require('./models/GeoLocationRepairBackup');
const GeoLocationRepairState = require('./models/GeoLocationRepairState');

const REPAIR_KEY = 'community-geolocation-v2';
const REPAIR_RELEASE = 'v2.3.1';
const LEASE_MS = 2 * 60 * 1000;
const RETRY_DELAY_MS = 24 * 60 * 60 * 1000;
const INVALID_SOURCES = ['world-center', 'world-hash', 'country-hash', 'unresolved'];

function sanitizeRepairError(error) {
    return String(error?.message || error || 'Unknown geolocation repair error').slice(0, 500);
}

async function claimRepairLease() {
    const now = new Date();
    await GeoLocationRepairState.updateOne(
        { key: REPAIR_KEY },
        { $setOnInsert: { key: REPAIR_KEY, release: REPAIR_RELEASE } },
        { upsert: true }
    );

    const leaseToken = crypto.randomUUID();
    const state = await GeoLocationRepairState.findOneAndUpdate(
        {
            key: REPAIR_KEY,
            $or: [
                { leaseExpiresAt: null },
                { leaseExpiresAt: { $exists: false } },
                { leaseExpiresAt: { $lte: now } }
            ]
        },
        {
            $set: {
                release: REPAIR_RELEASE,
                leaseToken,
                leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
                lastRunAt: now,
                lastError: null
            }
        },
        { new: true }
    ).lean();

    return state ? { leaseToken, state } : null;
}

function dueRepairQuery(now = new Date()) {
    return {
        $and: [
            {
                $or: [
                    { resolverVersion: { $exists: false } },
                    { resolverVersion: { $lt: GEO_RESOLVER_VERSION } },
                    { validationStatus: { $ne: 'valid' } },
                    { 'coordinates.source': { $in: INVALID_SOURCES } }
                ]
            },
            {
                $or: [
                    { nextRepairAt: null },
                    { nextRepairAt: { $exists: false } },
                    { nextRepairAt: { $lte: now } }
                ]
            }
        ]
    };
}

async function createRepairBackup(location) {
    const activities = await SiteActivity.find({ locationKey: location.key })
        .select('_id coordinates')
        .lean();

    await GeoLocationRepairBackup.updateOne(
        { release: REPAIR_RELEASE, locationKey: location.key },
        {
            $setOnInsert: {
                release: REPAIR_RELEASE,
                locationKey: location.key,
                geoLocation: location,
                activities: activities.map((activity) => ({
                    activityId: activity._id,
                    coordinates: activity.coordinates || null
                })),
                activityCount: activities.length,
                createdAt: new Date()
            }
        },
        { upsert: true }
    );
}

async function repairLocation(location) {
    await createRepairBackup(location);
    const parts = {
        city: location.city,
        region: location.region,
        country: location.country,
        raw: location.raw
    };
    const coordinates = await resolveCoordinates(parts, location.key, { forceRefresh: true });

    if (coordinates.validationStatus !== 'valid') {
        await GeoLocation.updateOne(
            { key: location.key },
            {
                $inc: { repairAttempts: 1 },
                $set: { nextRepairAt: new Date(Date.now() + RETRY_DELAY_MS) }
            }
        );
        return { repaired: false, updatedEvents: 0 };
    }

    const update = await SiteActivity.updateMany(
        { locationKey: location.key },
        {
            $set: {
                'coordinates.lat': coordinates.lat,
                'coordinates.lng': coordinates.lng,
                'coordinates.source': coordinates.source
            }
        }
    );
    await GeoLocation.updateOne(
        { key: location.key },
        {
            $inc: { repairAttempts: 1 },
            $set: { nextRepairAt: null, repairCompletedAt: new Date() }
        }
    );

    return { repaired: true, updatedEvents: update.modifiedCount };
}

async function repairGeolocationBatch({ limit = 5 } = {}) {
    await connectToDatabase();
    const boundedLimit = Math.min(Math.max(Number(limit) || 5, 1), 25);
    const claim = await claimRepairLease();
    if (!claim) return { success: true, skipped: true, reason: 'repair-already-running' };

    const { leaseToken } = claim;
    let processed = 0;
    let repaired = 0;
    let unresolved = 0;
    let updatedEvents = 0;

    try {
        const candidates = await GeoLocation.find(dueRepairQuery())
            .sort({ hits: -1, updatedAt: 1 })
            .limit(boundedLimit)
            .lean();

        for (const location of candidates) {
            const result = await repairLocation(location);
            processed += 1;
            repaired += result.repaired ? 1 : 0;
            unresolved += result.repaired ? 0 : 1;
            updatedEvents += result.updatedEvents;
            await new Promise((resolve) => setTimeout(resolve, 125));
        }

        await GeoLocationRepairState.updateOne(
            { key: REPAIR_KEY, leaseToken },
            {
                $inc: { processed, repaired, unresolved },
                $set: {
                    completedAt: candidates.length === 0 ? new Date() : null,
                    lastError: null,
                    leaseToken: null,
                    leaseExpiresAt: null
                }
            }
        );

        return {
            success: true,
            processed,
            repaired,
            unresolved,
            updatedEvents,
            complete: candidates.length === 0
        };
    } catch (error) {
        await GeoLocationRepairState.updateOne(
            { key: REPAIR_KEY, leaseToken },
            {
                $set: {
                    lastError: sanitizeRepairError(error),
                    leaseToken: null,
                    leaseExpiresAt: null
                }
            }
        ).catch(() => {});
        throw error;
    }
}

module.exports = {
    repairGeolocationBatch,
    dueRepairQuery,
    sanitizeRepairError,
    REPAIR_KEY,
    REPAIR_RELEASE
};
