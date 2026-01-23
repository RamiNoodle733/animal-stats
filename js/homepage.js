/**
 * HOMEPAGE - Hologram Silhouette Controller
 * Premium panels with smooth JS-based animation and speed-up interactions
 */

'use strict';

const HomepageController = {
    initialized: false,
    animalImages: [],
    mobilePanel: null,
    speedUpTimeout: null,
    
    // Animation state for each track
    animations: {
        left: { position: 0, speed: 1, targetSpeed: 1, track: null, height: 0 },
        right: { position: 0, speed: 1, targetSpeed: 1, track: null, height: 0 },
        mobile: { position: 0, speed: 1, targetSpeed: 1, track: null, width: 0 }
    },
    animationFrame: null,
    baseSpeed: 0.5, // pixels per frame at 60fps
    fastMultiplier: 3.5,
    
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
     * Start the JavaScript animation loop
     */
    startAnimationLoop() {
        // Wait a bit longer for images to load and get proper dimensions
        const initAnimation = () => {
            const leftTrack = this.animations.left.track;
            const rightTrack = this.animations.right.track;
            const mobileTrack = this.animations.mobile.track;
            
            // Measure track heights/widths for looping
            if (leftTrack) {
                this.animations.left.height = leftTrack.scrollHeight / 2;
                // If height is too small, images haven't loaded yet
                if (this.animations.left.height < 100) {
                    setTimeout(initAnimation, 200);
                    return;
                }
            }
            if (rightTrack) {
                this.animations.right.height = rightTrack.scrollHeight / 2;
            }
            if (mobileTrack) {
                this.animations.mobile.width = mobileTrack.scrollWidth / 2;
            }
            
            // Start animation
            const animate = () => {
                // Smoothly interpolate speed towards target
                for (const key of ['left', 'right', 'mobile']) {
                    const anim = this.animations[key];
                    anim.speed += (anim.targetSpeed - anim.speed) * 0.1;
                }
                
                // Update vertical tracks (both go UP)
                for (const key of ['left', 'right']) {
                    const anim = this.animations[key];
                    if (anim.track && anim.height > 0) {
                        anim.position -= this.baseSpeed * anim.speed;
                        
                        // Loop when reaching top
                        if (anim.position <= -anim.height) {
                            anim.position += anim.height;
                        }
                        
                        anim.track.style.transform = `translateY(${anim.position}px)`;
                    }
                }
                
                // Update mobile track (horizontal)
                const mobile = this.animations.mobile;
                if (mobile.track && mobile.width > 0) {
                    mobile.position -= this.baseSpeed * mobile.speed;
                    
                    // Loop when reaching left edge
                    if (mobile.position <= -mobile.width) {
                        mobile.position += mobile.width;
                    }
                    
                    mobile.track.style.transform = `translateX(${mobile.position}px)`;
                }
                
                this.animationFrame = requestAnimationFrame(animate);
            };
            
            animate();
        };
        
        initAnimation();
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
            panelLeft.addEventListener('mouseenter', () => this.speedUp('left'));
            panelLeft.addEventListener('mouseleave', () => this.speedNormal('left'));
        }
        
        if (panelRight) {
            panelRight.addEventListener('mouseenter', () => this.speedUp('right'));
            panelRight.addEventListener('mouseleave', () => this.speedNormal('right'));
        }
        
        // Desktop: Hover on nav area speeds up BOTH panels
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
        
        // Mobile: Touch/press speeds up, release returns to normal
        if (mobilePanel) {
            // Touch start
            mobilePanel.addEventListener('touchstart', () => {
                this.speedUp('mobile');
            }, { passive: true });
            
            // Touch end - brief delay then return to normal
            mobilePanel.addEventListener('touchend', () => {
                clearTimeout(this.speedUpTimeout);
                this.speedUpTimeout = setTimeout(() => {
                    this.speedNormal('mobile');
                }, 300);
            }, { passive: true });
            
            // Also support mouse for testing
            mobilePanel.addEventListener('mousedown', () => {
                this.speedUp('mobile');
            });
            
            mobilePanel.addEventListener('mouseup', () => {
                clearTimeout(this.speedUpTimeout);
                this.speedUpTimeout = setTimeout(() => {
                    this.speedNormal('mobile');
                }, 300);
            });
        }
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
