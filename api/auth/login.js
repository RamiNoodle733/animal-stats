/**
 * Auth Login API Route
 * POST /api/auth/login - Authenticate user and return token
 */

const { connectToDatabase } = require('../../lib/mongodb');
const User = require('../../models/User');
const jwt = require('jsonwebtoken');
const { notifyDiscord } = require('../../lib/discord');

const JWT_SECRET = process.env.JWT_SECRET || 'animal-stats-secret-key-change-in-production';

module.exports = async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        await connectToDatabase();

        const { login, password } = req.body;

        // Validation
        if (!login || !password) {
            return res.status(400).json({
                success: false,
                error: 'Please provide email/username and password'
            });
        }

        // Find user by email or username (include password for comparison)
        const user = await User.findOne({
            $or: [
                { email: login.toLowerCase() },
                { username: login }
            ]
        }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Notify Discord about login
        notifyDiscord('login', {
            username: user.username
        });

        // Return user data (without password)
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
                    createdAt: user.createdAt,
                    lastLogin: user.lastLogin
                },
                token
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error. Please try again.'
        });
    }
};
