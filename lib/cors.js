/**
 * Shared CORS helpers for API routes.
 *
 * Restricted routes should only echo configured site origins so credentials
 * (including HttpOnly JWT cookies) are never exposed to arbitrary origins.
 * Public read-only routes may use open CORS when they do not return user data
 * and do not accept credentials.
 */

const DEFAULT_SITE_ORIGIN = 'https://animalbattlestats.com';

function parseOriginList(value) {
    return String(value || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
        .map(normalizeOrigin)
        .filter(Boolean);
}

function normalizeOrigin(origin) {
    try {
        return new URL(origin).origin;
    } catch (_error) {
        return null;
    }
}

function getConfiguredOrigins() {
    const origins = new Set([
        normalizeOrigin(process.env.SITE_ORIGIN || DEFAULT_SITE_ORIGIN),
        ...parseOriginList(process.env.CORS_ALLOWED_ORIGINS),
        ...parseOriginList(process.env.VERCEL_PREVIEW_ORIGINS)
    ].filter(Boolean));

    [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL].forEach((vercelUrl) => {
        if (!vercelUrl) return;
        origins.add(normalizeOrigin(`https://${vercelUrl}`));
    });

    return origins;
}

function isAllowedVercelPreview(origin) {
    if (process.env.ALLOW_VERCEL_PREVIEW_ORIGINS !== 'true') {
        return false;
    }

    try {
        return new URL(origin).hostname.endsWith('.vercel.app');
    } catch (_error) {
        return false;
    }
}

function getAllowedOrigin(req) {
    const configuredOrigins = getConfiguredOrigins();
    const primaryOrigin = normalizeOrigin(process.env.SITE_ORIGIN || DEFAULT_SITE_ORIGIN);
    const requestOrigin = normalizeOrigin((req.headers || {}).origin);

    if (!requestOrigin) {
        return primaryOrigin;
    }

    if (configuredOrigins.has(requestOrigin) || isAllowedVercelPreview(requestOrigin)) {
        return requestOrigin;
    }

    return primaryOrigin;
}

function appendVaryOrigin(res) {
    const existing = res.getHeader('Vary');
    if (!existing) {
        res.setHeader('Vary', 'Origin');
        return;
    }

    const values = Array.isArray(existing) ? existing.join(', ') : String(existing);
    if (!values.split(',').map((value) => value.trim().toLowerCase()).includes('origin')) {
        res.setHeader('Vary', `${values}, Origin`);
    }
}

function setCorsHeaders(req, res, options = {}) {
    const {
        methods = 'GET, OPTIONS',
        headers = 'Content-Type, Authorization',
        credentials = false,
        open = false
    } = options;

    if (open) {
        res.setHeader('Access-Control-Allow-Origin', '*');
    } else {
        res.setHeader('Access-Control-Allow-Origin', getAllowedOrigin(req));
        appendVaryOrigin(res);
    }

    if (credentials) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    res.setHeader('Access-Control-Allow-Methods', methods);
    res.setHeader('Access-Control-Allow-Headers', headers);
}

module.exports = {
    setCorsHeaders,
    getConfiguredOrigins,
    getAllowedOrigin
};
