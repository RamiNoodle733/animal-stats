/**
 * ============================================
 * COMPARE PAGE ENHANCEMENTS - compare-page.js
 * ============================================
 * 
 * PS3-era fighting game intro animation, VS badge system, and result overlay.
 * 
 * TRIGGER RULES:
 * - Intro animation ONLY triggers when FIGHT button is pressed
 * - NO intro on animal selection
 * - After intro completes, result overlay is shown
 * 
 * PUBLIC API:
 * - ComparePageEnhancements.playFightSequence(left, right, result) - Call from FIGHT handler
 * - ComparePageEnhancements.setCustomVsBadge(content) - Custom VS badge
 * - ComparePageEnhancements.loadExternalVsBadge(url) - Load external VS badge
 */

(function() {
    'use strict';

    const ComparePageEnhancements = {
        // State tracking
        introPlaying: false,
        introTimeout: null,
        resultOverlayActive: false,
        _pendingResult: null,

        /**
         * Initialize compare page enhancements
         */
        init() {
            this.injectIntroOverlay();
            this.injectResultOverlay();
            this.injectHudBrackets();
            this.setupVsBadgeSlot();
            this.setupEventListeners();
            this.tryLoadExternalVsBadge();
            
            console.log('[Compare] Enhancements initialized - intro triggers on FIGHT only');
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
         * Inject the result reveal overlay HTML
         */
        injectResultOverlay() {
            if (document.getElementById('fightResultOverlay')) return;

            const overlay = document.createElement('div');
            overlay.id = 'fightResultOverlay';
            overlay.innerHTML = `
                <div class="result-backdrop"></div>
                <div class="result-container">
                    <button class="result-close-btn" id="resultCloseBtn"><i class="fas fa-times"></i></button>
                    
                    <div class="result-banner-slot" data-ui-slot="result-banner">
                        <div class="result-banner-default">
                            <div class="result-crown"><i class="fas fa-crown"></i></div>
                            <div class="result-title">WINNER</div>
                        </div>
                    </div>
                    
                    <div class="result-winner-section">
                        <div class="result-winner-glow"></div>
                        <img class="result-winner-image" id="resultWinnerImg" src="" alt="">
                        <div class="result-winner-name" id="resultWinnerName">???</div>
                        <div class="result-probability-badge" id="resultProbBadge">
                            <span class="prob-value">50%</span>
                            <span class="prob-label">WIN CHANCE</span>
                        </div>
                    </div>
                    
                    <div class="result-vs-divider">
                        <div class="result-vs-line"></div>
                        <span class="result-vs-text">VS</span>
                        <div class="result-vs-line"></div>
                    </div>
                    
                    <div class="result-loser-section">
                        <img class="result-loser-image" id="resultLoserImg" src="" alt="">
                        <div class="result-loser-info">
                            <div class="result-loser-name" id="resultLoserName">???</div>
                            <div class="result-loser-prob" id="resultLoserProb">50% chance</div>
                        </div>
                    </div>
                    
                    <div class="result-breakdown">
                        <div class="breakdown-header">
                            <i class="fas fa-chart-bar"></i>
                            <span>FIGHT BREAKDOWN</span>
                        </div>
                        <div class="breakdown-scores">
                            <div class="score-item winner">
                                <span class="score-name" id="breakdownWinnerName">Winner</span>
                                <span class="score-value" id="breakdownWinnerScore">0.0</span>
                            </div>
                            <div class="score-item loser">
                                <span class="score-name" id="breakdownLoserName">Loser</span>
                                <span class="score-value" id="breakdownLoserScore">0.0</span>
                            </div>
                        </div>
                        <div class="breakdown-bar">
                            <div class="breakdown-bar-fill winner" id="breakdownBarWinner"></div>
                            <div class="breakdown-bar-fill loser" id="breakdownBarLoser"></div>
                        </div>
                        <div class="breakdown-stats" id="breakdownStats"></div>
                    </div>
                    
                    <div class="result-actions">
                        <button class="result-btn primary" id="resultRunAgainBtn">
                            <i class="fas fa-redo"></i> RUN AGAIN
                        </button>
                        <button class="result-btn secondary" id="resultCloseBtn2">
                            <i class="fas fa-check"></i> CLOSE
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            // Event listeners
            document.getElementById('resultCloseBtn').addEventListener('click', () => this.hideResult());
            document.getElementById('resultCloseBtn2').addEventListener('click', () => this.hideResult());
            document.getElementById('resultRunAgainBtn').addEventListener('click', () => {
                this.hideResult();
                if (typeof window.app !== 'undefined' && window.app.startFight) {
                    setTimeout(() => window.app.startFight(), 300);
                }
            });
            overlay.querySelector('.result-backdrop').addEventListener('click', () => this.hideResult());
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
            // ESC to skip intro or close result
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    if (this.introPlaying) {
                        this.skipIntro();
                    }
                    if (this.resultOverlayActive) {
                        this.hideResult();
                    }
                }
            });
        },

        /**
         * Trigger the matchup intro animation - only called via playFightSequence
         * @param {Object} left - Left animal data
         * @param {Object} right - Right animal data
         */
        triggerMatchupIntro(left, right) {
            // Don't play if already playing
            if (this.introPlaying) return;

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

            // Auto-hide after animation completes, then show result if pending
            this.introTimeout = setTimeout(() => {
                this.hideIntro();
                // Show result if we have one pending
                if (this._pendingResult) {
                    setTimeout(() => this.showResult(this._pendingResult), 100);
                }
            }, 1200);
            
            // Safety timeout - ensure intro never blocks for more than 3 seconds
            setTimeout(() => {
                if (this.introPlaying) {
                    console.warn('[Compare] Safety timeout - forcing intro hide');
                    this.hideIntro();
                    if (this._pendingResult) {
                        setTimeout(() => this.showResult(this._pendingResult), 100);
                    }
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
            
            // Show result immediately if pending
            if (this._pendingResult) {
                setTimeout(() => this.showResult(this._pendingResult), 100);
            }
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
        },

        /**
         * PUBLIC API: Play the full fight sequence (intro → result)
         * Called from script.js startFight() instead of alert()
         * @param {Object} left - Left animal data
         * @param {Object} right - Right animal data  
         * @param {Object} result - Fight result { winner, loser, winnerScore, loserScore, winnerProb, loserProb }
         */
        playFightSequence(left, right, result) {
            // Store the result to show after intro
            this._pendingResult = {
                left,
                right,
                ...result
            };

            // Play intro animation first
            this.triggerMatchupIntro(left, right);
        },

        /**
         * Show the result overlay
         * @param {Object} result - { winner, loser, winnerScore, loserScore, winnerProb, loserProb, left, right }
         */
        showResult(result) {
            const overlay = document.getElementById('fightResultOverlay');
            if (!overlay) return;

            this._pendingResult = null;
            this.resultOverlayActive = true;

            // Populate winner section
            const winnerImg = document.getElementById('resultWinnerImg');
            const winnerName = document.getElementById('resultWinnerName');
            const probBadge = document.getElementById('resultProbBadge');

            if (winnerImg) winnerImg.src = result.winner.image || '';
            if (winnerName) winnerName.textContent = result.winner.name.toUpperCase();
            if (probBadge) {
                probBadge.querySelector('.prob-value').textContent = `${result.winnerProb.toFixed(1)}%`;
            }

            // Populate loser section
            const loserImg = document.getElementById('resultLoserImg');
            const loserName = document.getElementById('resultLoserName');
            const loserProb = document.getElementById('resultLoserProb');

            if (loserImg) loserImg.src = result.loser.image || '';
            if (loserName) loserName.textContent = result.loser.name;
            if (loserProb) loserProb.textContent = `${result.loserProb.toFixed(1)}% chance`;

            // Populate breakdown scores
            document.getElementById('breakdownWinnerName').textContent = result.winner.name;
            document.getElementById('breakdownLoserName').textContent = result.loser.name;
            document.getElementById('breakdownWinnerScore').textContent = result.winnerScore.toFixed(1);
            document.getElementById('breakdownLoserScore').textContent = result.loserScore.toFixed(1);

            // Calculate bar widths
            const totalScore = result.winnerScore + result.loserScore;
            const winnerPct = totalScore > 0 ? (result.winnerScore / totalScore * 100) : 50;
            const loserPct = 100 - winnerPct;

            document.getElementById('breakdownBarWinner').style.width = `${winnerPct}%`;
            document.getElementById('breakdownBarLoser').style.width = `${loserPct}%`;

            // Generate stat breakdown
            this.generateStatBreakdown(result);

            // Show overlay with animation
            overlay.classList.add('active');
            
            // Trigger reveal animations
            requestAnimationFrame(() => {
                overlay.classList.add('reveal');
            });
        },

        /**
         * Generate the detailed stat breakdown
         * @param {Object} result - Fight result data
         */
        generateStatBreakdown(result) {
            const container = document.getElementById('breakdownStats');
            if (!container) return;

            const stats = [
                { name: 'Attack', key: 'attack_ability', weight: 50 },
                { name: 'Defense', key: 'defensive_ability', weight: 13 },
                { name: 'Agility', key: 'agility', weight: 4 },
                { name: 'Intelligence', key: 'intelligence', weight: 2 },
                { name: 'Special', key: 'special_ability', weight: 10 },
                { name: 'Weight', key: 'avg_weight_lbs', weight: 20, isWeight: true }
            ];

            let html = '<div class="stat-comparison-grid">';

            stats.forEach(stat => {
                const winnerVal = stat.isWeight 
                    ? (result.winner[stat.key] || 0)
                    : (result.winner[stat.key] || 0);
                const loserVal = stat.isWeight
                    ? (result.loser[stat.key] || 0)
                    : (result.loser[stat.key] || 0);

                const winnerHigher = winnerVal > loserVal;
                const loserHigher = loserVal > winnerVal;

                html += `
                    <div class="stat-row">
                        <span class="stat-val ${winnerHigher ? 'higher' : ''}">${stat.isWeight ? Math.round(winnerVal).toLocaleString() : winnerVal}</span>
                        <span class="stat-name">${stat.name}</span>
                        <span class="stat-val ${loserHigher ? 'higher' : ''}">${stat.isWeight ? Math.round(loserVal).toLocaleString() : loserVal}</span>
                    </div>
                `;
            });

            html += '</div>';
            container.innerHTML = html;
        },

        /**
         * Hide the result overlay
         */
        hideResult() {
            const overlay = document.getElementById('fightResultOverlay');
            if (overlay) {
                overlay.classList.remove('reveal');
                setTimeout(() => {
                    overlay.classList.remove('active');
                    this.resultOverlayActive = false;
                }, 300);
            }
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
