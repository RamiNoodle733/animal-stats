/**
 * Animal Model - Mongoose Schema for Animal Battle Stats
 * 
 * Defines the complete schema for animal data including
 * stats, substats, battle profiles, and metadata.
 */

const mongoose = require('mongoose');

// Substat Schema (embedded)
const SubstatSchema = new mongoose.Schema({
    raw_power: { type: Number, default: 0, min: 0, max: 100 },
    weaponry: { type: Number, default: 0, min: 0, max: 100 },
    protection: { type: Number, default: 0, min: 0, max: 100 },
    toughness: { type: Number, default: 0, min: 0, max: 100 },
    speed: { type: Number, default: 0, min: 0, max: 100 },
    maneuverability: { type: Number, default: 0, min: 0, max: 100 },
    endurance: { type: Number, default: 0, min: 0, max: 100 },
    recovery: { type: Number, default: 0, min: 0, max: 100 },
    tactics: { type: Number, default: 0, min: 0, max: 100 },
    senses: { type: Number, default: 0, min: 0, max: 100 },
    ferocity: { type: Number, default: 0, min: 0, max: 100 },
    abilities: { type: Number, default: 0, min: 0, max: 100 }
}, { _id: false });

// Battle Profile Schema (embedded)
const BattleProfileSchema = new mongoose.Schema({
    preferred_range: { type: String, default: 'Close' },
    primary_environment: { type: String, default: 'Varied' },
    combat_style: { type: String, default: 'Fighter' },
    strengths: [{ type: String }],
    weaknesses: [{ type: String }]
}, { _id: false });

// Main Animal Schema
const AnimalSchema = new mongoose.Schema({
    // Basic Info
    name: { 
        type: String, 
        required: true, 
        unique: true,
        index: true,
        trim: true
    },
    scientific_name: { 
        type: String, 
        default: 'Unknown Species',
        trim: true
    },
    description: { 
        type: String, 
        default: '' 
    },
    
    // Classification
    type: { 
        type: String, 
        default: 'Mammal',
        enum: ['Mammal', 'Bird', 'Reptile', 'Amphibian', 'Fish', 'Insect', 'Arachnid', 'Crustacean', 'Mollusk', 'Invertebrate', 'Cephalopod', 'Cnidarian', 'Arthropod', 'Marsupial', 'Other'],
        index: true
    },
    class: { 
        type: String, 
        default: 'Fighter',
        index: true
    },
    
    // Physical Attributes
    habitat: { type: String, default: 'Varied' },
    size: { 
        type: String, 
        default: 'Medium',
        enum: ['Tiny', 'Small', 'Medium', 'Large', 'Extra Large', 'Colossal']
    },
    weight_kg: { type: Number, default: 50 },
    height_cm: { type: Number, default: 50 },
    length_cm: { type: Number, default: 100 },
    speed_mps: { type: Number, default: 10 },
    lifespan_years: { type: Number, default: 15 },
    bite_force_psi: { type: Number, default: 0 },
    size_score: { type: Number, default: 0, min: 0, max: 100 },
    
    // Behavior
    isNocturnal: { type: Boolean, default: false },
    isSocial: { type: Boolean, default: true },
    diet: [{ type: String }],
    
    // Main Stats (0-100)
    attack: { type: Number, default: 50, min: 0, max: 100, index: true },
    defense: { type: Number, default: 50, min: 0, max: 100, index: true },
    agility: { type: Number, default: 50, min: 0, max: 100, index: true },
    stamina: { type: Number, default: 50, min: 0, max: 100, index: true },
    intelligence: { type: Number, default: 50, min: 0, max: 100, index: true },
    special_attack: { type: Number, default: 50, min: 0, max: 100, index: true },
    
    // Substats
    substats: { type: SubstatSchema, default: () => ({}) },
    
    // Battle Profile
    battle_profile: { type: BattleProfileSchema, default: () => ({}) },
    
    // Traits & Abilities
    unique_traits: [{ type: String }],
    special_abilities: [{ type: String }],
    
    // Media
    image: { 
        type: String, 
        default: '' 
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt
    collection: 'animals'
});

// Virtual for total stats
AnimalSchema.virtual('totalStats').get(function() {
    return this.attack + this.defense + this.agility + this.stamina + this.intelligence + this.special_attack;
});

// Virtual for combat score (used in fights)
AnimalSchema.virtual('combatScore').get(function() {
    return (this.attack * 2) + (this.defense * 1.5) + (this.agility * 1.5) + 
           (this.intelligence * 1.2) + this.stamina + (this.special_attack * 0.8);
});

// Ensure virtuals are included in JSON output
AnimalSchema.set('toJSON', { virtuals: true });
AnimalSchema.set('toObject', { virtuals: true });

// Text index for search
AnimalSchema.index({ 
    name: 'text', 
    scientific_name: 'text', 
    description: 'text',
    habitat: 'text'
});

// Compound indexes for common queries
AnimalSchema.index({ type: 1, class: 1 });
AnimalSchema.index({ attack: -1, defense: -1 });

// Static method to find by name (case-insensitive)
AnimalSchema.statics.findByName = function(name) {
    return this.findOne({ name: new RegExp(`^${name}$`, 'i') });
};

// Static method to search animals
AnimalSchema.statics.search = function(query, filters = {}) {
    const searchQuery = {};
    
    if (query) {
        searchQuery.$text = { $search: query };
    }
    
    if (filters.type && filters.type !== 'all') {
        searchQuery.type = filters.type;
    }
    
    if (filters.class && filters.class !== 'all') {
        searchQuery.class = filters.class;
    }
    
    if (filters.size && filters.size !== 'all') {
        searchQuery.size = filters.size;
    }
    
    return this.find(searchQuery);
};

// Pre-save hook to ensure defaults
AnimalSchema.pre('save', function(next) {
    // Ensure diet is an array
    if (!Array.isArray(this.diet)) {
        this.diet = ['Varied'];
    }
    
    // Ensure unique_traits is an array
    if (!Array.isArray(this.unique_traits)) {
        this.unique_traits = [];
    }
    
    // Ensure special_abilities is an array
    if (!Array.isArray(this.special_abilities)) {
        this.special_abilities = [];
    }
    
    next();
});

// Prevent model recompilation in development
module.exports = mongoose.models.Animal || mongoose.model('Animal', AnimalSchema);
