/**
 * ============================================
 * HOMEPAGE - Portal Controller
 * ============================================
 * 
 * Handles:
 * - Silhouette panel animation with real animal images
 * - Intro animation (once per session)
 * - Speed-up on hover/touch interactions
 * - Mobile touch support
 */

'use strict';

class HomepageController {
    constructor() {
        this.initialized = false;
        this.animalImages = [];
        this.panels = {
            left: null,
            right: null
        };
        this.introPlayed = false;
    }

    /**
     * Initialize the homepage controller
     */
    init() {
        if (this.initialized) return;
        
        console.log('[Homepage] Initializing...');
        
        // Cache DOM elements
        this.panels.left = document.getElementById('silhouette-left');
        this.panels.right = document.getElementById('silhouette-right');
        this.trackLeft = document.getElementById('silhouette-track-left');
        this.trackRight = document.getElementById('silhouette-track-right');
        this.portalEl = document.getElementById('home-portal');
        this.navEl = document.getElementById('portal-nav');
        this.tournamentBtn = document.getElementById('portal-tournament-btn');
        
        console.log('[Homepage] Found elements:', {
            panelLeft: !!this.panels.left,
            panelRight: !!this.panels.right,
            trackLeft: !!this.trackLeft,
            trackRight: !!this.trackRight
        });
        
        if (!this.panels.left || !this.panels.right) {
            console.warn('Homepage panels not found');
            return;
        }
        
        // Setup event listeners
        this.setupSpeedUpInteractions();
        this.setupMobileTouch();
        
        this.initialized = true;
    }

    /**
     * Load animal images and populate silhouette panels
     * @param {Array} animals - Array of animal objects with image URLs
     */
    loadAnimalImages(animals) {
        console.log('[Homepage] loadAnimalImages called with', animals?.length, 'animals');
        
        if (!animals || !animals.length) {
            console.warn('[Homepage] No animals provided');
            return;
        }
        
        // Filter to animals with valid images, shuffle and pick a subset
        const validAnimals = animals.filter(a => a.image && !a.image.includes('fallback'));
        console.log('[Homepage] Valid animals with images:', validAnimals.length);
        
        // Shuffle and pick 12-16 for variety
        const shuffled = this.shuffleArray([...validAnimals]);
        const selected = shuffled.slice(0, Math.min(16, shuffled.length));
        
        this.animalImages = selected.map(a => a.image);
        console.log('[Homepage] Selected images:', this.animalImages.length);
        
        // Populate both panels
        this.populatePanel(this.trackLeft, this.animalImages);
        this.populatePanel(this.trackRight, [...this.animalImages].reverse());
    }

    /**
     * Populate a panel track with silhouette images
     */
    populatePanel(track, images) {
        console.log('[Homepage] populatePanel called', track?.id, images?.length, 'images');
        
        if (!track || !images.length) {
            console.warn('[Homepage] Track or images missing', track, images?.length);
            return;
        }
        
        track.innerHTML = '';
        
        // Double the images for seamless looping
        const allImages = [...images, ...images];
        
        allImages.forEach((src, index) => {
            const img = document.createElement('img');
            img.className = 'silhouette-img';
            img.loading = 'lazy';
            img.alt = '';
            img.draggable = false;
            
            // Handle load errors gracefully
            img.onerror = () => {
                img.style.display = 'none';
            };
            
            img.src = src;
            track.appendChild(img);
        });
    }

    /**
     * Shuffle array (Fisher-Yates)
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    /**
     * Play intro animation (once per session)
     */
    playIntro() {
        // Check if already played this session
        const introKey = 'abs_intro_played';
        if (sessionStorage.getItem(introKey)) {
            this.introPlayed = true;
            return;
        }
        
        // Check for reduced motion preference
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            sessionStorage.setItem(introKey, 'true');
            this.introPlayed = true;
            return;
        }
        
        // Add intro animation classes
        if (this.portalEl) {
            this.portalEl.classList.add('intro-animate');
        }
        
        if (this.panels.left) {
            this.panels.left.classList.add('intro-animate');
        }
        if (this.panels.right) {
            this.panels.right.classList.add('intro-animate');
        }
        
        // Mark intro as done after animation completes
        setTimeout(() => {
            if (this.panels.left) {
                this.panels.left.classList.add('intro-done');
            }
            if (this.panels.right) {
                this.panels.right.classList.add('intro-done');
            }
            sessionStorage.setItem(introKey, 'true');
            this.introPlayed = true;
        }, 800);
    }

    /**
     * Setup speed-up interactions for hover
     */
    setupSpeedUpInteractions() {
        // Nav buttons hover speeds up panels
        if (this.navEl) {
            this.navEl.addEventListener('mouseenter', () => this.speedUpPanels(true));
            this.navEl.addEventListener('mouseleave', () => this.speedUpPanels(false));
        }
        
        // Tournament button hover speeds up panels
        if (this.tournamentBtn) {
            this.tournamentBtn.addEventListener('mouseenter', () => this.speedUpPanels(true));
            this.tournamentBtn.addEventListener('mouseleave', () => this.speedUpPanels(false));
        }
        
        // Panel hover speeds up (already handled by CSS, but adding class for consistency)
        [this.panels.left, this.panels.right].forEach(panel => {
            if (panel) {
                panel.addEventListener('mouseenter', () => {
                    panel.classList.add('speed-up');
                });
                panel.addEventListener('mouseleave', () => {
                    panel.classList.remove('speed-up');
                });
            }
        });
    }

    /**
     * Speed up or slow down panel animations
     */
    speedUpPanels(fast) {
        [this.panels.left, this.panels.right].forEach(panel => {
            if (panel) {
                if (fast) {
                    panel.classList.add('speed-up');
                } else {
                    panel.classList.remove('speed-up');
                }
            }
        });
    }

    /**
     * Setup mobile touch interactions
     */
    setupMobileTouch() {
        // Touch on panels speeds them up briefly
        [this.panels.left, this.panels.right].forEach(panel => {
            if (!panel) return;
            
            // Make panels interactive on mobile
            panel.style.pointerEvents = 'auto';
            
            panel.addEventListener('touchstart', (e) => {
                panel.classList.add('touch-active');
            }, { passive: true });
            
            panel.addEventListener('touchend', () => {
                // Keep active for a moment after touch ends
                setTimeout(() => {
                    panel.classList.remove('touch-active');
                }, 500);
            }, { passive: true });
        });
        
        // Touch on nav area speeds up panels
        if (this.navEl) {
            this.navEl.addEventListener('touchstart', () => this.speedUpPanels(true), { passive: true });
            this.navEl.addEventListener('touchend', () => {
                setTimeout(() => this.speedUpPanels(false), 300);
            }, { passive: true });
        }
    }

    /**
     * Refresh panels with new images (can be called when data updates)
     */
    refresh(animals) {
        if (animals && animals.length) {
            this.loadAnimalImages(animals);
        }
    }

    /**
     * Activate homepage (called when navigating to home)
     */
    activate(animals) {
        this.init();
        
        if (animals && animals.length && !this.animalImages.length) {
            this.loadAnimalImages(animals);
        }
        
        // Play intro if not yet played
        if (!this.introPlayed) {
            // Small delay to let the view settle
            setTimeout(() => this.playIntro(), 50);
        }
    }
}

// Create global instance
window.HomepageController = new HomepageController();
