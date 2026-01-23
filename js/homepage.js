/**
 * HOMEPAGE - Hologram Silhouette Controller with Slingshot Physics
 * 
 * DESKTOP: Two side panels (left & right) scrolling UP
 *          - Hover to speed up
 *          - Click & drag DOWN to wind up, release to slingshot DOWN
 * 
 * MOBILE: One bottom panel scrolling LEFT
 *          - Touch & drag RIGHT to wind up, release to slingshot LEFT
 * 
 * Features:
 * - Smooth 60fps requestAnimationFrame animation
 * - Slingshot physics with tension, wind-up, and release
 * - Glowing drag line visual
 * - Tension shake/rumble at max capacity
 * - Satisfying momentum decay after release
 */

'use strict';

const HomepageController = {
    initialized: false,
    animalImages: [],
    mobilePanel: null,
    
    // Animation state for each track
    animations: {
        left: { 
            position: 0, 
            speed: 1, 
            targetSpeed: 1, 
            track: null, 
            height: 0,
            velocity: 0,
            panel: null
        },
        right: { 
            position: 0, 
            speed: 1, 
            targetSpeed: 1, 
            track: null, 
            height: 0,
            velocity: 0,
            panel: null
        },
        mobile: { 
            position: 0, 
            speed: 1, 
            targetSpeed: 1, 
            track: null, 
            width: 0,
            velocity: 0,
            panel: null
        }
    },
    
    // Slingshot state
    slingshot: {
        active: false,
        panelKey: null,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        tension: 0,
        maxTension: 1,
        minDragThreshold: 30,
        maxDragDistance: 300,
        releaseMultiplier: 25,
        dragLine: null,
        lastTensionMilestone: 0
    },
    
    // Physics constants
    physics: {
        baseSpeed: 1.5,
        hoverMultiplier: 3.5,
        friction: 0.985,
        minVelocity: 0.5,
        shakeIntensity: 3,
        shakeFrequency: 0.3
    },
    
    animationFrame: null,
    frameCount: 0,
    
    /**
     * Initialize and populate panels with ALL animals (shuffled, validated)
     */
    async activate(animals) {
        if (!animals || !animals.length) return;
        
        const trackLeft = document.getElementById('silhouette-track-left');
        const trackRight = document.getElementById('silhouette-track-right');
        
        if (!trackLeft || !trackRight) {
            console.warn('Homepage: silhouette tracks not found');
            return;
        }
        
        if (this.initialized) return;
        this.initialized = true;
        
        // Filter valid images
        const validAnimals = animals.filter(a => 
            a.image && 
            !a.image.includes('fallback') && 
            !a.image.includes('placeholder') &&
            a.image.trim() !== ''
        );
        
        const shuffled = this.shuffle([...validAnimals]);
        const allImages = shuffled.map(a => a.image);
        
        this.animalImages = allImages;
        
        // Add panel decorations
        this.addPanelDecorations();
        
        // Populate desktop panels
        const half = Math.ceil(allImages.length / 2);
        const leftImages = allImages.slice(0, half);
        const rightImages = allImages.slice(half);
        
        this.populateTrack(trackLeft, leftImages);
        this.populateTrack(trackRight, rightImages.length > 0 ? rightImages : leftImages);
        
        // Store references
        this.animations.left.track = trackLeft;
        this.animations.right.track = trackRight;
        this.animations.left.panel = document.getElementById('silhouette-left');
        this.animations.right.panel = document.getElementById('silhouette-right');
        
        // Create mobile panel
        this.createMobilePanel(allImages);
        
        // Create drag line overlay
        this.createDragLineOverlay();
        
        // Inject slingshot CSS
        this.injectSlingshotStyles();
        
        // Setup all interactions
        this.setupInteractions();
        
        // Start animation loop
        setTimeout(() => this.startAnimationLoop(), 100);
    },
    
    /**
     * Inject CSS styles for slingshot effects
     */
    injectSlingshotStyles() {
        if (document.getElementById('slingshot-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'slingshot-styles';
        style.textContent = `
            /* Slingshot dragging state */
            .silhouette-panel.slingshot-dragging {
                cursor: grabbing !important;
            }
            
            .silhouette-panel.slingshot-dragging .silhouette-img {
                filter: brightness(0) invert(1) drop-shadow(0 0 15px rgba(0, 255, 204, 0.6)) !important;
            }
            
            /* Motion blur during fast movement */
            .silhouette-panel.slingshot-blur .silhouette-track {
                filter: blur(2px);
            }
            
            .silhouette-panel.slingshot-blur .silhouette-img {
                opacity: 0.6 !important;
            }
            
            /* Flash animation on release */
            @keyframes slingshotFlash {
                0% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.8; transform: scale(1.1); }
                100% { opacity: 0; transform: scale(1.2); }
            }
            
            /* Particles container */
            .slingshot-particles {
                position: absolute;
                inset: 0;
                pointer-events: none;
                overflow: hidden;
                z-index: 50;
            }
            
            /* Individual particle */
            .slingshot-particle {
                position: absolute;
                width: 4px;
                height: 4px;
                background: #00ffcc;
                border-radius: 50%;
                box-shadow: 0 0 6px #00ffcc, 0 0 12px #00d4ff;
                animation: particleFly 0.6s ease-out forwards;
            }
            
            @keyframes particleFly {
                0% { 
                    opacity: 1; 
                    transform: translate(0, 0) scale(1);
                }
                100% { 
                    opacity: 0; 
                    transform: translate(var(--px), var(--py)) scale(0);
                }
            }
            
            /* Speed lines effect */
            .speed-lines {
                position: absolute;
                inset: 0;
                pointer-events: none;
                overflow: hidden;
                z-index: 40;
            }
            
            .speed-line {
                position: absolute;
                background: linear-gradient(to bottom, transparent, rgba(0, 212, 255, 0.4), transparent);
                width: 2px;
                animation: speedLine 0.3s linear infinite;
            }
            
            @keyframes speedLine {
                0% { transform: translateY(-100%); opacity: 1; }
                100% { transform: translateY(200%); opacity: 0; }
            }
            
            /* Mobile panel - enable touch for slingshot */
            @media (max-width: 600px) {
                .silhouette-panel.panel-mobile {
                    pointer-events: auto !important;
                    touch-action: none !important;
                    cursor: grab !important;
                }
                
                .silhouette-panel.panel-mobile .silhouette-track,
                .silhouette-panel.panel-mobile .silhouette-img {
                    pointer-events: none !important;
                }
                
                .speed-line {
                    height: 2px;
                    width: auto;
                    background: linear-gradient(to right, transparent, rgba(0, 212, 255, 0.4), transparent);
                    animation: speedLineHorizontal 0.3s linear infinite;
                }
                
                @keyframes speedLineHorizontal {
                    0% { transform: translateX(100%); opacity: 1; }
                    100% { transform: translateX(-200%); opacity: 0; }
                }
            }
        `;
        document.head.appendChild(style);
    },
    
    /**
     * Add decorative elements to panels
     */
    addPanelDecorations() {
        const panels = document.querySelectorAll('.silhouette-panel.panel-left, .silhouette-panel.panel-right');
        panels.forEach(panel => {
            if (!panel.querySelector('.panel-scanlines')) {
                const scanlines = document.createElement('div');
                scanlines.className = 'panel-scanlines';
                panel.appendChild(scanlines);
            }
            
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
        let mobilePanel = document.getElementById('silhouette-mobile');
        if (mobilePanel) {
            this.mobilePanel = mobilePanel;
            this.animations.mobile.track = mobilePanel.querySelector('.silhouette-track');
            this.animations.mobile.panel = mobilePanel;
            return;
        }
        
        mobilePanel = document.createElement('div');
        mobilePanel.className = 'silhouette-panel panel-mobile';
        mobilePanel.id = 'silhouette-mobile';
        
        const track = document.createElement('div');
        track.className = 'silhouette-track';
        track.id = 'silhouette-track-mobile';
        
        mobilePanel.appendChild(track);
        
        const homeView = document.getElementById('home-view');
        if (homeView) {
            homeView.appendChild(mobilePanel);
        }
        
        this.populateTrack(track, images);
        
        this.mobilePanel = mobilePanel;
        this.animations.mobile.track = track;
        this.animations.mobile.panel = mobilePanel;
    },
    
    /**
     * Create SVG overlay for drag line visualization
     */
    createDragLineOverlay() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 'slingshot-overlay';
        svg.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            z-index: 9999;
            opacity: 0;
            transition: opacity 0.15s ease;
        `;
        
        // Defs for gradients and filters
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        
        const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        gradient.id = 'drag-line-gradient';
        gradient.innerHTML = `
            <stop offset="0%" stop-color="#00d4ff" stop-opacity="0.8"/>
            <stop offset="50%" stop-color="#00ffcc" stop-opacity="1"/>
            <stop offset="100%" stop-color="#00d4ff" stop-opacity="0.8"/>
        `;
        defs.appendChild(gradient);
        
        const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        filter.id = 'drag-glow';
        filter.innerHTML = `
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        `;
        defs.appendChild(filter);
        
        svg.appendChild(defs);
        
        // Main drag line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.id = 'drag-line';
        line.setAttribute('stroke', 'url(#drag-line-gradient)');
        line.setAttribute('stroke-width', '3');
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('filter', 'url(#drag-glow)');
        svg.appendChild(line);
        
        // Start point circle
        const startCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        startCircle.id = 'drag-start';
        startCircle.setAttribute('r', '8');
        startCircle.setAttribute('fill', '#00d4ff');
        startCircle.setAttribute('filter', 'url(#drag-glow)');
        svg.appendChild(startCircle);
        
        // End point circle
        const endCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        endCircle.id = 'drag-end';
        endCircle.setAttribute('r', '12');
        endCircle.setAttribute('fill', '#00ffcc');
        endCircle.setAttribute('stroke', '#fff');
        endCircle.setAttribute('stroke-width', '2');
        endCircle.setAttribute('filter', 'url(#drag-glow)');
        svg.appendChild(endCircle);
        
        // Tension indicator arc
        const tensionArc = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        tensionArc.id = 'tension-indicator';
        tensionArc.setAttribute('r', '20');
        tensionArc.setAttribute('fill', 'none');
        tensionArc.setAttribute('stroke', '#ff3366');
        tensionArc.setAttribute('stroke-width', '3');
        tensionArc.setAttribute('stroke-dasharray', '0 126');
        tensionArc.setAttribute('filter', 'url(#drag-glow)');
        tensionArc.style.transformOrigin = 'center';
        svg.appendChild(tensionArc);
        
        document.body.appendChild(svg);
        this.slingshot.dragLine = svg;
    },
    
    /**
     * Create a silhouette image element with validation
     */
    createSilhouetteImage(src) {
        const img = document.createElement('img');
        img.className = 'silhouette-img';
        img.loading = 'lazy';
        img.alt = '';
        img.draggable = false;
        img.crossOrigin = 'anonymous';
        
        img.onerror = () => { img.style.display = 'none'; };
        img.onload = () => this.validateImageTransparency(img);
        img.src = src;
        
        return img;
    },
    
    /**
     * Populate a track with images (doubled for seamless loop)
     */
    populateTrack(track, images) {
        track.innerHTML = '';
        const allImages = [...images, ...images];
        
        allImages.forEach(src => {
            const img = this.createSilhouetteImage(src);
            track.appendChild(img);
        });
    },
    
    /**
     * Check if an image has transparency
     */
    validateImageTransparency(img) {
        if (!img || !img.complete || img.naturalWidth === 0) {
            img.style.display = 'none';
            return;
        }
        
        const src = img.src.toLowerCase();
        const badPatterns = [
            'white-background', 'white_background', 'on-white', 'on_white',
            '-white.', '_white.', 'solid-background', 'background-image',
            '/full/', 'nicepng.com/png/full'
        ];
        
        if (badPatterns.some(pattern => src.includes(pattern))) {
            img.style.display = 'none';
            return;
        }
        
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            const size = 50;
            canvas.width = size;
            canvas.height = size;
            
            ctx.drawImage(img, 0, 0, size, size);
            
            const corners = [
                ctx.getImageData(0, 0, 1, 1).data,
                ctx.getImageData(size - 1, 0, 1, 1).data,
                ctx.getImageData(0, size - 1, 1, 1).data,
                ctx.getImageData(size - 1, size - 1, 1, 1).data
            ];
            
            let opaqueCorners = corners.filter(p => p[3] > 200).length;
            
            if (opaqueCorners === 4) {
                const edges = [
                    ctx.getImageData(size / 2, 0, 1, 1).data,
                    ctx.getImageData(size / 2, size - 1, 1, 1).data,
                    ctx.getImageData(0, size / 2, 1, 1).data,
                    ctx.getImageData(size - 1, size / 2, 1, 1).data
                ];
                
                if (edges.filter(p => p[3] > 200).length >= 3) {
                    img.style.display = 'none';
                }
            }
        } catch (e) { /* CORS blocked */ }
    },
    
    /**
     * Main animation loop with slingshot physics
     */
    startAnimationLoop() {
        const self = this;
        
        const animate = () => {
            const isMobile = window.innerWidth <= 600;
            self.frameCount++;
            
            // Update slingshot visuals if active
            if (self.slingshot.active) {
                self.updateSlingshotVisuals();
            }
            
            if (isMobile) {
                self.animateMobile();
            } else {
                self.animateDesktop();
            }
            
            self.animationFrame = requestAnimationFrame(animate);
        };
        
        setTimeout(animate, 300);
    },
    
    /**
     * Animate mobile panel (horizontal)
     */
    animateMobile() {
        const mobile = this.animations.mobile;
        if (!mobile.track) return;
        
        // Measure width periodically
        if (mobile.width < 100 || this.frameCount % 60 === 0) {
            const newWidth = mobile.track.scrollWidth / 2;
            if (newWidth > 100) mobile.width = newWidth;
        }
        
        if (mobile.width <= 0) return;
        
        const isSlingshotting = this.slingshot.panelKey === 'mobile' && Math.abs(mobile.velocity) > this.physics.minVelocity;
        const isDragging = this.slingshot.active && this.slingshot.panelKey === 'mobile';
        
        if (isDragging) {
            // Wind-up mode
            const windUpSpeed = this.slingshot.tension * 2;
            mobile.position += windUpSpeed;
            
            // Shake at high tension
            if (this.slingshot.tension > 0.8) {
                const shake = Math.sin(this.frameCount * this.physics.shakeFrequency) * 
                              this.physics.shakeIntensity * (this.slingshot.tension - 0.8) * 5;
                mobile.track.style.transform = `translateX(${mobile.position}px) translateY(${shake}px)`;
            } else {
                mobile.track.style.transform = `translateX(${mobile.position}px)`;
            }
        } else if (isSlingshotting) {
            // Slingshot release mode
            mobile.position -= mobile.velocity;
            mobile.velocity *= this.physics.friction;
            
            // Speed lines effect
            this.updateSpeedLines(mobile.panel, Math.abs(mobile.velocity), 'horizontal');
            
            if (Math.abs(mobile.velocity) > 10) {
                mobile.panel?.classList.add('slingshot-blur');
            } else {
                mobile.panel?.classList.remove('slingshot-blur');
            }
            
            if (Math.abs(mobile.velocity) <= this.physics.minVelocity) {
                mobile.velocity = 0;
                mobile.panel?.classList.remove('slingshot-blur');
                this.removeSpeedLines(mobile.panel);
            }
            
            mobile.track.style.transform = `translateX(${mobile.position}px)`;
        } else {
            // Normal idle scrolling
            mobile.speed += (mobile.targetSpeed - mobile.speed) * 0.1;
            mobile.position -= this.physics.baseSpeed * mobile.speed;
            mobile.track.style.transform = `translateX(${mobile.position}px)`;
        }
        
        // Seamless loop
        if (mobile.position <= -mobile.width) {
            mobile.position += mobile.width;
        } else if (mobile.position > 0) {
            mobile.position -= mobile.width;
        }
    },
    
    /**
     * Animate desktop panels (vertical)
     */
    animateDesktop() {
        for (const key of ['left', 'right']) {
            const anim = this.animations[key];
            if (!anim.track) continue;
            
            // Measure height periodically
            if (anim.height < 100 || this.frameCount % 60 === 0) {
                const newHeight = anim.track.scrollHeight / 2;
                if (newHeight > 100) anim.height = newHeight;
            }
            
            if (anim.height <= 0) continue;
            
            const isSlingshotting = this.slingshot.panelKey === key && Math.abs(anim.velocity) > this.physics.minVelocity;
            const isDragging = this.slingshot.active && this.slingshot.panelKey === key;
            
            if (isDragging) {
                // Wind-up mode
                const windUpSpeed = this.slingshot.tension * 2;
                anim.position += windUpSpeed;
                
                // Shake at high tension
                if (this.slingshot.tension > 0.8) {
                    const shake = Math.sin(this.frameCount * this.physics.shakeFrequency) * 
                                  this.physics.shakeIntensity * (this.slingshot.tension - 0.8) * 5;
                    anim.track.style.transform = `translateY(${anim.position}px) translateX(${shake}px)`;
                } else {
                    anim.track.style.transform = `translateY(${anim.position}px)`;
                }
            } else if (isSlingshotting) {
                // Slingshot release mode
                anim.position -= anim.velocity;
                anim.velocity *= this.physics.friction;
                
                // Speed lines effect
                this.updateSpeedLines(anim.panel, Math.abs(anim.velocity), 'vertical');
                
                if (Math.abs(anim.velocity) > 10) {
                    anim.panel?.classList.add('slingshot-blur');
                } else {
                    anim.panel?.classList.remove('slingshot-blur');
                }
                
                if (Math.abs(anim.velocity) <= this.physics.minVelocity) {
                    anim.velocity = 0;
                    anim.panel?.classList.remove('slingshot-blur');
                    this.removeSpeedLines(anim.panel);
                }
                
                anim.track.style.transform = `translateY(${anim.position}px)`;
            } else {
                // Normal idle or hover scrolling
                anim.speed += (anim.targetSpeed - anim.speed) * 0.1;
                anim.position -= this.physics.baseSpeed * anim.speed;
                anim.track.style.transform = `translateY(${anim.position}px)`;
            }
            
            // Seamless loop
            if (anim.position <= -anim.height) {
                anim.position += anim.height;
            } else if (anim.position > 0) {
                anim.position -= anim.height;
            }
        }
    },
    
    /**
     * Create/update speed lines during fast movement
     */
    updateSpeedLines(panel, velocity, direction) {
        if (!panel || velocity < 8) return;
        
        let container = panel.querySelector('.speed-lines');
        if (!container) {
            container = document.createElement('div');
            container.className = 'speed-lines';
            panel.appendChild(container);
        }
        
        // Add new speed lines based on velocity
        const lineCount = Math.min(Math.floor(velocity / 5), 8);
        
        // Only add if we don't have enough
        while (container.children.length < lineCount) {
            const line = document.createElement('div');
            line.className = 'speed-line';
            
            if (direction === 'vertical') {
                line.style.left = `${Math.random() * 100}%`;
                line.style.height = `${20 + Math.random() * 30}px`;
                line.style.animationDuration = `${0.2 + Math.random() * 0.2}s`;
            } else {
                line.style.top = `${Math.random() * 100}%`;
                line.style.width = `${20 + Math.random() * 30}px`;
                line.style.animationDuration = `${0.2 + Math.random() * 0.2}s`;
            }
            
            container.appendChild(line);
        }
    },
    
    /**
     * Remove speed lines
     */
    removeSpeedLines(panel) {
        if (!panel) return;
        const container = panel.querySelector('.speed-lines');
        if (container) container.remove();
    },
    
    /**
     * Setup all interactions (hover + slingshot)
     */
    setupInteractions() {
        const panelLeft = document.getElementById('silhouette-left');
        const panelRight = document.getElementById('silhouette-right');
        const mobilePanel = document.getElementById('silhouette-mobile');
        const portalNav = document.getElementById('portal-nav');
        
        // Desktop: Hover effects
        if (panelLeft) {
            panelLeft.addEventListener('mouseenter', () => {
                if (!this.slingshot.active) this.speedUp('left');
            });
            panelLeft.addEventListener('mouseleave', () => {
                if (!this.slingshot.active) this.speedNormal('left');
            });
        }
        
        if (panelRight) {
            panelRight.addEventListener('mouseenter', () => {
                if (!this.slingshot.active) this.speedUp('right');
            });
            panelRight.addEventListener('mouseleave', () => {
                if (!this.slingshot.active) this.speedNormal('right');
            });
        }
        
        if (portalNav) {
            portalNav.addEventListener('mouseenter', () => {
                if (!this.slingshot.active) {
                    this.speedUp('left');
                    this.speedUp('right');
                }
            });
            portalNav.addEventListener('mouseleave', () => {
                if (!this.slingshot.active) {
                    this.speedNormal('left');
                    this.speedNormal('right');
                }
            });
        }
        
        // Desktop: Mouse slingshot on panels
        [panelLeft, panelRight].forEach(panel => {
            if (!panel) return;
            const key = panel.id === 'silhouette-left' ? 'left' : 'right';
            
            panel.style.cursor = 'grab';
            panel.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.startSlingshot(e, key, false);
            });
        });
        
        // Global mouse move and up for desktop
        document.addEventListener('mousemove', (e) => this.updateSlingshot(e, false));
        document.addEventListener('mouseup', (e) => this.releaseSlingshot(e));
        
        // Mobile: Touch slingshot
        if (mobilePanel) {
            mobilePanel.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.startSlingshot(e, 'mobile', true);
            }, { passive: false });
        }
        
        // Global touch events for mobile
        document.addEventListener('touchmove', (e) => {
            if (this.slingshot.active) {
                e.preventDefault();
                this.updateSlingshot(e, true);
            }
        }, { passive: false });
        
        document.addEventListener('touchend', (e) => this.releaseSlingshot(e));
        document.addEventListener('touchcancel', (e) => this.releaseSlingshot(e));
    },
    
    /**
     * Start slingshot drag
     */
    startSlingshot(e, panelKey, isTouch) {
        const point = isTouch ? e.touches[0] : e;
        
        this.slingshot.active = true;
        this.slingshot.panelKey = panelKey;
        this.slingshot.startX = point.clientX;
        this.slingshot.startY = point.clientY;
        this.slingshot.currentX = point.clientX;
        this.slingshot.currentY = point.clientY;
        this.slingshot.tension = 0;
        this.slingshot.lastTensionMilestone = 0;
        
        // Stop current movement
        this.animations[panelKey].targetSpeed = 0;
        this.animations[panelKey].velocity = 0;
        
        // Show drag line
        const overlay = this.slingshot.dragLine;
        if (overlay) {
            overlay.style.opacity = '1';
        }
        
        // Add dragging class
        const anim = this.animations[panelKey];
        if (anim.panel) {
            anim.panel.classList.add('slingshot-dragging');
            anim.panel.style.cursor = 'grabbing';
        }
        
        this.playHapticFeedback('start');
    },
    
    /**
     * Update slingshot during drag
     */
    updateSlingshot(e, isTouch) {
        if (!this.slingshot.active) return;
        
        const point = isTouch ? e.touches[0] : e;
        this.slingshot.currentX = point.clientX;
        this.slingshot.currentY = point.clientY;
        
        const isMobile = this.slingshot.panelKey === 'mobile';
        let dragDistance;
        
        if (isMobile) {
            // Mobile: horizontal drag (right = wind up)
            dragDistance = this.slingshot.currentX - this.slingshot.startX;
        } else {
            // Desktop: vertical drag (down = wind up)
            dragDistance = this.slingshot.currentY - this.slingshot.startY;
        }
        
        // Build tension when dragging in pull-back direction
        if (dragDistance > 0) {
            const normalizedTension = Math.min(dragDistance / this.slingshot.maxDragDistance, 1);
            this.slingshot.tension = normalizedTension * normalizedTension;
            
            // Haptic feedback at milestones
            if (normalizedTension > 0.5 && this.slingshot.lastTensionMilestone < 0.5) {
                this.playHapticFeedback('tension');
                this.slingshot.lastTensionMilestone = 0.5;
            }
            if (normalizedTension > 0.9 && this.slingshot.lastTensionMilestone < 0.9) {
                this.playHapticFeedback('max');
                this.slingshot.lastTensionMilestone = 0.9;
            }
        } else {
            this.slingshot.tension = 0;
            this.slingshot.lastTensionMilestone = 0;
        }
    },
    
    /**
     * Update visual elements for slingshot
     */
    updateSlingshotVisuals() {
        const s = this.slingshot;
        const overlay = s.dragLine;
        if (!overlay) return;
        
        const line = overlay.querySelector('#drag-line');
        const startCircle = overlay.querySelector('#drag-start');
        const endCircle = overlay.querySelector('#drag-end');
        const tensionIndicator = overlay.querySelector('#tension-indicator');
        
        if (line) {
            line.setAttribute('x1', s.startX);
            line.setAttribute('y1', s.startY);
            line.setAttribute('x2', s.currentX);
            line.setAttribute('y2', s.currentY);
            line.setAttribute('stroke-width', 3 + s.tension * 5);
        }
        
        if (startCircle) {
            startCircle.setAttribute('cx', s.startX);
            startCircle.setAttribute('cy', s.startY);
        }
        
        if (endCircle) {
            endCircle.setAttribute('cx', s.currentX);
            endCircle.setAttribute('cy', s.currentY);
            endCircle.setAttribute('r', 12 + s.tension * 8);
            
            // Color shift
            if (s.tension > 0.8) {
                endCircle.setAttribute('fill', '#ff3366');
            } else if (s.tension > 0.5) {
                endCircle.setAttribute('fill', '#ffcc00');
            } else {
                endCircle.setAttribute('fill', '#00ffcc');
            }
        }
        
        if (tensionIndicator) {
            tensionIndicator.setAttribute('cx', s.currentX);
            tensionIndicator.setAttribute('cy', s.currentY);
            const circumference = 126;
            const filled = circumference * s.tension;
            tensionIndicator.setAttribute('stroke-dasharray', `${filled} ${circumference - filled}`);
            tensionIndicator.style.transform = `rotate(${-90 + this.frameCount * 2}deg)`;
        }
        
        // Panel glow
        const anim = this.animations[s.panelKey];
        if (anim?.panel) {
            const glowIntensity = 0.2 + s.tension * 0.4;
            const glowColor = s.tension > 0.8 ? '255, 51, 102' : '0, 212, 255';
            anim.panel.style.boxShadow = `
                0 0 ${30 + s.tension * 50}px rgba(${glowColor}, ${glowIntensity}),
                inset 0 0 ${20 + s.tension * 30}px rgba(${glowColor}, ${glowIntensity * 0.5})
            `;
        }
    },
    
    /**
     * Release slingshot
     */
    releaseSlingshot(e) {
        if (!this.slingshot.active) return;
        
        const s = this.slingshot;
        const anim = this.animations[s.panelKey];
        
        const isMobile = s.panelKey === 'mobile';
        let dragDistance;
        
        if (isMobile) {
            dragDistance = s.currentX - s.startX;
        } else {
            dragDistance = s.currentY - s.startY;
        }
        
        // Check threshold
        if (dragDistance > s.minDragThreshold && s.tension > 0.1) {
            const velocity = s.tension * s.tension * s.releaseMultiplier;
            anim.velocity = velocity;
            
            this.playHapticFeedback('release');
            this.spawnReleaseParticles(anim.panel, isMobile);
            this.flashReleaseEffect(anim.panel);
        } else {
            anim.velocity = 0;
        }
        
        // Reset state
        s.active = false;
        s.tension = 0;
        s.lastTensionMilestone = 0;
        
        // Hide drag line
        const overlay = s.dragLine;
        if (overlay) {
            overlay.style.opacity = '0';
        }
        
        // Reset panel
        if (anim?.panel) {
            anim.panel.classList.remove('slingshot-dragging');
            anim.panel.style.boxShadow = '';
            anim.panel.style.cursor = 'grab';
        }
        
        anim.targetSpeed = 1;
    },
    
    /**
     * Spawn particles on release
     */
    spawnReleaseParticles(panel, isMobile) {
        if (!panel) return;
        
        let container = panel.querySelector('.slingshot-particles');
        if (!container) {
            container = document.createElement('div');
            container.className = 'slingshot-particles';
            panel.appendChild(container);
        }
        
        const particleCount = 15;
        const rect = panel.getBoundingClientRect();
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'slingshot-particle';
            
            // Random starting position
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${Math.random() * 100}%`;
            
            // Random direction
            const angle = Math.random() * Math.PI * 2;
            const distance = 50 + Math.random() * 100;
            const px = Math.cos(angle) * distance;
            const py = Math.sin(angle) * distance;
            
            particle.style.setProperty('--px', `${px}px`);
            particle.style.setProperty('--py', `${py}px`);
            
            container.appendChild(particle);
            
            // Remove after animation
            setTimeout(() => particle.remove(), 600);
        }
        
        // Clean up container after all particles done
        setTimeout(() => container.remove(), 700);
    },
    
    /**
     * Flash effect on release
     */
    flashReleaseEffect(panel) {
        if (!panel) return;
        
        const flash = document.createElement('div');
        flash.className = 'slingshot-flash';
        flash.style.cssText = `
            position: absolute;
            inset: 0;
            background: radial-gradient(circle, rgba(0, 255, 204, 0.6) 0%, transparent 70%);
            pointer-events: none;
            z-index: 100;
            animation: slingshotFlash 0.4s ease-out forwards;
        `;
        panel.appendChild(flash);
        
        setTimeout(() => flash.remove(), 400);
    },
    
    /**
     * Haptic feedback
     */
    playHapticFeedback(type) {
        if ('vibrate' in navigator) {
            switch (type) {
                case 'start': navigator.vibrate(10); break;
                case 'tension': navigator.vibrate([20, 10, 20]); break;
                case 'max': navigator.vibrate([50, 30, 50, 30, 50]); break;
                case 'release': navigator.vibrate(100); break;
            }
        }
    },
    
    /**
     * Speed up animation (hover effect)
     */
    speedUp(key) {
        if (this.animations[key] && !this.slingshot.active) {
            this.animations[key].targetSpeed = this.physics.hoverMultiplier;
        }
    },
    
    /**
     * Return to normal speed
     */
    speedNormal(key) {
        if (this.animations[key] && !this.slingshot.active) {
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
