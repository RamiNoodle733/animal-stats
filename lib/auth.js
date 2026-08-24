/**
 * Auth Utilities
 * JWT token verification and user authentication helpers
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ALGORITHM = 'HS256';

if (!JWT_SECRET) {
    throw new Error('Please define the JWT_SECRET environment variable inside .env.local or Vercel Environment Variables');
}

/**
 * Verify a JWT token and return the decoded user data
 * @param {string} token - JWT token to verify
 * @returns {object|null} - Decoded user data or null if invalid
 */
function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            algorithms: [JWT_ALGORITHM]
        });
        if (!decoded || typeof decoded !== 'object' || !decoded.userId || !decoded.username) {
            return null;
        }
        return {
            id: decoded.userId,
            username: decoded.username
        };
    } catch (_error) {
        return null;
    }
}

function signToken(payload, options = {}) {
    return jwt.sign(payload, JWT_SECRET, {
        ...options,
        algorithm: JWT_ALGORITHM
    });
}

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} - Token or null
 */
function extractToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.split(' ')[1];
}

/**
 * Middleware-style auth check for API routes
 * @param {object} req - Request object
 * @returns {object|null} - User data or null if not authenticated
 */
function extractCookieToken(cookieHeader) {
    const cookie = String(cookieHeader || '')
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith('abs_auth_token='));

    if (!cookie) {
        return null;
    }

    return decodeURIComponent(cookie.slice('abs_auth_token='.length));
}

function getAuthUser(req) {
    const headers = req?.headers || {};
    const token = extractToken(headers.authorization) || extractCookieToken(headers.cookie);
    
    if (!token) {
        return null;
    }
    
    return verifyToken(token);
}

async function authorizeRequest(req, allowedRoles = []) {
    const auth = getAuthUser(req);
    if (!auth) {
        return { ok: false, status: 401, error: 'Authentication required' };
    }

    const User = require('./models/User');
    const user = await User.findById(auth.id);
    if (!user) {
        return { ok: false, status: 401, error: 'Authenticated user no longer exists' };
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return { ok: false, status: 403, error: 'Insufficient permissions' };
    }

    return { ok: true, auth, user };
}

module.exports = {
    verifyToken,
    extractToken,
    extractCookieToken,
    getAuthUser,
    authorizeRequest,
    signToken
};
