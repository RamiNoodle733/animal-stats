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
 */

const { connectToDatabase } = require('../lib/mongodb');
const User = require('../lib/models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { notifyDiscord } = require('../lib/discord');
const { verifyToken, JWT_SECRET } = require('../lib/auth');
const { validatePublicName } = require('../lib/moderation');
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

async function sendAuthEmail({ to, subject, text, html }) {
    if (process.env.AUTH_EMAIL_WEBHOOK_URL) {
        try {
            await fetch(process.env.AUTH_EMAIL_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to, subject, text, html })
            });
            return;
        } catch (error) {
            console.error('Auth email webhook failed:', error);
        }
    }

    console.info('Auth email queued (configure AUTH_EMAIL_WEBHOOK_URL to send):', { to, subject, text });
}

async function sendVerificationEmail(req, user, token) {
    const url = `${getBaseUrl(req)}/api/auth?action=verify-email&email=${encodeURIComponent(user.email)}&token=${encodeURIComponent(token)}`;
    await sendAuthEmail({
        to: user.email,
        subject: 'Verify your Animal Battle Stats email',
        text: `Verify your email by opening this link: ${url}`,
        html: `<p>Welcome to Animal Battle Stats.</p><p><a href="${url}">Verify your email</a></p>`
    });
}

async function sendPasswordResetEmail(req, user, token) {
    const url = `${getBaseUrl(req)}/reset-password?email=${encodeURIComponent(user.email)}&token=${encodeURIComponent(token)}`;
    await sendAuthEmail({
        to: user.email,
        subject: 'Reset your Animal Battle Stats password',
        text: `Reset your password by opening this link: ${url}. This link expires in ${RESET_TOKEN_MINUTES} minutes.`,
        html: `<p>Reset your Animal Battle Stats password.</p><p><a href="${url}">Reset password</a></p>`
    });
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

function setAuthCookie(res, token) {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.setHeader('Set-Cookie', `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=${TOKEN_MAX_AGE_SECONDS}; Path=/; HttpOnly; SameSite=Lax${secure}`);
}

function clearAuthCookie(res) {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.setHeader('Set-Cookie', `${AUTH_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secure}`);
}

function signSessionToken(user) {
    return jwt.sign(
        { userId: user._id, username: user.username },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

function buildUserPayload(user) {
    return {
        id: user._id,
        username: user.username,
        email: user.email,
        emailVerified: Boolean(user.emailVerified),
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
