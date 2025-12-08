/**
 * User Model for MongoDB
 * Handles user authentication and profile data
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
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
        min: 1
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
