'use strict';

const mongoose = require('mongoose');

const GeoLocationRepairStateSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true, trim: true },
    release: { type: String, required: true, trim: true },
    leaseToken: { type: String, default: null },
    leaseExpiresAt: { type: Date, default: null },
    processed: { type: Number, default: 0 },
    repaired: { type: Number, default: 0 },
    unresolved: { type: Number, default: 0 },
    lastRunAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    lastError: { type: String, default: null }
}, {
    timestamps: true,
    collection: 'geolocationrepairstate'
});

module.exports = mongoose.models.GeoLocationRepairState
    || mongoose.model('GeoLocationRepairState', GeoLocationRepairStateSchema);
