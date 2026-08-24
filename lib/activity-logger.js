/**
 * Persistent activity logging + coordinate resolution for community globe analytics.
 */

const crypto = require('crypto');
const { connectToDatabase } = require('./mongodb');
const SiteActivity = require('./models/SiteActivity');
const GeoLocation = require('./models/GeoLocation');

const GEO_RESOLVER_VERSION = 2;
const INVALID_COORDINATE_SOURCES = new Set([
    'world-center',
    'world-hash',
    'country-hash'
]);

const COUNTRY_CENTERS = {
    US: { lat: 39.8283, lng: -98.5795 },
    CA: { lat: 56.1304, lng: -106.3468 },
    GB: { lat: 55.3781, lng: -3.4360 },
    UK: { lat: 55.3781, lng: -3.4360 },
    AU: { lat: -25.2744, lng: 133.7751 },
    DE: { lat: 51.1657, lng: 10.4515 },
    FR: { lat: 46.2276, lng: 2.2137 },
    BR: { lat: -14.2350, lng: -51.9253 },
    MX: { lat: 23.6345, lng: -102.5528 },
    IN: { lat: 20.5937, lng: 78.9629 },
    JP: { lat: 36.2048, lng: 138.2529 },
    KR: { lat: 35.9078, lng: 127.7669 },
    CN: { lat: 35.8617, lng: 104.1954 },
    ZA: { lat: -30.5595, lng: 22.9375 },
    SG: { lat: 1.3521, lng: 103.8198 },
    PH: { lat: 12.8797, lng: 121.7740 },
    ES: { lat: 40.4637, lng: -3.7492 },
    IT: { lat: 41.8719, lng: 12.5674 },
    NL: { lat: 52.1326, lng: 5.2913 },
    SE: { lat: 60.1282, lng: 18.6435 },
    NO: { lat: 60.4720, lng: 8.4689 },
    FI: { lat: 61.9241, lng: 25.7482 },
    PL: { lat: 51.9194, lng: 19.1451 },
    TR: { lat: 38.9637, lng: 35.2433 },
    RU: { lat: 61.5240, lng: 105.3188 },
    AR: { lat: -38.4161, lng: -63.6167 },
    CL: { lat: -35.6751, lng: -71.5430 },
    NZ: { lat: -40.9006, lng: 174.8860 },
    IE: { lat: 53.1424, lng: -7.6921 },
    ID: { lat: -0.7893, lng: 113.9213 }
};

const COUNTRY_NAME_TO_CODE = {
    'united states': 'US',
    usa: 'US',
    'united kingdom': 'GB',
    uk: 'GB',
    canada: 'CA',
    australia: 'AU',
    germany: 'DE',
    france: 'FR',
    brazil: 'BR',
    mexico: 'MX',
    india: 'IN',
    japan: 'JP',
    'south korea': 'KR',
    korea: 'KR',
    china: 'CN',
    'south africa': 'ZA',
    singapore: 'SG',
    philippines: 'PH',
    spain: 'ES',
    italy: 'IT',
    netherlands: 'NL',
    sweden: 'SE',
    norway: 'NO',
    finland: 'FI',
    poland: 'PL',
    turkey: 'TR',
    russia: 'RU',
    argentina: 'AR',
    chile: 'CL',
    'new zealand': 'NZ',
    ireland: 'IE',
    indonesia: 'ID'
};

const COMMON_TELEMETRY_FIELDS = Object.freeze([
    'username',
    'user',
    'page',
    'route',
    'referrer',
    'referer',
    'sessionId',
    'sessionHash',
    'duration',
    'screenSize',
    'language',
    'device',
    'browser',
    'os',
    'location'
]);

const EVENT_TELEMETRY_FIELDS = Object.freeze({
    vote: ['animal', 'voteType'],
    vote_removed: ['animal', 'oldVoteType'],
    vote_changed: ['animal', 'oldVoteType', 'newVoteType'],
    comment: ['target', 'content'],
    comment_reply: ['replyTo', 'target', 'content'],
    comment_upvote: ['commentAuthor', 'target'],
    comment_downvote: ['commentAuthor', 'target'],
    comment_deleted: ['target', 'content'],
    chat_message: ['content'],
    chat_reply: ['content'],
    fight: ['animal1', 'animal2'],
    tournament_complete: ['bracketSize', 'totalMatches', 'champion', 'runnerUp', 'thirdFourth', 'matchHistory'],
    tournament_quit: ['bracketSize', 'totalMatches', 'completedMatches', 'matchHistory'],
    prestige: ['prestige'],
    level_up: ['level']
});

const NUMERIC_TELEMETRY_FIELDS = new Set([
    'bracketSize',
    'totalMatches',
    'completedMatches',
    'prestige',
    'level'
]);

function stripUnsafeControlCharacters(value) {
    return Array.from(String(value)).filter((character) => {
        const code = character.charCodeAt(0);
        return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127);
    }).join('');
}

function cleanValue(value, maxLength = 256) {
    if (value === null || value === undefined) return null;
    const str = stripUnsafeControlCharacters(value)
        .trim();
    return str.length ? str.slice(0, maxLength) : null;
}

function normalizePage(page) {
    const raw = cleanValue(page);
    if (!raw) return null;

    try {
        const parsed = new URL(raw, 'https://animalbattlestats.com');
        return parsed.pathname;
    } catch {
        const pathOnly = raw.split('?')[0].split('#')[0];
        return pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
    }
}

function sanitizeReferrer(value) {
    const raw = cleanValue(value, 1024);
    if (!raw || raw.toLowerCase() === 'direct') return raw;

    try {
        const parsed = new URL(raw, 'https://animalbattlestats.com');
        if (!['http:', 'https:'].includes(parsed.protocol)) return null;
        return `${parsed.origin}${parsed.pathname}`.slice(0, 512);
    } catch {
        return null;
    }
}

function getPseudonymKey() {
    const configuredKey = process.env.ACTIVITY_HASH_SECRET || process.env.JWT_SECRET;
    if (configuredKey) return configuredKey;

    if (process.env.NODE_ENV === 'production') {
        throw new Error('ACTIVITY_HASH_SECRET or JWT_SECRET is required for production telemetry');
    }

    return 'animal-battle-stats-local-development';
}

function pseudonymize(value) {
    const raw = cleanValue(value, 2048);
    if (!raw) return null;

    return crypto
        .createHmac('sha256', getPseudonymKey())
        .update(raw)
        .digest('hex')
        .slice(0, 32);
}

function sanitizeLocation(location) {
    if (!location || typeof location !== 'object' || Array.isArray(location)) return null;

    const city = cleanValue(location.city, 100);
    const region = cleanValue(location.region, 100);
    const country = cleanValue(location.country, 100);
    const formatted = [city, region, country].filter(Boolean).join(', ');

    if (!formatted) return null;
    return { city, region, country, formatted };
}

function sanitizeMatchHistory(value) {
    if (!Array.isArray(value)) return [];

    return value.slice(-8).map((match) => ({
        winner: cleanValue(match?.winner, 100) || 'Unknown',
        loser: cleanValue(match?.loser, 100) || 'Unknown'
    }));
}

function sanitizeEventData(eventType, input = {}) {
    const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
    const type = cleanValue(eventType, 64)?.toLowerCase() || 'unknown';
    const allowedFields = new Set([
        ...COMMON_TELEMETRY_FIELDS,
        ...(EVENT_TELEMETRY_FIELDS[type] || [])
    ]);
    const sanitized = {};

    for (const field of allowedFields) {
        if (!(field in source)) continue;
        const value = source[field];

        if (field === 'location') {
            const location = sanitizeLocation(value);
            if (location) sanitized.location = location;
            continue;
        }

        if (field === 'page' || field === 'route') {
            const page = normalizePage(value);
            if (page) sanitized[field] = page;
            continue;
        }

        if (field === 'referrer' || field === 'referer') {
            const referrer = sanitizeReferrer(value);
            if (referrer) sanitized.referrer = referrer;
            continue;
        }

        if (field === 'sessionId') {
            const sessionHash = pseudonymize(value);
            if (sessionHash) sanitized.sessionHash = sessionHash;
            continue;
        }

        if (field === 'sessionHash') {
            const sessionHash = cleanValue(value, 64)?.toLowerCase();
            if (/^[a-f0-9]{32}$/.test(sessionHash || '')) {
                sanitized.sessionHash = sessionHash;
            }
            continue;
        }

        if (field === 'matchHistory') {
            sanitized.matchHistory = sanitizeMatchHistory(value);
            continue;
        }

        if (NUMERIC_TELEMETRY_FIELDS.has(field)) {
            const numberValue = Number(value);
            if (Number.isFinite(numberValue)) {
                sanitized[field] = Math.max(0, Math.min(1000000, Math.trunc(numberValue)));
            }
            continue;
        }

        const maxLength = field === 'content' ? 500 : 256;
        const clean = cleanValue(value, maxLength);
        if (clean) sanitized[field] = clean;
    }

    return sanitized;
}

function parseRawLocation(locationRaw) {
    const raw = cleanValue(locationRaw);
    if (!raw) return { city: null, region: null, country: null, raw: null };

    const parts = raw.split(',').map(part => cleanValue(part)).filter(Boolean);
    if (parts.length === 0) return { city: null, region: null, country: null, raw: raw };
    if (parts.length === 1) return { city: null, region: null, country: parts[0], raw: raw };
    if (parts.length === 2) return { city: parts[0], region: null, country: parts[1], raw: raw };

    return {
        city: parts[0],
        region: parts[1],
        country: parts.slice(2).join(', '),
        raw: raw
    };
}

function normalizeLocationParts(input = {}) {
    const city = cleanValue(input.city);
    const region = cleanValue(input.region);
    const country = cleanValue(input.country);
    const raw = cleanValue(input.raw) || cleanValue(input.formatted) || null;

    if (city || region || country || raw) {
        return {
            city,
            region,
            country,
            raw: raw || [city, region, country].filter(Boolean).join(', ') || null
        };
    }

    if (typeof input === 'string') {
        return parseRawLocation(input);
    }

    return { city: null, region: null, country: null, raw: null };
}

function buildLocationKey(parts) {
    const city = cleanValue(parts.city)?.toLowerCase() || 'unknown-city';
    const region = cleanValue(parts.region)?.toLowerCase() || 'unknown-region';
    const country = cleanValue(parts.country)?.toLowerCase() || 'unknown-country';

    if (city === 'unknown-city' && region === 'unknown-region' && country === 'unknown-country') {
        return null;
    }

    return `${city}|${region}|${country}`;
}

function toCountryCode(country) {
    const normalized = cleanValue(country);
    if (!normalized) return null;

    if (normalized.length === 2) return normalized.toUpperCase();
    const mapped = COUNTRY_NAME_TO_CODE[normalized.toLowerCase()];
    return mapped || null;
}

function getLocationGranularity(parts = {}) {
    if (cleanValue(parts.city)) return 'city';
    if (cleanValue(parts.region)) return 'region';
    if (cleanValue(parts.country)) return 'country';
    return 'unknown';
}

function coordinatesAreFinite(coordinates) {
    const lat = Number(coordinates?.lat);
    const lng = Number(coordinates?.lng);
    return Number.isFinite(lat)
        && Number.isFinite(lng)
        && lat >= -90
        && lat <= 90
        && lng >= -180
        && lng <= 180
        && !(Math.abs(lat) < 0.00001 && Math.abs(lng) < 0.00001);
}

function coordinatesMatchCountryCenter(coordinates, countryCode) {
    const center = countryCode ? COUNTRY_CENTERS[countryCode] : null;
    if (!center || !coordinatesAreFinite(coordinates)) return false;

    return Math.abs(Number(coordinates.lat) - center.lat) < 0.0001
        && Math.abs(Number(coordinates.lng) - center.lng) < 0.0001;
}

function validateCoordinateResult(coordinates, parts = {}) {
    const granularity = getLocationGranularity(parts);
    const countryCode = toCountryCode(parts.country);
    const source = cleanValue(coordinates?.source, 64) || 'unknown';

    if (!coordinatesAreFinite(coordinates) || INVALID_COORDINATE_SOURCES.has(source)) {
        return {
            valid: false,
            granularity,
            confidence: 'invalid',
            validationStatus: 'invalid',
            reason: 'Coordinates are missing, outside the globe, or use an unsafe fallback.'
        };
    }

    if (granularity === 'city' && (source === 'country-center' || coordinatesMatchCountryCenter(coordinates, countryCode))) {
        return {
            valid: false,
            granularity,
            confidence: 'invalid',
            validationStatus: 'invalid',
            reason: 'A named city cannot be represented by a country centroid.'
        };
    }

    if (granularity === 'region' && source === 'country-center') {
        return {
            valid: false,
            granularity,
            confidence: 'invalid',
            validationStatus: 'invalid',
            reason: 'A named region cannot be represented by a country centroid.'
        };
    }

    const highConfidence = source === 'geocode-city';
    const mediumConfidence = source === 'geocode-region' || source === 'geocode-country' || source === 'country-center';
    return {
        valid: true,
        granularity,
        confidence: highConfidence ? 'high' : (mediumConfidence ? 'medium' : 'low'),
        validationStatus: 'valid',
        reason: null
    };
}

function withTimeout(ms = 2500) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ms);
    return { controller, timeout };
}

async function geocodeByName(name, countryCode = null, source = 'geocode-city') {
    const query = cleanValue(name);
    if (!query) return null;

    const params = new URLSearchParams({
        name: query,
        count: '1',
        language: 'en',
        format: 'json'
    });

    if (countryCode) {
        params.set('countryCode', countryCode);
    }

    const { controller, timeout } = withTimeout(2500);

    try {
        const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`, {
            method: 'GET',
            signal: controller.signal
        });

        if (!response.ok) return null;
        const payload = await response.json();
        const results = Array.isArray(payload?.results) ? payload.results : [];
        const first = results.find((result) => {
            if (!countryCode) return true;
            return String(result?.country_code || '').toUpperCase() === countryCode;
        });

        if (!first || typeof first.latitude !== 'number' || typeof first.longitude !== 'number') {
            return null;
        }

        return {
            lat: Number(first.latitude.toFixed(5)),
            lng: Number(first.longitude.toFixed(5)),
            source,
            countryCode: cleanValue(first.country_code, 2)?.toUpperCase() || null
        };
    } catch {
        return null;
    } finally {
        clearTimeout(timeout);
    }
}

async function resolveCoordinates(parts, locationKey, options = {}) {
    if (!locationKey) {
        return { lat: null, lng: null, source: null };
    }

    const skipRemoteGeocode = Boolean(options.skipRemoteGeocode);
    const forceRefresh = Boolean(options.forceRefresh);
    const normalizedParts = normalizeLocationParts(parts);
    const expectedGranularity = getLocationGranularity(normalizedParts);
    const countryCode = toCountryCode(normalizedParts.country);

    const cached = await GeoLocation.findOne({ key: locationKey }).lean();
    const cachedValidation = validateCoordinateResult(cached?.coordinates, normalizedParts);
    const cachedIsCurrent = Number(cached?.resolverVersion || 1) >= GEO_RESOLVER_VERSION
        && cached?.validationStatus === 'valid';
    const legacyCacheIsSafe = cachedValidation.valid
        && !INVALID_COORDINATE_SOURCES.has(cached?.coordinates?.source)
        && !(expectedGranularity === 'city' && cached?.coordinates?.source === 'country-center');

    if (!forceRefresh && cached && (cachedIsCurrent || legacyCacheIsSafe)) {
        await GeoLocation.updateOne(
            { key: locationKey },
            {
                $inc: { hits: 1 },
                $set: {
                    granularity: cachedValidation.granularity,
                    confidence: cachedValidation.confidence,
                    validationStatus: cachedValidation.validationStatus,
                    resolverVersion: GEO_RESOLVER_VERSION,
                    lastError: null,
                    lastResolvedAt: new Date()
                }
            }
        ).catch(() => {});

        return {
            lat: cached.coordinates.lat,
            lng: cached.coordinates.lng,
            source: cached.coordinates.source || 'cache',
            granularity: cachedValidation.granularity,
            confidence: cachedValidation.confidence,
            validationStatus: cachedValidation.validationStatus,
            resolverVersion: GEO_RESOLVER_VERSION
        };
    }

    let coordinates = null;

    if (!skipRemoteGeocode && normalizedParts.city) {
        const cityQuery = [normalizedParts.city, normalizedParts.region, normalizedParts.country].filter(Boolean).join(', ');
        coordinates = await geocodeByName(cityQuery, countryCode, 'geocode-city');
    }

    if (!coordinates && !skipRemoteGeocode && normalizedParts.region && !normalizedParts.city) {
        const regionQuery = [normalizedParts.region, normalizedParts.country].filter(Boolean).join(', ');
        coordinates = await geocodeByName(regionQuery, countryCode, 'geocode-region');
    }

    if (!coordinates && !skipRemoteGeocode && normalizedParts.country && expectedGranularity === 'country') {
        coordinates = await geocodeByName(normalizedParts.country, countryCode, 'geocode-country');
    }

    if (!coordinates && expectedGranularity === 'country' && countryCode && COUNTRY_CENTERS[countryCode]) {
        coordinates = {
            lat: COUNTRY_CENTERS[countryCode].lat,
            lng: COUNTRY_CENTERS[countryCode].lng,
            source: 'country-center'
        };
    }

    const validation = validateCoordinateResult(coordinates, normalizedParts);
    const storedCoordinates = validation.valid
        ? { lat: coordinates.lat, lng: coordinates.lng, source: coordinates.source }
        : { lat: null, lng: null, source: coordinates?.source || 'unresolved' };

    await GeoLocation.findOneAndUpdate(
        { key: locationKey },
        {
            $set: {
                raw: normalizedParts.raw,
                city: normalizedParts.city,
                region: normalizedParts.region,
                country: normalizedParts.country,
                coordinates: storedCoordinates,
                granularity: validation.granularity,
                confidence: validation.confidence,
                validationStatus: validation.valid ? 'valid' : 'unresolved',
                resolverVersion: GEO_RESOLVER_VERSION,
                lastError: validation.reason,
                lastResolvedAt: new Date()
            },
            $inc: { hits: 1 }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return {
        ...storedCoordinates,
        granularity: validation.granularity,
        confidence: validation.confidence,
        validationStatus: validation.valid ? 'valid' : 'unresolved',
        resolverVersion: GEO_RESOLVER_VERSION
    };
}

function buildVisitorHash(req, normalized) {
    const headers = req?.headers || {};
    const forwarded = cleanValue(headers['x-forwarded-for']) || cleanValue(headers['x-real-ip']) || cleanValue(headers['x-vercel-forwarded-for']);
    const ip = cleanValue(forwarded?.split(',')[0]);
    const userAgent = cleanValue(headers['user-agent'], 512);
    const acceptLanguage = cleanValue(headers['accept-language']) || cleanValue(normalized.language);
    const sessionHash = cleanValue(normalized.metadata?.sessionHash, 64);

    const hasStrongIdentity = Boolean(ip || userAgent);
    const occurredHour = normalized.occurredAt instanceof Date
        ? normalized.occurredAt.toISOString().slice(0, 13)
        : new Date().toISOString().slice(0, 13);

    const stableParts = sessionHash
        ? ['session', sessionHash]
        : hasStrongIdentity
        ? [
            ip || 'no-ip',
            userAgent || 'no-ua',
            acceptLanguage || 'no-lang',
            normalized.username || 'Anonymous'
        ]
        : [
            normalized.username || 'Anonymous',
            normalized.locationKey || normalized.location?.raw || 'no-location',
            normalized.page || 'no-page',
            occurredHour
        ];

    const stableSeed = stableParts.join('|');
    return pseudonymize(stableSeed);
}

function normalizeInput({ eventType, data = {}, req = null, source = 'live', occurredAt = null, discordMessageId = null }) {
    const sanitizedData = sanitizeEventData(eventType, data);
    const locationCandidate = sanitizedData.location || {
        city: sanitizedData.city,
        region: sanitizedData.region,
        country: sanitizedData.country,
        formatted: sanitizedData.locationRaw || null
    };

    const location = normalizeLocationParts(locationCandidate);
    const page = normalizePage(sanitizedData.page || sanitizedData.route || null);
    const metadata = { ...sanitizedData };
    [
        'username',
        'user',
        'page',
        'route',
        'location',
        'device',
        'browser',
        'os',
        'screenSize',
        'language'
    ].forEach((field) => delete metadata[field]);

    return {
        discordMessageId: cleanValue(discordMessageId),
        source: source === 'import' ? 'import' : 'live',
        eventType: cleanValue(eventType) || 'unknown',
        occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
        username: cleanValue(sanitizedData.username || sanitizedData.user, 100) || 'Anonymous',
        page,
        location,
        locationKey: buildLocationKey(location),
        device: cleanValue(sanitizedData.device, 100),
        browser: cleanValue(sanitizedData.browser, 100),
        os: cleanValue(sanitizedData.os, 100),
        screenSize: cleanValue(sanitizedData.screenSize, 50),
        language: cleanValue(sanitizedData.language, 50),
        metadata,
        req
    };
}

async function logSiteActivity({
    eventType,
    data = {},
    req = null,
    source = 'live',
    occurredAt = null,
    discordMessageId = null,
    discordEventId = null
}) {
    if (!eventType) {
        return { success: false, reason: 'missing-event-type' };
    }

    await connectToDatabase();

    const normalized = normalizeInput({ eventType, data, req, source, occurredAt, discordMessageId });
    const coordinates = await resolveCoordinates(normalized.location, normalized.locationKey, {
        skipRemoteGeocode: normalized.source === 'import'
    });
    const visitorHash = buildVisitorHash(req, normalized);

    const payload = {
        source: normalized.source,
        eventType: normalized.eventType,
        occurredAt: normalized.occurredAt,
        username: normalized.username,
        visitorHash,
        page: normalized.page,
        locationKey: normalized.locationKey,
        locationRaw: normalized.location.raw,
        city: normalized.location.city,
        region: normalized.location.region,
        country: normalized.location.country,
        coordinates,
        device: normalized.device,
        browser: normalized.browser,
        os: normalized.os,
        screenSize: normalized.screenSize,
        language: normalized.language,
        metadata: normalized.metadata
    };

    if (normalized.discordMessageId) {
        payload.discordMessageId = normalized.discordMessageId;
    }

    if (normalized.source === 'live' && discordEventId) {
        payload.discordDelivery = {
            status: 'pending',
            eventId: cleanValue(discordEventId, 100),
            attempts: 0,
            nextAttemptAt: new Date()
        };
    } else if (normalized.source === 'import' && normalized.discordMessageId) {
        payload.discordDelivery = {
            status: 'sent',
            eventId: `import:${normalized.discordMessageId}`,
            messageId: normalized.discordMessageId,
            attempts: 0,
            sentAt: normalized.occurredAt
        };
    }

    try {
        if (payload.discordMessageId) {
            const existing = await SiteActivity.findOne({ discordMessageId: payload.discordMessageId }).select('_id').lean();
            if (existing) {
                return { success: true, inserted: false, duplicate: true };
            }
        }

        const created = await SiteActivity.create(payload);
        return { success: true, inserted: true, id: created._id };
    } catch (error) {
        if (error?.code === 11000) {
            return { success: true, inserted: false, duplicate: true };
        }
        throw error;
    }
}

module.exports = {
    logSiteActivity,
    normalizeLocationParts,
    buildLocationKey,
    sanitizeEventData,
    sanitizeReferrer,
    pseudonymize,
    resolveCoordinates,
    validateCoordinateResult,
    getLocationGranularity,
    coordinatesAreFinite,
    GEO_RESOLVER_VERSION
};
