/**
 * ============================================
 * COMPARE PAGE ENHANCEMENTS - compare-page.js
 * ============================================
 * 
 * Tournament-style matchup layout for the Compare page.
 * Builds fighter cards with abilities, traits, tournament record.
 * Handles intro animation and results overlay.
 * 
 * TRIGGER RULES:
 * - Intro animation ONLY triggers when FIGHT button is pressed
 * - NO intro on animal selection
 * - After intro completes, result overlay is shown
 */

(function() {
    'use strict';

    const ComparePageEnhancements = {
        // State tracking
        introPlaying: false,
        introTimeout: null,
        resultOverlayActive: false,
        _pendingResult: null,
        initialized: false,
        menuCollapsed: false,

        /**
         * Initialize compare page enhancements
         */
        init() {
            if (this.initialized) return;
            this.initialized = true;
            
            this.injectIntroOverlay();
            this.injectResultOverlay();
            this.setupTournamentLayout();
            this.setupEventListeners();
            
            console.log('[Compare] Tournament-style enhancements initialized');
        },

        /**
         * Setup tournament-style layout elements
         */
        setupTournamentLayout() {
            // Observe when Compare view becomes active to rebuild layout
            const compareView = document.getElementById('compare-view');
            if (!compareView) return;

            // Create mutation observer to detect when animals are set
            this.setupAnimalObserver();
            
            // Initial layout setup
            this.rebuildFighterCards();
        },

        /**
         * Watch for animal changes in the fighter cards
         */
        setupAnimalObserver() {
            // Hook into app state changes
            const self = this;
            
            // Watch for fighter image changes as proxy for animal selection
            const img1 = document.getElementById('animal-1-image');
            const img2 = document.getElementById('animal-2-image');
            
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
                        self.updateFighterInfo(mutation.target);
                    }
                });
            });
            
            if (img1) observer.observe(img1, { attributes: true });
            if (img2) observer.observe(img2, { attributes: true });
        },

        /**
         * Rebuild fighter cards with tournament-style info
         */
        rebuildFighterCards() {
            const fighterSections = document.querySelectorAll('#compare-view .fighter-section');
            
            fighterSections.forEach((section, index) => {
                const side = index === 0 ? 'left' : 'right';
                const num = index + 1;
                
                // Skip if already rebuilt
                if (section.querySelector('.c-identity-top')) return;
                
                // Get existing elements - these must be preserved for script.js DOM references
                const fighterDisplay = section.querySelector('.fighter-display');
                const oldStatsPanel = section.querySelector('.compare-stats-panel');
                const fighterInfoOverlay = fighterDisplay?.querySelector('.fighter-info-overlay');
                
                // Hide old stats panel (it's still in DOM for script.js references but hidden)
                if (oldStatsPanel) {
                    oldStatsPanel.style.display = 'none';
                }
                
                // Create new tournament-style structure
                const identityTop = document.createElement('div');
                identityTop.className = 'c-identity-top';
                identityTop.innerHTML = `
                    <h3 class="c-fighter-name" id="c-name-${num}">SELECT ANIMAL</h3>
                    <span class="c-scientific" id="c-scientific-${num}"></span>
                    <div class="battle-record-badge c-record-badge">
                        <div class="record-item rank">
                            <i class="fas fa-crown"></i>
                            <span class="record-value" id="c-rank-${num}">#--</span>
                            <span class="record-label">RANK</span>
                        </div>
                        <div class="record-divider"></div>
                        <div class="record-item battles">
                            <i class="fas fa-swords"></i>
                            <span class="record-value" id="c-battles-${num}">0</span>
                            <span class="record-label">BATTLES</span>
                        </div>
                        <div class="record-divider"></div>
                        <div class="record-item winrate">
                            <i class="fas fa-trophy"></i>
                            <span class="record-value" id="c-winrate-${num}">--%</span>
                            <span class="record-label">WIN %</span>
                        </div>
                    </div>
                `;
                
                // Create hero section wrapper
                const heroSection = document.createElement('div');
                heroSection.className = 'c-hero-section';
                
                // Create bottom info section (stats + abilities/traits - NO medals here)
                const bottomInfo = document.createElement('div');
                bottomInfo.className = 'c-bottom-info';
                bottomInfo.id = `c-bottom-info-${num}`;
                bottomInfo.innerHTML = `
                    <div class="c-quick-info">
                        <div class="quick-info-item clickable" id="c-weight-${num}" title="Click to switch kg/lbs">
                            <i class="fas fa-weight-hanging"></i>
                            <span>--</span>
                            <i class="fas fa-sync-alt toggle-icon"></i>
                        </div>
                        <div class="quick-info-item clickable" id="c-speed-${num}" title="Click to switch km/h / mph">
                            <i class="fas fa-tachometer-alt"></i>
                            <span>--</span>
                            <i class="fas fa-sync-alt toggle-icon"></i>
                        </div>
                        <div class="quick-info-item" id="c-bite-${num}">
                            <i class="fas fa-tooth"></i>
                            <span>--</span>
                        </div>
                    </div>
                    <div class="c-tags">
                        <div class="c-abilities-section">
                            <span class="abilities-label"><i class="fas fa-bolt"></i> ABILITIES</span>
                            <div class="abilities-tags-compact" id="c-abilities-${num}"></div>
                        </div>
                        <div class="c-traits-section">
                            <span class="traits-label"><i class="fas fa-star"></i> TRAITS</span>
                            <div class="traits-tags-compact" id="c-traits-${num}"></div>
                        </div>
                    </div>
                `;
                
                // Create tournament dashboard separately (sits at bottom row of grid)
                const tournamentDashboard = document.createElement('div');
                tournamentDashboard.className = 'c-tournament-dashboard';
                tournamentDashboard.innerHTML = `
                    <span class="dashboard-title"><i class="fas fa-trophy"></i> MEDALS</span>
                    <div class="medal-row">
                        <div class="medal-card gold">
                            <div class="medal-icon-wrap"><i class="fas fa-trophy"></i></div>
                            <span class="medal-count" id="c-gold-${num}">0</span>
                        </div>
                        <div class="medal-card silver">
                            <div class="medal-icon-wrap"><i class="fas fa-medal"></i></div>
                            <span class="medal-count" id="c-silver-${num}">0</span>
                        </div>
                        <div class="medal-card bronze">
                            <div class="medal-icon-wrap"><i class="fas fa-medal"></i></div>
                            <span class="medal-count" id="c-bronze-${num}">0</span>
                        </div>
                    </div>
                `;
                
                // Add click hint to fighter display
                if (fighterDisplay && !fighterDisplay.querySelector('.c-click-hint')) {
                    const clickHint = document.createElement('div');
                    clickHint.className = 'c-click-hint';
                    clickHint.innerHTML = '<i class="fas fa-hand-pointer"></i> CLICK TO SELECT';
                    fighterDisplay.appendChild(clickHint);
                    
                    // Hide the old fighter-info-overlay
                    if (fighterInfoOverlay) {
                        fighterInfoOverlay.style.display = 'none';
                    }
                }
                
                // Insert new elements into section in grid order
                // Grid: identity-top (row 1), hero+bottom-info (row 2), tournament (row 3)
                section.insertBefore(identityTop, section.firstChild);
                
                // Wrap fighter-display in hero section
                if (fighterDisplay) {
                    section.insertBefore(heroSection, fighterDisplay);
                    heroSection.appendChild(fighterDisplay);
                }
                
                // Add bottom info next to hero section (row 2, col 2)
                section.insertBefore(bottomInfo, oldStatsPanel);
                
                // Add tournament dashboard at end (row 3, spans both columns)
                section.appendChild(tournamentDashboard);
            });
            
            // Setup fight center with VS badge and stat bars
            this.setupFightCenter();
            
            // Re-bind unit toggle click handlers after elements are created
            this.setupUnitToggles();
        },

        /**
         * Setup the fight center area with VS badge and stat bars
         */
        setupFightCenter() {
            const fightCenter = document.querySelector('#compare-view .fight-center');
            if (!fightCenter || fightCenter.querySelector('.c-vs-section')) return;
            
            // Get radar chart - we'll preserve this element
            const radarContainer = fightCenter.querySelector('.radar-chart-container');
            
            // Add VS section at the beginning
            const vsSection = document.createElement('div');
            vsSection.className = 'c-vs-section';
            vsSection.innerHTML = `
                <div class="c-vs-burst"></div>
                <div class="c-vs-diamond"></div>
                <div class="c-vs-badge"><span>VS</span></div>
            `;
            fightCenter.insertBefore(vsSection, fightCenter.firstChild);
            
            // Add FIGHT button immediately after VS section (near top)
            const fightBtn = document.createElement('button');
            fightBtn.className = 'fight-btn c-fight-btn';
            fightBtn.id = 'fight-btn';
            fightBtn.innerHTML = '<i class="fas fa-bolt"></i> FIGHT <i class="fas fa-bolt"></i>';
            vsSection.after(fightBtn);
            
            // Add stat bars after radar chart - use Tournament's t-stats-compact for identical styling
            const statsCompact = document.createElement('div');
            statsCompact.className = 't-stats-compact';
            statsCompact.id = 'c-stats-compact';
            statsCompact.innerHTML = this.generateStatBarsHTML();
            
            if (radarContainer) {
                radarContainer.after(statsCompact);
            } else {
                fightCenter.appendChild(statsCompact);
            }
        },

        /**
         * Generate HTML for stat comparison bars
         * Uses same structure as Tournament's t-stat-row-compact for visual consistency
         */
        generateStatBarsHTML() {
            const stats = [
                { key: 'attack', icon: 'fa-fist-raised', abbr: 'ATK' },
                { key: 'defense', icon: 'fa-shield-alt', abbr: 'DEF' },
                { key: 'agility', icon: 'fa-wind', abbr: 'AGI' },
                { key: 'stamina', icon: 'fa-heart', abbr: 'STA' },
                { key: 'intelligence', icon: 'fa-brain', abbr: 'INT' },
                { key: 'special', icon: 'fa-bolt', abbr: 'SPL' }
            ];
            
            // Use Tournament's t-stat-row-compact structure exactly
            return stats.map(stat => `
                <div class="t-stat-row-compact" data-stat="${stat.key}" id="c-stat-row-${stat.key}">
                    <div class="t-stat-bar-left"><div class="stat-bar"><div class="stat-bar-fill" id="c-bar-1-${stat.key}" style="width: 0%"></div></div></div>
                    <div class="t-stat-center-cluster">
                        <span class="t-val left" id="c-val-1-${stat.key}">0</span>
                        <div class="t-stat-icon-label">
                            <i class="fas ${stat.icon}"></i>
                            <span class="t-stat-abbr">${stat.abbr}</span>
                        </div>
                        <span class="t-val right" id="c-val-2-${stat.key}">0</span>
                    </div>
                    <div class="t-stat-bar-right"><div class="stat-bar"><div class="stat-bar-fill" id="c-bar-2-${stat.key}" style="width: 0%"></div></div></div>
                </div>
            `).join('');
        },

        /**
         * Update fighter info when animal is selected
         */
        updateFighterInfo(imgElement) {
            if (!imgElement?.src || imgElement.src === '' || imgElement.style.display === 'none') return;
            
            const isLeft = imgElement.id === 'animal-1-image';
            const num = isLeft ? 1 : 2;
            const side = isLeft ? 'left' : 'right';
            const animal = isLeft 
                ? window.app?.state?.compare?.left 
                : window.app?.state?.compare?.right;
            
            if (animal) {
                this.updateFighterDisplay(side, animal);
            }
        },

        /**
         * Get ranking data for an animal from rankingsManager
         */
        getRankingData(animalName) {
            const rankings = window.rankingsManager?.rankings || [];
            if (!rankings.length || !animalName) return null;
            
            const name = animalName.toLowerCase();
            const rankIndex = rankings.findIndex((item) => {
                const itemAnimal = item.animal || item;
                return itemAnimal.name && itemAnimal.name.toLowerCase() === name;
            });
            
            if (rankIndex === -1) return null;
            
            const rankData = rankings[rankIndex];
            return {
                rank: rankIndex + 1,
                battles: rankData.totalFights || 0,
                winRate: rankData.winRate || 0,
                // Tournament medal data - same fields used by Tournament page
                tournamentsFirst: rankData.tournamentsFirst || 0,
                tournamentsSecond: rankData.tournamentsSecond || 0,
                tournamentsThird: rankData.tournamentsThird || 0
            };
        },

        /**
         * Update fighter display with animal data (called directly or via observer)
         */
        updateFighterDisplay(side, animal) {
            if (!animal) return;
            
            const num = side === 'left' ? 1 : 2;
            
            // Update name
            const nameEl = document.getElementById(`c-name-${num}`);
            if (nameEl) nameEl.textContent = animal.name.toUpperCase();
            
            // Update scientific name
            const sciEl = document.getElementById(`c-scientific-${num}`);
            if (sciEl) sciEl.textContent = animal.scientific_name || animal.latinName || '';
            
            // Update battle record - lookup from rankings like Stats page does
            const rankEl = document.getElementById(`c-rank-${num}`);
            const battlesEl = document.getElementById(`c-battles-${num}`);
            const winrateEl = document.getElementById(`c-winrate-${num}`);
            
            const rankingData = this.getRankingData(animal.name);
            if (rankingData) {
                if (rankEl) rankEl.textContent = `#${rankingData.rank}`;
                if (battlesEl) battlesEl.textContent = rankingData.battles;
                if (winrateEl) winrateEl.textContent = rankingData.battles > 0 ? `${Math.round(rankingData.winRate)}%` : '--%';
            } else {
                if (rankEl) rankEl.textContent = '#--';
                if (battlesEl) battlesEl.textContent = '0';
                if (winrateEl) winrateEl.textContent = '--%';
            }
            
            // Update quick info - use app's unit preferences like Stats page
            const weightEl = document.getElementById(`c-weight-${num}`);
            const speedEl = document.getElementById(`c-speed-${num}`);
            const biteEl = document.getElementById(`c-bite-${num}`);
            
            // Weight - use app's unit preference (same as Stats)
            if (weightEl) {
                const weightKg = animal.weight_kg;
                if (!weightKg) {
                    weightEl.querySelector('span').textContent = '--';
                } else {
                    const unit = window.app?.state?.weightUnit || 'kg';
                    if (unit === 'lbs') {
                        const lbs = (weightKg * 2.20462).toFixed(0);
                        weightEl.querySelector('span').textContent = `${Number(lbs).toLocaleString()} lbs`;
                    } else {
                        weightEl.querySelector('span').textContent = `${Number(weightKg.toFixed(0)).toLocaleString()} kg`;
                    }
                }
            }
            
            // Speed - use app's unit preference (same as Stats)
            if (speedEl) {
                const speedMps = animal.speed_mps;
                if (!speedMps) {
                    speedEl.querySelector('span').textContent = '--';
                } else {
                    const unit = window.app?.state?.speedUnit || 'kmh';
                    if (unit === 'mph') {
                        const mph = (speedMps * 2.23694).toFixed(0);
                        speedEl.querySelector('span').textContent = `${mph} mph`;
                    } else {
                        const kmh = (speedMps * 3.6).toFixed(0);
                        speedEl.querySelector('span').textContent = `${kmh} km/h`;
                    }
                }
            }
            
            if (biteEl) {
                const bite = animal.bite_force_psi || animal.biteForce;
                biteEl.querySelector('span').textContent = bite 
                    ? `${Math.round(bite).toLocaleString()} PSI` 
                    : '--';
            }
            
            // Update abilities - data uses special_abilities
            const abilitiesEl = document.getElementById(`c-abilities-${num}`);
            if (abilitiesEl) {
                const abilities = animal.special_abilities || animal.abilities || [];
                abilitiesEl.innerHTML = abilities.slice(0, 3).map(a => 
                    `<span class="ability-tag-sm">${a}</span>`
                ).join('') || '<span class="ability-tag-sm">None</span>';
            }
            
            // Update traits - data uses unique_traits
            const traitsEl = document.getElementById(`c-traits-${num}`);
            if (traitsEl) {
                const traits = animal.unique_traits || animal.traits || [];
                traitsEl.innerHTML = traits.slice(0, 3).map(t => 
                    `<span class="trait-tag-sm">${t}</span>`
                ).join('') || '<span class="trait-tag-sm">None</span>';
            }
            
            // Update tournament record - get from rankings data (same source as Tournament page)
            const goldEl = document.getElementById(`c-gold-${num}`);
            const silverEl = document.getElementById(`c-silver-${num}`);
            const bronzeEl = document.getElementById(`c-bronze-${num}`);
            
            // Use ranking data for tournament medals - same fields as Tournament page
            if (goldEl) goldEl.textContent = rankingData?.tournamentsFirst || 0;
            if (silverEl) silverEl.textContent = rankingData?.tournamentsSecond || 0;
            if (bronzeEl) bronzeEl.textContent = rankingData?.tournamentsThird || 0;
            
            // Update stat bars
            this.updateStatBars();
        },

        /**
         * Update the stat comparison bars
         */
        updateStatBars() {
            const left = window.app?.state?.compare?.left;
            const right = window.app?.state?.compare?.right;
            
            const stats = ['attack', 'defense', 'agility', 'stamina', 'intelligence', 'special'];
            
            stats.forEach(stat => {
                const leftVal = left?.[stat] || 0;
                const rightVal = right?.[stat] || 0;
                
                // Update values
                const val1El = document.getElementById(`c-val-1-${stat}`);
                const val2El = document.getElementById(`c-val-2-${stat}`);
                if (val1El) val1El.textContent = leftVal.toFixed ? leftVal.toFixed(0) : leftVal;
                if (val2El) val2El.textContent = rightVal.toFixed ? rightVal.toFixed(0) : rightVal;
                
                // Update bars (assuming 0-100 scale)
                const bar1El = document.getElementById(`c-bar-1-${stat}`);
                const bar2El = document.getElementById(`c-bar-2-${stat}`);
                if (bar1El) bar1El.style.width = `${Math.min(100, leftVal)}%`;
                if (bar2El) bar2El.style.width = `${Math.min(100, rightVal)}%`;
                
                // Highlight winner
                const rowEl = document.getElementById(`c-stat-row-${stat}`);
                if (rowEl) {
                    rowEl.classList.remove('left-wins', 'right-wins');
                    if (leftVal > rightVal) rowEl.classList.add('left-wins');
                    else if (rightVal > leftVal) rowEl.classList.add('right-wins');
                }
            });
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
                    <div class="result-header-sticky">
                        <button class="result-close-btn" id="resultCloseBtn"><i class="fas fa-times"></i></button>
                        <div class="result-banner-slot">
                            <div class="result-banner-default">
                                <div class="result-crown"><i class="fas fa-crown"></i></div>
                                <div class="result-title">WINNER</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="result-content-scroll">
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
                    </div>
                    
                    <div class="result-actions">
                        <button class="result-btn primary" id="resultRunAgainBtn">
                            <i class="fas fa-redo"></i> REMATCH
                        </button>
                        <button class="result-btn secondary" id="resultCloseBtn2">
                            <i class="fas fa-arrow-left"></i> BACK
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

            // Watch for view changes to rebuild cards
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.target.id === 'compare-view' && 
                        mutation.target.classList.contains('active-view')) {
                        this.rebuildFighterCards();
                    }
                });
            });

            const compareView = document.getElementById('compare-view');
            if (compareView) {
                observer.observe(compareView, { attributes: true, attributeFilter: ['class'] });
                
                // Check if Compare view is already active on load
                if (compareView.classList.contains('active-view')) {
                    this.rebuildFighterCards();
                }
            }
            
            // Setup unit toggle click handlers for weight/speed
            this.setupUnitToggles();
        },

        /**
         * Setup click handlers for weight/speed unit toggles
         */
        setupUnitToggles() {
            // Weight toggles (click to switch kg/lbs)
            ['c-weight-1', 'c-weight-2'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.addEventListener('click', () => {
                        if (window.app?.toggleWeightUnit) {
                            window.app.toggleWeightUnit();
                            this.refreshUnitDisplays();
                        }
                    });
                }
            });
            
            // Speed toggles (click to switch km/h / mph)
            ['c-speed-1', 'c-speed-2'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.addEventListener('click', () => {
                        if (window.app?.toggleSpeedUnit) {
                            window.app.toggleSpeedUnit();
                            this.refreshUnitDisplays();
                        }
                    });
                }
            });
        },

        /**
         * Refresh weight/speed displays with current unit preferences
         */
        refreshUnitDisplays() {
            const left = window.app?.state?.compare?.left;
            const right = window.app?.state?.compare?.right;
            
            if (left) this.updateFighterDisplay('left', left);
            if (right) this.updateFighterDisplay('right', right);
        },

        /**
         * Trigger the matchup intro animation
         */
        triggerMatchupIntro(left, right) {
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
            setTimeout(() => fighters[0]?.classList.add('animate-in'), 100);
            setTimeout(() => fighters[1]?.classList.add('animate-in'), 250);
            setTimeout(() => {
                if (vsBadge) vsBadge.classList.add('animate-in');
                if (lightSweep) lightSweep.classList.add('animate');
            }, 500);

            // Auto-hide and show result
            this.introTimeout = setTimeout(() => {
                this.hideIntro();
                if (this._pendingResult) {
                    setTimeout(() => this.showResult(this._pendingResult), 100);
                }
            }, 1200);
            
            // Safety timeout
            setTimeout(() => {
                if (this.introPlaying) {
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
         */
        playFightSequence(left, right, result) {
            this._pendingResult = { left, right, ...result };
            this.triggerMatchupIntro(left, right);
        },

        /**
         * Show the result overlay
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
            requestAnimationFrame(() => overlay.classList.add('reveal'));
        },

        /**
         * Generate the detailed stat breakdown
         */
        generateStatBreakdown(result) {
            const container = document.getElementById('breakdownStats');
            if (!container) return;

            const stats = [
                { name: 'Attack', key: 'attack' },
                { name: 'Defense', key: 'defense' },
                { name: 'Agility', key: 'agility' },
                { name: 'Stamina', key: 'stamina' },
                { name: 'Intelligence', key: 'intelligence' },
                { name: 'Special', key: 'special' }
            ];

            let html = '<div class="stat-comparison-grid">';

            stats.forEach(stat => {
                const winnerVal = result.winner[stat.key] || 0;
                const loserVal = result.loser[stat.key] || 0;
                const winnerHigher = winnerVal > loserVal;
                const loserHigher = loserVal > winnerVal;

                html += `
                    <div class="stat-row">
                        <span class="stat-val ${winnerHigher ? 'higher' : ''}">${winnerVal.toFixed ? winnerVal.toFixed(0) : winnerVal}</span>
                        <span class="stat-name">${stat.name}</span>
                        <span class="stat-val ${loserHigher ? 'higher' : ''}">${loserVal.toFixed ? loserVal.toFixed(0) : loserVal}</span>
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
