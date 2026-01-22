/**
 * BP Transaction Model for MongoDB
 * Ledger-style tracking of all Battle Points changes
 * 
 * Every BP change (purchase, reward, spend, refund) creates a transaction
 * This provides full audit trail and enables balance reconciliation
 */

const mongoose = require('mongoose');

const BpTransactionSchema = new mongoose.Schema({
    // User whose BP changed
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    
    // Transaction type
    type: {
        type: String,
        required: true,
        enum: [
            'purchase',           // Bought BP with real money
            'purchase_refund',    // Refund deduction
            'daily_reward',       // Daily login reward
            'level_up',           // Level up bonus
            'prestige_bonus',     // Prestige reset bonus
            'achievement',        // Achievement reward
            'tournament_prize',   // Tournament winnings
            'admin_grant',        // Manual admin grant
            'admin_deduct',       // Manual admin deduction
            'spend',              // Spent on shop item (future)
            'debt_payment'        // Paying off negative balance (future)
        ],
        index: true
    },
    
    // Amount changed (positive = gain, negative = loss)
    amount: {
        type: Number,
        required: true
    },
    
    // Balance after this transaction
    balanceAfter: {
        type: Number,
        required: true
    },
    
    // Reference to related purchase (if applicable)
    purchaseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Purchase',
        sparse: true
    },
    
    // Description for audit/display
    description: {
        type: String,
        required: true,
        maxlength: 200
    },
    
    // Metadata
    metadata: {
        packId: String,
        stripeSessionId: String,
        adminUserId: mongoose.Schema.Types.ObjectId,
        reason: String
    },
    
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

// Compound index for user transaction history
BpTransactionSchema.index({ userId: 1, createdAt: -1 });

// Index for finding transactions by type
BpTransactionSchema.index({ type: 1, createdAt: -1 });

/**
 * Static method to create a transaction and update user balance atomically
 * @param {Object} params - Transaction parameters
 * @returns {Promise<{transaction: BpTransaction, newBalance: number}>}
 */
BpTransactionSchema.statics.recordTransaction = async function(params) {
    const { userId, type, amount, description, purchaseId, metadata } = params;
    
    const User = mongoose.model('User');
    const session = await mongoose.startSession();
    
    try {
        session.startTransaction();
        
        // Update user balance atomically
        const user = await User.findByIdAndUpdate(
            userId,
            { $inc: { battlePoints: amount } },
            { new: true, session }
        );
        
        if (!user) {
            throw new Error('User not found');
        }
        
        // Create transaction record
        const transaction = new this({
            userId,
            type,
            amount,
            balanceAfter: user.battlePoints,
            description,
            purchaseId,
            metadata
        });
        
        await transaction.save({ session });
        
        await session.commitTransaction();
        
        return { transaction, newBalance: user.battlePoints };
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

/**
 * Get user's transaction history
 */
BpTransactionSchema.statics.getUserHistory = function(userId, limit = 50, skip = 0) {
    return this.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
};

/**
 * Calculate user's total BP from purchases (for reconciliation)
 */
BpTransactionSchema.statics.calculatePurchaseTotal = function(userId) {
    return this.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), type: 'purchase' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
};

// Prevent model recompilation in development
module.exports = mongoose.models.BpTransaction || mongoose.model('BpTransaction', BpTransactionSchema);
