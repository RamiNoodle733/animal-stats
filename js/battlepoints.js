/**
 * Battle Points Shop Manager (Coming Soon Version)
 * 
 * Shows a preview of the BP shop with greyed-out packs
 * Full functionality will be enabled when we upgrade to Pro plan
 */

'use strict';

class BattlepointsManager {
    constructor(app) {
        this.app = app;
        this.hasRendered = false;
        
        // Preview packs (static, not purchasable)
        this.previewPacks = [
            { id: 'pack_1000', name: '1,000 BP', bpAmount: 1000, priceDisplay: '$4.99', ribbon: null, isBestValue: false },
            { id: 'pack_2800', name: '2,800 BP', bpAmount: 2800, priceDisplay: '$12.99', ribbon: '10% EXTRA', isBestValue: false },
            { id: 'pack_5000', name: '5,000 BP', bpAmount: 5000, priceDisplay: '$19.99', ribbon: '22% EXTRA', isBestValue: false },
            { id: 'pack_13500', name: '13,500 BP', bpAmount: 13500, priceDisplay: '$49.99', ribbon: '35% EXTRA', isBestValue: true }
        ];
        
        // DOM elements
        this.dom = {};
    }
    
    /**
     * Initialize the manager
     */
    init() {
        this.cacheElements();
    }
    
    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.dom = {
            view: document.getElementById('battlepoints-view'),
            packsGrid: document.getElementById('bp-packs-grid'),
            balance: document.getElementById('bp-shop-balance')
        };
    }
    
    /**
     * Called when entering the battlepoints view
     */
    onViewEnter() {
        // Update balance display
        this.updateBalanceDisplay();
        
        // Render preview packs (once)
        if (!this.hasRendered) {
            this.renderPreviewPacks();
            this.hasRendered = true;
        }
    }
    
    /**
     * Update the balance display
     */
    updateBalanceDisplay() {
        if (!this.dom.balance) return;
        
        const user = window.Auth?.getUser();
        const bp = user?.battlePoints || 0;
        this.dom.balance.textContent = bp.toLocaleString();
    }
    
    /**
     * Render static preview packs (greyed out)
     */
    renderPreviewPacks() {
        if (!this.dom.packsGrid) return;
        
        const packsHtml = this.previewPacks.map(pack => this.renderPackCard(pack)).join('');
        this.dom.packsGrid.innerHTML = packsHtml;
    }
    
    /**
     * Render a single pack card (disabled preview)
     */
    renderPackCard(pack) {
        const ribbonHtml = pack.ribbon 
            ? `<div class="bp-pack-ribbon">${pack.ribbon}</div>` 
            : '';
        
        const bestValueClass = pack.isBestValue ? 'best-value' : '';
        
        return `
            <div class="bp-pack-card bp-pack-disabled ${bestValueClass}">
                ${ribbonHtml}
                <div class="bp-pack-icon">
                    <div class="bp-pack-coin">
                        <span class="bp-icon">⚔</span>
                    </div>
                </div>
                <div class="bp-pack-amount">${pack.bpAmount.toLocaleString()}</div>
                <div class="bp-pack-label">Battle Points</div>
                <div class="bp-pack-price">${pack.priceDisplay}</div>
                <button class="bp-pack-btn" disabled>
                    COMING SOON
                </button>
            </div>
        `;
    }
}

// Create global instance
window.BattlepointsManager = BattlepointsManager;
