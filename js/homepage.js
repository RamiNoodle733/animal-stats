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
 * - 5 tension levels: cyan → yellow → orange → red → BLACK (extreme)
 * - Panel grows/pulses with tension for satisfying feel
 * - Real whoosh sound using noise generation
 * - Speed lines on opposite side of pull direction
 * - Smooth 60fps requestAnimationFrame animation
 * - Satisfying release with particles, flash, screen shake
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
            baseDirection: -1,
            originalScale: 1
        },
        right: { 
            position: 0, 
            speed: 1, 
            targetSpeed: 1, 
            track: null, 
            height: 0,
            velocity: 0,
            panel: null,
            baseDirection: -1,
            originalScale: 1
        },
        mobile: { 
            position: 0, 
            speed: 1, 
            targetSpeed: 1, 
            track: null, 
            width: 0,
            velocity: 0,
            panel: null,
            baseDirection: -1,
            originalScale: 1
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
        direction: 0,
        maxTension: 1,
        minDragThreshold: 20,
        maxDragDistance: 250,
        releaseMultiplier: 60,
        dragLine: null,
        lastTensionMilestone: 0,
        preDragSpeed: 0
    },
    
    // Physics constants
    physics: {
        baseSpeed: 3.5,        // FAST idle speed (was 1.5)
        hoverMultiplier: 0.3,  // SLOW on hover (inverted - was 3.5 to speed up)
        friction: 0.94,
        minVelocity: 2,
        shakeIntensity: 4,
        shakeFrequency: 0.4,
        screenShakeIntensity: 8
    },
    
    // Audio for whoosh
    audioContext: null,
    noiseBuffer: null,
    
    animationFrame: null,
    frameCount: 0,
    screenShake: { active: false, intensity: 0, decay: 0.9 },
    
    /**
     * Initialize audio context and create noise buffer
     */
    initAudio() {
        if (this.audioContext) return;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.createNoiseBuffer();
        } catch (e) {}
    },
    
    /**
     * Create white noise buffer for whoosh sound
     */
    createNoiseBuffer() {
        if (!this.audioContext) return;
        
        const bufferSize = this.audioContext.sampleRate * 0.5; // 0.5 second of noise
        this.noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = this.noiseBuffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
    },
    
    /**
     * Play true whoosh sound using filtered noise with pitch/duration variation
     */
    playWhoosh(intensity) {
        if (!this.audioContext || !this.noiseBuffer) return;
        
        try {
            const ctx = this.audioContext;
            
            // Resume if suspended
            if (ctx.state === 'suspended') ctx.resume();
            
            // Create noise source
            const noiseSource = ctx.createBufferSource();
            noiseSource.buffer = this.noiseBuffer;
            
            // Playback rate affects pitch - higher intensity = lower swoosh
            noiseSource.playbackRate.value = 1.2 - intensity * 0.3;
            
            // Bandpass filter for whoosh character - lower for more dramatic
            const bandpass = ctx.createBiquadFilter();
            bandpass.type = 'bandpass';
            bandpass.frequency.setValueAtTime(600 + intensity * 500, ctx.currentTime);
            bandpass.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.3 + intensity * 0.1);
            bandpass.Q.value = 0.7;
            
            // Highpass to remove rumble
            const highpass = ctx.createBiquadFilter();
            highpass.type = 'highpass';
            highpass.frequency.value = 80;
            
            // Lowpass for air sound - more bass at higher intensity
            const lowpass = ctx.createBiquadFilter();
            lowpass.type = 'lowpass';
            lowpass.frequency.setValueAtTime(2500 + intensity * 2500, ctx.currentTime);
            lowpass.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.35);
            
            // Gain envelope - louder and longer at higher intensity
            const gainNode = ctx.createGain();
            const duration = 0.25 + intensity * 0.15;
            gainNode.gain.setValueAtTime(0, ctx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.25 + intensity * 0.15, ctx.currentTime + 0.025);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
            
            // Connect chain
            noiseSource.connect(highpass);
            highpass.connect(bandpass);
            bandpass.connect(lowpass);
            lowpass.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            noiseSource.start(ctx.currentTime);
            noiseSource.stop(ctx.currentTime + duration + 0.05);
        } catch (e) {}
    },
    
    /**
     * Play tension click/creak sound
     */
    playTensionCreak(tension) {
        if (!this.audioContext) return;
        
        try {
            const ctx = this.audioContext;
            if (ctx.state === 'suspended') ctx.resume();
            
            // Create a short creak/click
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            
            // More creaky/stretchy sound
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(200 + tension * 300, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.08);
            
            filter.type = 'lowpass';
            filter.frequency.value = 800;
            
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.1);
        } catch (e) {}
    },
    
    /**
     * Get tension level and colors
     */
    getTensionLevel(tension) {
        if (tension > 0.95) {
            return { 
                level: 'extreme', 
                color1: '#ff3020', 
                color2: '#cc1010',
                glowColor: '255, 50, 30',
                shadowColor: 'rgba(255, 50, 30, 0.8)'
            };
        } else if (tension > 0.8) {
            return { 
                level: 'max', 
                color1: '#ff3366', 
                color2: '#ff0044',
                glowColor: '255, 51, 102',
                shadowColor: 'rgba(255, 51, 102, 0.6)'
            };
        } else if (tension > 0.6) {
            return { 
                level: 'high', 
                color1: '#ff6b35', 
                color2: '#ff4500',
                glowColor: '255, 107, 53',
                shadowColor: 'rgba(255, 107, 53, 0.5)'
            };
        } else if (tension > 0.4) {
            return { 
                level: 'medium', 
                color1: '#ffcc00', 
                color2: '#ff9500',
                glowColor: '255, 200, 50',
                shadowColor: 'rgba(255, 200, 50, 0.4)'
            };
        } else {
            return { 
                level: 'low', 
                color1: '#00d4ff', 
                color2: '#00ffcc',
                glowColor: '0, 212, 255',
                shadowColor: 'rgba(0, 212, 255, 0.3)'
            };
        }
    },
    
    /**
     * Initialize and populate panels
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
        
        const validAnimals = animals.filter(a => 
            a.image && 
            !a.image.includes('fallback') && 
            !a.image.includes('placeholder') &&
            a.image.trim() !== ''
        );
        
        const shuffled = this.shuffle([...validAnimals]);
        const allImages = shuffled.map(a => a.image);
        
        this.animalImages = allImages;
        this.addPanelDecorations();
        
        const half = Math.ceil(allImages.length / 2);
        const leftImages = allImages.slice(0, half);
        const rightImages = allImages.slice(half);
        
        this.populateTrack(trackLeft, leftImages);
        this.populateTrack(trackRight, rightImages.length > 0 ? rightImages : leftImages);
        
        this.animations.left.track = trackLeft;
        this.animations.right.track = trackRight;
        this.animations.left.panel = document.getElementById('silhouette-left');
        this.animations.right.panel = document.getElementById('silhouette-right');
        
        this.createMobilePanel(allImages);
        this.createDragLineOverlay();
        this.injectSlingshotStyles();
        this.setupInteractions();
        
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
            /* Panel transform origin for scaling */
            .silhouette-panel {
                transform-origin: center center;
                transition: transform 0.1s ease-out;
            }
            
            /* Slingshot dragging state - keep silhouettes WHITE */
            .silhouette-panel.slingshot-active .silhouette-img {
                filter: brightness(0) invert(1) drop-shadow(0 0 12px rgba(0, 255, 204, 0.5)) !important;
                transition: opacity 0.15s ease !important;
                /* NO filter transition to prevent black flash */
            }
            
            /* Low tension - cyan glow */
            .silhouette-panel.slingshot-level-low .silhouette-img {
                filter: brightness(0) invert(1) drop-shadow(0 0 15px rgba(0, 212, 255, 0.6)) !important;
                opacity: 0.7 !important;
            }
            
            /* Medium tension - yellow glow, more faded */
            .silhouette-panel.slingshot-level-medium .silhouette-img {
                filter: brightness(0) invert(1) drop-shadow(0 0 18px rgba(255, 200, 50, 0.7)) !important;
                opacity: 0.5 !important;
            }
            
            /* High tension - orange glow */
            .silhouette-panel.slingshot-level-high .silhouette-img {
                filter: brightness(0) invert(1) drop-shadow(0 0 20px rgba(255, 107, 53, 0.8)) !important;
                opacity: 0.4 !important;
            }
            
            /* Max tension - red glow */
            .silhouette-panel.slingshot-level-max .silhouette-img {
                filter: brightness(0) invert(1) drop-shadow(0 0 25px rgba(255, 51, 102, 0.9)) !important;
                opacity: 0.3 !important;
            }
            
            /* EXTREME tension - burnt ember/crimson void with pulsing glow */
            .silhouette-panel.slingshot-level-extreme .silhouette-img {
                filter: brightness(0) invert(1) drop-shadow(0 0 35px rgba(255, 50, 50, 1)) drop-shadow(0 0 20px rgba(255, 100, 50, 0.8)) !important;
                opacity: 0.25 !important;
                animation: extremePulse 0.15s ease-in-out infinite alternate;
            }
            
            @keyframes extremePulse {
                0% { filter: brightness(0) invert(1) drop-shadow(0 0 35px rgba(255, 50, 50, 1)) drop-shadow(0 0 20px rgba(255, 100, 50, 0.8)); }
                100% { filter: brightness(0) invert(1) drop-shadow(0 0 45px rgba(255, 30, 30, 1)) drop-shadow(0 0 30px rgba(255, 80, 30, 1)); }
            }
            
            .silhouette-panel.slingshot-level-extreme {
                background: radial-gradient(ellipse at center, rgba(60, 10, 15, 0.95) 0%, rgba(25, 5, 10, 0.98) 100%) !important;
                border-color: rgba(255, 60, 40, 0.6) !important;
                box-shadow: 
                    0 0 40px rgba(255, 50, 30, 0.4),
                    0 0 80px rgba(255, 30, 20, 0.2),
                    inset 0 0 30px rgba(255, 50, 30, 0.15) !important;
            }
            
            /* Motion blur during fast movement - keep WHITE */
            .silhouette-panel.slingshot-blur .silhouette-track {
                filter: blur(3px);
            }
            
            .silhouette-panel.slingshot-blur .silhouette-img {
                filter: brightness(0) invert(1) drop-shadow(0 0 8px rgba(0, 212, 255, 0.4)) !important;
                opacity: 0.6 !important;
            }
            
            /* Panel bounce animation on release */
            @keyframes panelBounce {
                0% { transform: translateY(-50%) scale(1.08); }
                30% { transform: translateY(-50%) scale(0.96); }
                50% { transform: translateY(-50%) scale(1.02); }
                70% { transform: translateY(-50%) scale(0.99); }
                100% { transform: translateY(-50%) scale(1); }
            }
            
            @keyframes panelBounceMobile {
                0% { transform: scale(1.06); }
                30% { transform: scale(0.97); }
                50% { transform: scale(1.02); }
                70% { transform: scale(0.99); }
                100% { transform: scale(1); }
            }
            
            .silhouette-panel.slingshot-bounce {
                animation: panelBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards !important;
            }
            
            .silhouette-panel.panel-mobile.slingshot-bounce {
                animation: panelBounceMobile 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards !important;
            }
            
            /* Flash animations */
            @keyframes slingshotFlash {
                0% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.8; transform: scale(1.15); }
                100% { opacity: 0; transform: scale(1.3); }
            }
            
            @keyframes powerFlash {
                0% { opacity: 0.9; }
                100% { opacity: 0; }
            }
            
            @keyframes extremeFlash {
                0% { opacity: 1; background: radial-gradient(circle, rgba(255, 255, 255, 1) 0%, rgba(255, 50, 30, 0.8) 30%, transparent 70%); }
                30% { opacity: 0.9; background: radial-gradient(circle, rgba(255, 100, 50, 0.9) 0%, rgba(255, 30, 20, 0.5) 50%, transparent 80%); }
                100% { opacity: 0; background: transparent; }
            }
            
            /* Screen ripple effect */
            .slingshot-ripple {
                position: fixed;
                border-radius: 50%;
                border: 3px solid rgba(0, 255, 204, 0.6);
                pointer-events: none;
                animation: rippleExpand 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
                z-index: 9998;
            }
            
            @keyframes rippleExpand {
                0% { width: 0; height: 0; opacity: 1; }
                100% { width: 300px; height: 300px; opacity: 0; margin: -150px; }
            }
            
            /* Particles container */
            .slingshot-particles {
                position: absolute;
                inset: 0;
                pointer-events: none;
                overflow: visible;
                z-index: 50;
            }
            
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
            
            .slingshot-particle.trail {
                width: 4px;
                height: 4px;
                background: rgba(0, 255, 204, 0.8);
                box-shadow: 0 0 6px rgba(0, 255, 204, 0.6);
            }
            
            .slingshot-particle.ember {
                background: #ff6030;
                box-shadow: 0 0 8px #ff4020, 0 0 16px #ff2010;
            }
            
            @keyframes particleFly {
                0% { opacity: 1; transform: translate(0, 0) scale(1); }
                100% { opacity: 0; transform: translate(var(--px), var(--py)) scale(0); }
            }
            
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
            
            /* Speed lines - base styles */
            .speed-lines {
                position: absolute;
                pointer-events: none;
                overflow: hidden;
                z-index: 40;
            }
            
            /* Vertical speed lines - positioned at EXACT edges */
            .speed-lines.vertical-top {
                top: 0;
                left: 0;
                right: 0;
                height: 60%;
            }
            
            .speed-lines.vertical-bottom {
                bottom: 0;
                left: 0;
                right: 0;
                height: 60%;
            }
            
            .speed-lines.vertical-top .speed-line,
            .speed-lines.vertical-bottom .speed-line {
                position: absolute;
                background: linear-gradient(to bottom, transparent, rgba(0, 212, 255, 0.7), transparent);
                width: 2px;
                border-radius: 2px;
                box-shadow: 0 0 6px rgba(0, 212, 255, 0.5);
            }
            
            .speed-lines.vertical-top .speed-line {
                top: 0;
                animation: speedLineDown 0.18s linear infinite;
            }
            
            .speed-lines.vertical-bottom .speed-line {
                bottom: 0;
                animation: speedLineUp 0.18s linear infinite;
            }
            
            @keyframes speedLineDown {
                0% { transform: translateY(0); opacity: 1; }
                100% { transform: translateY(100%); opacity: 0; }
            }
            
            @keyframes speedLineUp {
                0% { transform: translateY(0); opacity: 1; }
                100% { transform: translateY(-100%); opacity: 0; }
            }
            
            /* Horizontal speed lines - positioned at EXACT edges */
            .speed-lines.horizontal-left {
                left: 0;
                top: 0;
                bottom: 0;
                width: 60%;
            }
            
            .speed-lines.horizontal-right {
                right: 0;
                top: 0;
                bottom: 0;
                width: 60%;
            }
            
            .speed-lines.horizontal-left .speed-line,
            .speed-lines.horizontal-right .speed-line {
                position: absolute;
                background: linear-gradient(to right, transparent, rgba(0, 212, 255, 0.7), transparent);
                height: 2px;
                border-radius: 2px;
                box-shadow: 0 0 6px rgba(0, 212, 255, 0.5);
            }
            
            .speed-lines.horizontal-left .speed-line {
                left: 0;
                animation: speedLineRight 0.18s linear infinite;
            }
            
            .speed-lines.horizontal-right .speed-line {
                right: 0;
                animation: speedLineLeft 0.18s linear infinite;
            }
            
            @keyframes speedLineRight {
                0% { transform: translateX(0); opacity: 1; }
                100% { transform: translateX(100%); opacity: 0; }
            }
            
            @keyframes speedLineLeft {
                0% { transform: translateX(0); opacity: 1; }
                100% { transform: translateX(-100%); opacity: 0; }
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
                0% { width: 20px; height: 20px; opacity: 1; margin: -10px; }
                100% { width: 200px; height: 200px; opacity: 0; margin: -100px; }
            }
            
            /* Mobile panel visibility fix - ALWAYS visible */
            @media (max-width: 600px) {
                .silhouette-panel.panel-mobile,
                .silhouette-panel.panel-mobile.slingshot-active,
                .silhouette-panel.panel-mobile.slingshot-blur,
                .silhouette-panel.panel-mobile.slingshot-level-low,
                .silhouette-panel.panel-mobile.slingshot-level-medium,
                .silhouette-panel.panel-mobile.slingshot-level-high,
                .silhouette-panel.panel-mobile.slingshot-level-max,
                .silhouette-panel.panel-mobile.slingshot-level-extreme {
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    pointer-events: auto !important;
                    position: fixed !important;
                    bottom: 100px !important;
                    touch-action: none !important;
                    cursor: grab !important;
                }
                
                .silhouette-panel.panel-mobile.slingshot-active {
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                }
                
                .silhouette-panel.panel-mobile .silhouette-track,
                .silhouette-panel.panel-mobile .silhouette-img {
                    pointer-events: none !important;
                }
                
                /* Mobile silhouettes MUST stay white during all slingshot states */
                .silhouette-panel.panel-mobile .silhouette-img,
                .silhouette-panel.panel-mobile.slingshot-active .silhouette-img,
                .silhouette-panel.panel-mobile.slingshot-blur .silhouette-img,
                .silhouette-panel.panel-mobile.slingshot-level-low .silhouette-img,
                .silhouette-panel.panel-mobile.slingshot-level-medium .silhouette-img,
                .silhouette-panel.panel-mobile.slingshot-level-high .silhouette-img,
                .silhouette-panel.panel-mobile.slingshot-level-max .silhouette-img,
                .silhouette-panel.panel-mobile.slingshot-level-extreme .silhouette-img {
                    filter: brightness(0) invert(1) drop-shadow(0 0 8px rgba(0, 212, 255, 0.3)) !important;
                }
            }
        `;
        document.head.appendChild(style);
    },
    
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
        
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        
        const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        gradient.id = 'drag-line-gradient';
        gradient.innerHTML = `
            <stop offset="0%" stop-color="#00d4ff" stop-opacity="0.9"/>
            <stop offset="50%" stop-color="#00ffcc" stop-opacity="1"/>
            <stop offset="100%" stop-color="#00d4ff" stop-opacity="0.9"/>
        `;
        defs.appendChild(gradient);
        
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
        
        const rubberBand = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        rubberBand.id = 'rubber-band';
        rubberBand.setAttribute('fill', 'none');
        rubberBand.setAttribute('stroke', 'url(#drag-line-gradient)');
        rubberBand.setAttribute('stroke-width', '4');
        rubberBand.setAttribute('stroke-linecap', 'round');
        rubberBand.setAttribute('filter', 'url(#drag-glow)');
        svg.appendChild(rubberBand);
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.id = 'drag-line';
        line.setAttribute('stroke', 'url(#drag-line-gradient)');
        line.setAttribute('stroke-width', '4');
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('filter', 'url(#drag-glow)');
        svg.appendChild(line);
        
        const startCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        startCircle.id = 'drag-start';
        startCircle.setAttribute('r', '10');
        startCircle.setAttribute('fill', '#00d4ff');
        startCircle.setAttribute('filter', 'url(#drag-glow)');
        svg.appendChild(startCircle);
        
        const endCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        endCircle.id = 'drag-end';
        endCircle.setAttribute('r', '14');
        endCircle.setAttribute('fill', '#00ffcc');
        endCircle.setAttribute('stroke', '#fff');
        endCircle.setAttribute('stroke-width', '3');
        endCircle.setAttribute('filter', 'url(#drag-glow)');
        svg.appendChild(endCircle);
        
        const tensionArc = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        tensionArc.id = 'tension-indicator';
        tensionArc.setAttribute('r', '30');
        tensionArc.setAttribute('fill', 'none');
        tensionArc.setAttribute('stroke', '#00ffcc');
        tensionArc.setAttribute('stroke-width', '4');
        tensionArc.setAttribute('stroke-dasharray', '0 188');
        tensionArc.setAttribute('filter', 'url(#pulse-glow)');
        svg.appendChild(tensionArc);
        
        const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        arrow.id = 'direction-arrow';
        arrow.setAttribute('fill', '#00ffcc');
        arrow.setAttribute('filter', 'url(#drag-glow)');
        arrow.style.opacity = '0';
        svg.appendChild(arrow);
        
        document.body.appendChild(svg);
        this.slingshot.dragLine = svg;
    },
    
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
    
    populateTrack(track, images) {
        track.innerHTML = '';
        const allImages = [...images, ...images];
        
        allImages.forEach(src => {
            const img = this.createSilhouetteImage(src);
            track.appendChild(img);
        });
    },
    
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
        } catch (e) {}
    },
    
    startAnimationLoop() {
        const self = this;
        
        const animate = () => {
            const isMobile = window.innerWidth <= 600;
            self.frameCount++;
            
            if (self.slingshot.active) {
                self.updateSlingshotVisuals();
                self.updatePanelScale();
            }
            
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
     * Update panel scale based on tension for satisfying feel
     */
    updatePanelScale() {
        const s = this.slingshot;
        const anim = this.animations[s.panelKey];
        if (!anim?.panel) return;
        
        // Scale grows with tension: 1.0 → 1.08 at max, 1.12 at extreme
        const baseScale = 1;
        const maxScale = s.tension > 0.95 ? 1.12 : 1.08;
        const scale = baseScale + (maxScale - baseScale) * s.tension;
        
        // Add subtle pulse at high tension
        let pulse = 0;
        if (s.tension > 0.8) {
            pulse = Math.sin(this.frameCount * 0.2) * 0.01 * (s.tension - 0.8) * 5;
        }
        
        anim.panel.style.transform = `scale(${scale + pulse})`;
    },
    
    /**
     * Reset panel scale
     */
    resetPanelScale(panelKey) {
        const anim = this.animations[panelKey];
        if (anim?.panel) {
            anim.panel.style.transform = 'scale(1)';
        }
    },
    
    applyScreenShake() {
        // Only shake the portal content, not fixed elements like footer
        const portalContent = document.querySelector('.home-portal');
        if (!portalContent) return;
        
        const shake = this.screenShake;
        if (shake.intensity > 0.5) {
            const x = (Math.random() - 0.5) * shake.intensity;
            const y = (Math.random() - 0.5) * shake.intensity;
            portalContent.style.transform = `translate(${x}px, ${y}px)`;
            shake.intensity *= shake.decay;
        } else {
            portalContent.style.transform = '';
            shake.active = false;
            shake.intensity = 0;
        }
    },
    
    triggerScreenShake(intensity) {
        this.screenShake.active = true;
        this.screenShake.intensity = intensity;
    },
    
    animateMobile() {
        const mobile = this.animations.mobile;
        if (!mobile.track) return;
        
        if (mobile.width < 100 || this.frameCount % 60 === 0) {
            const newWidth = mobile.track.scrollWidth / 2;
            if (newWidth > 100) mobile.width = newWidth;
        }
        
        if (mobile.width <= 0) return;
        
        const isSlingshotting = this.slingshot.panelKey === 'mobile' && Math.abs(mobile.velocity) > this.physics.minVelocity;
        const isDragging = this.slingshot.active && this.slingshot.panelKey === 'mobile';
        
        if (isDragging) {
            const tensionBrake = 1 - (this.slingshot.tension * 0.95);
            const windUpSpeed = this.physics.baseSpeed * tensionBrake * 0.5;
            mobile.position += mobile.baseDirection * windUpSpeed;
            
            // Update tension level class
            this.updateTensionClass(mobile.panel, this.slingshot.tension);
            
            if (this.slingshot.tension > 0.8) {
                const shakeAmount = this.physics.shakeIntensity * (this.slingshot.tension - 0.8) * 5;
                const shake = Math.sin(this.frameCount * this.physics.shakeFrequency) * shakeAmount;
                mobile.track.style.transform = `translateX(${mobile.position}px) translateY(${shake}px)`;
            } else {
                mobile.track.style.transform = `translateX(${mobile.position}px)`;
            }
        } else if (isSlingshotting) {
            mobile.position += mobile.velocity;
            mobile.velocity *= this.physics.friction;
            
            // Speed lines TRAIL BEHIND movement (same side as movement direction)
            // If moving right, lines trail on right. If moving left, lines trail on left.
            const movingRight = mobile.velocity > 0;
            this.updateSpeedLines(mobile.panel, Math.abs(mobile.velocity), movingRight ? 'horizontal-right' : 'horizontal-left');
            
            if (Math.abs(mobile.velocity) > 15 && this.frameCount % 3 === 0) {
                this.spawnTrailSpark(mobile.panel);
            }
            
            if (Math.abs(mobile.velocity) > 15) {
                mobile.panel?.classList.add('slingshot-blur');
            } else {
                mobile.panel?.classList.remove('slingshot-blur');
            }
            
            if (Math.abs(mobile.velocity) <= this.physics.minVelocity) {
                mobile.velocity = 0;
                this.clearAllSlingshotClasses(mobile.panel);
                this.removeSpeedLines(mobile.panel);
            }
            
            mobile.track.style.transform = `translateX(${mobile.position}px)`;
        } else {
            mobile.speed += (mobile.targetSpeed - mobile.speed) * 0.15;
            mobile.position += mobile.baseDirection * this.physics.baseSpeed * mobile.speed;
            mobile.track.style.transform = `translateX(${mobile.position}px)`;
        }
        
        if (mobile.position <= -mobile.width) {
            mobile.position += mobile.width;
        } else if (mobile.position > 0) {
            mobile.position -= mobile.width;
        }
    },
    
    animateDesktop() {
        for (const key of ['left', 'right']) {
            const anim = this.animations[key];
            if (!anim.track) continue;
            
            if (anim.height < 100 || this.frameCount % 60 === 0) {
                const newHeight = anim.track.scrollHeight / 2;
                if (newHeight > 100) anim.height = newHeight;
            }
            
            if (anim.height <= 0) continue;
            
            const isSlingshotting = this.slingshot.panelKey === key && Math.abs(anim.velocity) > this.physics.minVelocity;
            const isDragging = this.slingshot.active && this.slingshot.panelKey === key;
            
            if (isDragging) {
                const tensionBrake = 1 - (this.slingshot.tension * 0.95);
                const windUpSpeed = this.physics.baseSpeed * tensionBrake * 0.5;
                anim.position += anim.baseDirection * windUpSpeed;
                
                // Update tension level class
                this.updateTensionClass(anim.panel, this.slingshot.tension);
                
                if (this.slingshot.tension > 0.8) {
                    const shakeAmount = this.physics.shakeIntensity * (this.slingshot.tension - 0.8) * 5;
                    const shake = Math.sin(this.frameCount * this.physics.shakeFrequency) * shakeAmount;
                    anim.track.style.transform = `translateY(${anim.position}px) translateX(${shake}px)`;
                } else {
                    anim.track.style.transform = `translateY(${anim.position}px)`;
                }
            } else if (isSlingshotting) {
                anim.position += anim.velocity;
                anim.velocity *= this.physics.friction;
                
                // Speed lines TRAIL BEHIND movement (same side as movement direction)
                // If moving down, lines trail on bottom. If moving up, lines trail on top.
                const movingDown = anim.velocity > 0;
                this.updateSpeedLines(anim.panel, Math.abs(anim.velocity), movingDown ? 'vertical-bottom' : 'vertical-top');
                
                if (Math.abs(anim.velocity) > 15 && this.frameCount % 3 === 0) {
                    this.spawnTrailSpark(anim.panel);
                }
                
                if (Math.abs(anim.velocity) > 15) {
                    anim.panel?.classList.add('slingshot-blur');
                } else {
                    anim.panel?.classList.remove('slingshot-blur');
                }
                
                if (Math.abs(anim.velocity) <= this.physics.minVelocity) {
                    anim.velocity = 0;
                    this.clearAllSlingshotClasses(anim.panel);
                    this.removeSpeedLines(anim.panel);
                }
                
                anim.track.style.transform = `translateY(${anim.position}px)`;
            } else {
                anim.speed += (anim.targetSpeed - anim.speed) * 0.15;
                anim.position += anim.baseDirection * this.physics.baseSpeed * anim.speed;
                anim.track.style.transform = `translateY(${anim.position}px)`;
            }
            
            if (anim.position <= -anim.height) {
                anim.position += anim.height;
            } else if (anim.position > 0) {
                anim.position -= anim.height;
            }
        }
    },
    
    /**
     * Update tension level class on panel
     */
    updateTensionClass(panel, tension) {
        if (!panel) return;
        
        // Remove all level classes
        panel.classList.remove('slingshot-level-low', 'slingshot-level-medium', 'slingshot-level-high', 'slingshot-level-max', 'slingshot-level-extreme');
        
        // Add active class
        panel.classList.add('slingshot-active');
        
        // Add appropriate level
        const level = this.getTensionLevel(tension);
        panel.classList.add(`slingshot-level-${level.level}`);
    },
    
    /**
     * Clear all slingshot classes from panel
     */
    clearAllSlingshotClasses(panel) {
        if (!panel) return;
        panel.classList.remove(
            'slingshot-active',
            'slingshot-blur',
            'slingshot-level-low',
            'slingshot-level-medium', 
            'slingshot-level-high',
            'slingshot-level-max',
            'slingshot-level-extreme'
        );
    },
    
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
     * Update speed lines on correct side - lines spawn from the edge
     */
    updateSpeedLines(panel, velocity, position) {
        if (!panel || velocity < 10) return;
        
        // Remove any existing speed lines containers
        panel.querySelectorAll('.speed-lines').forEach(c => c.remove());
        
        const container = document.createElement('div');
        container.className = `speed-lines ${position}`;
        panel.appendChild(container);
        
        const lineCount = Math.min(Math.floor(velocity / 3), 15);
        const isVertical = position.startsWith('vertical');
        
        for (let i = 0; i < lineCount; i++) {
            const line = document.createElement('div');
            line.className = 'speed-line';
            
            if (isVertical) {
                // Position lines randomly along width, spawn from edge
                line.style.left = `${Math.random() * 100}%`;
                line.style.height = `${20 + Math.random() * 35}px`;
            } else {
                // Position lines randomly along height, spawn from edge
                line.style.top = `${Math.random() * 100}%`;
                line.style.width = `${20 + Math.random() * 35}px`;
            }
            line.style.animationDuration = `${0.12 + Math.random() * 0.12}s`;
            line.style.animationDelay = `${Math.random() * 0.1}s`;
            
            container.appendChild(line);
        }
    },
    
    removeSpeedLines(panel) {
        if (!panel) return;
        panel.querySelectorAll('.speed-lines').forEach(c => c.remove());
    },
    
    setupInteractions() {
        const panelLeft = document.getElementById('silhouette-left');
        const panelRight = document.getElementById('silhouette-right');
        const mobilePanel = document.getElementById('silhouette-mobile');
        const portalNav = document.getElementById('portal-nav');
        const tournamentBtn = document.getElementById('portal-tournament-btn');
        
        // Panel hover - SLOW DOWN silhouettes (inverted from original)
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
        
        // Nav buttons hover - SLOW DOWN silhouettes + focus effect
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
            
            // Individual button focus effects
            const navButtons = portalNav.querySelectorAll('.portal-nav-btn');
            navButtons.forEach(btn => {
                btn.addEventListener('mouseenter', () => this.activateButtonFocus(btn));
                btn.addEventListener('mouseleave', () => this.deactivateButtonFocus(btn));
            });
        }
        
        // Tournament button - same slow down effect + focus
        if (tournamentBtn) {
            tournamentBtn.addEventListener('mouseenter', () => {
                if (!this.slingshot.active) {
                    this.speedUp('left');
                    this.speedUp('right');
                }
                this.activateButtonFocus(tournamentBtn);
            });
            tournamentBtn.addEventListener('mouseleave', () => {
                if (!this.slingshot.active) {
                    this.speedNormal('left');
                    this.speedNormal('right');
                }
                this.deactivateButtonFocus(tournamentBtn);
            });
        }
        
        [panelLeft, panelRight].forEach(panel => {
            if (!panel) return;
            const key = panel.id === 'silhouette-left' ? 'left' : 'right';
            
            panel.style.cursor = 'grab';
            panel.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.initAudio();
                this.startSlingshot(e, key, false);
            });
        });
        
        document.addEventListener('mousemove', (e) => this.updateSlingshot(e, false));
        document.addEventListener('mouseup', (e) => this.releaseSlingshot(e));
        
        if (mobilePanel) {
            mobilePanel.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.initAudio();
                this.startSlingshot(e, 'mobile', true);
            }, { passive: false });
        }
        
        document.addEventListener('touchmove', (e) => {
            if (this.slingshot.active) {
                e.preventDefault();
                this.updateSlingshot(e, true);
            }
        }, { passive: false });
        
        document.addEventListener('touchend', (e) => this.releaseSlingshot(e));
        document.addEventListener('touchcancel', (e) => this.releaseSlingshot(e));
    },
    
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
        
        this.slingshot.preDragSpeed = this.animations[panelKey].speed;
        this.animations[panelKey].targetSpeed = 0;
        this.animations[panelKey].velocity = 0;
        
        const overlay = this.slingshot.dragLine;
        if (overlay) {
            overlay.style.opacity = '1';
        }
        
        const anim = this.animations[panelKey];
        if (anim.panel) {
            anim.panel.classList.add('slingshot-active');
            anim.panel.style.cursor = 'grabbing';
        }
        
        this.playHapticFeedback('start');
    },
    
    updateSlingshot(e, isTouch) {
        if (!this.slingshot.active) return;
        
        const point = isTouch ? e.touches[0] : e;
        this.slingshot.currentX = point.clientX;
        this.slingshot.currentY = point.clientY;
        
        const isMobile = this.slingshot.panelKey === 'mobile';
        let dragDistance;
        let dragDirection;
        
        if (isMobile) {
            dragDistance = this.slingshot.currentX - this.slingshot.startX;
            dragDirection = dragDistance > 0 ? -1 : 1;
        } else {
            dragDistance = this.slingshot.currentY - this.slingshot.startY;
            dragDirection = dragDistance > 0 ? -1 : 1;
        }
        
        const absDragDistance = Math.abs(dragDistance);
        
        if (absDragDistance > this.slingshot.minDragThreshold) {
            const normalizedDrag = Math.min(absDragDistance / this.slingshot.maxDragDistance, 1);
            const easedTension = normalizedDrag * (2 - normalizedDrag);
            
            this.slingshot.tension = easedTension;
            this.slingshot.direction = dragDirection;
            
            // Haptic and audio feedback at milestones
            const milestone = Math.floor(easedTension * 5) / 5; // 0.2, 0.4, 0.6, 0.8, 1.0
            if (milestone > this.slingshot.lastTensionMilestone) {
                if (milestone >= 0.95) {
                    this.playHapticFeedback('extreme');
                    this.playTensionCreak(1);
                } else if (milestone >= 0.8) {
                    this.playHapticFeedback('max');
                    this.playTensionCreak(0.8);
                } else if (milestone >= 0.6) {
                    this.playHapticFeedback('tension');
                    this.playTensionCreak(0.6);
                } else if (milestone >= 0.4) {
                    this.playTensionCreak(0.4);
                }
                this.slingshot.lastTensionMilestone = milestone;
            }
        } else {
            this.slingshot.tension = 0;
            this.slingshot.direction = 0;
            this.slingshot.lastTensionMilestone = 0;
        }
    },
    
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
        
        const level = this.getTensionLevel(s.tension);
        
        // Update gradient
        if (gradient) {
            gradient.innerHTML = `
                <stop offset="0%" stop-color="${level.color1}" stop-opacity="0.9"/>
                <stop offset="50%" stop-color="${level.color2}" stop-opacity="1"/>
                <stop offset="100%" stop-color="${level.color1}" stop-opacity="0.9"/>
            `;
        }
        
        // Rubber band curve
        if (rubberBand) {
            const midX = (s.startX + s.currentX) / 2;
            const midY = (s.startY + s.currentY) / 2;
            const dx = s.currentX - s.startX;
            const dy = s.currentY - s.startY;
            const perpX = -dy * 0.2 * s.tension;
            const perpY = dx * 0.2 * s.tension;
            
            const wobble = s.tension > 0.8 ? Math.sin(this.frameCount * 0.15) * s.tension * 8 : Math.sin(this.frameCount * 0.1) * s.tension * 5;
            const ctrlX = midX + perpX + wobble;
            const ctrlY = midY + perpY + wobble;
            
            rubberBand.setAttribute('d', `M ${s.startX} ${s.startY} Q ${ctrlX} ${ctrlY} ${s.currentX} ${s.currentY}`);
            rubberBand.setAttribute('stroke-width', 4 + s.tension * 6);
        }
        
        // Main line
        if (line) {
            line.setAttribute('x1', s.startX);
            line.setAttribute('y1', s.startY);
            line.setAttribute('x2', s.currentX);
            line.setAttribute('y2', s.currentY);
            line.setAttribute('stroke-width', 3 + s.tension * 4);
            line.style.opacity = '0.5';
        }
        
        // Start circle (anchor)
        if (startCircle) {
            startCircle.setAttribute('cx', s.startX);
            startCircle.setAttribute('cy', s.startY);
            const pulse = s.tension > 0.8 ? 2 + Math.sin(this.frameCount * 0.3) * 3 : 0;
            startCircle.setAttribute('r', 10 + s.tension * 6 + pulse);
            startCircle.setAttribute('fill', level.color1);
        }
        
        // End circle (handle)
        if (endCircle) {
            endCircle.setAttribute('cx', s.currentX);
            endCircle.setAttribute('cy', s.currentY);
            const endPulse = s.tension > 0.95 ? Math.sin(this.frameCount * 0.4) * 4 : 0;
            endCircle.setAttribute('r', 14 + s.tension * 12 + endPulse);
            endCircle.setAttribute('fill', level.color2);
            endCircle.setAttribute('stroke', s.tension > 0.95 ? '#ff0044' : '#fff');
            endCircle.setAttribute('stroke-width', s.tension > 0.95 ? '4' : '3');
        }
        
        // Tension indicator arc
        if (tensionIndicator) {
            tensionIndicator.setAttribute('cx', s.startX);
            tensionIndicator.setAttribute('cy', s.startY);
            
            const radius = 35 + s.tension * 20;
            tensionIndicator.setAttribute('r', radius);
            
            const circumference = 2 * Math.PI * radius;
            const filled = circumference * s.tension;
            tensionIndicator.setAttribute('stroke-dasharray', `${filled} ${circumference}`);
            
            tensionIndicator.style.transform = `rotate(-90deg)`;
            tensionIndicator.style.transformOrigin = `${s.startX}px ${s.startY}px`;
            
            tensionIndicator.setAttribute('stroke', level.color1);
            tensionIndicator.setAttribute('stroke-width', s.tension > 0.95 ? '6' : s.tension > 0.8 ? '5' : '4');
        }
        
        // Direction arrow
        if (directionArrow && s.tension > 0.2) {
            directionArrow.style.opacity = Math.min(s.tension * 1.5, 1).toString();
            
            const isMobile = s.panelKey === 'mobile';
            let arrowX, arrowY, arrowPoints;
            
            if (isMobile) {
                const dir = s.direction;
                arrowX = s.startX + dir * 60;
                arrowY = s.startY;
                
                if (dir > 0) {
                    arrowPoints = `${arrowX-15},${arrowY-10} ${arrowX},${arrowY} ${arrowX-15},${arrowY+10}`;
                } else {
                    arrowPoints = `${arrowX+15},${arrowY-10} ${arrowX},${arrowY} ${arrowX+15},${arrowY+10}`;
                }
            } else {
                const dir = s.direction;
                arrowX = s.startX;
                arrowY = s.startY + dir * 60;
                
                if (dir > 0) {
                    arrowPoints = `${arrowX-10},${arrowY-15} ${arrowX},${arrowY} ${arrowX+10},${arrowY-15}`;
                } else {
                    arrowPoints = `${arrowX-10},${arrowY+15} ${arrowX},${arrowY} ${arrowX+10},${arrowY+15}`;
                }
            }
            
            directionArrow.setAttribute('points', arrowPoints);
            directionArrow.setAttribute('fill', level.color2);
        } else if (directionArrow) {
            directionArrow.style.opacity = '0';
        }
        
        // Panel glow
        const anim = this.animations[s.panelKey];
        if (anim?.panel) {
            const glowIntensity = 0.2 + s.tension * 0.6;
            
            if (s.tension > 0.95) {
                // Extreme: burnt ember with pulsing crimson glow
                const pulse = 0.5 + Math.sin(Date.now() * 0.01) * 0.3;
                anim.panel.style.boxShadow = `
                    0 0 ${50 + s.tension * 50}px rgba(255, 50, 30, ${0.4 + pulse * 0.2}),
                    0 0 ${80}px rgba(255, 30, 20, 0.25),
                    inset 0 0 ${30 + s.tension * 30}px rgba(255, 50, 30, 0.2)
                `;
            } else {
                anim.panel.style.boxShadow = `
                    0 0 ${30 + s.tension * 60}px rgba(${level.glowColor}, ${glowIntensity}),
                    inset 0 0 ${20 + s.tension * 40}px rgba(${level.glowColor}, ${glowIntensity * 0.5})
                `;
            }
        }
    },
    
    releaseSlingshot(e) {
        if (!this.slingshot.active) return;
        
        const s = this.slingshot;
        const anim = this.animations[s.panelKey];
        
        if (s.tension > 0.1 && s.direction !== 0) {
            const powerCurve = s.tension * s.tension * s.tension;
            const velocity = powerCurve * s.releaseMultiplier * s.direction;
            
            anim.velocity = velocity;
            
            // Bounce effect on panel
            if (anim?.panel && s.tension > 0.2) {
                anim.panel.classList.add('slingshot-bounce');
                setTimeout(() => anim.panel?.classList.remove('slingshot-bounce'), 400);
            }
            
            // Screen ripple effect
            if (s.tension > 0.4) {
                this.spawnRipple(s.startX, s.startY, s.tension);
            }
            
            // Effects based on power
            if (s.tension > 0.95) {
                // EXTREME release
                this.triggerScreenShake(this.physics.screenShakeIntensity * 1.5);
                this.playWhoosh(1);
                this.spawnReleaseParticles(anim.panel, s.panelKey === 'mobile', 40, true);
                this.spawnShockwave(anim.panel, s.startX, s.startY);
                this.flashReleaseEffect(anim.panel, 'extreme');
            } else if (s.tension > 0.7) {
                this.triggerScreenShake(this.physics.screenShakeIntensity * s.tension);
                this.playWhoosh(s.tension);
                this.spawnReleaseParticles(anim.panel, s.panelKey === 'mobile', 28);
                this.spawnShockwave(anim.panel, s.startX, s.startY);
                this.flashReleaseEffect(anim.panel, 'power');
            } else if (s.tension > 0.3) {
                this.playWhoosh(s.tension * 0.7);
                this.spawnReleaseParticles(anim.panel, s.panelKey === 'mobile', 18);
                this.flashReleaseEffect(anim.panel, 'normal');
            } else {
                this.spawnReleaseParticles(anim.panel, s.panelKey === 'mobile', 10);
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
        
        this.animateSnapBack();
        this.resetPanelScale(s.panelKey);
        
        if (anim?.panel) {
            this.clearAllSlingshotClasses(anim.panel);
            anim.panel.style.boxShadow = '';
            anim.panel.style.cursor = 'grab';
            anim.panel.style.background = '';
        }
        
        anim.targetSpeed = 1;
    },
    
    /**
     * Spawn screen ripple effect at release point
     */
    spawnRipple(x, y, tension) {
        const ripple = document.createElement('div');
        ripple.className = 'slingshot-ripple';
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        
        const size = 200 + tension * 200;
        ripple.style.setProperty('--size', `${size}px`);
        
        // Color based on tension
        if (tension > 0.95) {
            ripple.style.borderColor = 'rgba(255, 80, 50, 0.8)';
        } else if (tension > 0.7) {
            ripple.style.borderColor = 'rgba(255, 150, 50, 0.7)';
        } else {
            ripple.style.borderColor = 'rgba(0, 255, 204, 0.6)';
        }
        
        document.body.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    },
    
    animateSnapBack() {
        const overlay = this.slingshot.dragLine;
        if (!overlay) return;
        
        const line = overlay.querySelector('#drag-line');
        const rubberBand = overlay.querySelector('#rubber-band');
        const tensionIndicator = overlay.querySelector('#tension-indicator');
        const directionArrow = overlay.querySelector('#direction-arrow');
        
        overlay.style.transition = 'opacity 0.15s ease-out';
        overlay.style.opacity = '0';
        
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
    
    spawnReleaseParticles(panel, isMobile, count = 15, isExtreme = false) {
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
            
            // Vary particle types
            if (i < count / 5) {
                particle.classList.add('big');
            } else if (i < count / 3) {
                particle.classList.add('trail');
            }
            
            // Add ember particles for extreme tension
            if (isExtreme && i % 3 === 0) {
                particle.classList.add('ember');
            }
            
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${Math.random() * 100}%`;
            
            const baseAngle = isMobile ? 
                (this.slingshot.direction > 0 ? 0 : Math.PI) :
                (this.slingshot.direction > 0 ? Math.PI/2 : -Math.PI/2);
            
            const angle = baseAngle + (Math.random() - 0.5) * Math.PI;
            const distance = 60 + Math.random() * 150;
            const px = Math.cos(angle) * distance;
            const py = Math.sin(angle) * distance;
            
            particle.style.setProperty('--px', `${px}px`);
            particle.style.setProperty('--py', `${py}px`);
            particle.style.animationDuration = `${0.4 + Math.random() * 0.2}s`;
            
            container.appendChild(particle);
            
            setTimeout(() => particle.remove(), 600);
        }
        
        setTimeout(() => {
            if (container.children.length === 0) {
                container.remove();
            }
        }, 600);
    },
    
    flashReleaseEffect(panel, type = 'normal') {
        if (!panel) return;
        
        const flash = document.createElement('div');
        let bg, animation, duration;
        
        if (type === 'extreme') {
            bg = 'radial-gradient(circle, rgba(255, 255, 255, 0.95) 0%, rgba(255, 0, 50, 0.5) 40%, transparent 70%)';
            animation = 'extremeFlash';
            duration = '0.4s';
        } else if (type === 'power') {
            bg = 'radial-gradient(circle, rgba(255, 200, 100, 0.8) 0%, transparent 70%)';
            animation = 'powerFlash';
            duration = '0.3s';
        } else {
            bg = 'radial-gradient(circle, rgba(0, 255, 204, 0.6) 0%, transparent 70%)';
            animation = 'slingshotFlash';
            duration = '0.4s';
        }
        
        flash.style.cssText = `
            position: absolute;
            inset: 0;
            background: ${bg};
            pointer-events: none;
            z-index: 100;
            animation: ${animation} ${duration} ease-out forwards;
        `;
        panel.appendChild(flash);
        
        setTimeout(() => flash.remove(), parseFloat(duration) * 1000);
    },
    
    playHapticFeedback(type) {
        if ('vibrate' in navigator) {
            switch (type) {
                case 'start': navigator.vibrate(15); break;
                case 'tension': navigator.vibrate([25, 15, 25]); break;
                case 'max': navigator.vibrate([60, 30, 60, 30, 60]); break;
                case 'extreme': navigator.vibrate([100, 50, 100, 50, 100, 50, 100]); break;
                case 'release': navigator.vibrate(150); break;
            }
        }
    },
    
    speedUp(key) {
        if (this.animations[key] && !this.slingshot.active) {
            this.animations[key].targetSpeed = this.physics.hoverMultiplier;
        }
    },
    
    speedNormal(key) {
        if (this.animations[key] && !this.slingshot.active) {
            this.animations[key].targetSpeed = 1;
        }
    },
    
    /**
     * Activate dramatic focus effect on button hover
     * - Button scales up dramatically
     * - Background blurs and dims
     * - Everything feels slow-motion
     */
    activateButtonFocus(btn) {
        if (!btn) return;
        
        // Add focused class to button
        btn.classList.add('portal-btn-focused');
        
        // Add slow-mo class to home view for blur/dim effect
        const homeView = document.getElementById('home-view');
        if (homeView) {
            homeView.classList.add('slow-motion-active');
        }
        
        // Dim other buttons
        const allBtns = document.querySelectorAll('.portal-nav-btn, .portal-tournament-btn');
        allBtns.forEach(b => {
            if (b !== btn) b.classList.add('portal-btn-dimmed');
        });
    },
    
    /**
     * Deactivate focus effect
     */
    deactivateButtonFocus(btn) {
        if (!btn) return;
        
        btn.classList.remove('portal-btn-focused');
        
        const homeView = document.getElementById('home-view');
        if (homeView) {
            homeView.classList.remove('slow-motion-active');
        }
        
        const allBtns = document.querySelectorAll('.portal-nav-btn, .portal-tournament-btn');
        allBtns.forEach(b => b.classList.remove('portal-btn-dimmed'));
    },
    
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
};

window.HomepageController = HomepageController;
