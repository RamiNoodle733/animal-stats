/**
 * ============================================
 * TOURNAMENT SYSTEM - tournament.js
 * ============================================
 * Handles: Tournament modal, bracket system, battle predictions
 * DOM Container: #tournament-modal (overlay)
 */

'use strict';

// SECTION: TOURNAMENT MANAGER
// ========================================
// Handles: Tournament modal, bracket system, predictions
// DOM Container: #tournament-modal (overlay)
// ========================================

/**
 * Tournament Manager - Handles bracket tournaments
 */
class TournamentManager {
    constructor(app) {
        this.app = app;
        this.bracketSize = 0;
        this.selectedBracketSize = 0;
        this.selectedType = 'all';
        this.animals = [];
        this.filteredAnimals = [];
        this.bracket = [];
        this.currentRound = 0;
        this.currentMatch = 0;
        this.totalMatches = 0;
        this.completedMatches = 0;
        this.winners = [];
        this.matchHistory = [];
        this.isActive = false;
        
        // Guess the majority feature
        this.guessModeEnabled = false;
        this.currentGuess = null;  // 0 = left, 1 = right, null = no guess
        this.correctGuesses = 0;
        this.totalGuesses = 0;
        this.hasVotedOnMatchup = false;  // Track if user has voted on current matchup
        
        // DOM Elements - V4 Tournament UI
        this.dom = {
            modal: document.getElementById('tournament-modal'),
            setup: document.getElementById('tournament-setup'),
            battle: document.getElementById('tournament-battle'),
            results: document.getElementById('tournament-results'),
            closeBtn: document.getElementById('tournament-close'),
            quitBtn: document.getElementById('tournament-quit'),
            bracketOptions: document.querySelectorAll('.t-bracket-card'),
            openBtn: document.getElementById('open-tournament-btn'),
            startBtn: document.getElementById('start-tournament-btn'),
            loginNote: document.getElementById('tournament-login-note'),
            filterSearch: document.getElementById('t-filter-search'),
            filterChips: document.getElementById('t-filter-chips'),
            previewAnimalCount: document.getElementById('preview-animal-count'),
            previewBracketSize: document.getElementById('preview-bracket-size'),
            // Battle elements
            progressText: document.getElementById('tournament-progress-text'),
            progressBar: document.getElementById('tournament-progress-bar'),
            matchText: document.getElementById('tournament-match-text'),
            fighter1: document.getElementById('tournament-fighter-1'),
            fighter2: document.getElementById('tournament-fighter-2'),
            // Guess elements
            guessToggle: document.getElementById('t-guess-toggle'),
            guessPrompt: document.getElementById('t-guess-prompt'),
            // Majority vote elements
            majorityBarLeft: document.getElementById('t-majority-left'),
            majorityBarRight: document.getElementById('t-majority-right'),
            majorityPctLeft: document.getElementById('t-majority-pct-left'),
            majorityPctRight: document.getElementById('t-majority-pct-right'),
            majorityTotal: document.getElementById('t-majority-total'),
            // Results elements
            championImg: document.getElementById('champion-img'),
            championName: document.getElementById('champion-name'),
            resultMatches: document.getElementById('result-matches'),
            resultBracket: document.getElementById('result-bracket'),
            podiumGrid: document.getElementById('t-podium-grid'),
            playAgainBtn: document.getElementById('play-again-btn'),
            closeResultsBtn: document.getElementById('close-results-btn'),
            // Bonus display
            bonusXp: document.getElementById('t-bonus-xp'),
            bonusBp: document.getElementById('t-bonus-bp'),
            bonusGuess: document.getElementById('t-bonus-guess')
        };
        
        // Cache for ELO ratings and matchup votes
        this.eloCache = {};
        this.matchupVoteCache = {};
        
        // Cache for ranking data (votes, tournament records, etc.)
        this.rankingDataCache = {};
        
        // Reference to radar chart instance
        this.tournamentRadarChart = null;
    }

    init() {
        this.bindEvents();
        this.updateLoginNote();
        this.populateTypeFilters();
        this.updateFilteredAnimals();
    }

    bindEvents() {
        // Open tournament modal button (both hero and sidebar) - use router
        this.dom.openBtn?.addEventListener('click', () => {
            if (window.Router) {
                window.Router.navigate('/tournament');
            } else {
                this.showSetup();
            }
        });
        document.getElementById('hero-tournament-btn')?.addEventListener('click', () => {
            if (window.Router) {
                window.Router.navigate('/tournament');
            } else {
                this.showSetup();
            }
        });
        
        // Start tournament button - now actually starts the tournament
        this.dom.startBtn?.addEventListener('click', () => this.startTournament());
        
        // Close button
        this.dom.closeBtn?.addEventListener('click', () => this.hideModal());
        
        // Quit button
        this.dom.quitBtn?.addEventListener('click', () => {
            if (confirm('Are you sure you want to quit the tournament?')) {
                this.hideModal();
            }
        });
        
        // Bracket size options - V4 uses t-bracket-card class
        this.dom.bracketOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const size = parseInt(e.currentTarget.dataset.size);
                this.selectBracketSize(size, e.currentTarget);
            });
        });
        
        // Fighter selection
        this.dom.fighter1?.addEventListener('click', () => this.selectWinner(0));
        this.dom.fighter2?.addEventListener('click', () => this.selectWinner(1));
        
        // Results buttons
        this.dom.playAgainBtn?.addEventListener('click', () => this.showSetup());
        this.dom.closeResultsBtn?.addEventListener('click', () => this.hideModal());
        
        // Guess mode toggle
        this.dom.guessToggle?.addEventListener('click', () => this.toggleGuessMode());
        
        // Filter search input
        this.dom.filterSearch?.addEventListener('input', (e) => this.filterChips(e.target.value));
        
        // Escape key closes modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.dom.modal?.classList.contains('show')) {
                if (this.isActive) {
                    if (confirm('Are you sure you want to quit the tournament?')) {
                        this.hideModal();
                    }
                } else {
                    this.hideModal();
                }
            }
        });
    }
    
    /**
     * Toggle guess-the-majority mode
     */
    toggleGuessMode() {
        this.guessModeEnabled = !this.guessModeEnabled;
        this.dom.guessToggle?.classList.toggle('active', this.guessModeEnabled);
        
        if (this.dom.guessPrompt) {
            this.dom.guessPrompt.style.display = this.guessModeEnabled ? 'block' : 'none';
        }
        
        // Highlight majority section when guess mode is active
        const majoritySection = document.querySelector('.t-majority-section');
        if (majoritySection) {
            majoritySection.classList.toggle('guess-mode-active', this.guessModeEnabled);
        }
        
        // Reset current guess when toggling
        this.currentGuess = null;
        this.updateGuessHighlight();
    }
    
    /**
     * Set guess for current matchup (called when clicking a fighter in guess mode)
     */
    setGuess(fighterIndex) {
        if (!this.guessModeEnabled) return;
        
        this.currentGuess = fighterIndex;
        this.updateGuessHighlight();
    }
    
    /**
     * Update visual highlight for guess selection
     */
    updateGuessHighlight() {
        const f1 = this.getFighterCard(1);
        const f2 = this.getFighterCard(2);
        
        f1?.classList.remove('guess-selected');
        f2?.classList.remove('guess-selected');
        
        if (this.currentGuess === 0) {
            f1?.classList.add('guess-selected');
        } else if (this.currentGuess === 1) {
            f2?.classList.add('guess-selected');
        }
    }
    
    /**
     * Filter type chips based on search input
     */
    filterChips(query) {
        const chips = this.dom.filterChips?.querySelectorAll('.t-chip');
        if (!chips) return;
        
        const q = query.toLowerCase();
        chips.forEach(chip => {
            const text = chip.textContent.toLowerCase();
            chip.style.display = text.includes(q) ? '' : 'none';
        });
    }
    
    /**
     * Populate type filter chips from animal data
     */
    populateTypeFilters() {
        if (!this.dom.filterChips) return;
        
        const types = [...new Set(this.app.state.animals.map(a => a.type).filter(Boolean))].sort();
        
        const typeIcons = {
            'Mammal': 'fa-paw',
            'Bird': 'fa-dove',
            'Reptile': 'fa-dragon',
            'Fish': 'fa-fish',
            'Amphibian': 'fa-frog',
            'Insect': 'fa-bug',
            'Arachnid': 'fa-spider',
            'Crustacean': 'fa-shrimp',
            'Mollusk': 'fa-shell'
        };
        
        // Build chip HTML - All first, then types
        let html = `<button class="t-chip active" data-type="all"><i class="fas fa-globe"></i> All</button>`;
        
        types.forEach(type => {
            const icon = typeIcons[type] || 'fa-paw';
            html += `<button class="t-chip" data-type="${type}"><i class="fas ${icon}"></i> ${type}</button>`;
        });
        
        this.dom.filterChips.innerHTML = html;
        
        // Bind click events
        this.dom.filterChips.querySelectorAll('.t-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                // Remove active from all
                this.dom.filterChips.querySelectorAll('.t-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this.selectedType = chip.dataset.type;
                this.updateFilteredAnimals();
                this.updatePreview();
            });
        });
    }
    
    /**
     * Update filtered animals based on selected type
     */
    updateFilteredAnimals() {
        if (this.selectedType === 'all') {
            this.filteredAnimals = [...this.app.state.animals];
        } else {
            this.filteredAnimals = this.app.state.animals.filter(a => a.type === this.selectedType);
        }
        this.updatePreview();
    }
    
    /**
     * Select bracket size (doesn't start tournament yet)
     */
    selectBracketSize(size, element) {
        // Remove selected from all
        this.dom.bracketOptions.forEach(opt => opt.classList.remove('selected'));
        // Add selected to clicked
        element.classList.add('selected');
        this.selectedBracketSize = size;
        this.updatePreview();
    }
    
    /**
     * Update the preview panel
     */
    updatePreview() {
        const available = this.filteredAnimals.length;
        const size = this.selectedBracketSize;
        
        if (this.dom.previewAnimalCount) {
            this.dom.previewAnimalCount.textContent = `${available} animals available`;
        }
        
        if (this.dom.previewBracketSize) {
            if (size > 0) {
                this.dom.previewBracketSize.textContent = `${size}-animal bracket`;
            } else {
                this.dom.previewBracketSize.textContent = 'Select bracket size';
            }
        }
        
        // Enable/disable start button
        if (this.dom.startBtn) {
            const canStart = size > 0 && available >= size;
            this.dom.startBtn.disabled = !canStart;
            
            if (size > 0 && available < size) {
                this.dom.previewAnimalCount.textContent = `${available} animals available (need ${size})`;
            }
        }
    }

    updateLoginNote() {
        if (this.dom.loginNote) {
            this.dom.loginNote.style.display = Auth.isLoggedIn() ? 'none' : 'block';
        }
    }

    showSetup() {
        this.resetTournamentState();
        this.updateLoginNote();
        this.updateFilteredAnimals();
        // Reset UI selections
        this.dom.bracketOptions.forEach(opt => opt.classList.remove('selected'));
        this.selectedBracketSize = 0;
        this.updatePreview();
        
        this.dom.setup.style.display = 'flex';
        this.dom.battle.style.display = 'none';
        this.dom.results.style.display = 'none';
        this.dom.modal.classList.add('show');
        
        // Hide header and nav on mobile for immersive tournament experience
        document.body.classList.add('tournament-active');
        
        // Update URL if not already on tournament route
        if (window.Router && window.Router.getCurrentPath() !== '/tournament') {
            window.Router.navigate('/tournament', { skipHandler: true });
        }
    }

    hideModal() {
        // Notify Discord if quitting an active tournament
        if (this.isActive && this.completedMatches > 0) {
            this.notifyTournamentQuit();
        }
        this.dom.modal.classList.remove('show');
        this.isActive = false;
        
        // Restore header and nav on mobile
        document.body.classList.remove('tournament-active');
        
        // Navigate back using router if on tournament route
        if (window.Router && window.Router.getCurrentPath() === '/tournament') {
            window.Router.back();
        }
    }

    resetTournamentState() {
        this.bracketSize = 0;
        this.animals = [];
        this.bracket = [];
        this.currentRound = 0;
        this.currentMatch = 0;
        this.totalMatches = 0;
        this.completedMatches = 0;
        this.winners = [];
        this.matchHistory = [];
        this.isActive = false;
        this.currentAnimal1 = null;
        this.currentAnimal2 = null;
        // Reset guess mode tracking
        this.currentGuess = null;
        this.correctGuesses = 0;
        this.totalGuesses = 0;
        this.currentMatchupVotes = null;
    }
    
    reset() {
        this.resetTournamentState();
        this.selectedBracketSize = 0;
        this.selectedType = 'all';
        this.guessModeEnabled = false;
    }
    
    /**
     * Setup mobile layout for the battle screen
     * Creates a compact mobile guess section and wraps info panels
     */
    setupMobileLayout() {
        // Check if we're on mobile (max-width: 768px)
        if (window.innerWidth > 768) return;
        
        // Check if mobile layout already set up
        if (document.querySelector('.mobile-guess-section')) return;
        
        const bottomBand = document.querySelector('.t-bottom-band');
        if (!bottomBand) return;
        
        // Get info panels
        const infoPanelLeft = bottomBand.querySelector('.t-info-panel.left');
        const infoPanelRight = bottomBand.querySelector('.t-info-panel.right');
        
        // === CREATE COMPACT GUESS SECTION ===
        const mobileGuess = document.createElement('div');
        mobileGuess.className = 'mobile-guess-section';
        mobileGuess.innerHTML = `
            <div class="guess-label" id="mobile-guess-label">
                <i class="fas fa-brain"></i> <span>Tap to Play Guess Mode</span>
            </div>
            <div class="vote-bar-section">
                <div class="vote-stats-row">
                    <span class="vote-pct left" id="mobile-majority-pct-left">?%</span>
                    <span class="vote-total" id="mobile-majority-total">Community Vote</span>
                    <span class="vote-pct right" id="mobile-majority-pct-right">?%</span>
                </div>
                <div class="vote-bar">
                    <div class="vote-fill left" id="mobile-majority-left" style="width: 50%;"></div>
                    <div class="vote-fill right" id="mobile-majority-right" style="width: 50%;"></div>
                </div>
            </div>
        `;
        
        // Insert guess section before stats
        const statsCompact = bottomBand.querySelector('.t-stats-compact');
        if (statsCompact) {
            bottomBand.insertBefore(mobileGuess, statsCompact);
        } else {
            bottomBand.insertBefore(mobileGuess, bottomBand.firstChild);
        }
        
        // === WRAP INFO PANELS ===
        if (infoPanelLeft && infoPanelRight && !bottomBand.querySelector('.t-info-panels-row')) {
            const infoPanelsRow = document.createElement('div');
            infoPanelsRow.className = 't-info-panels-row';
            infoPanelsRow.appendChild(infoPanelLeft);
            infoPanelsRow.appendChild(infoPanelRight);
            bottomBand.appendChild(infoPanelsRow);
        }
        
        // Helper function to update guess label text
        const updateGuessLabel = (enabled) => {
            const labelSpan = document.querySelector('#mobile-guess-label span');
            if (labelSpan) {
                labelSpan.textContent = enabled ? 'Guessing Mode ON — Pick the Crowd Favorite!' : 'Tap to Play Guess Mode';
            }
        };
        
        // Bind mobile guess section - click anywhere to toggle
        mobileGuess.addEventListener('click', () => {
            this.guessModeEnabled = !this.guessModeEnabled;
            mobileGuess.classList.toggle('active', this.guessModeEnabled);
            updateGuessLabel(this.guessModeEnabled);
            const originalToggle = document.getElementById('t-guess-toggle');
            if (originalToggle) {
                originalToggle.classList.toggle('active', this.guessModeEnabled);
            }
        });
        
        if (this.guessModeEnabled) {
            mobileGuess.classList.add('active');
            updateGuessLabel(true);
        }
    }
    
    /**
     * Update mobile vote display
     */
    updateMobileVoteDisplay(leftPct, rightPct, total) {
        const mobileLeftPct = document.getElementById('mobile-majority-pct-left');
        const mobileRightPct = document.getElementById('mobile-majority-pct-right');
        const mobileTotal = document.getElementById('mobile-majority-total');
        const mobileLeftBar = document.getElementById('mobile-majority-left');
        const mobileRightBar = document.getElementById('mobile-majority-right');
        
        if (mobileLeftPct) mobileLeftPct.textContent = leftPct;
        if (mobileRightPct) mobileRightPct.textContent = rightPct;
        if (mobileTotal) mobileTotal.textContent = total;
        
        if (mobileLeftBar && mobileRightBar) {
            // Parse percentages for bar widths
            const leftVal = parseFloat(leftPct) || 50;
            const rightVal = parseFloat(rightPct) || 50;
            mobileLeftBar.style.width = `${leftVal}%`;
            mobileRightBar.style.width = `${rightVal}%`;
        }
    }
    
    startTournament() {
        // Use selected bracket size
        const size = this.selectedBracketSize;
        if (!size || this.filteredAnimals.length < size) {
            alert('Please select a bracket size with enough animals available.');
            return;
        }
        
        this.resetTournamentState();
        this.bracketSize = size;
        this.totalMatches = size - 1;
        this.isActive = true;
        this.startTime = Date.now(); // Track tournament start time
        
        // Get random animals from filtered list
        this.animals = this.getRandomAnimals(size);
        
        // Build initial bracket (pairs of animals)
        this.bracket = [];
        for (let i = 0; i < this.animals.length; i += 2) {
            this.bracket.push([this.animals[i], this.animals[i + 1]]);
        }
        
        // Calculate total rounds
        this.totalRounds = Math.log2(size);
        this.currentRound = 1;
        this.currentMatch = 0;
        
        // Show battle screen
        this.dom.setup.style.display = 'none';
        this.dom.battle.style.display = 'flex';
        this.dom.results.style.display = 'none';
        
        // Setup mobile layout
        this.setupMobileLayout();
        
        // Show first matchup
        this.showCurrentMatch();
    }

    getRandomAnimals(count) {
        // Use filtered animals instead of all animals
        const allAnimals = [...this.filteredAnimals];
        
        // Shuffle array
        for (let i = allAnimals.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allAnimals[i], allAnimals[j]] = [allAnimals[j], allAnimals[i]];
        }
        
        // Take first 'count' animals
        return allAnimals.slice(0, count);
    }

    showCurrentMatch() {
        if (this.currentMatch >= this.bracket.length) {
            // Move to next round
            this.advanceRound();
            return;
        }
        
        const match = this.bracket[this.currentMatch];
        const [animal1, animal2] = match;
        
        // Store current animals
        this.currentAnimal1 = animal1;
        this.currentAnimal2 = animal2;
        
        // Play intro animation for EVERY match
        this.playMatchIntro(animal1, animal2, () => {
            this.displayMatch(animal1, animal2);
        });
    }
    
    /**
     * Play the fighting game style match intro animation
     */
    playMatchIntro(animal1, animal2, callback) {
        const overlay = document.getElementById('match-intro-overlay');
        if (!overlay) {
            callback();
            return;
        }
        
        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        // Populate intro data
        const imageLeft = document.getElementById('intro-image-left');
        const imageRight = document.getElementById('intro-image-right');
        const nameLeft = document.getElementById('intro-name-left');
        const nameRight = document.getElementById('intro-name-right');
        const scientificLeft = document.getElementById('intro-scientific-left');
        const scientificRight = document.getElementById('intro-scientific-right');
        
        if (imageLeft) {
            imageLeft.src = animal1.image || '';
            imageLeft.onerror = () => { imageLeft.src = 'images/fallback.png'; };
        }
        if (imageRight) {
            imageRight.src = animal2.image || '';
            imageRight.onerror = () => { imageRight.src = 'images/fallback.png'; };
        }
        if (nameLeft) nameLeft.textContent = (animal1.name || 'FIGHTER 1').toUpperCase();
        if (nameRight) nameRight.textContent = (animal2.name || 'FIGHTER 2').toUpperCase();
        if (scientificLeft) scientificLeft.textContent = animal1.scientific_name || '';
        if (scientificRight) scientificRight.textContent = animal2.scientific_name || '';
        
        // Reset animation states
        overlay.classList.remove('fade-out', 'shake');
        
        // Show overlay
        overlay.classList.add('active');
        
        // Spawn sparks after VS appears
        if (!prefersReducedMotion) {
            setTimeout(() => {
                this.spawnIntroSparks();
            }, 800);
            
            // Add screen shake when VS appears
            setTimeout(() => {
                overlay.classList.add('shake');
            }, 750);
        }
        
        // Duration before fade out (shorter for reduced motion)
        const introDuration = prefersReducedMotion ? 800 : 2000;
        const fadeOutDuration = prefersReducedMotion ? 200 : 500;
        
        setTimeout(() => {
            overlay.classList.add('fade-out');
            
            setTimeout(() => {
                overlay.classList.remove('active', 'fade-out', 'shake');
                callback();
            }, fadeOutDuration);
        }, introDuration);
    }
    
    /**
     * Spawn particle sparks for intro animation
     */
    spawnIntroSparks() {
        const container = document.getElementById('intro-sparks');
        if (!container) return;
        
        // Clear previous sparks
        container.innerHTML = '';
        
        // Spawn 15-20 sparks around center
        const sparkCount = 15 + Math.floor(Math.random() * 6);
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        for (let i = 0; i < sparkCount; i++) {
            const spark = document.createElement('div');
            spark.className = 'intro-spark';
            
            // Random position around center
            const angle = (Math.PI * 2 * i) / sparkCount + (Math.random() * 0.5);
            const distance = 50 + Math.random() * 100;
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            spark.style.left = `${x}px`;
            spark.style.top = `${y}px`;
            spark.style.animationDelay = `${Math.random() * 0.2}s`;
            
            container.appendChild(spark);
        }
    }
    
    /**
     * Display the actual match UI (called after intro)
     */
    displayMatch(animal1, animal2) {
        // Reset guess for new match
        this.currentGuess = null;
        this.updateGuessHighlight();
        
        // Update progress
        this.updateProgress();
        
        // Get fighter cards fresh from DOM
        const fighter1Card = this.getFighterCard(1);
        const fighter2Card = this.getFighterCard(2);
        
        // Reset any previous selection styling
        if (fighter1Card) fighter1Card.classList.remove('selected', 'eliminated', 'winner', 'loser');
        if (fighter2Card) fighter2Card.classList.remove('selected', 'eliminated', 'winner', 'loser');
        
        // Hide rating change displays
        this.hideRatingChanges();
        
        // Update fighter 1
        this.updateFighterCard(1, animal1);
        
        // Update fighter 2
        this.updateFighterCard(2, animal2);
        
        // Highlight stat winners for each row
        this.highlightStatWinners(animal1, animal2);
        
        // Update radar chart with both fighters
        this.updateTournamentRadarChart(animal1, animal2);
        
        // Load majority vote data for this matchup
        this.loadMatchupVotes(animal1.name, animal2.name);
        
        // Add entrance animation
        if (fighter1Card) fighter1Card.style.animation = 'none';
        if (fighter2Card) fighter2Card.style.animation = 'none';
        setTimeout(() => {
            const f1 = this.getFighterCard(1);
            const f2 = this.getFighterCard(2);
            if (f1) f1.style.animation = 'slideInLeft 0.5s ease';
            if (f2) f2.style.animation = 'slideInRight 0.5s ease';
        }, 10);
    }
    
    /**
     * Load majority vote data for a matchup
     * Shows ?% until user votes, then reveals percentages with animation
     */
    async loadMatchupVotes(animal1Name, animal2Name) {
        // Reset voted state for new matchup
        this.hasVotedOnMatchup = false;
        
        // Show ?% initially (hide until user votes)
        const pctLeft = document.getElementById('t-majority-pct-left');
        const pctRight = document.getElementById('t-majority-pct-right');
        const barLeft = document.getElementById('t-majority-left');
        const barRight = document.getElementById('t-majority-right');
        const totalEl = document.getElementById('t-majority-total');
        
        if (pctLeft) pctLeft.textContent = '?%';
        if (pctRight) pctRight.textContent = '?%';
        
        // Set bars to 50% as placeholder
        if (barLeft) {
            barLeft.style.transition = 'none';
            barLeft.style.width = '50%';
        }
        if (barRight) {
            barRight.style.transition = 'none';
            barRight.style.width = '50%';
        }
        
        // Also update mobile display
        this.updateMobileVoteDisplay('?%', '?%', 'No votes yet');
        
        try {
            const params = new URLSearchParams({
                action: 'matchup_votes',
                animal1: animal1Name,
                animal2: animal2Name
            });
            
            const response = await fetch(`/api/battles?${params}`);
            if (!response.ok) return;
            
            const result = await response.json();
            if (!result.success) return;
            
            const { animal1Votes, animal2Votes, totalVotes, animal1Percentage, animal2Percentage } = result.data;
            
            // Show vote count
            const voteText = totalVotes === 0 ? 'No votes yet' : `${totalVotes.toLocaleString()} votes`;
            if (totalEl) {
                totalEl.textContent = voteText;
            }
            
            // Update mobile display with vote count (but still hidden percentages)
            this.updateMobileVoteDisplay('?%', '?%', voteText);
            
            // Cache for guess evaluation and reveal after voting
            this.currentMatchupVotes = {
                animal1Votes,
                animal2Votes,
                totalVotes,
                animal1Percentage,
                animal2Percentage
            };
        } catch (error) {
            console.error('Error loading matchup votes:', error);
        }
    }
    
    /**
     * Reveal community vote percentages with animation (called after user votes)
     * @param {number} votedForIndex - 0 for left fighter, 1 for right fighter
     */
    revealCommunityVote(votedForIndex) {
        if (this.hasVotedOnMatchup) return;
        
        this.hasVotedOnMatchup = true;
        
        // Get elements directly for reliability
        const barLeft = document.getElementById('t-majority-left');
        const barRight = document.getElementById('t-majority-right');
        const pctLeft = document.getElementById('t-majority-pct-left');
        const pctRight = document.getElementById('t-majority-pct-right');
        const totalEl = document.getElementById('t-majority-total');
        
        // Get cached votes (or default to 0)
        let animal1Votes = this.currentMatchupVotes?.animal1Votes || 0;
        let animal2Votes = this.currentMatchupVotes?.animal2Votes || 0;
        
        // Add user's vote to the appropriate side
        if (votedForIndex === 0) {
            animal1Votes++;
        } else {
            animal2Votes++;
        }
        
        // Calculate new totals and percentages
        const newTotal = animal1Votes + animal2Votes;
        const animal1Percentage = newTotal > 0 ? Math.round((animal1Votes / newTotal) * 100) : 50;
        const animal2Percentage = newTotal > 0 ? 100 - animal1Percentage : 50;
        
        const voteText = `${newTotal.toLocaleString()} vote${newTotal !== 1 ? 's' : ''}`;
        if (totalEl) {
            totalEl.textContent = voteText;
        }
        
        // Enable transitions for smooth animation
        if (barLeft) {
            barLeft.style.transition = 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            barLeft.style.width = `${animal1Percentage}%`;
        }
        if (barRight) {
            barRight.style.transition = 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            barRight.style.width = `${animal2Percentage}%`;
        }
        
        // Reveal percentages with slight delay for effect
        setTimeout(() => {
            if (pctLeft) pctLeft.textContent = `${animal1Percentage}%`;
            if (pctRight) pctRight.textContent = `${animal2Percentage}%`;
            
            // Also update mobile display
            this.updateMobileVoteDisplay(`${animal1Percentage}%`, `${animal2Percentage}%`, voteText);
        }, 200);
    }
    
    /**
     * Hide rating change displays on fighter cards
     */
    hideRatingChanges() {
        document.getElementById('t-rating-change-1')?.classList.remove('show');
        document.getElementById('t-rating-change-2')?.classList.remove('show');
    }
    
    /**
     * Show in-card rating change (replaces overlay animation)
     */
    showInCardRatingChange(fighterNum, oldRating, newRating, isWinner) {
        const container = document.getElementById(`t-rating-change-${fighterNum}`);
        if (!container) return;
        
        const deltaEl = container.querySelector('.t-rating-delta');
        const calcEl = container.querySelector('.t-rating-calc');
        
        const change = newRating - oldRating;
        
        if (deltaEl) {
            deltaEl.textContent = change >= 0 ? `+${change}` : `${change}`;
            deltaEl.classList.remove('positive', 'negative');
            deltaEl.classList.add(change >= 0 ? 'positive' : 'negative');
        }
        
        if (calcEl) {
            calcEl.innerHTML = `<span class="old">${oldRating}</span> â†’ <span class="new">${newRating}</span>`;
        }
        
        container.classList.add('show');
    }
    
    /**
     * Highlight which fighter wins each stat category
     */
    highlightStatWinners(animal1, animal2) {
        const stats = ['attack', 'defense', 'agility', 'stamina', 'intelligence', 'special'];
        
        stats.forEach(stat => {
            // V4 selector uses t-stat-row class
            let row = document.querySelector(`.t-stat-row[data-stat="${stat}"]`);
            // Fallback to older selectors
            if (!row) row = document.querySelector(`.stat-row-v3[data-stat="${stat}"]`);
            if (!row) row = document.querySelector(`.stat-row-v2[data-stat="${stat}"]`);
            if (!row) row = document.querySelector(`.stat-row[data-stat="${stat}"]`);
            if (!row) return;
            
            const val1 = Math.round(animal1[stat] || 0);
            const val2 = Math.round(animal2[stat] || 0);
            
            // Remove previous winner classes
            row.classList.remove('left-wins', 'right-wins', 'tie');
            
            if (val1 > val2) {
                row.classList.add('left-wins');
            } else if (val2 > val1) {
                row.classList.add('right-wins');
            } else {
                row.classList.add('tie');
            }
        });
    }
    
    /**
     * Update Tournament Radar Chart
     * Reuses logic from CompareManager.updateRadarChart() with tournament colors
     */
    updateTournamentRadarChart(animal1, animal2) {
        const canvas = document.getElementById('tournament-radar-chart');
        if (!canvas) return;

        // Destroy existing chart if it exists
        if (this.tournamentRadarChart) {
            this.tournamentRadarChart.destroy();
            this.tournamentRadarChart = null;
        }

        // If no animals, don't render
        if (!animal1 && !animal2) return;

        const ctx = canvas.getContext('2d');
        
        const data = {
            labels: ['ATK', 'DEF', 'AGI', 'STA', 'INT', 'SPL'],
            datasets: []
        };

        // Left fighter - cyan color (tournament theme)
        if (animal1) {
            data.datasets.push({
                label: animal1.name,
                data: [animal1.attack, animal1.defense, animal1.agility, animal1.stamina, animal1.intelligence, animal1.special],
                fill: true,
                backgroundColor: 'rgba(0, 212, 255, 0.2)',
                borderColor: '#00d4ff',
                pointBackgroundColor: '#00d4ff',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#00d4ff',
                borderWidth: 2
            });
        }

        // Right fighter - orange color (tournament theme)
        if (animal2) {
            data.datasets.push({
                label: animal2.name,
                data: [animal2.attack, animal2.defense, animal2.agility, animal2.stamina, animal2.intelligence, animal2.special],
                fill: true,
                backgroundColor: 'rgba(255, 107, 0, 0.2)',
                borderColor: '#ff6b00',
                pointBackgroundColor: '#ff6b00',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#ff6b00',
                borderWidth: 2
            });
        }

        this.tournamentRadarChart = new Chart(ctx, {
            type: 'radar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: true,
                elements: {
                    line: { borderWidth: 2 },
                    point: { radius: 2, hoverRadius: 4 }
                },
                scales: {
                    r: {
                        angleLines: { color: 'rgba(255, 255, 255, 0.15)' },
                        grid: { color: 'rgba(255, 255, 255, 0.15)' },
                        pointLabels: {
                            color: 'rgba(255, 255, 255, 0.8)',
                            font: { family: 'Bebas Neue', size: 9 }
                        },
                        ticks: { display: false, backdropColor: 'transparent' },
                        suggestedMin: 0,
                        suggestedMax: 100
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
    
    /**
     * Get fighter card element (refreshed from DOM)
     */
    getFighterCard(fighterNum) {
        return document.getElementById(`tournament-fighter-${fighterNum}`);
    }
    
    /**
     * Update a fighter card with animal data and stat bars
     * Re-fetches DOM elements each time to ensure they exist
     * Updated to use Stats page consistent components - Sketch Layout
     */
    updateFighterCard(fighterNum, animal) {
        // Re-fetch DOM elements to ensure they exist - use t-fighter prefix for tournament
        const imgEl = document.getElementById(`t-fighter-${fighterNum}-img`);
        const nameEl = document.getElementById(`t-fighter-${fighterNum}-name`);
        const scientificEl = document.getElementById(`t-fighter-${fighterNum}-scientific`);
        const rankEl = document.getElementById(`t-fighter-${fighterNum}-rank`);
        const winrateEl = document.getElementById(`t-fighter-${fighterNum}-winrate`);
        const battlesEl = document.getElementById(`t-fighter-${fighterNum}-battles`);
        const weightEl = document.getElementById(`t-fighter-${fighterNum}-weight`);
        const speedEl = document.getElementById(`t-fighter-${fighterNum}-speed`);
        const biteEl = document.getElementById(`t-fighter-${fighterNum}-bite`);
        
        // Image
        if (imgEl) {
            imgEl.src = animal.image || '';
            imgEl.alt = animal.name || 'Unknown';
            imgEl.onerror = () => { imgEl.src = FALLBACK_IMAGE; };
        }
        
        // Name - IMPORTANT: Set from actual animal data
        if (nameEl) {
            nameEl.textContent = animal.name || 'Unknown Animal';
        }
        
        // Scientific Name
        if (scientificEl) {
            scientificEl.textContent = animal.scientific_name || animal.scientificName || 'Unknown species';
        }
        
        // Get ranking data from RankingsManager
        const rankings = this.app.rankingsManager?.rankings || [];
        const rankingItem = rankings.find(r => r.animal?.name === animal.name);
        const rankIndex = rankings.findIndex(r => r.animal?.name === animal.name);
        
        // Rank (now inside .record-value span)
        if (rankEl) {
            rankEl.textContent = rankIndex >= 0 ? `#${rankIndex + 1}` : '#--';
        }
        
        // Win rate (now inside .record-value span)
        if (winrateEl) {
            const winRate = rankingItem?.winRate || 0;
            winrateEl.textContent = `${winRate}%`;
        }
        
        // Battles count (now inside .record-value span)
        if (battlesEl) {
            const totalBattles = (rankingItem?.wins || 0) + (rankingItem?.losses || 0) || animal.totalBattles || 0;
            battlesEl.textContent = totalBattles;
        }
        
        // Physical specs - now use quick-info-item with span child
        if (weightEl) {
            const weightKg = animal.weight_kg || animal.weight || animal.averageWeight;
            const spanEl = weightEl.querySelector('span');
            if (spanEl) {
                if (weightKg) {
                    const weightLbs = Math.round(weightKg * 2.20462);
                    spanEl.textContent = `${weightLbs.toLocaleString()} lbs`;
                } else {
                    spanEl.textContent = '--';
                }
            }
        }
        
        if (speedEl) {
            const speedMps = animal.speed_mps || animal.speed || animal.topSpeed;
            const spanEl = speedEl.querySelector('span');
            if (spanEl) {
                if (speedMps) {
                    const speedKmh = Math.round(speedMps * 3.6);
                    spanEl.textContent = `${speedKmh} km/h`;
                } else {
                    spanEl.textContent = '--';
                }
            }
        }
        
        if (biteEl) {
            const bitePsi = animal.bite_force_psi || animal.biteForce || animal.bite;
            const spanEl = biteEl.querySelector('span');
            if (spanEl) {
                if (bitePsi) {
                    spanEl.textContent = `${Math.round(bitePsi).toLocaleString()} PSI`;
                } else {
                    spanEl.textContent = '--';
                }
            }
        }
        
        // Stats - update both value text and stat bar fill (reuses .stat-bar from Stats page)
        const statKeys = ['attack', 'defense', 'agility', 'stamina', 'intelligence', 'special'];
        
        statKeys.forEach(key => {
            const value = Math.round(animal[key] || 0);
            
            // Update stat value text
            const statEl = document.getElementById(`t-fighter-${fighterNum}-${key}`);
            if (statEl) statEl.textContent = value;
            
            // Update stat bar fill and tier class
            const barEl = document.getElementById(`t-fighter-${fighterNum}-${key}-bar`);
            if (barEl) {
                barEl.style.width = `${value}%`;
                // Apply tier coloring from Stats page
                barEl.className = 'stat-bar-fill ' + this.getStatTierClass(value);
            }
        });
        
        // Highlight which stat wins
        this.updateStatComparison();
        
        // Abilities and Traits tags (reuses .ability-tag-sm / .trait-tag-sm from Stats page)
        this.updateFighterTags(fighterNum, animal);
        
        // Fetch ranking data (votes, tournament records) and update UI
        this.fetchAndUpdateRankingData(fighterNum, animal);
        
        // Action buttons (upvote/downvote/comments/details)
        this.setupFighterActionButtons(fighterNum, animal);
    }
    
    /**
     * Fetch ranking data for an animal and update tournament record + vote counts
     * Uses cached data if available, otherwise fetches from /api/rankings
     */
    async fetchAndUpdateRankingData(fighterNum, animal) {
        const animalName = animal.name;
        
        // Check cache first
        if (this.rankingDataCache[animalName]) {
            this.applyRankingDataToUI(fighterNum, this.rankingDataCache[animalName]);
            return;
        }
        
        // Fetch from API
        try {
            const response = await fetch('/api/rankings', {
                headers: { 'Accept': 'application/json' }
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    // Cache all ranking data
                    result.data.forEach(item => {
                        const name = item.animal?.name || item.name;
                        if (name) {
                            this.rankingDataCache[name] = {
                                upvotes: item.upvotes || 0,
                                downvotes: item.downvotes || 0,
                                commentCount: item.commentCount || 0,
                                tournamentsFirst: item.tournamentsFirst || 0,
                                tournamentsSecond: item.tournamentsSecond || 0,
                                tournamentsThird: item.tournamentsThird || 0,
                                tournamentsPlayed: item.tournamentsPlayed || 0
                            };
                        }
                    });
                    
                    // Apply to UI if we got data for this animal
                    if (this.rankingDataCache[animalName]) {
                        this.applyRankingDataToUI(fighterNum, this.rankingDataCache[animalName]);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching ranking data:', error);
        }
    }
    
    /**
     * Apply ranking data to the tournament UI
     */
    applyRankingDataToUI(fighterNum, data) {
        // Update tournament record medals
        const goldEl = document.getElementById(`t-fighter-${fighterNum}-gold`);
        const silverEl = document.getElementById(`t-fighter-${fighterNum}-silver`);
        const bronzeEl = document.getElementById(`t-fighter-${fighterNum}-bronze`);
        
        if (goldEl) goldEl.textContent = data.tournamentsFirst || 0;
        if (silverEl) silverEl.textContent = data.tournamentsSecond || 0;
        if (bronzeEl) bronzeEl.textContent = data.tournamentsThird || 0;
        
        // Update vote counts
        const upvotesEl = document.getElementById(`t-fighter-${fighterNum}-upvotes`);
        const downvotesEl = document.getElementById(`t-fighter-${fighterNum}-downvotes`);
        const commentCountEl = document.getElementById(`t-fighter-${fighterNum}-comment-count`);
        
        if (upvotesEl) upvotesEl.textContent = data.upvotes || 0;
        if (downvotesEl) downvotesEl.textContent = data.downvotes || 0;
        if (commentCountEl) commentCountEl.textContent = data.commentCount || 0;
    }
    
    /**
     * Get the tier class for a stat value (reuses Stats page tier system)
     */
    getStatTierClass(value) {
        if (value >= 90) return 'stat-bar-tier-s';
        if (value >= 75) return 'stat-bar-tier-a';
        if (value >= 60) return 'stat-bar-tier-b';
        if (value >= 40) return 'stat-bar-tier-c';
        if (value >= 20) return 'stat-bar-tier-d';
        return 'stat-bar-tier-f';
    }
    
    /**
     * Update stat comparison highlighting
     */
    updateStatComparison() {
        const statKeys = ['attack', 'defense', 'agility', 'stamina', 'intelligence', 'special'];
        
        statKeys.forEach(key => {
            const stat1El = document.getElementById(`t-fighter-1-${key}`);
            const stat2El = document.getElementById(`t-fighter-2-${key}`);
            // Support multiple class names for stat rows (old and new layouts)
            const compareRow = document.querySelector(`.t-stat-row-compact[data-stat="${key}"]`)
                            || document.querySelector(`.t-stat-row[data-stat="${key}"]`) 
                            || document.querySelector(`.t-stat-compare[data-stat="${key}"]`);
            
            if (stat1El && stat2El && compareRow) {
                const val1 = parseInt(stat1El.textContent) || 0;
                const val2 = parseInt(stat2El.textContent) || 0;
                
                compareRow.classList.remove('left-wins', 'right-wins');
                if (val1 > val2) {
                    compareRow.classList.add('left-wins');
                } else if (val2 > val1) {
                    compareRow.classList.add('right-wins');
                }
            }
        });
    }
    
    /**
     * Update abilities and traits tags for a fighter
     * Uses Stats page .ability-tag-sm and .trait-tag-sm classes
     * Shows full text, no truncation
     */
    updateFighterTags(fighterNum, animal) {
        const abilitiesEl = document.getElementById(`t-fighter-${fighterNum}-abilities`);
        const traitsEl = document.getElementById(`t-fighter-${fighterNum}-traits`);
        
        // Abilities (up to 3 for display) - use Stats page ability-tag-sm
        // Prefer special_abilities (DB field name) over abilities
        if (abilitiesEl) {
            const abilities = animal.special_abilities || animal.abilities || [];
            const abilityList = Array.isArray(abilities) ? abilities : [abilities].filter(Boolean);
            if (abilityList.length > 0) {
                abilitiesEl.innerHTML = abilityList.slice(0, 3).map(a => 
                    `<span class="ability-tag-sm"><i class="fas fa-star"></i>${a}</span>`
                ).join('');
            } else {
                abilitiesEl.innerHTML = '<span class="ability-tag-sm placeholder">None</span>';
            }
        }
        
        // Traits (up to 3 for display) - use Stats page trait-tag-sm
        // Prefer unique_traits (DB field name) over traits
        if (traitsEl) {
            const traits = animal.unique_traits || animal.traits || animal.characteristics || [];
            const traitList = Array.isArray(traits) ? traits : [traits].filter(Boolean);
            if (traitList.length > 0) {
                traitsEl.innerHTML = traitList.slice(0, 3).map(t => 
                    `<span class="trait-tag-sm"><i class="fas fa-tag"></i>${t}</span>`
                ).join('');
            } else {
                traitsEl.innerHTML = '<span class="trait-tag-sm placeholder">None</span>';
            }
        }
    }
    
    /**
     * Update tournament record medals for a fighter
     * Shows gold/silver/bronze medal counts from tournament history
     */
    updateFighterTournamentRecord(fighterNum, animal) {
        const goldEl = document.getElementById(`t-fighter-${fighterNum}-gold`);
        const silverEl = document.getElementById(`t-fighter-${fighterNum}-silver`);
        const bronzeEl = document.getElementById(`t-fighter-${fighterNum}-bronze`);
        
        // Get tournament stats from animal data
        const gold = animal.tournamentsFirst || 0;
        const silver = animal.tournamentsSecond || 0;
        const bronze = animal.tournamentsThird || 0;
        
        if (goldEl) goldEl.textContent = gold;
        if (silverEl) silverEl.textContent = silver;
        if (bronzeEl) bronzeEl.textContent = bronze;
    }
    
    /**
     * Setup action button handlers for a fighter panel
     * Reuses RankingsManager methods for comments and details
     */
    setupFighterActionButtons(fighterNum, animal) {
        const upvoteBtn = document.getElementById(`t-fighter-${fighterNum}-upvote`);
        const downvoteBtn = document.getElementById(`t-fighter-${fighterNum}-downvote`);
        const commentsBtn = document.getElementById(`t-fighter-${fighterNum}-comments`);
        const detailsBtn = document.getElementById(`t-fighter-${fighterNum}-details`);
        
        const animalId = animal._id || animal.id || '';
        const animalName = animal.name || '';
        const animalImage = animal.image || '';
        
        // Store animal data on buttons for click handlers
        [upvoteBtn, downvoteBtn, commentsBtn, detailsBtn].forEach(btn => {
            if (btn) {
                btn.dataset.animalId = animalId;
                btn.dataset.animalName = animalName;
                btn.dataset.animalImage = animalImage;
            }
        });
        
        // Upvote handler
        if (upvoteBtn) {
            upvoteBtn.onclick = async () => {
                if (!Auth.isLoggedIn()) {
                    Auth.showToast('Please log in to vote!');
                    Auth.showModal('login');
                    return;
                }
                await this.handleTournamentVote(animal, 'up', upvoteBtn, downvoteBtn, fighterNum);
            };
        }
        
        // Downvote handler
        if (downvoteBtn) {
            downvoteBtn.onclick = async () => {
                if (!Auth.isLoggedIn()) {
                    Auth.showToast('Please log in to vote!');
                    Auth.showModal('login');
                    return;
                }
                await this.handleTournamentVote(animal, 'down', upvoteBtn, downvoteBtn, fighterNum);
            };
        }
        
        // Comments handler - use RankingsManager openCommentsModal
        if (commentsBtn) {
            commentsBtn.onclick = () => {
                const rankingsManager = this.app.rankingsManager;
                if (rankingsManager && rankingsManager.openCommentsModal) {
                    // Create a fake event with the button as currentTarget
                    rankingsManager.openCommentsModal({ currentTarget: commentsBtn });
                } else {
                    // Fallback: Navigate to rankings tab and show comments
                    this.app.switchView('rankings');
                    Auth.showToast('View comments on the Rankings page');
                }
            };
        }
        
        // Details handler - show in-tournament details overlay
        if (detailsBtn) {
            detailsBtn.onclick = () => {
                this.toggleDetailsOverlay(fighterNum, animal);
            };
        }
        
        // Setup close button for details overlay
        const detailsCloseBtn = document.getElementById(`t-details-close-${fighterNum}`);
        if (detailsCloseBtn) {
            detailsCloseBtn.onclick = () => {
                const overlay = document.getElementById(`t-details-overlay-${fighterNum}`);
                if (overlay) overlay.classList.remove('show');
            };
        }
    }
    
    /**
     * Toggle and populate the in-tournament details overlay
     */
    toggleDetailsOverlay(fighterNum, animal) {
        const overlay = document.getElementById(`t-details-overlay-${fighterNum}`);
        if (!overlay) return;
        
        // If already showing, just hide it
        if (overlay.classList.contains('show')) {
            overlay.classList.remove('show');
            return;
        }
        
        // Populate the overlay with animal data
        this.populateDetailsOverlay(fighterNum, animal);
        
        // Show the overlay
        overlay.classList.add('show');
    }
    
    /**
     * Populate the details overlay with animal information
     */
    populateDetailsOverlay(fighterNum, animal) {
        // Description
        const descEl = document.getElementById(`t-details-desc-${fighterNum}`);
        if (descEl) {
            descEl.textContent = animal.description || 'No description available.';
        }
        
        // Type
        const typeEl = document.getElementById(`t-details-type-${fighterNum}`);
        if (typeEl) {
            typeEl.textContent = animal.type || 'Unknown';
        }
        
        // Habitat
        const habitatEl = document.getElementById(`t-details-habitat-${fighterNum}`);
        if (habitatEl) {
            const habitat = Array.isArray(animal.habitat) ? animal.habitat.join(', ') : (animal.habitat || 'Unknown');
            habitatEl.textContent = habitat;
        }
        
        // Diet
        const dietEl = document.getElementById(`t-details-diet-${fighterNum}`);
        if (dietEl) {
            const diet = Array.isArray(animal.diet) ? animal.diet.join(', ') : (animal.diet || 'Unknown');
            dietEl.textContent = diet;
        }
        
        // Size
        const sizeEl = document.getElementById(`t-details-size-${fighterNum}`);
        if (sizeEl) {
            sizeEl.textContent = animal.size || 'Unknown';
        }
        
        // Lifespan
        const lifespanEl = document.getElementById(`t-details-lifespan-${fighterNum}`);
        if (lifespanEl) {
            lifespanEl.textContent = animal.lifespan_years ? `${animal.lifespan_years} years` : 'Unknown';
        }
        
        // Social
        const socialEl = document.getElementById(`t-details-social-${fighterNum}`);
        if (socialEl) {
            socialEl.textContent = animal.isSocial === true ? 'Yes' : (animal.isSocial === false ? 'No' : 'Unknown');
        }
        
        // Combat Style
        const combatEl = document.getElementById(`t-details-combat-${fighterNum}`);
        if (combatEl) {
            combatEl.textContent = animal.battle_profile?.combat_style || animal.combat_style || 'Adaptive';
        }
    }
    
    /**
     * Handle vote from tournament action buttons
     * Users can change their vote anytime, but XP is only awarded once per day
     */
    async handleTournamentVote(animal, voteType, upvoteBtn, downvoteBtn, fighterNum) {
        // Get user's timezone
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        try {
            const response = await fetch('/api/votes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.getToken()}`
                },
                body: JSON.stringify({ 
                    animalId: animal._id || animal.id, 
                    animalName: animal.name, 
                    voteType,
                    timeZone
                })
            });

            const result = await response.json();

            if (result.success) {
                // Update button states
                const userVote = result.data.userVote;
                if (upvoteBtn) {
                    upvoteBtn.classList.toggle('active', userVote === 'up');
                }
                if (downvoteBtn) {
                    downvoteBtn.classList.toggle('active', userVote === 'down');
                }
                
                // Update vote counts from server response
                const animalName = animal.name;
                if (this.rankingDataCache[animalName]) {
                    this.rankingDataCache[animalName].upvotes = result.data.upvotes;
                    this.rankingDataCache[animalName].downvotes = result.data.downvotes;
                    // Re-apply to UI
                    if (fighterNum) {
                        this.applyRankingDataToUI(fighterNum, this.rankingDataCache[animalName]);
                    }
                }
                
                Auth.showToast(result.message || `Vote recorded for ${animal.name}!`);
            } else {
                Auth.showToast(result.message || 'Failed to vote');
            }
        } catch (error) {
            console.error('Vote error:', error);
            Auth.showToast('Failed to vote. Please try again.');
        }
    }

    /**
     * Fetch and display ELO rating for a fighter
     * Uses Stats page .row-elo-badge with tier classes
     */
    async updateFighterElo(fighterNum, animalName) {
        const eloEl = document.getElementById(`t-fighter-${fighterNum}-elo`);
        if (!eloEl) return;
        
        // Check cache first
        if (this.eloCache[animalName]) {
            const elo = this.eloCache[animalName];
            eloEl.textContent = elo;
            this.applyEloBadgeTier(eloEl, elo);
            return;
        }
        
        try {
            const response = await fetch(`/api/battles?animal=${encodeURIComponent(animalName)}`);
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    const elo = result.data.battleRating || 1000;
                    this.eloCache[animalName] = elo;
                    eloEl.textContent = elo;
                    this.applyEloBadgeTier(eloEl, elo);
                }
            }
        } catch (error) {
            console.error('Error fetching ELO:', error);
            eloEl.textContent = '1000';
            this.applyEloBadgeTier(eloEl, 1000);
        }
    }
    
    /**
     * Apply ELO tier class to badge (reuses Stats page .row-elo-badge tiers)
     */
    applyEloBadgeTier(el, elo) {
        el.classList.remove('elite', 'high', 'mid', 'low');
        if (elo >= 1200) {
            el.classList.add('elite');
        } else if (elo >= 1100) {
            el.classList.add('high');
        } else if (elo >= 1000) {
            el.classList.add('mid');
        } else {
            el.classList.add('low');
        }
    }

    updateProgress() {
        const roundName = this.getRoundName(this.currentRound, this.totalRounds);
        const matchInRound = this.currentMatch + 1;
        const matchesInRound = this.bracket.length;
        
        this.dom.progressText.textContent = roundName;
        this.dom.matchText.textContent = `Match ${matchInRound} of ${matchesInRound}`;
        
        const progressPercent = (this.completedMatches / this.totalMatches) * 100;
        this.dom.progressBar.style.width = `${progressPercent}%`;
    }

    getRoundName(round, totalRounds) {
        if (round === totalRounds) return 'FINALS';
        if (round === totalRounds - 1) return 'SEMI-FINALS';
        if (round === totalRounds - 2) return 'QUARTER-FINALS';
        return `Round ${round} of ${totalRounds}`;
    }

    selectWinner(fighterIndex) {
        const match = this.bracket[this.currentMatch];
        const winner = match[fighterIndex];
        const loser = match[1 - fighterIndex];
        
        // If guess mode is active, check guess before recording battle
        // Only count guesses if there were prior votes (can't guess majority of nothing)
        if (this.guessModeEnabled && this.currentGuess !== null && this.currentMatchupVotes && this.currentMatchupVotes.totalVotes > 0) {
            this.totalGuesses++;
            // Check if user guessed the majority choice
            const majorityIndex = this.getMajorityWinner();
            if (this.currentGuess === majorityIndex) {
                this.correctGuesses++;
            }
        }
        
        // Reveal community vote percentages with animation (pass which fighter was selected)
        this.revealCommunityVote(fighterIndex);
        
        // Record match locally
        this.matchHistory.push({
            round: this.currentRound,
            winner: winner,
            loser: loser
        });
        
        // Add winner to next round
        this.winners.push(winner);
        this.completedMatches++;
        
        // Visual feedback using CSS classes - fetch fresh from DOM
        const winnerEl = this.getFighterCard(fighterIndex === 0 ? 1 : 2);
        const loserEl = this.getFighterCard(fighterIndex === 0 ? 2 : 1);
        
        if (winnerEl) winnerEl.classList.add('winner');
        if (loserEl) loserEl.classList.add('loser');
        
        // Record battle to API and show in-card animation
        this.recordBattleWithInCardAnimation(winner, loser, fighterIndex);
    }
    
    /**
     * Get the majority winner index based on cached votes
     */
    getMajorityWinner() {
        if (!this.currentMatchupVotes) return null;
        const { animal1Votes, animal2Votes } = this.currentMatchupVotes;
        if (animal1Votes === animal2Votes) return null;
        return animal1Votes > animal2Votes ? 0 : 1;
    }
    
    async recordBattleWithInCardAnimation(winner, loser, winnerIndex) {
        try {
            // Record vote to matchup-votes API
            this.recordMatchupVote(winner.name, loser.name, winner.name);
            
            const response = await fetch('/api/battles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ winner: winner.name, loser: loser.name })
            });
            
            if (!response.ok) {
                console.error('Failed to record battle');
                this.proceedToNextMatch();
                return;
            }
            
            const result = await response.json();
            
            if (result.success && result.data) {
                // Update ELO cache with new values
                this.eloCache[winner.name] = result.data.winner.newRating;
                this.eloCache[loser.name] = result.data.loser.newRating;
                
                // Show in-card rating changes (replacing overlay)
                const winnerFighterNum = winnerIndex === 0 ? 1 : 2;
                const loserFighterNum = winnerIndex === 0 ? 2 : 1;
                
                this.showInCardRatingChange(
                    winnerFighterNum,
                    result.data.winner.oldRating,
                    result.data.winner.newRating,
                    true
                );
                this.showInCardRatingChange(
                    loserFighterNum,
                    result.data.loser.oldRating,
                    result.data.loser.newRating,
                    false
                );
                
                // Wait for animation then proceed
                await new Promise(resolve => setTimeout(resolve, 1500));
                this.proceedToNextMatch();
            } else {
                this.proceedToNextMatch();
            }
        } catch (error) {
            console.error('Error recording battle:', error);
            this.proceedToNextMatch();
        }
    }
    
    /**
     * Record vote to matchup-votes API (consolidated into battles)
     */
    async recordMatchupVote(animal1, animal2, votedFor) {
        try {
            await fetch('/api/battles?action=matchup_votes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ animal1, animal2, votedFor })
            });
        } catch (error) {
            console.error('Error recording matchup vote:', error);
        }
    }
    
    /**
     * Proceed to the next match after rating animation
     */
    proceedToNextMatch() {
        // Reset fighter card classes
        const fighter1Card = this.getFighterCard(1);
        const fighter2Card = this.getFighterCard(2);
        
        if (fighter1Card) fighter1Card.classList.remove('selected', 'eliminated', 'winner', 'loser', 'guess-selected');
        if (fighter2Card) fighter2Card.classList.remove('selected', 'eliminated', 'winner', 'loser', 'guess-selected');
        
        this.currentMatch++;
        this.showCurrentMatch();
    }
    
    async recordBattle(winnerName, loserName) {
        // Legacy function - now using recordBattleWithAnimation
        try {
            const response = await fetch('/api/battles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ winner: winnerName, loser: loserName })
            });
            
            if (!response.ok) {
                console.error('Failed to record battle');
                return;
            }
            
            const result = await response.json();
            console.log('Battle recorded:', result.data);
            
            // Update ELO cache
            if (result.success && result.data) {
                this.eloCache[winnerName] = result.data.winner.newRating;
                this.eloCache[loserName] = result.data.loser.newRating;
            }
        } catch (error) {
            console.error('Error recording battle:', error);
        }
    }

    advanceRound() {
        if (this.winners.length === 1) {
            // Tournament complete!
            this.showResults();
            return;
        }
        
        // Build new bracket from winners
        this.bracket = [];
        for (let i = 0; i < this.winners.length; i += 2) {
            this.bracket.push([this.winners[i], this.winners[i + 1]]);
        }
        
        this.winners = [];
        this.currentRound++;
        this.currentMatch = 0;
        
        // Show next match
        this.showCurrentMatch();
    }

    showResults() {
        this.isActive = false;
        const champion = this.winners[0];
        
        // Get final four (semi-finalists + finalists)
        const finalFour = this.getFinalFour();
        
        // Send tournament completion to Discord
        this.notifyTournamentComplete(champion, finalFour);
        
        // Update champion card
        this.dom.championImg.src = champion.image;
        this.dom.championImg.onerror = () => { this.dom.championImg.src = FALLBACK_IMAGE; };
        this.dom.championName.textContent = champion.name;
        this.dom.resultMatches.textContent = this.totalMatches;
        this.dom.resultBracket.textContent = this.bracketSize;
        
        // Update tournament stats
        const statTotalBattles = document.getElementById('stat-total-battles');
        const statDuration = document.getElementById('stat-duration');
        const statAvgRating = document.getElementById('stat-avg-rating');
        
        if (statTotalBattles) statTotalBattles.textContent = this.totalMatches;
        if (statDuration) {
            const duration = Math.round((Date.now() - (this.startTime || Date.now())) / 1000);
            statDuration.textContent = duration > 60 ? `${Math.floor(duration/60)}m ${duration%60}s` : `${duration}s`;
        }
        if (statAvgRating) {
            const avgRating = Math.round(finalFour.reduce((sum, a) => sum + (a.elo || 1500), 0) / finalFour.length);
            statAvgRating.textContent = avgRating;
        }
        
        // Update podium grid (2nd, 3rd, 4th place)
        if (this.dom.podiumGrid) {
            const positions = ['2ND', '3RD', '4TH'];
            let podiumHtml = '';
            let posIdx = 0;
            
            finalFour.forEach(animal => {
                if (animal.name !== champion.name && posIdx < 3) {
                    podiumHtml += `
                        <div class="t-podium-card">
                            <div class="t-podium-pos">${positions[posIdx]} PLACE</div>
                            <img src="${animal.image}" alt="${animal.name}" class="t-podium-img" 
                                onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'">
                            <div class="t-podium-name">${animal.name}</div>
                        </div>
                    `;
                    posIdx++;
                }
            });
            
            this.dom.podiumGrid.innerHTML = podiumHtml;
        }
        
        // Award XP/BP for completing a tournament (with guess bonus)
        this.awardTournamentReward();
        
        // Switch to results screen
        this.dom.setup.style.display = 'none';
        this.dom.battle.style.display = 'none';
        this.dom.results.style.display = 'flex';
    }
    
    /**
     * Award XP/BP for completing a tournament (including guess bonus)
     */
    async awardTournamentReward() {
        // Calculate guess bonus XP
        let guessBonus = 0;
        if (this.guessModeEnabled && this.totalGuesses > 0) {
            // 5 XP per correct guess
            guessBonus = this.correctGuesses * 5;
        }
        
        // Update bonus display
        if (this.dom.bonusGuess) {
            if (guessBonus > 0) {
                this.dom.bonusGuess.textContent = `+${guessBonus} XP (${this.correctGuesses}/${this.totalGuesses} guesses)`;
                this.dom.bonusGuess.parentElement.style.display = 'flex';
            } else {
                this.dom.bonusGuess.parentElement.style.display = 'none';
            }
        }
        
        if (!Auth.isLoggedIn()) return;
        
        try {
            const response = await fetch('/api/auth?action=rewards', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.getToken()}`
                },
                body: JSON.stringify({ 
                    action: 'tournament_participate',
                    bonusXp: guessBonus 
                })
            });

            const result = await response.json();

            if (result.success) {
                // Update bonus display
                if (this.dom.bonusXp) {
                    this.dom.bonusXp.textContent = `+${result.data.xpAdded} XP`;
                }
                if (this.dom.bonusBp) {
                    this.dom.bonusBp.textContent = `+${result.data.bpAdded} BP`;
                }
                
                this.showXpPopup(result.data.xpAdded, result.data.bpAdded);
                
                if (result.data.leveledUp) {
                    this.showLevelUpPopup(result.data.newLevel, result.data.levelUpBpReward || 0);
                }
                
                Auth.refreshUserStats();
            }
        } catch (error) {
            console.error('Error awarding tournament reward:', error);
        }
    }
    
    showXpPopup(xp, bp) {
        if (xp === 0 && bp === 0) return;
        
        const popup = document.createElement('div');
        popup.className = 'xp-popup';
        
        let text = '';
        if (xp > 0) text += `+${xp} XP`;
        if (bp > 0) text += (text ? ', ' : '') + `+${bp} BP`;
        
        popup.innerHTML = `<i class="fas fa-star"></i> ${text}`;
        document.body.appendChild(popup);
        
        setTimeout(() => popup.remove(), 2000);
    }
    
    showLevelUpPopup(newLevel, bpReward = 0) {
        const popup = document.createElement('div');
        popup.className = 'level-up-popup';
        popup.innerHTML = `
            <div class="level-up-content">
                <i class="fas fa-crown"></i>
                <span>LEVEL UP!</span>
                <span class="new-level">Level ${newLevel}</span>
                ${bpReward > 0 ? `<span class="level-up-reward">+${bpReward} BP</span>` : ''}
            </div>
        `;
        document.body.appendChild(popup);
        
        setTimeout(() => popup.remove(), 3000);
    }

    getFinalFour() {
        // Get the last 4 unique animals from match history
        const seen = new Set();
        const finalFour = [];
        
        // Start from the end (finals, then semis)
        for (let i = this.matchHistory.length - 1; i >= 0 && finalFour.length < 4; i--) {
            const match = this.matchHistory[i];
            if (!seen.has(match.winner.name)) {
                seen.add(match.winner.name);
                finalFour.push(match.winner);
            }
            if (!seen.has(match.loser.name) && finalFour.length < 4) {
                seen.add(match.loser.name);
                finalFour.push(match.loser);
            }
        }
        
        return finalFour;
    }

    /**
     * Send tournament completion notification to Discord
     */
    notifyTournamentComplete(champion, finalFour) {
        try {
            const runnerUps = finalFour.filter(a => a.name !== champion.name);
            const matchHistoryData = this.matchHistory.map(m => ({
                winner: m.winner.name,
                loser: m.loser.name
            }));
            
            const data = JSON.stringify({
                user: Auth.isLoggedIn() ? Auth.getUser()?.username : 'Anonymous',
                bracketSize: this.bracketSize,
                totalMatches: this.totalMatches,
                champion: champion.name,
                runnerUp: runnerUps[0]?.name || 'N/A',
                thirdFourth: runnerUps.slice(1).map(a => a.name).join(', ') || 'N/A',
                matchHistory: matchHistoryData
            });
            
            // Use sendBeacon for more reliable delivery
            const sent = navigator.sendBeacon('/api/battles?action=tournament_complete', data);
            console.log('Tournament complete notification sent:', sent);
        } catch (error) {
            console.error('Failed to notify tournament completion:', error);
        }
    }

    /**
     * Send tournament quit notification to Discord
     */
    notifyTournamentQuit() {
        if (this.completedMatches === 0) return; // Don't notify if no matches played
        
        try {
            const matchHistoryData = this.matchHistory.map(m => ({
                winner: m.winner.name,
                loser: m.loser.name
            }));
            
            const data = JSON.stringify({
                user: Auth.isLoggedIn() ? Auth.getUser()?.username : 'Anonymous',
                bracketSize: this.bracketSize,
                totalMatches: this.totalMatches,
                completedMatches: this.completedMatches,
                matchHistory: matchHistoryData
            });
            
            // Use sendBeacon for more reliable delivery
            const sent = navigator.sendBeacon('/api/battles?action=tournament_quit', data);
            console.log('Tournament quit notification sent:', sent);
        } catch (error) {
            console.error('Failed to notify tournament quit:', error);
        }
    }
}

// ========================================

