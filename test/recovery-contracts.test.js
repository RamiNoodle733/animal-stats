'use strict';

process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/animal-battle-stats-test';
process.env.ACTIVITY_HASH_SECRET ||= 'test-only-activity-secret';
process.env.JWT_SECRET ||= 'test-only-jwt-secret-that-is-long-enough-for-validation';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
    validateCoordinateResult,
    getLocationGranularity,
    coordinatesAreFinite,
    getVerifiedCityCentroid
} = require('../lib/activity-logger');
const communityApi = require('../api/community');
const {
    getRetryDelayMs,
    sanitizeDeliveryError,
    createEmbed
} = require('../lib/discord');
const {
    dueRepairQuery,
    sanitizeRepairError
} = require('../lib/geolocation-repair');

const {
    isValidPublicPoint,
    toPublicPoint
} = communityApi._test;

test('coordinate validation rejects zero and out-of-range coordinates', () => {
    assert.equal(coordinatesAreFinite({ lat: 0, lng: 0 }), false);
    assert.equal(coordinatesAreFinite({ lat: 91, lng: 0 }), false);
    assert.equal(coordinatesAreFinite({ lat: 29.7604, lng: -95.3698 }), true);
});

test('named cities cannot inherit a country centroid', () => {
    const result = validateCoordinateResult(
        { lat: 39.8283, lng: -98.5795, source: 'country-center' },
        { city: 'Houston', region: 'TX', country: 'US' }
    );
    assert.equal(result.valid, false);
    assert.equal(result.validationStatus, 'invalid');
});

test('valid city, region, and country results retain their granularity', () => {
    assert.equal(getLocationGranularity({ city: 'Dubai', country: 'AE' }), 'city');
    assert.equal(getLocationGranularity({ region: 'Ontario', country: 'CA' }), 'region');
    assert.equal(getLocationGranularity({ country: 'CH' }), 'country');

    const houston = validateCoordinateResult(
        { lat: 29.7604, lng: -95.3698, source: 'geocode-city' },
        { city: 'Houston', region: 'TX', country: 'US' }
    );
    assert.equal(houston.valid, true);
    assert.equal(houston.confidence, 'high');
});

test('verified centroids cover known geocoder failures without country ambiguity', () => {
    assert.deepEqual(
        getVerifiedCityCentroid({ city: 'Sugar Land', region: 'TX', country: 'United States' }),
        { lat: 29.61968, lng: -95.63495, source: 'verified-city-centroid' }
    );
    assert.deepEqual(
        getVerifiedCityCentroid({ city: 'Volketswil', region: 'ZH', country: 'Switzerland' }),
        { lat: 47.39016, lng: 8.69085, source: 'verified-city-centroid' }
    );
    assert.equal(getVerifiedCityCentroid({ city: 'Sugar Land', country: 'CA' }), null);
});

test('public point serializer exposes anonymous aggregate fields only', () => {
    const internal = {
        key: 'houston|tx|us',
        city: 'Houston',
        region: 'TX',
        country: 'US',
        locationRaw: 'Houston, TX, US',
        coordinateSource: 'geocode-city',
        lat: 29.7604,
        lng: -95.3698,
        totalEvents: 3,
        totalVisits: 1,
        uniqueVisitors: 1,
        lastSeen: '2026-08-24T12:34:56.000Z',
        username: 'private-user',
        visitorHash: 'private-hash',
        referrer: 'private-referrer'
    };
    const publicPoint = toPublicPoint(internal);

    assert.deepEqual(Object.keys(publicPoint).sort(), [
        'city', 'coordinateQuality', 'country', 'granularity', 'key', 'label', 'lastSeen',
        'lat', 'lng', 'region', 'totalEvents', 'totalVisits', 'uniqueVisitors'
    ].sort());
    assert.equal(publicPoint.lat, 29.8);
    assert.equal(publicPoint.lng, -95.4);
    assert.equal(publicPoint.lastSeen, '2026-08-24T00:00:00.000Z');
});

test('public point validation blocks historical bad fallbacks', () => {
    assert.equal(isValidPublicPoint({
        city: 'Dubai', country: 'AE', lat: 0, lng: 0, coordinateSource: 'world-center'
    }), false);
    assert.equal(isValidPublicPoint({
        city: 'Katy', country: 'US', lat: 39.8283, lng: -98.5795, coordinateSource: 'country-center'
    }), false);
    assert.equal(isValidPublicPoint({
        city: 'Volketswil', country: 'CH', lat: 47.39, lng: 8.69, coordinateSource: 'geocode-city'
    }), true);
});

test('Discord retry timing is bounded and webhook secrets are redacted', () => {
    assert.equal(getRetryDelayMs(1), 30000);
    assert.equal(getRetryDelayMs(2), 60000);
    assert.equal(getRetryDelayMs(99) <= 86400000, true);
    assert.equal(
        sanitizeDeliveryError(new Error('failed https://discord.com/api/webhooks/123/secret-token')),
        'failed [redacted-webhook]'
    );
});

test('geolocation repair remains retryable and sanitizes stored errors', () => {
    const query = dueRepairQuery(new Date('2026-08-24T00:00:00.000Z'));
    assert.equal(Array.isArray(query.$and), true);
    assert.equal(JSON.stringify(query).includes('resolverVersion'), true);
    assert.equal(JSON.stringify(query).includes('nextRepairAt'), true);
    assert.equal(sanitizeRepairError(new Error('x'.repeat(800))).length, 500);
});

test('every supported Discord event produces a safe embed', () => {
    const eventTypes = [
        'vote', 'vote_removed', 'vote_changed', 'comment', 'comment_reply',
        'comment_upvote', 'comment_downvote', 'comment_deleted', 'fight', 'signup',
        'login', 'site_visit', 'logout', 'site_leave', 'chat_message', 'chat_reply',
        'tournament_complete', 'tournament_quit', 'prestige', 'level_up'
    ];
    for (const eventType of eventTypes) {
        const embed = createEmbed(eventType, { username: 'Test', user: 'Test' });
        assert.equal(typeof embed.title, 'string', eventType);
        assert.equal(embed.title.length > 0, true, eventType);
        assert.equal(Array.isArray(embed.fields), true, eventType);
    }
});
