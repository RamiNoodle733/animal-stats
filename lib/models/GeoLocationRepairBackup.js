'use strict';

const mongoose = require('mongoose');

const GeoLocationRepairBackupSchema = new mongoose.Schema({
    release: { type: String, required: true, trim: true },
    locationKey: { type: String, required: true, trim: true },
    geoLocation: { type: mongoose.Schema.Types.Mixed, default: null },
    activities: {
        type: [{
            activityId: { type: mongoose.Schema.Types.ObjectId, required: true },
            coordinates: { type: mongoose.Schema.Types.Mixed, default: null }
        }],
        default: []
    },
    activityCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
}, {
    collection: 'geolocationrepairbackups',
    versionKey: false
});

GeoLocationRepairBackupSchema.index({ release: 1, locationKey: 1 }, { unique: true });

module.exports = mongoose.models.GeoLocationRepairBackup
    || mongoose.model('GeoLocationRepairBackup', GeoLocationRepairBackupSchema);
