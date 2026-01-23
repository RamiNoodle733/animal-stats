/**
 * HOMEPAGE - Hologram Silhouette Controller
 * 
 * DESKTOP: Two side panels (left & right) scrolling UP with hover speed-up
 * MOBILE: One bottom panel scrolling LEFT with no interactions
 * 
 * Animation uses requestAnimationFrame for smooth 60fps performance
 */

'use strict';

const HomepageController = {
    initialized: false,
    animalImages: [],
    mobilePanel: null,
    
    // Animation state for each track
    animations: {
        left: { position: 0, speed: 1, targetSpeed: 1, track: null, height: 0 },
        right: { position: 0, speed: 1, targetSpeed: 1, track: null, height: 0 },
        mobile: { position: 0, speed: 1, targetSpeed: 1, track: null, width: 0 }
    },
    animationFrame: null,
    baseSpeed: 1.5,       // Pixels per frame at 60fps
    fastMultiplier: 3.5,  // Speed multiplier when hovering (desktop only)
    
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
        
        // Store track references
        this.animations.left.track = trackLeft;
        this.animations.right.track = trackRight;
        
        // Create mobile panel (hidden on desktop)
        this.createMobilePanel(images);
        
        // Setup speed-up interactions
        this.setupInteractions();
        
        // Start animation loop after images load
        setTimeout(() => this.startAnimationLoop(), 100);
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
            this.animations.mobile.track = mobilePanel.querySelector('.silhouette-track');
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
        
        // Populate with exactly 2 copies for seamless loop (same as desktop)
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
        
        this.mobilePanel = mobilePanel;
        this.animations.mobile.track = track;
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
     * Start the JavaScript animation loop (requestAnimationFrame)
     * Desktop: Both panels scroll UP (translateY)
     * Mobile: Single panel scrolls LEFT (translateX)
     */
    startAnimationLoop() {
        const self = this;
        let frameCount = 0;
        
        const animate = () => {
            const isMobile = window.innerWidth <= 600;
            frameCount++;
            
            // Smoothly interpolate speed towards target (easing)
            for (const key of ['left', 'right', 'mobile']) {
                const anim = self.animations[key];
                anim.speed += (anim.targetSpeed - anim.speed) * 0.1;
            }
            
            if (isMobile) {
                // MOBILE: Horizontal animation (scroll left)
                const mobile = self.animations.mobile;
                if (mobile.track) {
                    // Re-measure width periodically (every 60 frames) to handle late image loading
                    if (mobile.width < 100 || frameCount % 60 === 0) {
                        const newWidth = mobile.track.scrollWidth / 2;
                        if (newWidth > 100) {
                            mobile.width = newWidth;
                        }
                    }
                    
                    if (mobile.width > 0) {
                        mobile.position -= self.baseSpeed * mobile.speed;
                        
                        // Seamless loop: reset when scrolled past half the content
                        if (mobile.position <= -mobile.width) {
                            mobile.position += mobile.width;
                        }
                        
                        mobile.track.style.transform = `translateX(${mobile.position}px)`;
                    }
                }
            } else {
                // DESKTOP: Vertical animation (scroll up) for both panels
                for (const key of ['left', 'right']) {
                    const anim = self.animations[key];
                    if (anim.track) {
                        // Re-measure height periodically (every 60 frames) to handle late image loading
                        if (anim.height < 100 || frameCount % 60 === 0) {
                            const newHeight = anim.track.scrollHeight / 2;
                            if (newHeight > 100) {
                                anim.height = newHeight;
                            }
                        }
                        
                        if (anim.height > 0) {
                            anim.position -= self.baseSpeed * anim.speed;
                            
                            // Seamless loop: reset when scrolled past half the content
                            if (anim.position <= -anim.height) {
                                anim.position += anim.height;
                            }
                            
                            anim.track.style.transform = `translateY(${anim.position}px)`;
                        }
                    }
                }
            }
            
            self.animationFrame = requestAnimationFrame(animate);
        };
        
        // Start after short delay for images to load
        setTimeout(animate, 300);
    },
    
    /**
     * Setup desktop hover interactions for speed-up effect
     * Mobile has NO interactions (disabled)
     */
    setupInteractions() {
        const panelLeft = document.getElementById('silhouette-left');
        const panelRight = document.getElementById('silhouette-right');
        const portalNav = document.getElementById('portal-nav');
        
        // DESKTOP ONLY: Hover on panel speeds up that panel
        if (panelLeft) {
            panelLeft.addEventListener('mouseenter', () => this.speedUp('left'));
            panelLeft.addEventListener('mouseleave', () => this.speedNormal('left'));
        }
        
        if (panelRight) {
            panelRight.addEventListener('mouseenter', () => this.speedUp('right'));
            panelRight.addEventListener('mouseleave', () => this.speedNormal('right'));
        }
        
        // DESKTOP ONLY: Hover on nav area speeds up BOTH panels
        if (portalNav) {
            portalNav.addEventListener('mouseenter', () => {
                this.speedUp('left');
                this.speedUp('right');
            });
            portalNav.addEventListener('mouseleave', () => {
                this.speedNormal('left');
                this.speedNormal('right');
            });
        }
        
        // MOBILE: No interactions (panel has pointer-events: none in CSS)
    },
    
    /**
     * Speed up animation (smooth transition)
     */
    speedUp(key) {
        if (this.animations[key]) {
            this.animations[key].targetSpeed = this.fastMultiplier;
        }
    },
    
    /**
     * Return to normal speed (smooth transition)
     */
    speedNormal(key) {
        if (this.animations[key]) {
            this.animations[key].targetSpeed = 1;
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
