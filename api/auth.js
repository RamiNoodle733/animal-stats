/**
 * Consolidated Auth API Route
 * Handles: login, signup, me, profile, rewards, and prestige
 * 
 * POST /api/auth?action=login - Authenticate user
 * POST /api/auth?action=signup - Create new user
 * GET /api/auth?action=me - Get current user from token
 * GET/POST /api/auth?action=rewards - XP/BP rewards system
 * POST /api/auth?action=prestige - Prestige at level 100
 * POST /api/auth?action=flag-rename - Admin-only: require a user to rename
 * GET /api/auth?action=google-start - Begin Google OAuth sign in
 * GET /api/auth?action=google-callback - Complete Google OAuth sign in
 * GET /api/auth?action=link-google - Begin linking Google to the current user
 * POST /api/auth?action=unlink-google - Unlink Google from the current user
 * GET/PUT /api/auth?action=notification-preferences - Manage email notification settings
 * GET /api/auth?action=unsubscribe - Public signed-token email unsubscribe
 */

const { connectToDatabase } = require('../lib/mongodb');
const User = require('../lib/models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { notifyDiscord } = require('../lib/discord');
const { verifyToken, JWT_SECRET } = require('../lib/auth');
const { validatePublicName } = require('../lib/moderation');
const {
    normalizeNotificationPreferences,
    sendEmail,
    verifyUnsubscribeToken
} = require('../lib/email');
const { 
    XP_REWARDS, 
    xpToNext, 
    processXpAward, 
    processPrestige,
    buildProgressionPayload 
} = require('../lib/xpSystem');

const PASSWORD_MIN_LENGTH = 8;
const AUTH_COOKIE_NAME = 'abs_auth_token';
const TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const VERIFICATION_TOKEN_HOURS = 24;
const RESET_TOKEN_MINUTES = 60;
const LOGIN_LIMIT = { windowMs: 15 * 60 * 1000, max: 5 };
const SIGNUP_LIMIT = { windowMs: 60 * 60 * 1000, max: 5 };
const attemptBuckets = new Map();
const GENERIC_AUTH_ERROR = 'Unable to complete this request. Please check your details and try again later.';
const GOOGLE_PROVIDER = 'google';
const GOOGLE_OAUTH_SCOPES = ['openid', 'email', 'profile'];
const GOOGLE_STATE_COOKIE = 'abs_google_oauth_state';
const GOOGLE_STATE_MAX_AGE_SECONDS = 10 * 60;
const GOOGLE_AUTO_LINK_VERIFIED_EMAILS = process.env.GOOGLE_AUTO_LINK_VERIFIED_EMAILS === 'true';

function normalizeIdentifier(value) {
    return String(value || '').trim().toLowerCase();
}

function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

function getAttemptKey(kind, scope, value) {
    return `${kind}:${scope}:${normalizeIdentifier(value) || 'unknown'}`;
}

function pruneBucket(bucket, now, windowMs) {
    bucket.failures = bucket.failures.filter((timestamp) => now - timestamp < windowMs);
}

function isRateLimited(kind, req, identifier, config) {
    const now = Date.now();
    const keys = [
        getAttemptKey(kind, 'ip', getClientIp(req)),
        getAttemptKey(kind, 'id', identifier)
    ];

    return keys.some((key) => {
        const bucket = attemptBuckets.get(key) || { failures: [] };
        pruneBucket(bucket, now, config.windowMs);
        attemptBuckets.set(key, bucket);
        return bucket.failures.length >= config.max;
    });
}

function recordFailedAttempt(kind, req, identifier, config) {
    const now = Date.now();
    [
        getAttemptKey(kind, 'ip', getClientIp(req)),
        getAttemptKey(kind, 'id', identifier)
    ].forEach((key) => {
        const bucket = attemptBuckets.get(key) || { failures: [] };
        pruneBucket(bucket, now, config.windowMs);
        bucket.failures.push(now);
        attemptBuckets.set(key, bucket);
    });
}

function clearFailedAttempts(kind, req, identifier) {
    [
        getAttemptKey(kind, 'ip', getClientIp(req)),
        getAttemptKey(kind, 'id', identifier)
    ].forEach((key) => attemptBuckets.delete(key));
}

function validatePasswordPolicy(password) {
    if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
        return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
    }
    return null;
}

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function createOneTimeToken() {
    const token = crypto.randomBytes(32).toString('hex');
    return { token, tokenHash: hashToken(token) };
}

function getBaseUrl(req) {
    const configured = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
    if (configured) {
        return configured.startsWith('http') ? configured.replace(/\/$/, '') : `https://${configured.replace(/\/$/, '')}`;
    }
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    return `${protocol}://${req.headers.host}`;
}

async function sendVerificationEmail(req, user, token) {
    const url = `${getBaseUrl(req)}/api/auth?action=verify-email&email=${encodeURIComponent(user.email)}&token=${encodeURIComponent(token)}`;
    await sendEmail({
        to: user.email,
        subject: 'Verify your Animal Battle Stats email',
        text: `Verify your email by opening this link: ${url}`,
        html: `<p>Welcome to Animal Battle Stats.</p><p><a href="${url}">Verify your email</a></p>`
    });
}

async function sendPasswordResetEmail(req, user, token) {
    const url = `${getBaseUrl(req)}/reset-password?email=${encodeURIComponent(user.email)}&token=${encodeURIComponent(token)}`;
    await sendEmail({
        to: user.email,
        subject: 'Reset your Animal Battle Stats password',
        text: `Reset your password by opening this link: ${url}. This link expires in ${RESET_TOKEN_MINUTES} minutes.`,
        html: `<p>Reset your Animal Battle Stats password.</p><p><a href="${url}">Reset password</a></p>`
    });
}

function getSafeReturnPath(value) {
    const raw = String(value || '').trim();
    if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('://')) {
        return '/';
    }
    return raw;
}

function buildRedirectUrl(req, path, params = {}) {
    const url = new URL(path, getBaseUrl(req));
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, String(value));
        }
    });
    return url.toString();
}

function redirectTo(res, location) {
    res.statusCode = 302;
    res.setHeader('Location', location);
    return res.end();
}

function parseCookies(req) {
    return String(req.headers.cookie || '').split(';').reduce((cookies, pair) => {
        const index = pair.indexOf('=');
        if (index > -1) {
            cookies[pair.slice(0, index).trim()] = decodeURIComponent(pair.slice(index + 1).trim());
        }
        return cookies;
    }, {});
}

function getRequestToken(req) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.split(' ')[1];
    }
    return parseCookies(req)[AUTH_COOKIE_NAME] || null;
}

function appendSetCookie(res, cookie) {
    const existing = res.getHeader('Set-Cookie');
    if (!existing) {
        res.setHeader('Set-Cookie', cookie);
    } else if (Array.isArray(existing)) {
        res.setHeader('Set-Cookie', [...existing, cookie]);
    } else {
        res.setHeader('Set-Cookie', [existing, cookie]);
    }
}

function setAuthCookie(res, token) {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    appendSetCookie(res, `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=${TOKEN_MAX_AGE_SECONDS}; Path=/; HttpOnly; SameSite=Lax${secure}`);
}

function clearAuthCookie(res) {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    appendSetCookie(res, `${AUTH_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secure}`);
}

function setGoogleStateCookie(res, state) {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    appendSetCookie(res, `${GOOGLE_STATE_COOKIE}=${encodeURIComponent(state)}; Max-Age=${GOOGLE_STATE_MAX_AGE_SECONDS}; Path=/; HttpOnly; SameSite=Lax${secure}`);
}

function clearGoogleStateCookie(res) {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    appendSetCookie(res, `${GOOGLE_STATE_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secure}`);
}

function signSessionToken(user) {
    return jwt.sign(
        { userId: user._id, username: user.username },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

function buildUserPayload(user) {
    const authProviders = (user.authProviders || []).map((provider) => ({
        provider: provider.provider,
        email: provider.email,
        linkedAt: provider.linkedAt
    }));

    return {
        id: user._id,
        username: user.username,
        email: user.email,
        emailVerified: Boolean(user.emailVerified),
        emailNotifications: normalizeNotificationPreferences(user.emailNotifications || {}),
        authProviders,
        googleLinked: authProviders.some((provider) => provider.provider === GOOGLE_PROVIDER),
        displayName: user.displayName,
        avatar: user.avatar,
        role: user.role,
        requiresUsernameChange: Boolean(user.requiresUsernameChange),
        xp: user.xp || 0,
        level: user.level || 1,
        xpToNext: xpToNext(user.level || 1),
        prestige: user.prestige || 0,
        lifetimeXp: user.lifetimeXp || 0,
        battlePoints: user.battlePoints || 0,
        isPrestigeReady: (user.level || 1) >= 100,
        profileAnimal: user.profileAnimal || null,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
    };
}


module.exports = async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const action = req.query.action;

    try {
        await connectToDatabase();

        switch (action) {
            case 'login':
                if (req.method !== 'POST') {
                    return res.status(405).json({ success: false, error: 'Method not allowed' });
                }
                return await handleLogin(req, res);
            
            case 'signup':
                if (req.method !== 'POST') {
                    return res.status(405).json({ success: false, error: 'Method not allowed' });
                }
                return await handleSignup(req, res);
            
            case 'google-start':
                if (req.method !== 'GET') {
                    return res.status(405).json({ success: false, error: 'Method not allowed' });
                }
                return await handleGoogleStart(req, res, 'login');

            case 'google-callback':
                if (req.method !== 'GET') {
                    return res.status(405).json({ success: false, error: 'Method not allowed' });
                }
                return await handleGoogleCallback(req, res);

            case 'link-google':
                if (req.method !== 'GET') {
                    return res.status(405).json({ success: false, error: 'Method not allowed' });
                }
                return await handleGoogleStart(req, res, 'link');

            case 'unlink-google':
                if (req.method !== 'POST') {
                    return res.status(405).json({ success: false, error: 'Method not allowed' });
                }
                return await handleUnlinkGoogle(req, res);

            case 'verify-email':
                if (req.method !== 'GET' && req.method !== 'POST') {
                    return res.status(405).json({ success: false, error: 'Method not allowed' });
                }
                return await handleVerifyEmail(req, res);

            case 'forgot-password':
                if (req.method !== 'POST') {
                    return res.status(405).json({ success: false, error: 'Method not allowed' });
                }
                return await handleForgotPassword(req, res);

            case 'reset-password':
                if (req.method !== 'POST') {
                    return res.status(405).json({ success: false, error: 'Method not allowed' });
                }
                return await handleResetPassword(req, res);

            case 'logout':
                if (req.method !== 'POST') {
                    return res.status(405).json({ success: false, error: 'Method not allowed' });
                }
                clearAuthCookie(res);
                return res.status(200).json({ success: true, message: 'Logged out' });

            case 'me':
                if (req.method !== 'GET') {
                    return res.status(405).json({ success: false, error: 'Method not allowed' });
                }
                return await handleMe(req, res);
            
            case 'profile':
                if (req.method === 'GET') {
                    return await handleGetProfile(req, res);
                } else if (req.method === 'PUT' || req.method === 'POST') {
                    return await handleUpdateProfile(req, res);
                }
                return res.status(405).json({ success: false, error: 'Method not allowed' });

            case 'notification-preferences':
                if (req.method === 'GET') {
                    return await handleGetNotificationPreferences(req, res);
                } else if (req.method === 'PUT') {
                    return await handleUpdateNotificationPreferences(req, res);
                }
                return res.status(405).json({ success: false, error: 'Method not allowed' });

            case 'unsubscribe':
                if (req.method !== 'GET' && req.method !== 'POST') {
                    return res.status(405).json({ success: false, error: 'Method not allowed' });
                }
                return await handleUnsubscribe(req, res);
            
            case 'rewards':
                return await handleRewards(req, res);
            
            case 'prestige':
                if (req.method !== 'POST') {
                    return res.status(405).json({ success: false, error: 'Method not allowed' });
                }
                return await handlePrestige(req, res);

            case 'flag-rename':
                if (req.method !== 'POST') {
                    return res.status(405).json({ success: false, error: 'Method not allowed' });
                }
                return await handleFlagRename(req, res);
            
            case 'user':
                if (req.method !== 'GET') {
                    return res.status(405).json({ success: false, error: 'Method not allowed' });
                }
                return await handleGetPublicProfile(req, res);
            
            default:
                return res.status(400).json({ success: false, error: 'Invalid action' });
        }
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ success: false, error: 'Server error. Please try again.' });
    }
};


function getGoogleConfig(req) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${getBaseUrl(req)}/api/auth?action=google-callback`;

    if (!clientId || !clientSecret) {
        return null;
    }

    return { clientId, clientSecret, redirectUri };
}

function encodeGoogleState(payload) {
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodeGoogleState(value) {
    try {
        return JSON.parse(Buffer.from(String(value || ''), 'base64url').toString('utf8'));
    } catch (_err) {
        return null;
    }
}

function getAuthenticatedUserFromRequest(req) {
    const token = getRequestToken(req);
    if (!token) return null;

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return { id: decoded.userId, username: decoded.username };
    } catch (_err) {
        return null;
    }
}

function findLinkedProvider(user, provider = GOOGLE_PROVIDER) {
    return (user.authProviders || []).find((authProvider) => authProvider.provider === provider);
}

function addOrUpdateGoogleProvider(user, googleProfile) {
    if (!user.authProviders) user.authProviders = [];

    const linkedProvider = findLinkedProvider(user);
    if (linkedProvider) {
        linkedProvider.providerUserId = googleProfile.sub;
        linkedProvider.email = googleProfile.email;
        linkedProvider.linkedAt = linkedProvider.linkedAt || new Date();
        return;
    }

    user.authProviders.push({
        provider: GOOGLE_PROVIDER,
        providerUserId: googleProfile.sub,
        email: googleProfile.email,
        linkedAt: new Date()
    });
}

async function buildUniqueUsername(googleProfile) {
    const emailPrefix = String(googleProfile.email || '').split('@')[0];
    const namePrefix = String(googleProfile.name || '').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
    const base = (emailPrefix || namePrefix || 'google_user')
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 16) || 'google_user';
    const normalizedBase = base.length >= 3 ? base : `${base}_abs`;

    for (let index = 0; index < 50; index += 1) {
        const suffix = index === 0 ? '' : String(index);
        const candidate = `${normalizedBase}${suffix}`.slice(0, 20);
        const exists = await User.exists({ username: { $regex: new RegExp(`^${candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });
        if (!exists) return candidate;
    }

    return `google_${crypto.randomBytes(5).toString('hex')}`.slice(0, 20);
}

async function fetchGoogleProfile(req, code) {
    const googleConfig = getGoogleConfig(req);
    if (!googleConfig) {
        throw new Error('Google OAuth is not configured.');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: googleConfig.clientId,
            client_secret: googleConfig.clientSecret,
            redirect_uri: googleConfig.redirectUri,
            grant_type: 'authorization_code'
        })
    });

    if (!tokenResponse.ok) {
        throw new Error('Google token exchange failed.');
    }

    const tokenPayload = await tokenResponse.json();
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenPayload.access_token}` }
    });

    if (!profileResponse.ok) {
        throw new Error('Google profile fetch failed.');
    }

    const profile = await profileResponse.json();
    if (!profile.sub || !profile.email) {
        throw new Error('Google did not return the required profile details.');
    }

    return {
        sub: String(profile.sub),
        email: normalizeIdentifier(profile.email),
        emailVerified: profile.email_verified === true || profile.email_verified === 'true',
        name: profile.name || profile.email
    };
}

async function handleGoogleStart(req, res, mode = 'login') {
    const googleConfig = getGoogleConfig(req);
    const returnTo = getSafeReturnPath(req.query.returnTo || req.headers.referer);

    if (!googleConfig) {
        return redirectTo(res, buildRedirectUrl(req, mode === 'link' ? '/profile' : '/login', {
            google_error: 'not_configured',
            message: 'Google sign-in is not configured yet.'
        }));
    }

    const authUser = getAuthenticatedUserFromRequest(req);
    if (mode === 'link' && !authUser) {
        return redirectTo(res, buildRedirectUrl(req, '/login', {
            google_error: 'login_required',
            message: 'Log in before linking a Google account.',
            returnTo: '/profile'
        }));
    }

    const nonce = crypto.randomBytes(24).toString('hex');
    const state = encodeGoogleState({
        nonce,
        mode,
        returnTo: mode === 'link' ? '/profile' : returnTo,
        userId: mode === 'link' ? authUser.id : null,
        createdAt: Date.now()
    });
    setGoogleStateCookie(res, nonce);

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', googleConfig.clientId);
    authUrl.searchParams.set('redirect_uri', googleConfig.redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', GOOGLE_OAUTH_SCOPES.join(' '));
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('prompt', 'select_account');

    return redirectTo(res, authUrl.toString());
}

function googleErrorRedirect(req, res, state, code, message) {
    const destination = state?.mode === 'link' ? '/profile' : '/login';
    return redirectTo(res, buildRedirectUrl(req, destination, {
        google_error: code,
        message
    }));
}

async function handleGoogleCallback(req, res) {
    const state = decodeGoogleState(req.query.state);
    const expectedNonce = parseCookies(req)[GOOGLE_STATE_COOKIE];
    clearGoogleStateCookie(res);

    if (req.query.error) {
        return googleErrorRedirect(req, res, state, 'cancelled', 'Google sign-in was cancelled.');
    }

    if (!state || !expectedNonce || state.nonce !== expectedNonce || Date.now() - Number(state.createdAt || 0) > GOOGLE_STATE_MAX_AGE_SECONDS * 1000) {
        return googleErrorRedirect(req, res, state, 'invalid_state', 'Google sign-in expired. Please try again.');
    }

    try {
        const googleProfile = await fetchGoogleProfile(req, String(req.query.code || ''));

        if (!googleProfile.emailVerified) {
            return googleErrorRedirect(req, res, state, 'unverified_email', 'Google did not verify this email address.');
        }

        const alreadyLinkedUser = await User.findOne({
            authProviders: {
                $elemMatch: {
                    provider: GOOGLE_PROVIDER,
                    providerUserId: googleProfile.sub
                }
            }
        });

        if (state.mode === 'link') {
            const authUser = getAuthenticatedUserFromRequest(req);
            if (!authUser || String(authUser.id) !== String(state.userId)) {
                return googleErrorRedirect(req, res, state, 'login_required', 'Log in before linking a Google account.');
            }

            const currentUser = await User.findById(state.userId);
            if (!currentUser) {
                return googleErrorRedirect(req, res, state, 'login_required', 'Log in before linking a Google account.');
            }

            if (alreadyLinkedUser && String(alreadyLinkedUser._id) !== String(currentUser._id)) {
                return googleErrorRedirect(req, res, state, 'already_linked', 'That Google account is already linked to another Animal Battle Stats account.');
            }

            addOrUpdateGoogleProvider(currentUser, googleProfile);
            if (currentUser.email === googleProfile.email) currentUser.emailVerified = true;
            await currentUser.save();

            const token = signSessionToken(currentUser);
            setAuthCookie(res, token);
            return redirectTo(res, buildRedirectUrl(req, state.returnTo || '/profile', { google_linked: '1' }));
        }

        if (alreadyLinkedUser) {
            alreadyLinkedUser.lastLogin = new Date();
            await alreadyLinkedUser.save();
            const token = signSessionToken(alreadyLinkedUser);
            setAuthCookie(res, token);
            await notifyDiscord('login', { username: alreadyLinkedUser.username }, req);
            return redirectTo(res, getSafeReturnPath(state.returnTo));
        }

        const existingEmailUser = await User.findOne({ email: googleProfile.email });
        if (existingEmailUser) {
            if (GOOGLE_AUTO_LINK_VERIFIED_EMAILS && existingEmailUser.emailVerified && googleProfile.emailVerified) {
                addOrUpdateGoogleProvider(existingEmailUser, googleProfile);
                existingEmailUser.lastLogin = new Date();
                await existingEmailUser.save();
                const token = signSessionToken(existingEmailUser);
                setAuthCookie(res, token);
                return redirectTo(res, getSafeReturnPath(state.returnTo));
            }

            return googleErrorRedirect(
                req,
                res,
                state,
                'existing_account',
                'An account already uses that email. Log in first, then use Link Google account from your profile.'
            );
        }

        const username = await buildUniqueUsername(googleProfile);
        const user = new User({
            username,
            email: googleProfile.email,
            displayName: String(googleProfile.name || username).slice(0, 30),
            emailVerified: true,
            authProviders: [{
                provider: GOOGLE_PROVIDER,
                providerUserId: googleProfile.sub,
                email: googleProfile.email,
                linkedAt: new Date()
            }]
        });

        await user.save();
        const token = signSessionToken(user);
        setAuthCookie(res, token);
        await notifyDiscord('signup', { username: user.username }, req);
        return redirectTo(res, getSafeReturnPath(state.returnTo));
    } catch (error) {
        console.error('Google OAuth callback error:', error);
        return googleErrorRedirect(req, res, state, 'oauth_failed', 'Google sign-in failed. Please try again.');
    }
}

async function handleUnlinkGoogle(req, res) {
    const authUser = getAuthenticatedUserFromRequest(req);
    if (!authUser) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const user = await User.findById(authUser.id).select('+password');
    if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
    }

    const hasPassword = Boolean(user.password);
    if (!hasPassword) {
        return res.status(400).json({
            success: false,
            error: 'Add a password to your account before unlinking Google.'
        });
    }

    const originalCount = (user.authProviders || []).length;
    user.authProviders = (user.authProviders || []).filter((provider) => provider.provider !== GOOGLE_PROVIDER);

    if (user.authProviders.length === originalCount) {
        return res.status(400).json({ success: false, error: 'No Google account is linked.' });
    }

    await user.save();
    return res.status(200).json({
        success: true,
        message: 'Google account unlinked.',
        data: { user: buildUserPayload(user) }
    });
}

// ==================== LOGIN ====================
async function handleLogin(req, res) {
    const { login, password } = req.body || {};
    const normalizedLogin = normalizeIdentifier(login);

    if (isRateLimited('login', req, normalizedLogin, LOGIN_LIMIT)) {
        return res.status(429).json({ success: false, error: GENERIC_AUTH_ERROR });
    }

    if (!normalizedLogin || !password) {
        recordFailedAttempt('login', req, normalizedLogin, LOGIN_LIMIT);
        return res.status(400).json({
            success: false,
            error: 'Please provide email/username and password'
        });
    }

    const user = await User.findOne({
        $or: [
            { email: normalizedLogin },
            { username: login }
        ]
    }).select('+password');

    if (!user) {
        recordFailedAttempt('login', req, normalizedLogin, LOGIN_LIMIT);
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    if (!user.password) {
        recordFailedAttempt('login', req, normalizedLogin, LOGIN_LIMIT);
        return res.status(401).json({
            success: false,
            error: 'This account uses Google sign-in. Continue with Google or reset your password to add password login.'
        });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        recordFailedAttempt('login', req, normalizedLogin, LOGIN_LIMIT);
        const generic = isRateLimited('login', req, normalizedLogin, LOGIN_LIMIT);
        return res.status(401).json({ success: false, error: generic ? GENERIC_AUTH_ERROR : 'Invalid credentials' });
    }

    clearFailedAttempts('login', req, normalizedLogin);
    user.lastLogin = new Date();
    await user.save();

    const token = signSessionToken(user);
    setAuthCookie(res, token);

    await notifyDiscord('login', { username: user.username }, req);

    res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
            user: buildUserPayload(user),
            token
        }
    });
}

// ==================== SIGNUP ====================
async function handleSignup(req, res) {
    const { username, email, password } = req.body || {};
    const normalizedEmail = normalizeIdentifier(email);
    const signupIdentifier = normalizedEmail || username;

    if (isRateLimited('signup', req, signupIdentifier, SIGNUP_LIMIT)) {
        return res.status(429).json({ success: false, error: GENERIC_AUTH_ERROR });
    }

    if (!username || !normalizedEmail || !password) {
        recordFailedAttempt('signup', req, signupIdentifier, SIGNUP_LIMIT);
        return res.status(400).json({
            success: false,
            error: 'Please provide username, email, and password'
        });
    }

    const passwordError = validatePasswordPolicy(password);
    if (passwordError) {
        recordFailedAttempt('signup', req, signupIdentifier, SIGNUP_LIMIT);
        return res.status(400).json({ success: false, error: passwordError });
    }

    const usernameModeration = validatePublicName(username);
    if (!usernameModeration.valid) {
        recordFailedAttempt('signup', req, signupIdentifier, SIGNUP_LIMIT);
        return res.status(400).json({ success: false, error: usernameModeration.error });
    }

    const existingUser = await User.findOne({
        $or: [{ email: normalizedEmail }, { username }]
    });

    if (existingUser) {
        recordFailedAttempt('signup', req, signupIdentifier, SIGNUP_LIMIT);
        const repeated = isRateLimited('signup', req, signupIdentifier, SIGNUP_LIMIT);
        const field = existingUser.email === normalizedEmail ? 'email' : 'username';
        return res.status(400).json({
            success: false,
            error: repeated ? GENERIC_AUTH_ERROR : `An account with this ${field} already exists`
        });
    }

    const { token: verificationToken, tokenHash } = createOneTimeToken();
    const user = new User({
        username,
        email: normalizedEmail,
        password,
        emailVerified: false,
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpiresAt: new Date(Date.now() + VERIFICATION_TOKEN_HOURS * 60 * 60 * 1000)
    });

    await user.save();
    clearFailedAttempts('signup', req, signupIdentifier);

    await sendVerificationEmail(req, user, verificationToken);

    const token = signSessionToken(user);
    setAuthCookie(res, token);

    await notifyDiscord('signup', { username: user.username }, req);

    res.status(201).json({
        success: true,
        message: 'Account created successfully. Please check your email to verify your account.',
        data: {
            user: buildUserPayload(user),
            token
        }
    });
}

// ==================== EMAIL VERIFICATION ====================
async function handleVerifyEmail(req, res) {
    const source = req.method === 'GET' ? req.query : req.body;
    const email = normalizeIdentifier(source.email);
    const token = String(source.token || '');

    if (!email || !token) {
        return res.status(400).json({ success: false, error: 'Verification link is invalid or expired.' });
    }

    const user = await User.findOne({
        email,
        emailVerificationTokenHash: hashToken(token),
        emailVerificationExpiresAt: { $gt: new Date() }
    });

    if (!user) {
        return res.status(400).json({ success: false, error: 'Verification link is invalid or expired.' });
    }

    user.emailVerified = true;
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpiresAt = null;
    await user.save();

    if (req.method === 'GET') {
        res.statusCode = 302;
        res.setHeader('Location', '/login?verified=1');
        return res.end();
    }

    return res.status(200).json({ success: true, message: 'Email verified.' });
}

// ==================== FORGOT PASSWORD ====================
async function handleForgotPassword(req, res) {
    const email = normalizeIdentifier(req.body?.email || req.body?.login);
    const genericResponse = {
        success: true,
        message: 'If an account matches that email, a password reset link has been sent.'
    };

    if (!email) {
        return res.status(200).json(genericResponse);
    }

    const user = await User.findOne({ email });
    if (user) {
        const { token, tokenHash } = createOneTimeToken();
        user.passwordResetTokenHash = tokenHash;
        user.passwordResetExpiresAt = new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000);
        await user.save();
        await sendPasswordResetEmail(req, user, token);
    }

    return res.status(200).json(genericResponse);
}

// ==================== RESET PASSWORD ====================
async function handleResetPassword(req, res) {
    const email = normalizeIdentifier(req.body?.email);
    const token = String(req.body?.token || '');
    const password = req.body?.password;

    const passwordError = validatePasswordPolicy(password);
    if (passwordError) {
        return res.status(400).json({ success: false, error: passwordError });
    }

    if (!email || !token) {
        return res.status(400).json({ success: false, error: 'Reset link is invalid or expired.' });
    }

    const user = await User.findOne({
        email,
        passwordResetTokenHash: hashToken(token),
        passwordResetExpiresAt: { $gt: new Date() }
    }).select('+password');

    if (!user) {
        return res.status(400).json({ success: false, error: 'Reset link is invalid or expired.' });
    }

    user.password = password;
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    await user.save();

    return res.status(200).json({ success: true, message: 'Password reset successfully. Please sign in with your new password.' });
}


function getAuthenticatedRequestUser(req) {
    const token = getRequestToken(req);
    if (!token) return null;

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return { id: decoded.userId, username: decoded.username };
    } catch (_err) {
        return null;
    }
}

function pickNotificationPreferenceUpdates(body = {}) {
    const allowedKeys = ['enabled', 'weeklyDigest', 'newFeatures', 'commentReplies', 'tournamentUpdates'];
    const updates = {};

    allowedKeys.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(body, key)) {
            updates[key] = Boolean(body[key]);
        }
    });

    return updates;
}

// ==================== NOTIFICATION PREFERENCES ====================
async function handleGetNotificationPreferences(req, res) {
    const authUser = getAuthenticatedRequestUser(req);
    if (!authUser) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const user = await User.findById(authUser.id);
    if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.status(200).json({
        success: true,
        data: {
            emailNotifications: normalizeNotificationPreferences(user.emailNotifications || {})
        }
    });
}

async function handleUpdateNotificationPreferences(req, res) {
    const authUser = getAuthenticatedRequestUser(req);
    if (!authUser) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const user = await User.findById(authUser.id);
    if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
    }

    const current = normalizeNotificationPreferences(user.emailNotifications || {});
    const updates = pickNotificationPreferenceUpdates(req.body || {});
    const next = { ...current, ...updates };

    if (Object.prototype.hasOwnProperty.call(updates, 'enabled')) {
        next.unsubscribedAt = updates.enabled ? null : (current.unsubscribedAt || new Date());
    } else if (next.enabled && current.unsubscribedAt) {
        next.unsubscribedAt = null;
    }

    user.emailNotifications = next;
    await user.save();

    return res.status(200).json({
        success: true,
        message: 'Notification preferences updated',
        data: {
            emailNotifications: normalizeNotificationPreferences(user.emailNotifications || {})
        }
    });
}

// ==================== PUBLIC UNSUBSCRIBE ====================
async function handleUnsubscribe(req, res) {
    const token = String(req.query.token || req.body?.token || '');
    const payload = verifyUnsubscribeToken(token);

    if (!payload?.userId || !payload?.email) {
        return res.status(400).json({ success: false, error: 'Unsubscribe link is invalid.' });
    }

    const user = await User.findOne({ _id: payload.userId, email: normalizeIdentifier(payload.email) });
    if (!user) {
        return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const preferences = normalizeNotificationPreferences(user.emailNotifications || {});
    preferences.enabled = false;
    preferences.weeklyDigest = false;
    preferences.newFeatures = false;
    preferences.commentReplies = false;
    preferences.tournamentUpdates = false;
    preferences.unsubscribedAt = new Date();
    user.emailNotifications = preferences;
    await user.save();

    if (req.method === 'GET' && !(req.headers.accept || '').includes('application/json')) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send('<!doctype html><html><head><title>Unsubscribed</title></head><body><h1>You are unsubscribed</h1><p>You will no longer receive Animal Battle Stats notification emails.</p><p>You can opt back in from your profile settings.</p></body></html>');
    }

    return res.status(200).json({
        success: true,
        message: 'You have been unsubscribed from notification emails.'
    });
}

// ==================== ME ====================
async function handleMe(req, res) {
    const token = getRequestToken(req);
    if (!token) {
        return res.status(401).json({ success: false, error: 'No token provided' });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, JWT_SECRET);
    } catch (_err) {
        return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.status(200).json({
        success: true,
        data: {
            user: buildUserPayload(user),
            token
        }
    });
}

// ==================== GET PROFILE ====================
async function handleGetProfile(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
        decoded = jwt.verify(token, JWT_SECRET);
    } catch (_err) {
        return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
    }

    // New XP system: xp is already progress toward next level
    const xpProgress = user.xp || 0;
    const xpNeeded = xpToNext(user.level || 1);

    res.status(200).json({
        success: true,
        data: {
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                emailVerified: Boolean(user.emailVerified),
                emailNotifications: normalizeNotificationPreferences(user.emailNotifications || {}),
                authProviders: buildUserPayload(user).authProviders,
                googleLinked: buildUserPayload(user).googleLinked,
                displayName: user.displayName,
                avatar: user.avatar,
                role: user.role,
                requiresUsernameChange: Boolean(user.requiresUsernameChange),
                xp: user.xp || 0,
                level: user.level || 1,
                battlePoints: user.battlePoints || 0,
                profileAnimal: user.profileAnimal || null,
                prestige: user.prestige || 0,
                lifetimeXp: user.lifetimeXp || 0,
                xpToNext: xpNeeded,
                xpProgress,
                xpNeeded,
                xpPercentage: Math.min(100, Math.round((xpProgress / xpNeeded) * 100)),
                isPrestigeReady: (user.level || 1) >= 100,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            }
        }
    });
}

// ==================== UPDATE PROFILE ====================
async function handleUpdateProfile(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
        decoded = jwt.verify(token, JWT_SECRET);
    } catch (_err) {
        return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
    }

    const { displayName, username, profileAnimal } = req.body;
    let publicNameChanged = false;

    // Handle username change (login credential) - 3/week limit
    if (username !== undefined && username !== user.username) {
        const newUsername = username.trim();
        
        // Validate username format
        if (newUsername.length < 3) {
            return res.status(400).json({ success: false, error: 'Username must be at least 3 characters' });
        }
        if (newUsername.length > 20) {
            return res.status(400).json({ success: false, error: 'Username cannot exceed 20 characters' });
        }
        if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
            return res.status(400).json({ success: false, error: 'Username can only contain letters, numbers, and underscores' });
        }

        const usernameModeration = validatePublicName(newUsername);
        if (!usernameModeration.valid) {
            return res.status(400).json({ success: false, error: usernameModeration.error });
        }

        // Check if username is already taken (by another user)
        const escapedUsername = newUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const existingUser = await User.findOne({ 
            username: { $regex: new RegExp(`^${escapedUsername}$`, 'i') },
            _id: { $ne: user._id }
        });
        if (existingUser) {
            return res.status(400).json({ success: false, error: 'Username is already taken' });
        }

        // Check weekly change limit (3 per week). Moderation-required renames must not
        // trap a user in a blocked state, so they bypass this self-service limit.
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentChanges = (user.usernameChanges || []).filter(
            change => new Date(change.changedAt) > oneWeekAgo
        );
        
        if (!user.requiresUsernameChange && recentChanges.length >= 3) {
            const oldestChange = recentChanges[0];
            const resetDate = new Date(new Date(oldestChange.changedAt).getTime() + 7 * 24 * 60 * 60 * 1000);
            return res.status(400).json({ 
                success: false, 
                error: `You can only change your username 3 times per week. Try again ${resetDate.toLocaleDateString()}.`,
                usernameChangesRemaining: 0,
                resetDate: resetDate.toISOString()
            });
        }

        // Record the change
        if (!user.usernameChanges) user.usernameChanges = [];
        user.usernameChanges.push({
            oldUsername: user.username,
            newUsername: newUsername,
            changedAt: new Date()
        });

        // Update username
        user.username = newUsername;
        publicNameChanged = true;
    }

    // Handle display name change - unlimited
    if (displayName !== undefined && displayName !== user.displayName) {
        const newDisplayName = displayName.trim();
        
        // Basic validation for display name
        if (newDisplayName.length < 1) {
            return res.status(400).json({ success: false, error: 'Display name cannot be empty' });
        }
        if (newDisplayName.length > 30) {
            return res.status(400).json({ success: false, error: 'Display name cannot exceed 30 characters' });
        }

        const displayNameModeration = validatePublicName(newDisplayName);
        if (!displayNameModeration.valid) {
            return res.status(400).json({ success: false, error: displayNameModeration.error });
        }
        
        user.displayName = newDisplayName;
        publicNameChanged = true;
    }

    // Clear forced rename moderation once the user has successfully saved allowed
    // public names. This only updates moderation metadata and keeps account history,
    // XP, votes, comments, and other linked records intact.
    if (user.requiresUsernameChange && publicNameChanged) {
        const usernameModeration = validatePublicName(user.username);
        const displayNameModeration = validatePublicName(user.displayName || user.username);

        if (usernameModeration.valid && displayNameModeration.valid) {
            user.requiresUsernameChange = false;
            user.moderationReason = null;
            user.moderatedAt = null;
            user.moderatedBy = null;
        }
    }

    // Update profile animal
    if (profileAnimal !== undefined) {
        user.profileAnimal = profileAnimal;
    }

    await user.save();

    // Calculate username changes remaining this week
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentChanges = (user.usernameChanges || []).filter(
        change => new Date(change.changedAt) > oneWeekAgo
    );
    const usernameChangesRemaining = Math.max(0, 3 - recentChanges.length);

    // New XP system: xp is already progress toward next level
    const xpProgress = user.xp || 0;
    const xpNeeded = xpToNext(user.level || 1);

    res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                emailVerified: Boolean(user.emailVerified),
                emailNotifications: normalizeNotificationPreferences(user.emailNotifications || {}),
                authProviders: buildUserPayload(user).authProviders,
                googleLinked: buildUserPayload(user).googleLinked,
                displayName: user.displayName || user.username,
                avatar: user.avatar,
                role: user.role,
                requiresUsernameChange: Boolean(user.requiresUsernameChange),
                xp: user.xp || 0,
                level: user.level || 1,
                battlePoints: user.battlePoints || 0,
                profileAnimal: user.profileAnimal || null,
                prestige: user.prestige || 0,
                lifetimeXp: user.lifetimeXp || 0,
                xpToNext: xpNeeded,
                usernameChangesRemaining,
                xpProgress,
                xpNeeded,
                xpPercentage: Math.min(100, Math.round((xpProgress / xpNeeded) * 100)),
                isPrestigeReady: (user.level || 1) >= 100,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            }
        }
    });
}


// ==================== ADMIN FLAG RENAME ====================
async function handleFlagRename(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
        decoded = jwt.verify(token, JWT_SECRET);
    } catch (_err) {
        return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    const adminUser = await User.findById(decoded.userId);
    if (!adminUser) {
        return res.status(401).json({ success: false, error: 'Admin user not found' });
    }

    if (adminUser.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { userId, username, reason } = req.body || {};
    if (!userId && !username) {
        return res.status(400).json({ success: false, error: 'Provide userId or username to flag' });
    }

    const targetQuery = userId
        ? { _id: userId }
        : { username: { $regex: new RegExp(`^${String(username).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } };

    const targetUser = await User.findOne(targetQuery);
    if (!targetUser) {
        return res.status(404).json({ success: false, error: 'User not found' });
    }

    targetUser.requiresUsernameChange = true;
    targetUser.moderationReason = String(reason || 'Public name requires moderation review').trim();
    targetUser.moderatedAt = new Date();
    targetUser.moderatedBy = adminUser._id;
    targetUser.previousModeratedUsername = targetUser.username;

    await targetUser.save();

    return res.status(200).json({
        success: true,
        message: 'User flagged for required rename',
        data: {
            user: {
                id: targetUser._id,
                username: targetUser.username,
                displayName: targetUser.displayName || targetUser.username,
                role: targetUser.role,
                requiresUsernameChange: Boolean(targetUser.requiresUsernameChange),
                moderationReason: targetUser.moderationReason,
                moderatedAt: targetUser.moderatedAt,
                moderatedBy: targetUser.moderatedBy,
                previousModeratedUsername: targetUser.previousModeratedUsername
            }
        }
    });
}

// ==================== REWARDS ====================
async function handleRewards(req, res) {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const user = verifyToken(token);
    if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    if (req.method === 'GET') {
        // Get user's current progression
        const dbUser = await User.findById(user.id);
        
        if (!dbUser) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        return res.status(200).json({
            success: true,
            data: buildProgressionPayload(dbUser)
        });
    }

    if (req.method === 'POST') {
        const { action, customXp, customBp } = req.body;

        // Get reward amounts from config
        let xpToAward = 0;
        let bpToAward = 0;

        if (action && XP_REWARDS[action]) {
            xpToAward = XP_REWARDS[action].xp;
            bpToAward = XP_REWARDS[action].bp;
        } else if (customXp !== undefined || customBp !== undefined) {
            xpToAward = parseInt(customXp) || 0;
            bpToAward = parseInt(customBp) || 0;
        } else {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid action or reward amount',
                validActions: Object.keys(XP_REWARDS)
            });
        }

        // Cap rewards to prevent abuse
        xpToAward = Math.min(Math.max(xpToAward, 0), 500);
        bpToAward = Math.min(Math.max(bpToAward, 0), 100);

        // Get current user state
        const dbUser = await User.findById(user.id);
        if (!dbUser) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Process XP award with leveling
        const result = processXpAward(
            dbUser.level || 1,
            dbUser.xp || 0,
            xpToAward
        );

        // Calculate total BP: action BP + level-up BP rewards
        const totalBpEarned = bpToAward + result.totalBpEarned;

        // Update user in database with NEW level and XP values
        const updatedUser = await User.findByIdAndUpdate(
            user.id,
            {
                $set: {
                    level: result.level,
                    xp: result.xp
                },
                $inc: {
                    lifetimeXp: xpToAward,
                    battlePoints: totalBpEarned
                }
            },
            { new: true }
        );

        const leveledUp = result.levelsGained.length > 0;
        const levelsGained = result.levelsGained;

        // Build response message
        let message = `+${xpToAward} XP`;
        if (bpToAward > 0) message += `, +${bpToAward} BP`;
        
        if (leveledUp) {
            const newLevel = result.level;
            const bpReward = result.totalBpEarned;
            if (levelsGained.length === 1) {
                message = `🎉 Level Up! You reached level ${newLevel}! +${bpReward} BP`;
            } else {
                message = `🎉 ${levelsGained.length}x Level Up! You reached level ${newLevel}! +${bpReward} BP`;
            }
        }

        return res.status(200).json({
            success: true,
            data: {
                xpAdded: xpToAward,
                bpAdded: totalBpEarned,
                level: result.level,
                xp: result.xp,
                xpToNext: result.xpToNext,
                xpPercent: Math.min(100, Math.round((result.xp / result.xpToNext) * 100)),
                prestige: updatedUser.prestige || 0,
                lifetimeXp: updatedUser.lifetimeXp || 0,
                battlePoints: updatedUser.battlePoints || 0,
                isPrestigeReady: result.isPrestigeReady,
                leveledUp,
                levelsGained,
                newLevel: leveledUp ? result.level : null,
                levelUpBpReward: result.totalBpEarned
            },
            message
        });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
}

// ==================== PRESTIGE ====================
async function handlePrestige(req, res) {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const user = verifyToken(token);
    if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    // Get current user
    const dbUser = await User.findById(user.id);
    if (!dbUser) {
        return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check eligibility
    const prestigeResult = processPrestige(dbUser.level || 1, dbUser.prestige || 0);
    if (!prestigeResult.success) {
        return res.status(400).json({ success: false, error: prestigeResult.error });
    }

    // Apply prestige
    const updatedUser = await User.findByIdAndUpdate(
        user.id,
        {
            $set: {
                level: prestigeResult.newLevel,
                xp: prestigeResult.newXp,
                prestige: prestigeResult.newPrestige
            },
            $inc: {
                battlePoints: prestigeResult.prestigeReward.bp
            }
        },
        { new: true }
    );

    await notifyDiscord('prestige', { 
        username: updatedUser.username, 
        prestige: updatedUser.prestige 
    }, req);

    return res.status(200).json({
        success: true,
        data: buildProgressionPayload(updatedUser),
        message: `🌟 Prestige ${updatedUser.prestige}! You earned ${prestigeResult.prestigeReward.bp} BP!`
    });
}

// ==================== GET PUBLIC PROFILE ====================
async function handleGetPublicProfile(req, res) {
    const { username } = req.query;
    
    if (!username) {
        return res.status(400).json({ success: false, error: 'Username is required' });
    }

    const escapedUsername = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await User.findOne({ 
        username: { $regex: new RegExp(`^${escapedUsername}$`, 'i') }
    });
    
    if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
    }

    // XP calculations
    const xpProgress = user.xp || 0;
    const xpNeeded = xpToNext(user.level || 1);

    // Return public profile data (no sensitive info like email)
    res.status(200).json({
        success: true,
        data: {
            user: {
                id: user._id,
                username: user.username,
                displayName: user.displayName || user.username,
                profileAnimal: user.profileAnimal || null,
                level: user.level || 1,
                prestige: user.prestige || 0,
                xp: user.xp || 0,
                xpToNext: xpNeeded,
                xpProgress,
                xpNeeded,
                xpPercentage: Math.min(100, Math.round((xpProgress / xpNeeded) * 100)),
                role: user.role,
                createdAt: user.createdAt
            }
        }
    });
}
