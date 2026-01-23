/**
 * HOMEPAGE - Hologram Silhouette Controller
 * Premium panels with speed-up interactions
 */

'use strict';

const HomepageController = {
    initialized: false,
    animalImages: [],
    mobilePanel: null,
    speedUpTimeout: null,
    
    /**
     * Initialize and populate panels
     */
    activate(animals) {
        if (!animals || !animals.length) return;
        
        const trackLeft = document.getElementById('silhouette-track-left');
        const trackRight = document.getElementById('silhouette-track-right');
        
        if (!trackLeft || !trackRight) {
            console.warn('Homepage: silhouette tracks not found');
            return;
        }
        
        // Only populate once
        if (this.initialized) return;
        this.initialized = true;
        
        // Filter to animals with valid images
        const validAnimals = animals.filter(a => a.image && !a.image.includes('fallback'));
        
        // Shuffle and pick animals
        const shuffled = this.shuffle([...validAnimals]);
        const selected = shuffled.slice(0, 16);
        const images = selected.map(a => a.image);
        
        // Store for mobile panel
        this.animalImages = images;
        
        // Add panel decorations (scanlines, frame highlight)
        this.addPanelDecorations();
        
        // Populate desktop panels (double images for seamless loop)
        this.populateTrack(trackLeft, images);
        this.populateTrack(trackRight, [...images].reverse());
        
        // Create mobile panel (hidden on desktop)
        this.createMobilePanel(images);
        
        // Setup speed-up interactions
        this.setupInteractions();
    },
    
    /**
     * Add decorative elements to panels
     */
    addPanelDecorations() {
        const panels = document.querySelectorAll('.silhouette-panel.panel-left, .silhouette-panel.panel-right');
        panels.forEach(panel => {
            // Add scanlines overlay
            if (!panel.querySelector('.panel-scanlines')) {
                const scanlines = document.createElement('div');
                scanlines.className = 'panel-scanlines';
                panel.appendChild(scanlines);
            }
            
            // Add top highlight
            if (!panel.querySelector('.panel-frame-highlight')) {
                const highlight = document.createElement('div');
                highlight.className = 'panel-frame-highlight';
                panel.appendChild(highlight);
            }
        });
    },
    
    /**
     * Create mobile bottom panel
     */
    createMobilePanel(images) {
        // Check if already exists
        let mobilePanel = document.getElementById('silhouette-mobile');
        if (mobilePanel) {
            this.mobilePanel = mobilePanel;
            return;
        }
        
        // Create mobile panel
        mobilePanel = document.createElement('div');
        mobilePanel.className = 'silhouette-panel panel-mobile';
        mobilePanel.id = 'silhouette-mobile';
        
        // Create track
        const track = document.createElement('div');
        track.className = 'silhouette-track';
        track.id = 'silhouette-track-mobile';
        
        mobilePanel.appendChild(track);
        
        // Insert into home view
        const homeView = document.getElementById('home-view');
        if (homeView) {
            homeView.appendChild(mobilePanel);
        }
        
        // Populate (horizontal scroll needs more images)
        const allImages = [...images, ...images, ...images];
        allImages.forEach(src => {
            const img = document.createElement('img');
            img.className = 'silhouette-img';
            img.loading = 'lazy';
            img.alt = '';
            img.draggable = false;
            img.onerror = () => { img.style.display = 'none'; };
            img.src = src;
            track.appendChild(img);
        });
        
        this.mobilePanel = mobilePanel;
    },
    
    /**
     * Populate a track with images
     */
    populateTrack(track, images) {
        track.innerHTML = '';
        
        // Double for seamless loop
        const allImages = [...images, ...images];
        
        allImages.forEach(src => {
            const img = document.createElement('img');
            img.className = 'silhouette-img';
            img.loading = 'lazy';
            img.alt = '';
            img.draggable = false;
            img.onerror = () => { img.style.display = 'none'; };
            img.src = src;
            track.appendChild(img);
        });
    },
    
    /**
     * Setup speed-up interactions
     */
    setupInteractions() {
        const panelLeft = document.getElementById('silhouette-left');
        const panelRight = document.getElementById('silhouette-right');
        const portalNav = document.getElementById('portal-nav');
        const mobilePanel = this.mobilePanel;
        
        // Desktop: Hover on panel speeds up that panel
        if (panelLeft) {
            panelLeft.addEventListener('mouseenter', () => this.speedUp(panelLeft));
            panelLeft.addEventListener('mouseleave', () => this.speedNormal(panelLeft));
        }
        
        if (panelRight) {
            panelRight.addEventListener('mouseenter', () => this.speedUp(panelRight));
            panelRight.addEventListener('mouseleave', () => this.speedNormal(panelRight));
        }
        
        // Desktop: Hover on nav area speeds up BOTH panels
        if (portalNav) {
            portalNav.addEventListener('mouseenter', () => {
                this.speedUp(panelLeft);
                this.speedUp(panelRight);
            });
            portalNav.addEventListener('mouseleave', () => {
                this.speedNormal(panelLeft);
                this.speedNormal(panelRight);
            });
        }
        
        // Mobile: Touch/press speeds up, release returns to normal
        if (mobilePanel) {
            // Touch start
            mobilePanel.addEventListener('touchstart', () => {
                this.speedUp(mobilePanel);
            }, { passive: true });
            
            // Touch end - brief delay then return to normal
            mobilePanel.addEventListener('touchend', () => {
                clearTimeout(this.speedUpTimeout);
                this.speedUpTimeout = setTimeout(() => {
                    this.speedNormal(mobilePanel);
                }, 300);
            }, { passive: true });
            
            // Also support mouse for testing
            mobilePanel.addEventListener('mousedown', () => {
                this.speedUp(mobilePanel);
            });
            
            mobilePanel.addEventListener('mouseup', () => {
                clearTimeout(this.speedUpTimeout);
                this.speedUpTimeout = setTimeout(() => {
                    this.speedNormal(mobilePanel);
                }, 300);
            });
        }
    },
    
    /**
     * Speed up animation
     */
    speedUp(panel) {
        if (panel) {
            panel.classList.add('speed-up');
        }
    },
    
    /**
     * Return to normal speed
     */
    speedNormal(panel) {
        if (panel) {
            panel.classList.remove('speed-up');
        }
    },
    
    /**
     * Fisher-Yates shuffle
     */
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
};

window.HomepageController = HomepageController;
