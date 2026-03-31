/**
 * SiteActivity Model - Persistent cumulative analytics events.
 */

const mongoose = require('mongoose');

const SiteActivitySchema = new mongoose.Schema({
    discordMessageId: {
        type: String,
        index: true,
        sparse: true,
        unique: true,
        trim: true
    },
    source: {
        type: String,
        enum: ['live', 'import'],
        default: 'live',
        index: true
    },
    eventType: {
        type: String,
        required: true,
        index: true,
        trim: true
    },
    occurredAt: {
        type: Date,
        required: true,
        default: Date.now,
        index: true
    },
    username: {
        type: String,
        default: 'Anonymous',
        index: true,
        trim: true
    },
    visitorHash: {
        type: String,
        default: null,
        index: true
    },
    page: {
        type: String,
        default: null,
        index: true,
        trim: true
    },
    locationKey: {
        type: String,
        default: null,
        index: true
    },
    locationRaw: {
        type: String,
        default: null
    },
    city: {
        type: String,
        default: null,
        index: true
    },
    region: {
        type: String,
        default: null,
        index: true
    },
    country: {
        type: String,
        default: null,
        index: true
    },
    coordinates: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null },
        source: { type: String, default: null }
    },
    device: {
        type: String,
        default: null,
        index: true
    },
    browser: {
        type: String,
        default: null,
        index: true
    },
    os: {
        type: String,
        default: null,
        index: true
    },
    screenSize: {
        type: String,
        default: null
    },
    language: {
        type: String,
        default: null
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true,
    collection: 'siteactivity'
});

SiteActivitySchema.index({ locationKey: 1, occurredAt: -1 });
SiteActivitySchema.index({ eventType: 1, occurredAt: -1 });
SiteActivitySchema.index({ page: 1, occurredAt: -1 });
SiteActivitySchema.index({ visitorHash: 1, occurredAt: -1 });

module.exports = mongoose.models.SiteActivity || mongoose.model('SiteActivity', SiteActivitySchema);
