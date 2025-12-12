/**
 * Consolidated Auth API Route
 * Handles: login, signup, me, profile, and rewards
 * 
 * POST /api/auth?action=login - Authenticate user
 * POST /api/auth?action=signup - Create new user
 * GET /api/auth?action=me - Get current user from token
 * GET/POST /api/auth?action=rewards - XP/BP rewards system
 */

const { connectToDatabase } = require('../lib/mongodb');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { notifyDiscord } = require('../lib/discord');
const { verifyToken } = require('../lib/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'animal-stats-secret-key-change-in-production';

// Reward amounts for different actions
const REWARD_CONFIG = {
    vote: { xp: 5, bp: 0 },
    comment: { xp: 10, bp: 0 },
    reply: { xp: 5, bp: 0 },
    tournament_win: { xp: 50, bp: 10 },
    tournament_participate: { xp: 25, bp: 5 },
    battle_won: { xp: 15, bp: 3 },
    daily_login: { xp: 20, bp: 2 },
    first_vote_of_day: { xp: 10, bp: 1 }
};

module.exports = async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
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
            
            default:
                return res.status(400).json({ success: false, error: 'Invalid action. Use ?action=login, signup, me, profile, or rewards' });
        }
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ success: false, error: 'Server error. Please try again.' });
    }
};

// ==================== LOGIN ====================
async function handleLogin(req, res) {
    const { login, password } = req.body;

    if (!login || !password) {
        return res.status(400).json({
            success: false,
            error: 'Please provide email/username and password'
        });
    }

    const user = await User.findOne({
        $or: [
            { email: login.toLowerCase() },
            { username: login }
        ]
    }).select('+password');

    if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
        { userId: user._id, username: user.username },
        JWT_SECRET,
        { expiresIn: '7d' }
    );

    notifyDiscord('login', { username: user.username }, req);

    res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                displayName: user.displayName,
                avatar: user.avatar,
                role: user.role,
                xp: user.xp || 0,
                level: user.level || 1,
                battlePoints: user.battlePoints || 0,
                profileAnimal: user.profileAnimal || null,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            },
            token
        }
    });
}

// ==================== SIGNUP ====================
async function handleSignup(req, res) {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({
            success: false,
            error: 'Please provide username, email, and password'
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            success: false,
            error: 'Password must be at least 6 characters'
        });
    }

    const existingUser = await User.findOne({
        $or: [{ email: email.toLowerCase() }, { username }]
    });

    if (existingUser) {
        const field = existingUser.email === email.toLowerCase() ? 'email' : 'username';
        return res.status(400).json({
            success: false,
            error: `An account with this ${field} already exists`
        });
    }

    const user = new User({
        username,
        email: email.toLowerCase(),
        password
    });

    await user.save();

    const token = jwt.sign(
        { userId: user._id, username: user.username },
        JWT_SECRET,
        { expiresIn: '7d' }
    );

    notifyDiscord('signup', { username: user.username }, req);

    res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: {
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                displayName: user.displayName,
                avatar: user.avatar,
                role: user.role,
                xp: user.xp || 0,
                level: user.level || 1,
                battlePoints: user.battlePoints || 0,
                profileAnimal: user.profileAnimal || null,
                createdAt: user.createdAt
            },
            token
        }
    });
}

// ==================== ME ====================
async function handleMe(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
        decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
    }

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
                xp: user.xp || 0,
                level: user.level || 1,
                battlePoints: user.battlePoints || 0,
                profileAnimal: user.profileAnimal || null,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            }
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
    } catch (err) {
        return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Calculate XP progress for current level
    const xpForCurrentLevel = calculateXpForLevel(user.level);
    const xpForNextLevel = calculateXpForLevel(user.level + 1);
    const xpProgress = user.xp - xpForCurrentLevel;
    const xpNeeded = xpForNextLevel - xpForCurrentLevel;

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
                xp: user.xp || 0,
                level: user.level || 1,
                battlePoints: user.battlePoints || 0,
                profileAnimal: user.profileAnimal || null,
                xpProgress,
                xpNeeded,
                xpPercentage: Math.min(100, Math.round((xpProgress / xpNeeded) * 100)),
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
    } catch (err) {
        return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
    }

    const { displayName, username, profileAnimal } = req.body;

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

        // Check if username is already taken (by another user)
        const existingUser = await User.findOne({ 
            username: { $regex: new RegExp(`^${newUsername}$`, 'i') },
            _id: { $ne: user._id }
        });
        if (existingUser) {
            return res.status(400).json({ success: false, error: 'Username is already taken' });
        }

        // Check weekly change limit (3 per week)
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentChanges = (user.usernameChanges || []).filter(
            change => new Date(change.changedAt) > oneWeekAgo
        );
        
        if (recentChanges.length >= 3) {
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
        
        user.displayName = newDisplayName;
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

    // Calculate XP progress
    const xpForCurrentLevel = calculateXpForLevel(user.level);
    const xpForNextLevel = calculateXpForLevel(user.level + 1);
    const xpProgress = user.xp - xpForCurrentLevel;
    const xpNeeded = xpForNextLevel - xpForCurrentLevel;

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
                xp: user.xp || 0,
                level: user.level || 1,
                battlePoints: user.battlePoints || 0,
                profileAnimal: user.profileAnimal || null,
                usernameChangesRemaining,
                xpProgress,
                xpNeeded,
                xpPercentage: Math.min(100, Math.round((xpProgress / xpNeeded) * 100)),
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            }
        }
    });
}

// ==================== XP CALCULATION HELPERS ====================
/**
 * Calculate total XP needed to reach a specific level
 * Uses a polynomial curve: Level 1 = 0 XP, Level 2 = 100 XP, scales up
 */
function calculateXpForLevel(level) {
    if (level <= 1) return 0;
    // XP curve: 100 * (level-1)^1.5
    return Math.floor(100 * Math.pow(level - 1, 1.5));
}

/**
 * Calculate level from total XP
 */
function calculateLevelFromXp(xp) {
    if (xp < 100) return 1;
    // Inverse of the XP formula
    return Math.floor(Math.pow(xp / 100, 1/1.5) + 1);
}

// XP required for each level (exponential growth) - for rewards
function xpForLevel(level) {
    return Math.floor(100 * Math.pow(1.5, level - 1));
}

// Calculate level info from total XP - for rewards
function calculateLevel(totalXp) {
    let level = 1;
    let xpNeeded = xpForLevel(level);
    let xpAccumulated = 0;
    
    while (xpAccumulated + xpNeeded <= totalXp) {
        xpAccumulated += xpNeeded;
        level++;
        xpNeeded = xpForLevel(level);
    }
    
    return {
        level,
        currentXp: totalXp - xpAccumulated,
        xpForNextLevel: xpNeeded,
        totalXp
    };
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
        // Get user's current XP, level, and BP
        const dbUser = await User.findById(user.id);
        
        if (!dbUser) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const levelInfo = calculateLevel(dbUser.xp || 0);

        return res.status(200).json({
            success: true,
            data: {
                xp: dbUser.xp || 0,
                level: levelInfo.level,
                currentLevelXp: levelInfo.currentXp,
                xpForNextLevel: levelInfo.xpForNextLevel,
                battlePoints: dbUser.battlePoints || 0,
                username: dbUser.username
            }
        });
    }

    if (req.method === 'POST') {
        const { action, customXp, customBp } = req.body;

        // Get reward amounts
        let xpToAdd = 0;
        let bpToAdd = 0;

        if (action && REWARD_CONFIG[action]) {
            xpToAdd = REWARD_CONFIG[action].xp;
            bpToAdd = REWARD_CONFIG[action].bp;
        } else if (customXp !== undefined || customBp !== undefined) {
            xpToAdd = parseInt(customXp) || 0;
            bpToAdd = parseInt(customBp) || 0;
        } else {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid action or reward amount',
                validActions: Object.keys(REWARD_CONFIG)
            });
        }

        // Cap rewards to prevent abuse
        xpToAdd = Math.min(Math.max(xpToAdd, 0), 500);
        bpToAdd = Math.min(Math.max(bpToAdd, 0), 100);

        // Update user in database
        const dbUser = await User.findByIdAndUpdate(
            user.id,
            {
                $inc: {
                    xp: xpToAdd,
                    battlePoints: bpToAdd
                }
            },
            { new: true }
        );

        if (!dbUser) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const levelInfo = calculateLevel(dbUser.xp || 0);
        const oldLevelInfo = calculateLevel((dbUser.xp || 0) - xpToAdd);
        const leveledUp = levelInfo.level > oldLevelInfo.level;

        return res.status(200).json({
            success: true,
            data: {
                xpAdded: xpToAdd,
                bpAdded: bpToAdd,
                totalXp: dbUser.xp,
                totalBp: dbUser.battlePoints,
                level: levelInfo.level,
                currentLevelXp: levelInfo.currentXp,
                xpForNextLevel: levelInfo.xpForNextLevel,
                leveledUp,
                newLevel: leveledUp ? levelInfo.level : null
            },
            message: leveledUp 
                ? `🎉 Level Up! You are now level ${levelInfo.level}!` 
                : `+${xpToAdd} XP${bpToAdd > 0 ? `, +${bpToAdd} BP` : ''}`
        });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
}
