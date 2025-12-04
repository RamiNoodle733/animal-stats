/**
 * Auth Utilities
 * JWT token verification and user authentication helpers
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'animal-stats-secret-key-change-in-production';

/**
 * Verify a JWT token and return the decoded user data
 * @param {string} token - JWT token to verify
 * @returns {object|null} - Decoded user data or null if invalid
 */
function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return {
            id: decoded.userId,
            username: decoded.username
        };
    } catch (error) {
        console.error('Token verification failed:', error.message);
        return null;
    }
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
function getAuthUser(req) {
    const authHeader = req.headers.authorization;
    const token = extractToken(authHeader);
    
    if (!token) {
        return null;
    }
    
    return verifyToken(token);
}

module.exports = {
    verifyToken,
    extractToken,
    getAuthUser,
    JWT_SECRET
};
