/**
 * User Model for MongoDB
 * Handles user authentication and profile data
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');


const EmailNotificationsSchema = new mongoose.Schema({
    enabled: {
        type: Boolean,
        default: false
    },
    weeklyDigest: {
        type: Boolean,
        default: false
    },
    newFeatures: {
        type: Boolean,
        default: false
    },
    commentReplies: {
        type: Boolean,
        default: false
    },
    tournamentUpdates: {
        type: Boolean,
        default: false
    },
    unsubscribedAt: {
        type: Date,
        default: null
    }
}, { _id: false });

const AuthProviderSchema = new mongoose.Schema({
    provider: {
        type: String,
        required: true,
        enum: ['google']
    },
    providerUserId: {
        type: String,
        required: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    linkedAt: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters'],
        maxlength: [20, 'Username cannot exceed 20 characters'],
        match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [
            function passwordRequired() {
                return !this.authProviders || this.authProviders.length === 0;
            },
            'Password is required'
        ],
        minlength: [8, 'Password must be at least 8 characters'],
        select: false // Don't include password in queries by default
    },
    displayName: {
        type: String,
        trim: true,
        maxlength: [30, 'Display name cannot exceed 30 characters']
    },
    avatar: {
        type: String,
        default: 'default'
    },
    role: {
        type: String,
        enum: ['user', 'moderator', 'admin'],
        default: 'user'
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    authProviders: {
        type: [AuthProviderSchema],
        default: []
    },
    emailNotifications: {
        type: EmailNotificationsSchema,
        default: () => ({})
    },
    emailVerificationTokenHash: {
        type: String,
        select: false,
        default: null
    },
    emailVerificationExpiresAt: {
        type: Date,
        select: false,
        default: null
    },
    passwordResetTokenHash: {
        type: String,
        select: false,
        default: null
    },
    passwordResetExpiresAt: {
        type: Date,
        select: false,
        default: null
    },
    // Moderation flags for forced public-name changes without deleting accounts
    requiresUsernameChange: {
        type: Boolean,
        default: false
    },
    moderationReason: {
        type: String,
        trim: true,
        default: null
    },
    moderatedAt: {
        type: Date,
        default: null
    },
    moderatedBy: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    previousModeratedUsername: {
        type: String,
        trim: true,
        default: null
    },
    // Stats voting history
    votes: [{
        animalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Animal' },
        statName: String,
        voteType: { type: String, enum: ['up', 'down'] },
        createdAt: { type: Date, default: Date.now }
    }],
    // Fight predictions
    fightVotes: [{
        animal1Id: { type: mongoose.Schema.Types.ObjectId, ref: 'Animal' },
        animal2Id: { type: mongoose.Schema.Types.ObjectId, ref: 'Animal' },
        winnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Animal' },
        createdAt: { type: Date, default: Date.now }
    }],
    // XP & Leveling System
    xp: {
        type: Number,
        default: 0,
        min: 0
    },
    level: {
        type: Number,
        default: 1,
        min: 1,
        max: 100
    },
    prestige: {
        type: Number,
        default: 0,
        min: 0
    },
    lifetimeXp: {
        type: Number,
        default: 0,
        min: 0
    },
    // Battle Points (currency)
    battlePoints: {
        type: Number,
        default: 0,
        min: 0
    },
    // Profile animal avatar (stores animal name)
    profileAnimal: {
        type: String,
        default: null
    },
    // Username change tracking (limit 3 per week)
    usernameChanges: [{
        oldUsername: String,
        newUsername: String,
        changedAt: { type: Date, default: Date.now }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

UserSchema.index({ 'authProviders.provider': 1, 'authProviders.providerUserId': 1 }, { unique: true, sparse: true });

// Hash password before saving
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword) {
    if (!this.password) {
        throw new Error('Password field not loaded. Use .select("+password") when querying.');
    }
    return bcrypt.compare(candidatePassword, this.password);
};

// Set display name to username if not provided
UserSchema.pre('save', function(next) {
    if (!this.displayName) {
        this.displayName = this.username;
    }
    next();
});

// Prevent model recompilation in development
module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
