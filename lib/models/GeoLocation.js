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
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        source: { type: String, default: 'fallback' }
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
