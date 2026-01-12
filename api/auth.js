/**
 * Consolidated Auth API Route
 * Handles: login, signup, me, profile, rewards, and prestige
 * 
 * POST /api/auth?action=login - Authenticate user
 * POST /api/auth?action=signup - Create new user
 * GET /api/auth?action=me - Get current user from token
 * GET/POST /api/auth?action=rewards - XP/BP rewards system
 * POST /api/auth?action=prestige - Prestige at level 100
 */

const { connectToDatabase } = require('../lib/mongodb');
const User = require('../lib/models/User');
const jwt = require('jsonwebtoken');
const { notifyDiscord } = require('../lib/discord');
const { verifyToken } = require('../lib/auth');
const { 
    XP_REWARDS, 
    xpToNext, 
    processXpAward, 
    processPrestige,
    buildProgressionPayload 
} = require('../lib/xpSystem');

const JWT_SECRET = process.env.JWT_SECRET || 'animal-stats-secret-key-change-in-production';

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
            
            case 'prestige':
                if (req.method !== 'POST') {
                    return res.status(405).json({ success: false, error: 'Method not allowed' });
                }
                return await handlePrestige(req, res);
            
            default:
                return res.status(400).json({ success: false, error: 'Invalid action. Use ?action=login, signup, me, profile, rewards, or prestige' });
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
                xpToNext: xpToNext(user.level || 1),
                prestige: user.prestige || 0,
                lifetimeXp: user.lifetimeXp || 0,
                battlePoints: user.battlePoints || 0,
                isPrestigeReady: (user.level || 1) >= 100,
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

    notifyDiscord('prestige', { 
        username: updatedUser.username, 
        prestige: updatedUser.prestige 
    }, req);

    return res.status(200).json({
        success: true,
        data: buildProgressionPayload(updatedUser),
        message: `🌟 Prestige ${updatedUser.prestige}! You earned ${prestigeResult.prestigeReward.bp} BP!`
    });
}
