/**
 * ============================================
 * COMPARE PAGE ENHANCEMENTS - compare-page.js
 * ============================================
 * 
 * PS3-era fighting game intro animation and VS badge system.
 * 
 * REPLACEABLE SLOT CONTRACT:
 * --------------------------
 * To replace the default VS badge with your own:
 * 
 * Option 1 - External SVG file:
 *   Place your custom badge at: /assets/ui/vs-badge.svg
 *   Call: ComparePageEnhancements.loadExternalVsBadge('/assets/ui/vs-badge.svg')
 * 
 * Option 2 - Inline SVG:
 *   Replace contents of .vs-badge-default element
 * 
 * Option 3 - Via JavaScript:
 *   ComparePageEnhancements.setCustomVsBadge('<svg>...</svg>')
 *   or
 *   ComparePageEnhancements.setCustomVsBadge(htmlElement)
 */

(function() {
    'use strict';

    const ComparePageEnhancements = {
        // Track if intro has played this session for current matchup
        lastMatchupKey: null,
        introPlaying: false,
        introTimeout: null,
        
        // Flag to prevent intro on initial page load
        initialLoadComplete: false,

        /**
         * Initialize compare page enhancements
         */
        init() {
            this.injectIntroOverlay();
            this.injectHudBrackets();
            this.setupVsBadgeSlot();
            this.setupEventListeners();
            this.tryLoadExternalVsBadge();
            
            // Mark initial load complete after a short delay
            // This prevents intro from playing when page first loads with existing matchup
            setTimeout(() => {
                this.initialLoadComplete = true;
            }, 1500);
        },

        /**
         * Inject the matchup intro overlay HTML
         */
        injectIntroOverlay() {
            if (document.getElementById('matchupIntroOverlay')) return;

            const overlay = document.createElement('div');
            overlay.id = 'matchupIntroOverlay';
            overlay.innerHTML = `
                <div class="intro-light-sweep"></div>
                <div class="intro-matchup-stage">
                    <div class="intro-fighter left">
                        <img class="intro-fighter-image" id="introFighter1Img" src="" alt="">
                        <div class="intro-fighter-name" id="introFighter1Name">???</div>
                    </div>
                    <div class="intro-vs-badge">
                        <div class="intro-vs-text">VS</div>
                    </div>
                    <div class="intro-fighter right">
                        <img class="intro-fighter-image" id="introFighter2Img" src="" alt="">
                        <div class="intro-fighter-name" id="introFighter2Name">???</div>
                    </div>
                </div>
                <div class="intro-skip-hint">Click or press ESC to skip</div>
            `;

            document.body.appendChild(overlay);

            // Click to skip
            overlay.addEventListener('click', () => this.skipIntro());
        },

        /**
         * Inject HUD corner brackets into fighter displays
         */
        injectHudBrackets() {
            const fighterDisplays = document.querySelectorAll('#compare-view .fighter-display');
            fighterDisplays.forEach(display => {
                if (display.querySelector('.hud-bracket-tl')) return;
                
                display.insertAdjacentHTML('beforeend', `
                    <div class="hud-bracket-tl"></div>
                    <div class="hud-bracket-tr"></div>
                    <div class="hud-bracket-bl"></div>
                    <div class="hud-bracket-br"></div>
                `);
            });
        },

        /**
         * Setup the VS badge slot with default placeholder
         */
        setupVsBadgeSlot() {
            const fightCenter = document.querySelector('#compare-view .fight-center');
            if (!fightCenter || document.getElementById('vsBadgeSlot')) return;

            // Create the replaceable slot
            const slot = document.createElement('div');
            slot.id = 'vsBadgeSlot';
            slot.setAttribute('data-ui-slot', 'vs-badge');
            slot.innerHTML = `
                <!-- External badge loader (set src to use custom badge) -->
                <img id="vsBadgeExternal" src="" alt="VS" style="display:none;">
                
                <!-- Default VS badge placeholder - replace this with your own design -->
                <div class="vs-badge-default">
                    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                        <!-- Outer glow ring -->
                        <defs>
                            <filter id="vsGlow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
                                <feMerge>
                                    <feMergeNode in="blur"/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>
                            <linearGradient id="vsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:#ff6b00"/>
                                <stop offset="50%" style="stop-color:#ff3300"/>
                                <stop offset="100%" style="stop-color:#ff8800"/>
                            </linearGradient>
                            <linearGradient id="vsBorderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:#ffd700"/>
                                <stop offset="100%" style="stop-color:#ff6b00"/>
                            </linearGradient>
                        </defs>
                        
                        <!-- Background hexagon -->
                        <polygon points="60,5 110,32.5 110,87.5 60,115 10,87.5 10,32.5" 
                                 fill="rgba(0,0,0,0.8)" 
                                 stroke="url(#vsBorderGradient)" 
                                 stroke-width="3"
                                 filter="url(#vsGlow)"/>
                        
                        <!-- Inner accent ring -->
                        <polygon points="60,15 100,37.5 100,82.5 60,105 20,82.5 20,37.5" 
                                 fill="none" 
                                 stroke="rgba(255,107,0,0.4)" 
                                 stroke-width="1"/>
                        
                        <!-- VS Text -->
                        <text x="60" y="72" 
                              text-anchor="middle" 
                              font-family="Bebas Neue, sans-serif" 
                              font-size="48" 
                              font-weight="bold"
                              fill="url(#vsGradient)"
                              filter="url(#vsGlow)">VS</text>
                        
                        <!-- Top accent -->
                        <line x1="35" y1="25" x2="85" y2="25" 
                              stroke="#ffd700" 
                              stroke-width="2" 
                              opacity="0.6"/>
                        
                        <!-- Bottom accent -->
                        <line x1="35" y1="95" x2="85" y2="95" 
                              stroke="#ffd700" 
                              stroke-width="2" 
                              opacity="0.6"/>
                    </svg>
                </div>
            `;

            fightCenter.appendChild(slot);
        },

        /**
         * Try to load external VS badge if exists
         */
        tryLoadExternalVsBadge() {
            // Check if custom asset exists at default path
            const img = new Image();
            img.onload = () => {
                this.loadExternalVsBadge('/assets/ui/vs-badge.svg');
            };
            img.onerror = () => {
                // No external badge, use default
                console.log('[Compare] Using default VS badge. Place custom at /assets/ui/vs-badge.svg');
            };
            img.src = '/assets/ui/vs-badge.svg';
        },

        /**
         * Load an external VS badge SVG/image
         * @param {string} url - Path to the badge asset
         */
        loadExternalVsBadge(url) {
            const external = document.getElementById('vsBadgeExternal');
            if (!external) return;

            external.onload = () => {
                external.classList.add('loaded');
            };
            external.onerror = () => {
                console.warn('[Compare] Failed to load external VS badge:', url);
                external.classList.remove('loaded');
            };
            external.src = url;
        },

        /**
         * Set a custom VS badge via HTML string or element
         * @param {string|HTMLElement} content - SVG string or element
         */
        setCustomVsBadge(content) {
            const slot = document.getElementById('vsBadgeSlot');
            if (!slot) return;

            const defaultBadge = slot.querySelector('.vs-badge-default');
            const external = slot.querySelector('#vsBadgeExternal');

            if (external) external.style.display = 'none';
            
            if (typeof content === 'string') {
                if (defaultBadge) {
                    defaultBadge.innerHTML = content;
                }
            } else if (content instanceof HTMLElement) {
                if (defaultBadge) {
                    defaultBadge.innerHTML = '';
                    defaultBadge.appendChild(content);
                }
            }
        },

        /**
         * Setup event listeners
         */
        setupEventListeners() {
            // ESC to skip intro
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.introPlaying) {
                    this.skipIntro();
                }
            });

            // Watch for compare animal changes to trigger intro
            this.observeCompareChanges();
        },

        /**
         * Watch for changes in compare state
         */
        observeCompareChanges() {
            // Hook into the app's state if available
            const checkAndTrigger = () => {
                if (typeof window.app !== 'undefined' && window.app.state) {
                    const { left, right } = window.app.state.compare || {};
                    if (left && right) {
                        const key = `${left.name}|${right.name}`;
                        if (key !== this.lastMatchupKey) {
                            this.lastMatchupKey = key;
                            this.triggerMatchupIntro(left, right);
                        }
                    }
                }
            };

            // Check periodically when in compare view
            setInterval(() => {
                const compareView = document.getElementById('compare-view');
                if (compareView && compareView.classList.contains('active-view')) {
                    checkAndTrigger();
                }
            }, 500);
        },

        /**
         * Trigger the matchup intro animation
         * @param {Object} left - Left animal data
         * @param {Object} right - Right animal data
         */
        triggerMatchupIntro(left, right) {
            // Don't play if already playing
            if (this.introPlaying) return;
            
            // Don't play on initial page load - only on actual matchup changes
            if (!this.initialLoadComplete) return;

            const overlay = document.getElementById('matchupIntroOverlay');
            if (!overlay) return;

            // Set fighter data
            const img1 = document.getElementById('introFighter1Img');
            const name1 = document.getElementById('introFighter1Name');
            const img2 = document.getElementById('introFighter2Img');
            const name2 = document.getElementById('introFighter2Name');

            if (img1) img1.src = left.image || '';
            if (name1) name1.textContent = left.name.toUpperCase();
            if (img2) img2.src = right.image || '';
            if (name2) name2.textContent = right.name.toUpperCase();

            // Reset animation classes
            const fighters = overlay.querySelectorAll('.intro-fighter');
            const vsBadge = overlay.querySelector('.intro-vs-badge');
            const lightSweep = overlay.querySelector('.intro-light-sweep');

            fighters.forEach(f => f.classList.remove('animate-in'));
            if (vsBadge) vsBadge.classList.remove('animate-in');
            if (lightSweep) lightSweep.classList.remove('animate');

            // Show overlay
            this.introPlaying = true;
            overlay.classList.add('active');

            // Animate sequence
            setTimeout(() => {
                fighters[0]?.classList.add('animate-in');
            }, 100);

            setTimeout(() => {
                fighters[1]?.classList.add('animate-in');
            }, 250);

            setTimeout(() => {
                if (vsBadge) vsBadge.classList.add('animate-in');
                if (lightSweep) lightSweep.classList.add('animate');
                
                // Pulse the main VS badge slot
                const slot = document.getElementById('vsBadgeSlot');
                if (slot) {
                    slot.classList.remove('vs-active');
                    void slot.offsetWidth; // Force reflow
                    slot.classList.add('vs-active');
                }
            }, 500);

            // Auto-hide after animation completes
            this.introTimeout = setTimeout(() => {
                this.hideIntro();
            }, 1200);
            
            // Safety timeout - ensure intro never blocks for more than 3 seconds
            setTimeout(() => {
                if (this.introPlaying) {
                    console.warn('[Compare] Safety timeout - forcing intro hide');
                    this.hideIntro();
                }
            }, 3000);
        },

        /**
         * Skip the intro animation
         */
        skipIntro() {
            if (!this.introPlaying) return;
            
            if (this.introTimeout) {
                clearTimeout(this.introTimeout);
                this.introTimeout = null;
            }
            
            this.hideIntro();
        },

        /**
         * Hide the intro overlay
         */
        hideIntro() {
            const overlay = document.getElementById('matchupIntroOverlay');
            if (overlay) {
                overlay.classList.remove('active');
            }
            this.introPlaying = false;
        }
    };

    // Expose globally
    window.ComparePageEnhancements = ComparePageEnhancements;

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => ComparePageEnhancements.init());
    } else {
        ComparePageEnhancements.init();
    }

})();
