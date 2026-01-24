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
            
            // Define colors for each stat type - using bright, saturated colors
            const statColors = {
                attack: '#ff3333',      // bright red
                defense: '#2563eb',     // bright blue
                agility: '#16a34a',     // bright green
                stamina: '#ea580c',     // bright orange
                intelligence: '#9333ea', // bright purple
                special: '#ec4899'      // bright pink
            };
            
            // Helper to convert hex to rgb
            const hexToRgb = (hex) => {
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result ? {
                    r: parseInt(result[1], 16),
                    g: parseInt(result[2], 16),
                    b: parseInt(result[3], 16)
                } : { r: 80, g: 80, b: 80 };
            };
            
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
                
                // Much more drastic saturation: nearly 0 for low stats, very high for high stats
                // Uses exponential curve for more dramatic effect
                const calcSaturation = (val) => {
                    const normalized = Math.max(0, Math.min(1, val / 100));
                    // Exponential curve: 0.05 at 0%, 0.3 at 50%, 2.0 at 100%
                    return 0.05 + Math.pow(normalized, 1.5) * 1.95;
                };
                
                // Calculate color for stat value numbers - MUCH more drastic
                // Very dark grey for low stats, bright color for high stats
                const calcStatColor = (val, statType) => {
                    const normalized = Math.max(0, Math.min(1, val / 100));
                    // Use a threshold: < 40 is dark grey, > 60 is bright color
                    if (val < 40) {
                        // Dark grey for low stats
                        const grey = Math.round(80 - normalized * 30); // 80 to 50
                        return `rgb(${grey}, ${grey}, ${grey})`;
                    } else if (val > 60) {
                        // Use full stat color for high stats
                        const statRgb = hexToRgb(statColors[statType]);
                        return `rgb(${statRgb.r}, ${statRgb.g}, ${statRgb.b})`;
                    } else {
                        // Mid-range: interpolate between grey and color
                        const intensity = (val - 40) / 20; // 0 to 1
                        const grey = 80;
                        const statRgb = hexToRgb(statColors[statType]);
                        const r = Math.round(grey + (statRgb.r - grey) * intensity);
                        const g = Math.round(grey + (statRgb.g - grey) * intensity);
                        const b = Math.round(grey + (statRgb.b - grey) * intensity);
                        return `rgb(${r}, ${g}, ${b})`;
                    }
                };
                
                if (bar1El) {
                    bar1El.style.width = `${Math.min(100, leftVal)}%`;
                    bar1El.style.filter = `saturate(${calcSaturation(leftVal)})`;
                    // Add high-stat class for pulse animation on high values
                    bar1El.classList.toggle('high-stat', leftVal >= 70);
                }
                if (bar2El) {
                    bar2El.style.width = `${Math.min(100, rightVal)}%`;
                    bar2El.style.filter = `saturate(${calcSaturation(rightVal)})`;
                    bar2El.classList.toggle('high-stat', rightVal >= 70);
                }
                
                // Apply much more drastic color to stat value numbers
                if (val1El) {
                    val1El.style.color = calcStatColor(leftVal, stat);
                    val1El.style.fontWeight = leftVal >= 70 ? '700' : '400';
                    val1El.style.textShadow = leftVal >= 70 ? `0 0 12px ${statColors[stat]}60` : 'none';
                }
                if (val2El) {
                    val2El.style.color = calcStatColor(rightVal, stat);
                    val2El.style.fontWeight = rightVal >= 70 ? '700' : '400';
                    val2El.style.textShadow = rightVal >= 70 ? `0 0 12px ${statColors[stat]}60` : 'none';
                }
                
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
         * Inject the matchup intro overlay HTML (same as tournament intro)
         */
        injectIntroOverlay() {
            if (document.getElementById('matchupIntroOverlay')) return;

            const overlay = document.createElement('div');
            overlay.id = 'matchupIntroOverlay';
            overlay.className = 'match-intro-overlay';
            overlay.innerHTML = `
                <div class="intro-speed-lines"></div>
                <div class="intro-sparks" id="compare-intro-sparks"></div>
                
                <div class="intro-content">
                    <!-- Left Fighter Plate -->
                    <div class="intro-fighter-plate left" id="compare-plate-left">
                        <div class="intro-fighter-image-wrap">
                            <div class="intro-fighter-glow left"></div>
                            <img src="" alt="" class="intro-fighter-image" id="introFighter1Img">
                        </div>
                        <div class="intro-fighter-info">
                            <div class="intro-fighter-name" id="introFighter1Name">ANIMAL NAME</div>
                            <div class="intro-fighter-scientific" id="introFighter1Scientific">Scientific name</div>
                        </div>
                    </div>
                    
                    <!-- VS Badge Center -->
                    <div class="intro-vs-container" id="compare-vs-container">
                        <div class="intro-vs-burst"></div>
                        <div class="intro-vs-badge">
                            <span>VS</span>
                        </div>
                    </div>
                    
                    <!-- Right Fighter Plate -->
                    <div class="intro-fighter-plate right" id="compare-plate-right">
                        <div class="intro-fighter-image-wrap">
                            <div class="intro-fighter-glow right"></div>
                            <img src="" alt="" class="intro-fighter-image" id="introFighter2Img">
                        </div>
                        <div class="intro-fighter-info">
                            <div class="intro-fighter-name" id="introFighter2Name">ANIMAL NAME</div>
                            <div class="intro-fighter-scientific" id="introFighter2Scientific">Scientific name</div>
                        </div>
                    </div>
                </div>
                <div class="intro-skip-hint">Click or press ESC to skip</div>
            `;

            document.body.appendChild(overlay);
            overlay.addEventListener('click', () => this.skipIntro());
        },

        /**
         * Inject the result reveal overlay HTML - Premium Winner Screen
         */
        injectResultOverlay() {
            if (document.getElementById('fightResultOverlay')) return;

            const overlay = document.createElement('div');
            overlay.id = 'fightResultOverlay';
            overlay.innerHTML = `
                <div class="result-backdrop"></div>
                <div class="result-particles" id="resultParticles"></div>
                <div class="result-confetti" id="resultConfetti"></div>
                
                <!-- Close Button -->
                <button class="result-close-x" id="resultCloseX">
                    <i class="fas fa-times"></i>
                </button>
                
                <div class="result-arena">
                    <!-- Victory Header -->
                    <div class="victory-header">
                        <div class="victory-crown-rays"></div>
                        <div class="victory-crown"><i class="fas fa-crown"></i></div>
                        <div class="victory-title">VICTORY</div>
                        <div class="victory-subtitle" id="victorySubtitle">Dominant Performance</div>
                    </div>
                    
                    <!-- Champion Showcase - Decorations only -->
                    <div class="champion-showcase" id="championShowcase">
                        <div class="champion-aura"></div>
                        <div class="champion-ring ring-1"></div>
                        <div class="champion-ring ring-2"></div>
                        <div class="champion-ring ring-3"></div>
                        <div class="champion-spotlight"></div>
                        <img class="champion-image" id="championImg" src="" alt="">
                        <div class="champion-particles" id="championParticles"></div>
                    </div>
                    
                    <!-- Champion Info -->
                    <div class="champion-info">
                        <div class="champion-name" id="championName">CHAMPION</div>
                    </div>
                    
                    <!-- Battle Stats Summary -->
                    <div class="battle-summary">
                        <div class="summary-card difficulty-card" id="difficultyCard">
                            <div class="card-icon"><i class="fas fa-bolt" id="diffIcon"></i></div>
                            <div class="card-content">
                                <div class="card-label">DIFFICULTY</div>
                                <div class="card-value" id="diffLevel">MODERATE</div>
                            </div>
                        </div>
                        
                        <div class="summary-card margin-card" id="marginCard">
                            <div class="card-icon"><i class="fas fa-percentage"></i></div>
                            <div class="card-content">
                                <div class="card-label">WIN MARGIN</div>
                                <div class="card-value" id="winMargin">0%</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Statistical Analysis -->
                    <div class="stat-analysis" id="statAnalysis">
                        <div class="analysis-title">STATISTICAL ANALYSIS</div>
                        <div class="analysis-grid" id="analysisGrid"></div>
                    </div>
                    
                    <!-- Defeated Opponent Mini -->
                    <div class="defeated-section" id="defeatedSection">
                        <div class="defeated-label">DEFEATED</div>
                        <div class="defeated-card" id="defeatedCard">
                            <img class="defeated-image" id="defeatedImg" src="" alt="">
                            <div class="defeated-name" id="defeatedName">OPPONENT</div>
                            <div class="defeated-x"><i class="fas fa-times"></i></div>
                        </div>
                    </div>
                    
                    <!-- Cage Fight Badge -->
                    <div class="cage-fight-badge">
                        <span>No weapons</span>
                        <span class="badge-dot"></span>
                        <span>No escape</span>
                        <span class="badge-dot"></span>
                        <span>Bloodlusted</span>
                        <span class="badge-dot"></span>
                        <span>1v1 to the death</span>
                    </div>
                    
                    <!-- Action Buttons -->
                    <div class="result-actions">
                        <button class="result-btn primary-btn" id="exploreWinnerBtn">
                            <i class="fas fa-search"></i>
                            <span>Explore Winner</span>
                        </button>
                        <button class="result-btn share-btn" id="shareResultBtn">
                            <i class="fas fa-share-alt"></i>
                            <span>Share</span>
                        </button>
                        <button class="result-btn ghost-btn" id="resultBackBtn">
                            <i class="fas fa-arrow-left"></i>
                            <span>Back</span>
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            // Event listeners
            document.getElementById('resultCloseX').addEventListener('click', () => this.hideResult());
            document.getElementById('resultBackBtn').addEventListener('click', () => this.hideResult());
            document.getElementById('exploreWinnerBtn').addEventListener('click', () => {
                this.hideResult();
                if (this._lastWinner && window.app) {
                    window.app.switchView('stats');
                    window.app.selectAnimal(this._lastWinner);
                }
            });
            
            // Share button (placeholder functionality for now)
            document.getElementById('shareResultBtn').addEventListener('click', () => {
                // TODO: Implement share functionality
                console.log('Share button clicked');
            });
            
            // Champion showcase click
            document.getElementById('championShowcase').addEventListener('click', () => {
                if (this._lastWinner && window.app) {
                    this.hideResult();
                    window.app.switchView('stats');
                    window.app.selectAnimal(this._lastWinner);
                }
            });
            
            // Defeated card click
            document.getElementById('defeatedCard').addEventListener('click', () => {
                if (this._lastLoser && window.app) {
                    this.hideResult();
                    window.app.switchView('stats');
                    window.app.selectAnimal(this._lastLoser);
                }
            });
            
            // Backdrop click to close
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
         * Uses event delegation to handle dynamically created elements
         */
        setupUnitToggles() {
            // Use event delegation on the compare view container
            const compareView = document.getElementById('compare-view');
            if (!compareView || compareView.dataset.unitTogglesSetup) return;
            
            compareView.dataset.unitTogglesSetup = 'true';
            
            compareView.addEventListener('click', (e) => {
                const target = e.target.closest('.quick-info-item.clickable');
                if (!target) return;
                
                const id = target.id;
                
                // Weight toggles
                if (id === 'c-weight-1' || id === 'c-weight-2') {
                    if (window.app?.toggleWeightUnit) {
                        window.app.toggleWeightUnit();
                        this.refreshUnitDisplays();
                    }
                }
                
                // Speed toggles
                if (id === 'c-speed-1' || id === 'c-speed-2') {
                    if (window.app?.toggleSpeedUnit) {
                        window.app.toggleSpeedUnit();
                        this.refreshUnitDisplays();
                    }
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
         * Trigger the matchup intro animation (tournament-style)
         */
        triggerMatchupIntro(left, right) {
            if (this.introPlaying) return;

            const overlay = document.getElementById('matchupIntroOverlay');
            if (!overlay) return;

            // Set fighter data - using tournament-style element IDs
            const img1 = document.getElementById('introFighter1Img');
            const name1 = document.getElementById('introFighter1Name');
            const scientific1 = document.getElementById('introFighter1Scientific');
            const img2 = document.getElementById('introFighter2Img');
            const name2 = document.getElementById('introFighter2Name');
            const scientific2 = document.getElementById('introFighter2Scientific');

            if (img1) {
                img1.src = left.image || '';
                img1.onerror = () => { img1.src = 'images/fallback.png'; };
            }
            if (name1) name1.textContent = (left.name || 'FIGHTER 1').toUpperCase();
            if (scientific1) scientific1.textContent = left.scientific_name || '';
            if (img2) {
                img2.src = right.image || '';
                img2.onerror = () => { img2.src = 'images/fallback.png'; };
            }
            if (name2) name2.textContent = (right.name || 'FIGHTER 2').toUpperCase();
            if (scientific2) scientific2.textContent = right.scientific_name || '';

            // Reset animation states (tournament-style)
            overlay.classList.remove('fade-out', 'shake');
            
            // Reset VS badge animation
            const vsBadge = overlay.querySelector('.intro-vs-badge');
            const vsBurst = overlay.querySelector('.intro-vs-burst');
            if (vsBadge) {
                vsBadge.style.animation = 'none';
                vsBadge.offsetHeight; // Force reflow
                vsBadge.style.animation = '';
            }
            if (vsBurst) {
                vsBurst.style.animation = 'none';
                vsBurst.offsetHeight; // Force reflow
                vsBurst.style.animation = '';
            }

            // Show overlay
            this.introPlaying = true;
            overlay.classList.add('active');

            // Check for reduced motion preference
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            // Spawn sparks after VS appears (tournament-style)
            if (!prefersReducedMotion) {
                setTimeout(() => {
                    this.spawnIntroSparks();
                }, 800);
                
                // Add screen shake when VS appears
                setTimeout(() => {
                    overlay.classList.add('shake');
                }, 750);
            }

            // Duration before fade out
            const introDuration = prefersReducedMotion ? 800 : 2000;
            const fadeOutDuration = prefersReducedMotion ? 200 : 500;

            // Auto-hide and show result
            this.introTimeout = setTimeout(() => {
                overlay.classList.add('fade-out');
                setTimeout(() => {
                    this.hideIntro();
                    if (this._pendingResult) {
                        setTimeout(() => this.showResult(this._pendingResult), 100);
                    }
                }, fadeOutDuration);
            }, introDuration);
            
            // Safety timeout
            setTimeout(() => {
                if (this.introPlaying) {
                    this.hideIntro();
                    if (this._pendingResult) {
                        setTimeout(() => this.showResult(this._pendingResult), 100);
                    }
                }
            }, 5000);
        },

        /**
         * Spawn intro sparks effect
         */
        spawnIntroSparks() {
            const container = document.getElementById('compare-intro-sparks');
            if (!container) return;
            
            container.innerHTML = '';
            
            for (let i = 0; i < 20; i++) {
                const spark = document.createElement('div');
                spark.className = 'intro-spark';
                spark.style.setProperty('--angle', Math.random() * 360 + 'deg');
                spark.style.setProperty('--distance', (50 + Math.random() * 150) + 'px');
                spark.style.setProperty('--delay', Math.random() * 0.3 + 's');
                container.appendChild(spark);
            }
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
         * Calculate difficulty level based on win probability
         */
        getDifficultyInfo(winnerProb) {
            const prob = winnerProb;
            if (prob >= 90) return { 
                level: 'EFFORTLESS', 
                icon: 'fa-feather', 
                color: '#22c55e', 
                meter: 5,
                description: 'An overwhelming mismatch. The winner dominates in virtually every category.'
            };
            if (prob >= 80) return { 
                level: 'EASY', 
                icon: 'fa-shield-alt', 
                color: '#4ade80', 
                meter: 20,
                description: 'A clear advantage. The winner has superior stats across most categories.'
            };
            if (prob >= 70) return { 
                level: 'MODERATE', 
                icon: 'fa-balance-scale', 
                color: '#facc15', 
                meter: 40,
                description: 'A solid victory. The winner holds meaningful advantages in key areas.'
            };
            if (prob >= 60) return { 
                level: 'CHALLENGING', 
                icon: 'fa-fist-raised', 
                color: '#f97316', 
                meter: 60,
                description: 'A competitive matchup. The outcome was determined by a few critical stats.'
            };
            if (prob >= 55) return { 
                level: 'HARD', 
                icon: 'fa-fire', 
                color: '#ef4444', 
                meter: 80,
                description: 'An intense battle. Victory came down to marginal differences.'
            };
            return { 
                level: 'EXTREME', 
                icon: 'fa-bolt', 
                color: '#dc2626', 
                meter: 95,
                description: 'A razor-thin margin. This fight could go either way in nature.'
            };
        },

        /**
         * Get fun facts based on the matchup
         */
        getFunFact(winner, loser) {
            const facts = [
                `${winner.name}s can be found in ${winner.habitat || 'various habitats'} around the world.`,
                `The average ${winner.name.toLowerCase()} weighs about ${winner.weight_kg || winner.averageWeight || '?'}kg.`,
                `${winner.name}s are known for their incredible ${winner.attack > 80 ? 'offensive power' : winner.defense > 80 ? 'defensive capabilities' : winner.agility > 80 ? 'speed and agility' : 'survival instincts'}.`,
                `In a real encounter, ${winner.name.toLowerCase()}s typically ${winner.attack > winner.defense ? 'strike first' : 'wait for the right moment'}.`,
                `${loser.name}s put up a fight with their ${loser.defense > loser.attack ? 'strong defenses' : 'aggressive tactics'}.`,
                `Both species have evolved remarkable adaptations for survival.`,
                `${winner.name}s have been around for millions of years.`,
                `This matchup showcases nature's incredible diversity.`
            ];
            return facts[Math.floor(Math.random() * facts.length)];
        },

        /**
         * Spawn celebration particles
         */
        spawnCelebrationParticles() {
            const container = document.getElementById('resultParticles');
            if (!container) return;
            
            container.innerHTML = '';
            
            // Metallic colors - silver, gold, platinum, bronze
            const colors = ['#c0c0c0', '#d4af37', '#e5e4e2', '#cd7f32', '#b8860b', '#aaa9ad'];
            
            // Metallic shrapnel pieces - slower, more dramatic
            for (let i = 0; i < 40; i++) {
                const particle = document.createElement('div');
                particle.className = 'metallic-shard';
                particle.style.setProperty('--x', (Math.random() * 100) + '%');
                particle.style.setProperty('--delay', (Math.random() * 1.5) + 's');
                particle.style.setProperty('--duration', (4 + Math.random() * 4) + 's');
                particle.style.setProperty('--color', colors[Math.floor(Math.random() * colors.length)]);
                particle.style.setProperty('--size', (4 + Math.random() * 8) + 'px');
                particle.style.setProperty('--rotation', (Math.random() * 360) + 'deg');
                container.appendChild(particle);
            }
        },

        /**
         * Spawn confetti burst
         */
        spawnConfetti() {
            const container = document.getElementById('resultConfetti');
            if (!container) return;
            
            container.innerHTML = '';
            
            // Metallic debris colors
            const colors = ['#c0c0c0', '#d4af37', '#e5e4e2', '#b8860b', '#848482', '#aaa9ad'];
            
            // Explosion debris - starts from center, explodes outward in slow motion
            for (let i = 0; i < 60; i++) {
                const debris = document.createElement('div');
                debris.className = 'explosion-debris';
                // Start from center
                debris.style.setProperty('--startX', '50%');
                debris.style.setProperty('--startY', '40%');
                // End position - random spread
                debris.style.setProperty('--endX', (Math.random() * 100) + '%');
                debris.style.setProperty('--endY', (Math.random() * 100) + '%');
                debris.style.setProperty('--delay', (Math.random() * 0.3) + 's');
                debris.style.setProperty('--duration', (2 + Math.random() * 3) + 's');
                debris.style.setProperty('--color', colors[Math.floor(Math.random() * colors.length)]);
                debris.style.setProperty('--size', (3 + Math.random() * 6) + 'px');
                debris.style.setProperty('--rotation', (Math.random() * 720) + 'deg');
                container.appendChild(debris);
            }
        },

        /**
         * Spawn champion aura particles
         */
        spawnChampionParticles() {
            const container = document.getElementById('championParticles');
            if (!container) return;
            
            container.innerHTML = '';
            
            // Metallic sparks around the champion
            const colors = ['#d4af37', '#c0c0c0', '#e5e4e2', '#ffd700'];
            for (let i = 0; i < 24; i++) {
                const spark = document.createElement('div');
                spark.className = 'metallic-spark';
                spark.style.setProperty('--angle', (i * 15) + 'deg');
                spark.style.setProperty('--delay', (Math.random() * 3) + 's');
                spark.style.setProperty('--color', colors[Math.floor(Math.random() * colors.length)]);
                container.appendChild(spark);
            }
        },

        /**
         * Get victory subtitle based on difficulty
         */
        getVictorySubtitle(difficulty, prob) {
            if (prob >= 90) return "Absolute Domination";
            if (prob >= 80) return "Decisive Victory";
            if (prob >= 70) return "Clear Winner";
            if (prob >= 60) return "Hard-Fought Victory";
            if (prob >= 55) return "Narrow Victory";
            return "Photo Finish";
        },

        /**
         * Show the result overlay - Premium Version
         */
        showResult(result) {
            const overlay = document.getElementById('fightResultOverlay');
            if (!overlay) return;

            this._pendingResult = null;
            this.resultOverlayActive = true;
            this._lastWinner = result.winner;
            this._lastLoser = result.loser;

            // Get difficulty info
            const difficulty = this.getDifficultyInfo(result.winnerProb);

            // Champion image and name
            const championImg = document.getElementById('championImg');
            const championName = document.getElementById('championName');
            
            if (championImg) {
                championImg.src = result.winner.image || '';
                championImg.onerror = () => { championImg.src = 'images/fallback.png'; };
            }
            if (championName) championName.textContent = result.winner.name.toUpperCase();

            // Victory subtitle
            const victorySubtitle = document.getElementById('victorySubtitle');
            if (victorySubtitle) {
                victorySubtitle.textContent = this.getVictorySubtitle(difficulty, result.winnerProb);
            }

            // Defeated opponent
            const defeatedImg = document.getElementById('defeatedImg');
            const defeatedName = document.getElementById('defeatedName');
            
            if (defeatedImg) {
                defeatedImg.src = result.loser.image || '';
                defeatedImg.onerror = () => { defeatedImg.src = 'images/fallback.png'; };
            }
            if (defeatedName) defeatedName.textContent = result.loser.name;

            // Difficulty card
            const difficultyCard = document.getElementById('difficultyCard');
            const diffIcon = document.getElementById('diffIcon');
            const diffLevel = document.getElementById('diffLevel');
            
            if (difficultyCard) difficultyCard.style.setProperty('--card-color', difficulty.color);
            if (diffIcon) diffIcon.className = `fas ${difficulty.icon}`;
            if (diffLevel) diffLevel.textContent = difficulty.level;

            // Win margin - show exact with decimals
            const totalScore = result.winnerScore + result.loserScore;
            const winMarginPct = totalScore > 0 ? ((result.winnerScore / totalScore) * 100).toFixed(1) : '50.0';
            const winMargin = document.getElementById('winMargin');
            if (winMargin) {
                winMargin.textContent = `${winMarginPct}%`;
            }

            // Generate statistical analysis
            this.generateStatAnalysis(result);

            // Show overlay with animation sequence
            overlay.classList.add('active');
            
            // Spawn effects with timing
            setTimeout(() => this.spawnConfetti(), 200);
            setTimeout(() => this.spawnCelebrationParticles(), 400);
            setTimeout(() => this.spawnChampionParticles(), 300);
            
            // Animate reveal sequence
            requestAnimationFrame(() => {
                overlay.classList.add('reveal');
            });
        },

        /**
         * Generate statistical analysis
         */
        generateStatAnalysis(result) {
            const container = document.getElementById('analysisGrid');
            if (!container) return;

            const stats = [
                { name: 'ATK', key: 'attack', icon: 'fa-fist-raised', fullName: 'Attack' },
                { name: 'DEF', key: 'defense', icon: 'fa-shield-alt', fullName: 'Defense' },
                { name: 'SPD', key: 'agility', icon: 'fa-bolt', fullName: 'Speed' },
                { name: 'STA', key: 'stamina', icon: 'fa-heart', fullName: 'Stamina' },
                { name: 'INT', key: 'intelligence', icon: 'fa-brain', fullName: 'Intelligence' },
                { name: 'SPC', key: 'special', icon: 'fa-star', fullName: 'Special' }
            ];

            // Get short names for animals
            const winnerShort = result.winner.name.length > 8 ? result.winner.name.substring(0, 7) + '.' : result.winner.name;
            const loserShort = result.loser.name.length > 8 ? result.loser.name.substring(0, 7) + '.' : result.loser.name;

            let html = '';
            
            // Header row with animal names
            html += `
                <div class="analysis-header-row">
                    <div class="analysis-col stat-col">STAT</div>
                    <div class="analysis-col winner-col"><i class="fas fa-crown"></i> ${winnerShort.toUpperCase()}</div>
                    <div class="analysis-col loser-col">${loserShort.toUpperCase()}</div>
                </div>
            `;
            
            // Stat rows
            stats.forEach((stat, index) => {
                const winnerVal = result.winner[stat.key] || 0;
                const loserVal = result.loser[stat.key] || 0;
                const isWinnerBetter = winnerVal > loserVal;
                const isLoserBetter = loserVal > winnerVal;
                const isTie = winnerVal === loserVal;
                
                html += `
                    <div class="analysis-row" style="--delay: ${index * 0.04}s">
                        <div class="analysis-col stat-col">
                            <i class="fas ${stat.icon}"></i>
                            <span>${stat.name}</span>
                        </div>
                        <div class="analysis-col winner-col ${isWinnerBetter ? 'winning' : ''}">
                            ${isWinnerBetter ? '<i class="fas fa-caret-up win-indicator"></i>' : ''}
                            <span class="stat-num">${winnerVal}</span>
                        </div>
                        <div class="analysis-col loser-col ${isLoserBetter ? 'losing-better' : ''}">
                            ${isLoserBetter ? '<i class="fas fa-caret-up lose-indicator"></i>' : ''}
                            <span class="stat-num">${loserVal}</span>
                        </div>
                    </div>
                `;
            });

            container.innerHTML = html;
        },

        /**
         * Hide the result overlay
         */
        hideResult() {
            const overlay = document.getElementById('fightResultOverlay');
            if (overlay) {
                overlay.classList.remove('reveal');
                
                // Clear particles
                const particles = document.getElementById('resultParticles');
                const confetti = document.getElementById('resultConfetti');
                const champParticles = document.getElementById('championParticles');
                if (particles) particles.innerHTML = '';
                if (confetti) confetti.innerHTML = '';
                if (champParticles) champParticles.innerHTML = '';
                
                setTimeout(() => {
                    overlay.classList.remove('active');
                    this.resultOverlayActive = false;
                }, 400);
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
