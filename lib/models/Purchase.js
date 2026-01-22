/**
 * Purchase Model for MongoDB
 * Tracks all Battle Points purchases with Stripe integration
 * 
 * Security: BP is ONLY granted via webhook after payment confirmation
 */

const mongoose = require('mongoose');

const PurchaseSchema = new mongoose.Schema({
    // User who made the purchase
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    
    // Pack that was purchased (from server-defined packs)
    packId: {
        type: String,
        required: true,
        enum: ['pack_1000', 'pack_2800', 'pack_5000', 'pack_13500']
    },
    
    // Stripe identifiers for idempotency and tracking
    stripeCheckoutSessionId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    stripePaymentIntentId: {
        type: String,
        sparse: true,
        index: true
    },
    stripeCustomerId: {
        type: String,
        sparse: true
    },
    
    // Purchase status with clear state machine
    status: {
        type: String,
        enum: ['pending', 'paid', 'fulfilled', 'refunded', 'failed', 'partially_refunded'],
        default: 'pending',
        index: true
    },
    
    // Amount details (stored for record, but pack defines authoritative values)
    bpAmount: {
        type: Number,
        required: true,
        min: 0
    },
    bpGranted: {
        type: Number,
        default: 0,
        min: 0
    },
    priceUsd: {
        type: Number,
        required: true,
        min: 0
    },
    
    // Refund tracking
    refundedAt: Date,
    refundAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    bpDeducted: {
        type: Number,
        default: 0,
        min: 0
    },
    
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    paidAt: Date,
    fulfilledAt: Date,
    
    // Metadata
    metadata: {
        userEmail: String,
        username: String,
        ipAddress: String,
        userAgent: String
    }
}, {
    timestamps: true
});

// Compound index for user purchase history queries
PurchaseSchema.index({ userId: 1, createdAt: -1 });

// Index for finding unfulfilled paid purchases (for recovery)
PurchaseSchema.index({ status: 1, paidAt: 1 });

/**
 * Check if this purchase has already been fulfilled
 * Used to prevent double-grants on webhook retries
 */
PurchaseSchema.methods.isAlreadyFulfilled = function() {
    return this.status === 'fulfilled' || this.bpGranted > 0;
};

/**
 * Mark purchase as paid (from webhook)
 */
PurchaseSchema.methods.markPaid = function(paymentIntentId) {
    this.status = 'paid';
    this.paidAt = new Date();
    if (paymentIntentId) {
        this.stripePaymentIntentId = paymentIntentId;
    }
    return this.save();
};

/**
 * Mark purchase as fulfilled (BP granted)
 */
PurchaseSchema.methods.markFulfilled = function(bpGranted) {
    this.status = 'fulfilled';
    this.fulfilledAt = new Date();
    this.bpGranted = bpGranted;
    return this.save();
};

/**
 * Mark purchase as refunded
 */
PurchaseSchema.methods.markRefunded = function(refundAmount, bpDeducted) {
    this.status = this.bpGranted === bpDeducted ? 'refunded' : 'partially_refunded';
    this.refundedAt = new Date();
    this.refundAmount = refundAmount;
    this.bpDeducted = bpDeducted;
    return this.save();
};

// Prevent model recompilation in development
module.exports = mongoose.models.Purchase || mongoose.model('Purchase', PurchaseSchema);
