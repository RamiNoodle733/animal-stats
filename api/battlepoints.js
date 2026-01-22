/**
 * Battle Points Shop API
 * 
 * Endpoints:
 * GET  /api/battlepoints?action=packs     - Get available BP packs
 * POST /api/battlepoints?action=checkout  - Create Stripe checkout session
 * POST /api/battlepoints?action=webhook   - Handle Stripe webhooks (signature verified)
 * GET  /api/battlepoints?action=history   - Get user's purchase history
 * 
 * SECURITY:
 * - Pack definitions are SERVER-ONLY (never trust client prices)
 * - BP is ONLY granted via webhook after Stripe confirms payment
 * - Webhook signature verification is REQUIRED
 * - Idempotency prevents double-grants on webhook retries
 */

const { connectToDatabase } = require('../lib/mongodb');
const User = require('../lib/models/User');
const Purchase = require('../lib/models/Purchase');
const BpTransaction = require('../lib/models/BpTransaction');
const { verifyToken } = require('../lib/auth');

// Stripe SDK - lazy loaded to avoid issues if not configured
let stripe = null;
function getStripe() {
    if (!stripe && process.env.STRIPE_SECRET_KEY) {
        stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    }
    return stripe;
}

// Buffer to collect raw body for webhooks
async function getRawBody(req) {
    return new Promise((resolve, reject) => {
        if (req.body && typeof req.body === 'string') {
            resolve(req.body);
            return;
        }
        
        if (req.body && Buffer.isBuffer(req.body)) {
            resolve(req.body.toString('utf8'));
            return;
        }
        
        // If body is already parsed as object by Vercel, we need to stringify it
        // This is a fallback - ideally we'd get the raw body
        if (req.body && typeof req.body === 'object') {
            resolve(JSON.stringify(req.body));
            return;
        }
        
        // Collect raw body from stream
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
    });
}

// ============================================
// SERVER-AUTHORITATIVE PACK DEFINITIONS
// ============================================
// These are the ONLY valid packs. Client CANNOT set prices or amounts.
const BP_PACKS = {
    pack_1000: {
        id: 'pack_1000',
        name: '1,000 BP',
        bpAmount: 1000,
        priceUsd: 4.99,
        ribbon: null,
        isBestValue: false,
        sortOrder: 1
    },
    pack_2800: {
        id: 'pack_2800',
        name: '2,800 BP',
        bpAmount: 2800,
        baseAmount: 2545, // What you'd get without bonus
        bonusPercent: 10,
        priceUsd: 12.99,
        ribbon: '10% EXTRA',
        isBestValue: false,
        sortOrder: 2
    },
    pack_5000: {
        id: 'pack_5000',
        name: '5,000 BP',
        bpAmount: 5000,
        baseAmount: 4098, // What you'd get without bonus
        bonusPercent: 22,
        priceUsd: 19.99,
        ribbon: '22% EXTRA',
        isBestValue: false,
        sortOrder: 3
    },
    pack_13500: {
        id: 'pack_13500',
        name: '13,500 BP',
        bpAmount: 13500,
        baseAmount: 10000, // What you'd get without bonus
        bonusPercent: 35,
        priceUsd: 49.99,
        ribbon: '35% EXTRA',
        isBestValue: true,
        sortOrder: 4
    }
};

// App base URL for redirects
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://animalbattlestats.com';

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Stripe-Signature');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const action = req.query.action;

    try {
        switch (action) {
            case 'packs':
                return handleGetPacks(req, res);
            
            case 'checkout':
                if (req.method !== 'POST') {
                    return res.status(405).json({ success: false, error: 'Method not allowed' });
                }
                await connectToDatabase();
                return handleCreateCheckout(req, res);
            
            case 'webhook':
                if (req.method !== 'POST') {
                    return res.status(405).json({ success: false, error: 'Method not allowed' });
                }
                await connectToDatabase();
                return handleWebhook(req, res);
            
            case 'history':
                if (req.method !== 'GET') {
                    return res.status(405).json({ success: false, error: 'Method not allowed' });
                }
                await connectToDatabase();
                return handleGetHistory(req, res);
            
            default:
                return res.status(400).json({
                    success: false,
                    error: 'Invalid action. Use ?action=packs, checkout, webhook, or history'
                });
        }
    } catch (error) {
        console.error('Battlepoints API error:', error);
        return res.status(500).json({ success: false, error: 'Server error' });
    }
};

// ============================================
// GET PACKS - Public endpoint
// ============================================
function handleGetPacks(req, res) {
    // Return packs sorted by sortOrder, without internal fields
    const packs = Object.values(BP_PACKS)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(pack => ({
            id: pack.id,
            name: pack.name,
            bpAmount: pack.bpAmount,
            bonusPercent: pack.bonusPercent || 0,
            priceUsd: pack.priceUsd,
            priceDisplay: `$${pack.priceUsd.toFixed(2)}`,
            ribbon: pack.ribbon,
            isBestValue: pack.isBestValue
        }));

    return res.status(200).json({
        success: true,
        packs
    });
}

// ============================================
// CREATE CHECKOUT SESSION
// ============================================
async function handleCreateCheckout(req, res) {
    // Verify user is logged in
    const auth = await verifyToken(req);
    if (!auth.success) {
        return res.status(401).json({
            success: false,
            error: 'Please log in to purchase BP',
            requiresLogin: true
        });
    }

    const stripeClient = getStripe();
    if (!stripeClient) {
        return res.status(500).json({
            success: false,
            error: 'Payment system not configured'
        });
    }

    const { packId } = req.body;

    // Validate pack ID against server-defined packs
    const pack = BP_PACKS[packId];
    if (!pack) {
        return res.status(400).json({
            success: false,
            error: 'Invalid pack selected'
        });
    }

    try {
        // Get user for metadata
        const user = await User.findById(auth.userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Create Stripe Checkout Session
        const session = await stripeClient.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `${pack.name} - Animal Battle Stats`,
                        description: `${pack.bpAmount.toLocaleString()} Battle Points${pack.bonusPercent ? ` (includes ${pack.bonusPercent}% bonus!)` : ''}`,
                        images: [`${APP_BASE_URL}/images/bp-pack-${pack.id}.png`],
                        metadata: {
                            packId: pack.id,
                            bpAmount: pack.bpAmount.toString()
                        }
                    },
                    unit_amount: Math.round(pack.priceUsd * 100) // Convert to cents
                },
                quantity: 1
            }],
            mode: 'payment',
            success_url: `${APP_BASE_URL}/battlepoints?success=1&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${APP_BASE_URL}/battlepoints?canceled=1`,
            client_reference_id: auth.userId.toString(),
            customer_email: user.email,
            metadata: {
                userId: auth.userId.toString(),
                username: user.username,
                packId: pack.id,
                bpAmount: pack.bpAmount.toString()
            },
            // Enable automatic payment methods (includes Apple Pay, Google Pay)
            automatic_payment_methods: {
                enabled: true
            }
        });

        // Create pending purchase record
        const purchase = new Purchase({
            userId: auth.userId,
            packId: pack.id,
            stripeCheckoutSessionId: session.id,
            bpAmount: pack.bpAmount,
            priceUsd: pack.priceUsd,
            status: 'pending',
            metadata: {
                userEmail: user.email,
                username: user.username,
                ipAddress: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
                userAgent: req.headers['user-agent']
            }
        });
        await purchase.save();

        return res.status(200).json({
            success: true,
            checkoutUrl: session.url,
            sessionId: session.id
        });

    } catch (error) {
        console.error('Checkout creation error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to create checkout session'
        });
    }
}

// ============================================
// STRIPE WEBHOOK HANDLER
// ============================================
async function handleWebhook(req, res) {
    const stripeClient = getStripe();
    if (!stripeClient) {
        return res.status(500).json({ error: 'Stripe not configured' });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.error('STRIPE_WEBHOOK_SECRET not configured');
        return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    // Get raw body for signature verification
    const signature = req.headers['stripe-signature'];
    let event;

    try {
        // Get raw body - handles various Vercel body formats
        const rawBody = await getRawBody(req);
        
        event = stripeClient.webhooks.constructEvent(
            rawBody,
            signature,
            webhookSecret
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    // Handle the event
    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object);
                break;
            
            case 'payment_intent.succeeded':
                // Usually handled via checkout.session.completed, but good to have
                console.log('Payment intent succeeded:', event.data.object.id);
                break;
            
            case 'charge.refunded':
                await handleRefund(event.data.object);
                break;
            
            case 'charge.dispute.created':
                await handleDispute(event.data.object);
                break;
            
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return res.status(200).json({ received: true });

    } catch (error) {
        console.error('Webhook processing error:', error);
        // Return 200 to prevent Stripe from retrying (we logged the error)
        return res.status(200).json({ received: true, error: error.message });
    }
}

/**
 * Handle successful checkout - GRANT BP HERE
 * This is the ONLY place BP should be granted for purchases
 */
async function handleCheckoutCompleted(session) {
    const { id: sessionId, client_reference_id: userId, metadata, payment_intent } = session;

    // Find the purchase record
    let purchase = await Purchase.findOne({ stripeCheckoutSessionId: sessionId });

    if (!purchase) {
        console.error('Purchase not found for session:', sessionId);
        // Create purchase record if it doesn't exist (edge case)
        if (metadata?.userId && metadata?.packId) {
            const pack = BP_PACKS[metadata.packId];
            if (pack) {
                purchase = new Purchase({
                    userId: metadata.userId,
                    packId: metadata.packId,
                    stripeCheckoutSessionId: sessionId,
                    stripePaymentIntentId: payment_intent,
                    bpAmount: pack.bpAmount,
                    priceUsd: pack.priceUsd,
                    status: 'pending'
                });
            }
        }
        if (!purchase) {
            throw new Error('Could not find or create purchase record');
        }
    }

    // IDEMPOTENCY CHECK - Prevent double-grants
    if (purchase.isAlreadyFulfilled()) {
        console.log('Purchase already fulfilled, skipping:', sessionId);
        return;
    }

    // Update purchase with payment info
    purchase.stripePaymentIntentId = payment_intent;
    purchase.paidAt = new Date();
    purchase.status = 'paid';
    await purchase.save();

    // Grant BP using transaction ledger
    const pack = BP_PACKS[purchase.packId];
    const bpToGrant = pack?.bpAmount || purchase.bpAmount;

    try {
        const { newBalance } = await BpTransaction.recordTransaction({
            userId: purchase.userId,
            type: 'purchase',
            amount: bpToGrant,
            description: `Purchased ${pack?.name || purchase.packId}`,
            purchaseId: purchase._id,
            metadata: {
                packId: purchase.packId,
                stripeSessionId: sessionId
            }
        });

        // Mark purchase as fulfilled
        await purchase.markFulfilled(bpToGrant);

        console.log(`Granted ${bpToGrant} BP to user ${purchase.userId}. New balance: ${newBalance}`);

    } catch (error) {
        console.error('Failed to grant BP:', error);
        purchase.status = 'paid'; // Keep as paid, not fulfilled - can retry
        await purchase.save();
        throw error;
    }
}

/**
 * Handle refunds
 */
async function handleRefund(charge) {
    // Find purchase by payment intent
    const purchase = await Purchase.findOne({
        stripePaymentIntentId: charge.payment_intent
    });

    if (!purchase) {
        console.log('No purchase found for refund:', charge.payment_intent);
        return;
    }

    if (purchase.status === 'refunded') {
        console.log('Refund already processed:', charge.payment_intent);
        return;
    }

    // Calculate BP to deduct
    const bpToDeduct = purchase.bpGranted;
    
    try {
        // Get current user balance
        const user = await User.findById(purchase.userId);
        if (!user) {
            throw new Error('User not found for refund');
        }

        // Record refund transaction (this will go negative if needed)
        await BpTransaction.recordTransaction({
            userId: purchase.userId,
            type: 'purchase_refund',
            amount: -bpToDeduct,
            description: `Refund: ${BP_PACKS[purchase.packId]?.name || purchase.packId}`,
            purchaseId: purchase._id,
            metadata: {
                packId: purchase.packId,
                reason: 'stripe_refund'
            }
        });

        // Mark purchase as refunded
        await purchase.markRefunded(charge.amount_refunded / 100, bpToDeduct);

        console.log(`Refund processed: ${bpToDeduct} BP deducted from user ${purchase.userId}`);

    } catch (error) {
        console.error('Failed to process refund:', error);
        throw error;
    }
}

/**
 * Handle disputes (chargebacks)
 * TODO: Implement full dispute handling
 * For now, log and mark for manual review
 */
async function handleDispute(dispute) {
    console.warn('DISPUTE RECEIVED:', {
        id: dispute.id,
        charge: dispute.charge,
        amount: dispute.amount,
        reason: dispute.reason
    });

    // Find related purchase
    const charge = await getStripe().charges.retrieve(dispute.charge);
    if (charge?.payment_intent) {
        const purchase = await Purchase.findOne({
            stripePaymentIntentId: charge.payment_intent
        });
        if (purchase) {
            // Mark purchase with dispute info
            purchase.metadata = purchase.metadata || {};
            purchase.metadata.disputeId = dispute.id;
            purchase.metadata.disputeReason = dispute.reason;
            purchase.metadata.disputeCreatedAt = new Date();
            await purchase.save();
        }
    }

    // TODO: Send alert to admin, potentially deduct BP
    // For now, disputes require manual handling
}

// ============================================
// GET PURCHASE HISTORY
// ============================================
async function handleGetHistory(req, res) {
    const auth = await verifyToken(req);
    if (!auth.success) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    try {
        const purchases = await Purchase.find({ 
            userId: auth.userId,
            status: { $in: ['paid', 'fulfilled', 'refunded'] }
        })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

        const history = purchases.map(p => ({
            id: p._id,
            packName: BP_PACKS[p.packId]?.name || p.packId,
            bpAmount: p.bpGranted || p.bpAmount,
            priceUsd: p.priceUsd,
            status: p.status,
            purchasedAt: p.fulfilledAt || p.paidAt || p.createdAt
        }));

        return res.status(200).json({
            success: true,
            purchases: history
        });

    } catch (error) {
        console.error('Get history error:', error);
        return res.status(500).json({ success: false, error: 'Failed to load history' });
    }
}
