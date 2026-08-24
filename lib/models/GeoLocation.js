/**
 * GeoLocation Model - Persistent lookup cache for location coordinates.
 */

const mongoose = require('mongoose');

const GeoLocationSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true
    },
    raw: {
        type: String,
        default: null
    },
    city: {
        type: String,
        default: null
    },
    region: {
        type: String,
        default: null
    },
    country: {
        type: String,
        default: null,
        index: true
    },
    coordinates: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null },
        source: { type: String, default: 'fallback' }
    },
    granularity: {
        type: String,
        enum: ['city', 'region', 'country', 'unknown'],
        default: 'unknown',
        index: true
    },
    confidence: {
        type: String,
        enum: ['high', 'medium', 'low', 'invalid'],
        default: 'invalid'
    },
    validationStatus: {
        type: String,
        enum: ['valid', 'unresolved', 'invalid'],
        default: 'unresolved',
        index: true
    },
    resolverVersion: {
        type: Number,
        default: 1
    },
    lastError: {
        type: String,
        default: null
    },
    hits: {
        type: Number,
        default: 0
    },
    lastResolvedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    collection: 'geolocationcache'
});

module.exports = mongoose.models.GeoLocation || mongoose.model('GeoLocation', GeoLocationSchema);
