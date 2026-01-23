/**
 * HOMEPAGE - Hologram Silhouette Controller with Slingshot Physics
 * 
 * DESKTOP: Two side panels (left & right) with idle upward scroll
 *          - Hover to speed up
 *          - Click & drag UP or DOWN to wind up, release to slingshot in opposite direction
 * 
 * MOBILE: One bottom panel with idle leftward scroll
 *          - Touch & drag LEFT or RIGHT to wind up, release to slingshot in opposite direction
 * 
 * Features:
 * - Bidirectional slingshot (both directions)
 * - Bow & arrow physics: silhouettes slow down as tension builds
 * - Smooth 60fps requestAnimationFrame animation
 * - Satisfying release with particles, flash, screen shake
 * - Elastic rubber band visual feedback
 * - Whoosh sound effects
 * - Haptic feedback on mobile
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
            panel: null,
            baseDirection: -1 // -1 = up (default idle direction)
        },
        right: { 
            position: 0, 
            speed: 1, 
            targetSpeed: 1, 
            track: null, 
            height: 0,
            velocity: 0,
            panel: null,
            baseDirection: -1
        },
        mobile: { 
            position: 0, 
            speed: 1, 
            targetSpeed: 1, 
            track: null, 
            width: 0,
            velocity: 0,
            panel: null,
            baseDirection: -1 // -1 = left (default idle direction)
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
        direction: 0, // +1 or -1 depending on drag direction
        maxTension: 1,
        minDragThreshold: 20, // Lower threshold for easier activation
        maxDragDistance: 250, // Slightly shorter for quicker max tension
        releaseMultiplier: 60, // MUCH higher for faster release
        dragLine: null,
        rubberBand: null,
        lastTensionMilestone: 0,
        preDragSpeed: 0 // Remember speed before drag for smooth return
    },
    
    // Physics constants
    physics: {
        baseSpeed: 1.5,
        hoverMultiplier: 3.5,
        friction: 0.94, // Higher friction = faster slowdown (was 0.985)
        minVelocity: 2, // Higher threshold = faster return to idle (was 0.5)
        shakeIntensity: 4,
        shakeFrequency: 0.4,
        screenShakeIntensity: 8,
        elasticSnapSpeed: 0.15 // Speed of rubber band snap back
    },
    
    // Audio context for satisfying sounds
    audioContext: null,
    
    animationFrame: null,
    frameCount: 0,
    screenShake: { active: false, intensity: 0, decay: 0.9 },
    
    /**
     * Initialize audio context
     */
    initAudio() {
        if (this.audioContext) return;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            // Audio not available
        }
    },
    
    /**
     * Play whoosh sound on release
     */
    playWhoosh(intensity) {
        if (!this.audioContext) return;
        
        try {
            const ctx = this.audioContext;
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            
            // White noise-ish whoosh
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(150 + intensity * 100, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2000, ctx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);
            
            gainNode.gain.setValueAtTime(0.15 * intensity, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.3);
        } catch (e) {
            // Sound failed, not critical
        }
    },
    
    /**
     * Play tension building sound
     */
    playTensionClick() {
        if (!this.audioContext) return;
        
        try {
            const ctx = this.audioContext;
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, ctx.currentTime);
            
            gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
            
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.05);
        } catch (e) {}
    },
    
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
            
            /* Tension building - silhouettes become ethereal */
            .silhouette-panel.slingshot-winding .silhouette-img {
                filter: brightness(0) invert(1) drop-shadow(0 0 20px rgba(255, 200, 50, 0.8)) !important;
                opacity: 0.4 !important;
            }
            
            .silhouette-panel.slingshot-maxed .silhouette-img {
                filter: brightness(0) invert(1) drop-shadow(0 0 25px rgba(255, 50, 100, 1)) !important;
                opacity: 0.3 !important;
            }
            
            /* Motion blur during fast movement */
            .silhouette-panel.slingshot-blur .silhouette-track {
                filter: blur(4px);
            }
            
            .silhouette-panel.slingshot-blur .silhouette-img {
                opacity: 0.5 !important;
            }
            
            /* Flash animation on release */
            @keyframes slingshotFlash {
                0% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.8; transform: scale(1.15); }
                100% { opacity: 0; transform: scale(1.3); }
            }
            
            /* Power flash for big releases */
            @keyframes powerFlash {
                0% { opacity: 0.9; }
                100% { opacity: 0; }
            }
            
            /* Particles container */
            .slingshot-particles {
                position: absolute;
                inset: 0;
                pointer-events: none;
                overflow: visible;
                z-index: 50;
            }
            
            /* Individual particle */
            .slingshot-particle {
                position: absolute;
                width: 6px;
                height: 6px;
                background: #00ffcc;
                border-radius: 50%;
                box-shadow: 0 0 8px #00ffcc, 0 0 16px #00d4ff;
                animation: particleFly 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
            }
            
            .slingshot-particle.big {
                width: 10px;
                height: 10px;
                box-shadow: 0 0 12px #00ffcc, 0 0 24px #00d4ff, 0 0 36px #00d4ff;
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
            
            /* Spark trail particles */
            .slingshot-spark {
                position: absolute;
                width: 3px;
                height: 3px;
                background: #fff;
                border-radius: 50%;
                box-shadow: 0 0 4px #fff, 0 0 8px #00ffcc;
                animation: sparkFade 0.3s ease-out forwards;
            }
            
            @keyframes sparkFade {
                0% { opacity: 1; transform: scale(1); }
                100% { opacity: 0; transform: scale(0.3); }
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
                background: linear-gradient(to bottom, transparent, rgba(0, 212, 255, 0.6), transparent);
                width: 3px;
                animation: speedLine 0.2s linear infinite;
            }
            
            @keyframes speedLine {
                0% { transform: translateY(-100%); opacity: 1; }
                100% { transform: translateY(200%); opacity: 0; }
            }
            
            /* Shockwave effect */
            .slingshot-shockwave {
                position: absolute;
                border-radius: 50%;
                border: 3px solid rgba(0, 255, 204, 0.8);
                animation: shockwaveExpand 0.5s ease-out forwards;
                pointer-events: none;
            }
            
            @keyframes shockwaveExpand {
                0% { 
                    width: 20px; 
                    height: 20px; 
                    opacity: 1;
                    margin: -10px;
                }
                100% { 
                    width: 200px; 
                    height: 200px; 
                    opacity: 0;
                    margin: -100px;
                }
            }
            
            /* Rubber band visual */
            .rubber-band {
                position: fixed;
                pointer-events: none;
                z-index: 9998;
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
                    height: 3px;
                    width: auto;
                    background: linear-gradient(to right, transparent, rgba(0, 212, 255, 0.6), transparent);
                    animation: speedLineHorizontal 0.2s linear infinite;
                }
                
                @keyframes speedLineHorizontal {
                    0% { transform: translateX(100%); opacity: 1; }
                    100% { transform: translateX(-200%); opacity: 0; }
                }
            }
            
            /* Screen shake */
            @keyframes screenShake {
                0%, 100% { transform: translate(0, 0); }
                10% { transform: translate(-5px, -3px); }
                20% { transform: translate(5px, 3px); }
                30% { transform: translate(-3px, 5px); }
                40% { transform: translate(3px, -5px); }
                50% { transform: translate(-5px, 3px); }
                60% { transform: translate(5px, -3px); }
                70% { transform: translate(-3px, -5px); }
                80% { transform: translate(3px, 5px); }
                90% { transform: translate(-5px, -3px); }
            }
            
            .screen-shaking {
                animation: screenShake 0.3s ease-out;
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
            transition: opacity 0.1s ease;
        `;
        
        // Defs for gradients and filters
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        
        // Dynamic gradient that changes with tension
        const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        gradient.id = 'drag-line-gradient';
        gradient.innerHTML = `
            <stop offset="0%" stop-color="#00d4ff" stop-opacity="0.9"/>
            <stop offset="50%" stop-color="#00ffcc" stop-opacity="1"/>
            <stop offset="100%" stop-color="#00d4ff" stop-opacity="0.9"/>
        `;
        defs.appendChild(gradient);
        
        // Intense glow filter
        const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        filter.id = 'drag-glow';
        filter.innerHTML = `
            <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
            <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        `;
        defs.appendChild(filter);
        
        // Pulse filter for tension indicator
        const pulseFilter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        pulseFilter.id = 'pulse-glow';
        pulseFilter.innerHTML = `
            <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
            <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        `;
        defs.appendChild(pulseFilter);
        
        svg.appendChild(defs);
        
        // Rubber band path (curved line)
        const rubberBand = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        rubberBand.id = 'rubber-band';
        rubberBand.setAttribute('fill', 'none');
        rubberBand.setAttribute('stroke', 'url(#drag-line-gradient)');
        rubberBand.setAttribute('stroke-width', '4');
        rubberBand.setAttribute('stroke-linecap', 'round');
        rubberBand.setAttribute('filter', 'url(#drag-glow)');
        svg.appendChild(rubberBand);
        
        // Main drag line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.id = 'drag-line';
        line.setAttribute('stroke', 'url(#drag-line-gradient)');
        line.setAttribute('stroke-width', '4');
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('filter', 'url(#drag-glow)');
        svg.appendChild(line);
        
        // Start point circle (anchor)
        const startCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        startCircle.id = 'drag-start';
        startCircle.setAttribute('r', '10');
        startCircle.setAttribute('fill', '#00d4ff');
        startCircle.setAttribute('filter', 'url(#drag-glow)');
        svg.appendChild(startCircle);
        
        // End point circle (handle being dragged)
        const endCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        endCircle.id = 'drag-end';
        endCircle.setAttribute('r', '14');
        endCircle.setAttribute('fill', '#00ffcc');
        endCircle.setAttribute('stroke', '#fff');
        endCircle.setAttribute('stroke-width', '3');
        endCircle.setAttribute('filter', 'url(#drag-glow)');
        svg.appendChild(endCircle);
        
        // Tension indicator arc - stays around START point (anchor)
        const tensionArc = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        tensionArc.id = 'tension-indicator';
        tensionArc.setAttribute('r', '30');
        tensionArc.setAttribute('fill', 'none');
        tensionArc.setAttribute('stroke', '#00ffcc');
        tensionArc.setAttribute('stroke-width', '4');
        tensionArc.setAttribute('stroke-dasharray', '0 188'); // circumference = 2 * PI * 30 ≈ 188
        tensionArc.setAttribute('filter', 'url(#pulse-glow)');
        tensionArc.style.transformOrigin = 'center';
        svg.appendChild(tensionArc);
        
        // Direction arrow indicator
        const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        arrow.id = 'direction-arrow';
        arrow.setAttribute('fill', '#00ffcc');
        arrow.setAttribute('filter', 'url(#drag-glow)');
        arrow.style.opacity = '0';
        svg.appendChild(arrow);
        
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
            
            // Apply screen shake if active
            if (self.screenShake.active) {
                self.applyScreenShake();
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
     * Apply screen shake effect
     */
    applyScreenShake() {
        const homeView = document.getElementById('home-view');
        if (!homeView) return;
        
        const shake = this.screenShake;
        if (shake.intensity > 0.5) {
            const x = (Math.random() - 0.5) * shake.intensity;
            const y = (Math.random() - 0.5) * shake.intensity;
            homeView.style.transform = `translate(${x}px, ${y}px)`;
            shake.intensity *= shake.decay;
        } else {
            homeView.style.transform = '';
            shake.active = false;
            shake.intensity = 0;
        }
    },
    
    /**
     * Trigger screen shake
     */
    triggerScreenShake(intensity) {
        this.screenShake.active = true;
        this.screenShake.intensity = intensity;
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
            // BOW & ARROW EFFECT: Silhouettes slow down as tension builds
            // At max tension, they're nearly stopped
            const tensionBrake = 1 - (this.slingshot.tension * 0.95); // 0.95 = 95% slowdown at max
            const windUpSpeed = this.physics.baseSpeed * tensionBrake * 0.5;
            
            // Continue moving in base direction but slowing down
            mobile.position += mobile.baseDirection * windUpSpeed;
            
            // Shake at high tension
            if (this.slingshot.tension > 0.8) {
                const shakeAmount = this.physics.shakeIntensity * (this.slingshot.tension - 0.8) * 5;
                const shake = Math.sin(this.frameCount * this.physics.shakeFrequency) * shakeAmount;
                mobile.track.style.transform = `translateX(${mobile.position}px) translateY(${shake}px)`;
                
                // Update panel class for visual feedback
                mobile.panel?.classList.add('slingshot-maxed');
                mobile.panel?.classList.remove('slingshot-winding');
            } else if (this.slingshot.tension > 0.3) {
                mobile.panel?.classList.add('slingshot-winding');
                mobile.panel?.classList.remove('slingshot-maxed');
                mobile.track.style.transform = `translateX(${mobile.position}px)`;
            } else {
                mobile.panel?.classList.remove('slingshot-winding', 'slingshot-maxed');
                mobile.track.style.transform = `translateX(${mobile.position}px)`;
            }
        } else if (isSlingshotting) {
            // Slingshot release mode - velocity includes direction
            mobile.position += mobile.velocity;
            mobile.velocity *= this.physics.friction;
            
            // Speed lines effect
            this.updateSpeedLines(mobile.panel, Math.abs(mobile.velocity), 'horizontal');
            
            // Spawn trailing sparks
            if (Math.abs(mobile.velocity) > 15 && this.frameCount % 3 === 0) {
                this.spawnTrailSpark(mobile.panel);
            }
            
            if (Math.abs(mobile.velocity) > 15) {
                mobile.panel?.classList.add('slingshot-blur');
            } else {
                mobile.panel?.classList.remove('slingshot-blur');
            }
            
            // Return to idle faster
            if (Math.abs(mobile.velocity) <= this.physics.minVelocity) {
                mobile.velocity = 0;
                mobile.panel?.classList.remove('slingshot-blur', 'slingshot-winding', 'slingshot-maxed');
                this.removeSpeedLines(mobile.panel);
            }
            
            mobile.track.style.transform = `translateX(${mobile.position}px)`;
        } else {
            // Normal idle scrolling
            mobile.speed += (mobile.targetSpeed - mobile.speed) * 0.15; // Faster lerp
            mobile.position += mobile.baseDirection * this.physics.baseSpeed * mobile.speed;
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
                // BOW & ARROW EFFECT: Silhouettes slow down as tension builds
                const tensionBrake = 1 - (this.slingshot.tension * 0.95);
                const windUpSpeed = this.physics.baseSpeed * tensionBrake * 0.5;
                
                // Continue moving in base direction but slowing down
                anim.position += anim.baseDirection * windUpSpeed;
                
                // Shake at high tension
                if (this.slingshot.tension > 0.8) {
                    const shakeAmount = this.physics.shakeIntensity * (this.slingshot.tension - 0.8) * 5;
                    const shake = Math.sin(this.frameCount * this.physics.shakeFrequency) * shakeAmount;
                    anim.track.style.transform = `translateY(${anim.position}px) translateX(${shake}px)`;
                    
                    anim.panel?.classList.add('slingshot-maxed');
                    anim.panel?.classList.remove('slingshot-winding');
                } else if (this.slingshot.tension > 0.3) {
                    anim.panel?.classList.add('slingshot-winding');
                    anim.panel?.classList.remove('slingshot-maxed');
                    anim.track.style.transform = `translateY(${anim.position}px)`;
                } else {
                    anim.panel?.classList.remove('slingshot-winding', 'slingshot-maxed');
                    anim.track.style.transform = `translateY(${anim.position}px)`;
                }
            } else if (isSlingshotting) {
                // Slingshot release mode - velocity includes direction
                anim.position += anim.velocity;
                anim.velocity *= this.physics.friction;
                
                // Speed lines effect
                this.updateSpeedLines(anim.panel, Math.abs(anim.velocity), 'vertical');
                
                // Spawn trailing sparks
                if (Math.abs(anim.velocity) > 15 && this.frameCount % 3 === 0) {
                    this.spawnTrailSpark(anim.panel);
                }
                
                if (Math.abs(anim.velocity) > 15) {
                    anim.panel?.classList.add('slingshot-blur');
                } else {
                    anim.panel?.classList.remove('slingshot-blur');
                }
                
                // Return to idle faster
                if (Math.abs(anim.velocity) <= this.physics.minVelocity) {
                    anim.velocity = 0;
                    anim.panel?.classList.remove('slingshot-blur', 'slingshot-winding', 'slingshot-maxed');
                    this.removeSpeedLines(anim.panel);
                }
                
                anim.track.style.transform = `translateY(${anim.position}px)`;
            } else {
                // Normal idle or hover scrolling
                anim.speed += (anim.targetSpeed - anim.speed) * 0.15;
                anim.position += anim.baseDirection * this.physics.baseSpeed * anim.speed;
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
     * Spawn trail spark during fast movement
     */
    spawnTrailSpark(panel) {
        if (!panel) return;
        
        const spark = document.createElement('div');
        spark.className = 'slingshot-spark';
        spark.style.left = `${Math.random() * 100}%`;
        spark.style.top = `${Math.random() * 100}%`;
        panel.appendChild(spark);
        
        setTimeout(() => spark.remove(), 300);
    },
    
    /**
     * Create/update speed lines during fast movement
     */
    updateSpeedLines(panel, velocity, direction) {
        if (!panel || velocity < 10) return;
        
        let container = panel.querySelector('.speed-lines');
        if (!container) {
            container = document.createElement('div');
            container.className = 'speed-lines';
            panel.appendChild(container);
        }
        
        // Add new speed lines based on velocity
        const lineCount = Math.min(Math.floor(velocity / 4), 12);
        
        // Only add if we don't have enough
        while (container.children.length < lineCount) {
            const line = document.createElement('div');
            line.className = 'speed-line';
            
            if (direction === 'vertical') {
                line.style.left = `${Math.random() * 100}%`;
                line.style.height = `${30 + Math.random() * 40}px`;
                line.style.animationDuration = `${0.15 + Math.random() * 0.15}s`;
            } else {
                line.style.top = `${Math.random() * 100}%`;
                line.style.width = `${30 + Math.random() * 40}px`;
                line.style.animationDuration = `${0.15 + Math.random() * 0.15}s`;
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
                this.initAudio(); // Init audio on first interaction
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
                this.initAudio();
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
        this.slingshot.direction = 0;
        this.slingshot.lastTensionMilestone = 0;
        
        // Remember current speed for smooth return
        this.slingshot.preDragSpeed = this.animations[panelKey].speed;
        
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
     * Update slingshot during drag - BIDIRECTIONAL
     */
    updateSlingshot(e, isTouch) {
        if (!this.slingshot.active) return;
        
        const point = isTouch ? e.touches[0] : e;
        this.slingshot.currentX = point.clientX;
        this.slingshot.currentY = point.clientY;
        
        const isMobile = this.slingshot.panelKey === 'mobile';
        let dragDistance;
        let dragDirection;
        
        if (isMobile) {
            // Mobile: horizontal drag - LEFT or RIGHT both work
            dragDistance = this.slingshot.currentX - this.slingshot.startX;
            // Negative = dragging left, Positive = dragging right
            // Release will be opposite direction
            dragDirection = dragDistance > 0 ? -1 : 1; // If drag right, release goes left
        } else {
            // Desktop: vertical drag - UP or DOWN both work
            dragDistance = this.slingshot.currentY - this.slingshot.startY;
            // Negative = dragging up, Positive = dragging down
            // Release will be opposite direction
            dragDirection = dragDistance > 0 ? -1 : 1; // If drag down, release goes up
        }
        
        const absDragDistance = Math.abs(dragDistance);
        
        if (absDragDistance > this.slingshot.minDragThreshold) {
            // Build tension with easeOutQuad curve for satisfying feel
            const normalizedDrag = Math.min(absDragDistance / this.slingshot.maxDragDistance, 1);
            const easedTension = normalizedDrag * (2 - normalizedDrag); // easeOutQuad
            
            this.slingshot.tension = easedTension;
            this.slingshot.direction = dragDirection;
            
            // Haptic feedback at milestones
            const milestone = Math.floor(easedTension * 4) / 4; // 0.25, 0.5, 0.75, 1.0
            if (milestone > this.slingshot.lastTensionMilestone) {
                if (milestone >= 0.9) {
                    this.playHapticFeedback('max');
                    this.playTensionClick();
                } else if (milestone >= 0.5) {
                    this.playHapticFeedback('tension');
                    this.playTensionClick();
                }
                this.slingshot.lastTensionMilestone = milestone;
            }
        } else {
            this.slingshot.tension = 0;
            this.slingshot.direction = 0;
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
        const rubberBand = overlay.querySelector('#rubber-band');
        const startCircle = overlay.querySelector('#drag-start');
        const endCircle = overlay.querySelector('#drag-end');
        const tensionIndicator = overlay.querySelector('#tension-indicator');
        const directionArrow = overlay.querySelector('#direction-arrow');
        const gradient = overlay.querySelector('#drag-line-gradient');
        
        // Update gradient colors based on tension
        if (gradient) {
            let color1, color2;
            if (s.tension > 0.8) {
                color1 = '#ff3366';
                color2 = '#ff6b35';
            } else if (s.tension > 0.5) {
                color1 = '#ffcc00';
                color2 = '#ff9500';
            } else {
                color1 = '#00d4ff';
                color2 = '#00ffcc';
            }
            gradient.innerHTML = `
                <stop offset="0%" stop-color="${color1}" stop-opacity="0.9"/>
                <stop offset="50%" stop-color="${color2}" stop-opacity="1"/>
                <stop offset="100%" stop-color="${color1}" stop-opacity="0.9"/>
            `;
        }
        
        // Create rubber band curve (quadratic bezier)
        if (rubberBand) {
            const midX = (s.startX + s.currentX) / 2;
            const midY = (s.startY + s.currentY) / 2;
            // Perpendicular offset based on tension for curve effect
            const dx = s.currentX - s.startX;
            const dy = s.currentY - s.startY;
            const perpX = -dy * 0.2 * s.tension;
            const perpY = dx * 0.2 * s.tension;
            
            const ctrlX = midX + perpX + Math.sin(this.frameCount * 0.1) * s.tension * 5;
            const ctrlY = midY + perpY + Math.cos(this.frameCount * 0.1) * s.tension * 5;
            
            rubberBand.setAttribute('d', `M ${s.startX} ${s.startY} Q ${ctrlX} ${ctrlY} ${s.currentX} ${s.currentY}`);
            rubberBand.setAttribute('stroke-width', 4 + s.tension * 6);
        }
        
        // Main line (straight)
        if (line) {
            line.setAttribute('x1', s.startX);
            line.setAttribute('y1', s.startY);
            line.setAttribute('x2', s.currentX);
            line.setAttribute('y2', s.currentY);
            line.setAttribute('stroke-width', 3 + s.tension * 4);
            line.style.opacity = 0.5;
        }
        
        // Start circle (anchor) - pulses at high tension
        if (startCircle) {
            startCircle.setAttribute('cx', s.startX);
            startCircle.setAttribute('cy', s.startY);
            const pulse = s.tension > 0.8 ? 2 + Math.sin(this.frameCount * 0.3) * 2 : 0;
            startCircle.setAttribute('r', 10 + s.tension * 4 + pulse);
            
            // Color matches tension
            if (s.tension > 0.8) {
                startCircle.setAttribute('fill', '#ff3366');
            } else if (s.tension > 0.5) {
                startCircle.setAttribute('fill', '#ffcc00');
            } else {
                startCircle.setAttribute('fill', '#00d4ff');
            }
        }
        
        // End circle (dragged handle)
        if (endCircle) {
            endCircle.setAttribute('cx', s.currentX);
            endCircle.setAttribute('cy', s.currentY);
            endCircle.setAttribute('r', 14 + s.tension * 10);
            
            // Color shift based on tension
            if (s.tension > 0.8) {
                endCircle.setAttribute('fill', '#ff3366');
                endCircle.setAttribute('stroke', '#fff');
            } else if (s.tension > 0.5) {
                endCircle.setAttribute('fill', '#ffcc00');
                endCircle.setAttribute('stroke', '#fff');
            } else {
                endCircle.setAttribute('fill', '#00ffcc');
                endCircle.setAttribute('stroke', '#fff');
            }
        }
        
        // Tension indicator arc - stays around START point (anchor), fills up as tension builds
        if (tensionIndicator) {
            tensionIndicator.setAttribute('cx', s.startX);
            tensionIndicator.setAttribute('cy', s.startY);
            
            const radius = 35 + s.tension * 15;
            tensionIndicator.setAttribute('r', radius);
            
            const circumference = 2 * Math.PI * radius;
            const filled = circumference * s.tension;
            tensionIndicator.setAttribute('stroke-dasharray', `${filled} ${circumference}`);
            
            // Rotate so arc starts from top and fills clockwise - NO ORBIT
            tensionIndicator.style.transform = `rotate(-90deg)`;
            tensionIndicator.style.transformOrigin = `${s.startX}px ${s.startY}px`;
            
            // Color matches tension
            if (s.tension > 0.8) {
                tensionIndicator.setAttribute('stroke', '#ff3366');
                tensionIndicator.setAttribute('stroke-width', '5');
            } else if (s.tension > 0.5) {
                tensionIndicator.setAttribute('stroke', '#ffcc00');
                tensionIndicator.setAttribute('stroke-width', '4');
            } else {
                tensionIndicator.setAttribute('stroke', '#00ffcc');
                tensionIndicator.setAttribute('stroke-width', '3');
            }
        }
        
        // Direction arrow showing where release will go
        if (directionArrow && s.tension > 0.2) {
            directionArrow.style.opacity = Math.min(s.tension * 1.5, 1).toString();
            
            // Arrow points opposite to drag direction (where release will send)
            const isMobile = s.panelKey === 'mobile';
            let arrowX, arrowY, arrowPoints;
            
            if (isMobile) {
                // Horizontal arrow
                const dir = s.direction; // Already calculated as opposite of drag
                arrowX = s.startX + dir * 60;
                arrowY = s.startY;
                
                if (dir > 0) {
                    // Right arrow
                    arrowPoints = `${arrowX-15},${arrowY-10} ${arrowX},${arrowY} ${arrowX-15},${arrowY+10}`;
                } else {
                    // Left arrow
                    arrowPoints = `${arrowX+15},${arrowY-10} ${arrowX},${arrowY} ${arrowX+15},${arrowY+10}`;
                }
            } else {
                // Vertical arrow
                const dir = s.direction;
                arrowX = s.startX;
                arrowY = s.startY + dir * 60;
                
                if (dir > 0) {
                    // Down arrow
                    arrowPoints = `${arrowX-10},${arrowY-15} ${arrowX},${arrowY} ${arrowX+10},${arrowY-15}`;
                } else {
                    // Up arrow
                    arrowPoints = `${arrowX-10},${arrowY+15} ${arrowX},${arrowY} ${arrowX+10},${arrowY+15}`;
                }
            }
            
            directionArrow.setAttribute('points', arrowPoints);
            
            // Color matches tension
            if (s.tension > 0.8) {
                directionArrow.setAttribute('fill', '#ff3366');
            } else if (s.tension > 0.5) {
                directionArrow.setAttribute('fill', '#ffcc00');
            } else {
                directionArrow.setAttribute('fill', '#00ffcc');
            }
        } else if (directionArrow) {
            directionArrow.style.opacity = '0';
        }
        
        // Panel glow intensity
        const anim = this.animations[s.panelKey];
        if (anim?.panel) {
            const glowIntensity = 0.2 + s.tension * 0.5;
            let glowColor;
            if (s.tension > 0.8) {
                glowColor = '255, 51, 102';
            } else if (s.tension > 0.5) {
                glowColor = '255, 200, 50';
            } else {
                glowColor = '0, 212, 255';
            }
            
            anim.panel.style.boxShadow = `
                0 0 ${30 + s.tension * 60}px rgba(${glowColor}, ${glowIntensity}),
                inset 0 0 ${20 + s.tension * 40}px rgba(${glowColor}, ${glowIntensity * 0.5})
            `;
        }
    },
    
    /**
     * Release slingshot - BIDIRECTIONAL with faster release
     */
    releaseSlingshot(e) {
        if (!this.slingshot.active) return;
        
        const s = this.slingshot;
        const anim = this.animations[s.panelKey];
        
        // Check if we have enough tension for a release
        if (s.tension > 0.1 && s.direction !== 0) {
            // Calculate velocity - MUCH faster release
            // Using cubic function for more satisfying power curve
            const powerCurve = s.tension * s.tension * s.tension; // cubic
            const velocity = powerCurve * s.releaseMultiplier * s.direction;
            
            anim.velocity = velocity;
            
            // Effects based on power
            if (s.tension > 0.7) {
                // Big release - screen shake, lots of particles, sound
                this.triggerScreenShake(this.physics.screenShakeIntensity * s.tension);
                this.playWhoosh(s.tension);
                this.spawnReleaseParticles(anim.panel, s.panelKey === 'mobile', 25);
                this.spawnShockwave(anim.panel, s.startX, s.startY);
                this.flashReleaseEffect(anim.panel, true);
            } else if (s.tension > 0.3) {
                // Medium release
                this.playWhoosh(s.tension * 0.7);
                this.spawnReleaseParticles(anim.panel, s.panelKey === 'mobile', 15);
                this.flashReleaseEffect(anim.panel, false);
            } else {
                // Small release
                this.spawnReleaseParticles(anim.panel, s.panelKey === 'mobile', 8);
            }
            
            this.playHapticFeedback('release');
        } else {
            anim.velocity = 0;
        }
        
        // Reset state
        s.active = false;
        s.tension = 0;
        s.direction = 0;
        s.lastTensionMilestone = 0;
        
        // Hide drag line with snap-back animation
        this.animateSnapBack();
        
        // Reset panel
        if (anim?.panel) {
            anim.panel.classList.remove('slingshot-dragging', 'slingshot-winding', 'slingshot-maxed');
            anim.panel.style.boxShadow = '';
            anim.panel.style.cursor = 'grab';
        }
        
        anim.targetSpeed = 1;
    },
    
    /**
     * Animate the rubber band snapping back
     */
    animateSnapBack() {
        const overlay = this.slingshot.dragLine;
        if (!overlay) return;
        
        const line = overlay.querySelector('#drag-line');
        const rubberBand = overlay.querySelector('#rubber-band');
        const endCircle = overlay.querySelector('#drag-end');
        const tensionIndicator = overlay.querySelector('#tension-indicator');
        const directionArrow = overlay.querySelector('#direction-arrow');
        
        // Quick fade out
        overlay.style.transition = 'opacity 0.15s ease-out';
        overlay.style.opacity = '0';
        
        // Reset after animation
        setTimeout(() => {
            overlay.style.transition = 'opacity 0.1s ease';
            if (line) {
                line.setAttribute('x1', '0');
                line.setAttribute('y1', '0');
                line.setAttribute('x2', '0');
                line.setAttribute('y2', '0');
            }
            if (rubberBand) {
                rubberBand.setAttribute('d', '');
            }
            if (tensionIndicator) {
                tensionIndicator.setAttribute('stroke-dasharray', '0 188');
            }
            if (directionArrow) {
                directionArrow.style.opacity = '0';
            }
        }, 150);
    },
    
    /**
     * Spawn shockwave effect for big releases
     */
    spawnShockwave(panel, x, y) {
        if (!panel) return;
        
        const rect = panel.getBoundingClientRect();
        const localX = x - rect.left;
        const localY = y - rect.top;
        
        const wave = document.createElement('div');
        wave.className = 'slingshot-shockwave';
        wave.style.left = `${localX}px`;
        wave.style.top = `${localY}px`;
        panel.appendChild(wave);
        
        setTimeout(() => wave.remove(), 500);
    },
    
    /**
     * Spawn particles on release
     */
    spawnReleaseParticles(panel, isMobile, count = 15) {
        if (!panel) return;
        
        let container = panel.querySelector('.slingshot-particles');
        if (!container) {
            container = document.createElement('div');
            container.className = 'slingshot-particles';
            panel.appendChild(container);
        }
        
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'slingshot-particle';
            if (i < count / 4) particle.classList.add('big');
            
            // Random starting position
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${Math.random() * 100}%`;
            
            // Directional bias based on slingshot direction
            const baseAngle = isMobile ? 
                (this.slingshot.direction > 0 ? 0 : Math.PI) :
                (this.slingshot.direction > 0 ? Math.PI/2 : -Math.PI/2);
            
            const angle = baseAngle + (Math.random() - 0.5) * Math.PI;
            const distance = 80 + Math.random() * 120;
            const px = Math.cos(angle) * distance;
            const py = Math.sin(angle) * distance;
            
            particle.style.setProperty('--px', `${px}px`);
            particle.style.setProperty('--py', `${py}px`);
            
            container.appendChild(particle);
            
            // Remove after animation
            setTimeout(() => particle.remove(), 500);
        }
        
        // Clean up container after all particles done
        setTimeout(() => {
            if (container.children.length === 0) {
                container.remove();
            }
        }, 600);
    },
    
    /**
     * Flash effect on release
     */
    flashReleaseEffect(panel, intense = false) {
        if (!panel) return;
        
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: absolute;
            inset: 0;
            background: radial-gradient(circle, 
                ${intense ? 'rgba(255, 200, 100, 0.8)' : 'rgba(0, 255, 204, 0.6)'} 0%, 
                transparent 70%);
            pointer-events: none;
            z-index: 100;
            animation: ${intense ? 'powerFlash' : 'slingshotFlash'} ${intense ? '0.3s' : '0.4s'} ease-out forwards;
        `;
        panel.appendChild(flash);
        
        setTimeout(() => flash.remove(), intense ? 300 : 400);
    },
    
    /**
     * Haptic feedback
     */
    playHapticFeedback(type) {
        if ('vibrate' in navigator) {
            switch (type) {
                case 'start': navigator.vibrate(15); break;
                case 'tension': navigator.vibrate([25, 15, 25]); break;
                case 'max': navigator.vibrate([60, 30, 60, 30, 60]); break;
                case 'release': navigator.vibrate(150); break;
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
