/**
 * AUDIO MANAGER - Site-wide Sound Effects System
 * 
 * All sounds are procedurally generated using Web Audio API.
 * NO MUSIC - Only dry mechanical sounds: clicks, whooshes, impacts, etc.
 * 
 * Sound Categories:
 * - UI: clicks, hovers, toggles, selections
 * - Navigation: page transitions, swooshes
 * - Actions: button presses, confirmations, errors
 * - Combat/Game: impacts, victories, defeats
 * - Ambient: tension, release, energy
 */

'use strict';

const AudioManager = {
    // Core audio context
    ctx: null,
    masterGain: null,
    
    // Settings
    enabled: true,
    volume: 0.5,
    
    // Noise buffers for various sounds
    buffers: {
        white: null,
        pink: null,
        brown: null
    },
    
    // Cooldowns to prevent sound spam
    cooldowns: {},
    
    /**
     * Initialize the audio system
     */
    init() {
        if (this.ctx) return;
        
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            
            // Master gain control
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = this.volume;
            this.masterGain.connect(this.ctx.destination);
            
            // Generate noise buffers
            this.createNoiseBuffers();
            
            // Load saved preferences
            this.loadPreferences();
            
            console.log('[AudioManager] Initialized');
        } catch (e) {
            console.warn('[AudioManager] Failed to initialize:', e);
        }
    },
    
    /**
     * Resume audio context (required after user interaction)
     */
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },
    
    /**
     * Create noise buffers for various sound generation
     */
    createNoiseBuffers() {
        if (!this.ctx) return;
        
        const sampleRate = this.ctx.sampleRate;
        const duration = 2; // 2 seconds of noise
        const bufferSize = sampleRate * duration;
        
        // White noise
        this.buffers.white = this.ctx.createBuffer(1, bufferSize, sampleRate);
        const whiteData = this.buffers.white.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            whiteData[i] = Math.random() * 2 - 1;
        }
        
        // Pink noise (more natural)
        this.buffers.pink = this.ctx.createBuffer(1, bufferSize, sampleRate);
        const pinkData = this.buffers.pink.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            pinkData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
            b6 = white * 0.115926;
        }
        
        // Brown noise (rumble)
        this.buffers.brown = this.ctx.createBuffer(1, bufferSize, sampleRate);
        const brownData = this.buffers.brown.getChannelData(0);
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            brownData[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = brownData[i];
            brownData[i] *= 3.5;
        }
    },
    
    /**
     * Check cooldown for a sound
     */
    canPlay(soundId, cooldownMs = 50) {
        const now = Date.now();
        if (this.cooldowns[soundId] && now - this.cooldowns[soundId] < cooldownMs) {
            return false;
        }
        this.cooldowns[soundId] = now;
        return true;
    },
    
    /**
     * Set master volume (0-1)
     */
    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
        if (this.masterGain) {
            this.masterGain.gain.value = this.volume;
        }
        this.savePreferences();
    },
    
    /**
     * Toggle audio on/off
     */
    toggle() {
        this.enabled = !this.enabled;
        if (this.masterGain) {
            this.masterGain.gain.value = this.enabled ? this.volume : 0;
        }
        this.savePreferences();
        return this.enabled;
    },
    
    /**
     * Alias for toggle - toggleMute
     */
    toggleMute() {
        return this.toggle();
    },
    
    /**
     * Check if audio is enabled
     */
    isEnabled() {
        return this.enabled;
    },
    
    /**
     * Save preferences to localStorage
     */
    savePreferences() {
        try {
            localStorage.setItem('abs_audio_prefs', JSON.stringify({
                enabled: this.enabled,
                volume: this.volume
            }));
        } catch (e) {}
    },
    
    /**
     * Load preferences from localStorage
     */
    loadPreferences() {
        try {
            const prefs = JSON.parse(localStorage.getItem('abs_audio_prefs'));
            if (prefs) {
                this.enabled = prefs.enabled !== false;
                this.volume = typeof prefs.volume === 'number' ? prefs.volume : 0.5;
                if (this.masterGain) {
                    this.masterGain.gain.value = this.enabled ? this.volume : 0;
                }
            }
        } catch (e) {}
    },
    
    // ========================================
    // SOUND GENERATORS - All Dry/Mechanical
    // ========================================
    
    /**
     * UI Click - Short, dry click sound
     */
    click(intensity = 0.5) {
        if (!this.ctx || !this.enabled || !this.canPlay('click', 30)) return;
        this.resume();
        
        try {
            const now = this.ctx.currentTime;
            
            // Noise burst for click body
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.buffers.white;
            
            // Tight bandpass for click character
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 2000 + intensity * 2000;
            filter.Q.value = 5;
            
            // Sharp envelope
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.15 * intensity, now + 0.002);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
            
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            
            noise.start(now);
            noise.stop(now + 0.05);
        } catch (e) {}
    },
    
    /**
     * Soft hover sound - Very subtle
     */
    hover() {
        if (!this.ctx || !this.enabled || !this.canPlay('hover', 50)) return;
        this.resume();
        
        try {
            const now = this.ctx.currentTime;
            
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.buffers.pink;
            
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = 3000;
            
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.03, now + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
            
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            
            noise.start(now);
            noise.stop(now + 0.08);
        } catch (e) {}
    },
    
    /**
     * Button press - Satisfying thunk
     */
    buttonPress() {
        if (!this.ctx || !this.enabled || !this.canPlay('buttonPress', 80)) return;
        this.resume();
        
        try {
            const now = this.ctx.currentTime;
            
            // Low thump component
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.buffers.brown;
            
            const lowpass = this.ctx.createBiquadFilter();
            lowpass.type = 'lowpass';
            lowpass.frequency.value = 400;
            
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            
            // High click component
            const click = this.ctx.createBufferSource();
            click.buffer = this.buffers.white;
            
            const highpass = this.ctx.createBiquadFilter();
            highpass.type = 'highpass';
            highpass.frequency.value = 2500;
            
            const clickGain = this.ctx.createGain();
            clickGain.gain.setValueAtTime(0.12, now);
            clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
            
            noise.connect(lowpass);
            lowpass.connect(gain);
            gain.connect(this.masterGain);
            
            click.connect(highpass);
            highpass.connect(clickGain);
            clickGain.connect(this.masterGain);
            
            noise.start(now);
            noise.stop(now + 0.1);
            click.start(now);
            click.stop(now + 0.05);
        } catch (e) {}
    },
    
    /**
     * Toggle switch sound
     */
    toggle_sound(on = true) {
        if (!this.ctx || !this.enabled || !this.canPlay('toggle', 50)) return;
        this.resume();
        
        try {
            const now = this.ctx.currentTime;
            
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.buffers.white;
            
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = on ? 3500 : 2000;
            filter.Q.value = 8;
            
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
            
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            
            noise.start(now);
            noise.stop(now + 0.05);
        } catch (e) {}
    },
    
    /**
     * Whoosh - Air movement sound
     */
    whoosh(intensity = 0.5, direction = 1) {
        if (!this.ctx || !this.enabled || !this.canPlay('whoosh', 100)) return;
        this.resume();
        
        try {
            const now = this.ctx.currentTime;
            const duration = 0.15 + intensity * 0.2;
            
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.buffers.pink;
            noise.playbackRate.value = 0.8 + intensity * 0.4;
            
            // Bandpass sweep for whoosh character
            const bandpass = this.ctx.createBiquadFilter();
            bandpass.type = 'bandpass';
            bandpass.frequency.setValueAtTime(800 + intensity * 800, now);
            bandpass.frequency.exponentialRampToValueAtTime(200, now + duration);
            bandpass.Q.value = 1;
            
            // Highpass to remove rumble
            const highpass = this.ctx.createBiquadFilter();
            highpass.type = 'highpass';
            highpass.frequency.value = 100;
            
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.2 + intensity * 0.15, now + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
            
            noise.connect(highpass);
            highpass.connect(bandpass);
            bandpass.connect(gain);
            gain.connect(this.masterGain);
            
            noise.start(now);
            noise.stop(now + duration + 0.05);
        } catch (e) {}
    },
    
    /**
     * Swoosh - Page transition sound
     */
    swoosh(direction = 1) {
        if (!this.ctx || !this.enabled || !this.canPlay('swoosh', 150)) return;
        this.resume();
        
        try {
            const now = this.ctx.currentTime;
            
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.buffers.pink;
            noise.playbackRate.value = direction > 0 ? 1.2 : 0.9;
            
            const bandpass = this.ctx.createBiquadFilter();
            bandpass.type = 'bandpass';
            const startFreq = direction > 0 ? 400 : 1200;
            const endFreq = direction > 0 ? 1200 : 400;
            bandpass.frequency.setValueAtTime(startFreq, now);
            bandpass.frequency.exponentialRampToValueAtTime(endFreq, now + 0.2);
            bandpass.Q.value = 0.8;
            
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.18, now + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
            
            noise.connect(bandpass);
            bandpass.connect(gain);
            gain.connect(this.masterGain);
            
            noise.start(now);
            noise.stop(now + 0.25);
        } catch (e) {}
    },
    
    /**
     * Impact - Heavy hit sound
     */
    impact(intensity = 0.7) {
        if (!this.ctx || !this.enabled || !this.canPlay('impact', 100)) return;
        this.resume();
        
        try {
            const now = this.ctx.currentTime;
            
            // Deep thump
            const thump = this.ctx.createBufferSource();
            thump.buffer = this.buffers.brown;
            
            const lowpass = this.ctx.createBiquadFilter();
            lowpass.type = 'lowpass';
            lowpass.frequency.setValueAtTime(300 + intensity * 200, now);
            lowpass.frequency.exponentialRampToValueAtTime(80, now + 0.15);
            
            const thumpGain = this.ctx.createGain();
            thumpGain.gain.setValueAtTime(0.35 * intensity, now);
            thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            
            // Crack/snap
            const crack = this.ctx.createBufferSource();
            crack.buffer = this.buffers.white;
            
            const highpass = this.ctx.createBiquadFilter();
            highpass.type = 'highpass';
            highpass.frequency.value = 1500;
            
            const crackGain = this.ctx.createGain();
            crackGain.gain.setValueAtTime(0.2 * intensity, now);
            crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
            
            thump.connect(lowpass);
            lowpass.connect(thumpGain);
            thumpGain.connect(this.masterGain);
            
            crack.connect(highpass);
            highpass.connect(crackGain);
            crackGain.connect(this.masterGain);
            
            thump.start(now);
            thump.stop(now + 0.25);
            crack.start(now);
            crack.stop(now + 0.06);
        } catch (e) {}
    },
    
    /**
     * Selection confirm - Satisfying pop
     */
    select() {
        if (!this.ctx || !this.enabled || !this.canPlay('select', 60)) return;
        this.resume();
        
        try {
            const now = this.ctx.currentTime;
            
            // Pop sound using filtered noise
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.buffers.white;
            
            const bandpass = this.ctx.createBiquadFilter();
            bandpass.type = 'bandpass';
            bandpass.frequency.value = 1800;
            bandpass.Q.value = 10;
            
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
            
            noise.connect(bandpass);
            bandpass.connect(gain);
            gain.connect(this.masterGain);
            
            noise.start(now);
            noise.stop(now + 0.08);
        } catch (e) {}
    },
    
    /**
     * Deselect/back sound
     */
    deselect() {
        if (!this.ctx || !this.enabled || !this.canPlay('deselect', 60)) return;
        this.resume();
        
        try {
            const now = this.ctx.currentTime;
            
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.buffers.pink;
            
            const bandpass = this.ctx.createBiquadFilter();
            bandpass.type = 'bandpass';
            bandpass.frequency.setValueAtTime(1500, now);
            bandpass.frequency.exponentialRampToValueAtTime(800, now + 0.05);
            bandpass.Q.value = 5;
            
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
            
            noise.connect(bandpass);
            bandpass.connect(gain);
            gain.connect(this.masterGain);
            
            noise.start(now);
            noise.stop(now + 0.1);
        } catch (e) {}
    },
    
    /**
     * Error/invalid action sound
     */
    error() {
        if (!this.ctx || !this.enabled || !this.canPlay('error', 200)) return;
        this.resume();
        
        try {
            const now = this.ctx.currentTime;
            
            // Two quick harsh buzzes
            for (let i = 0; i < 2; i++) {
                const noise = this.ctx.createBufferSource();
                noise.buffer = this.buffers.white;
                
                const bandpass = this.ctx.createBiquadFilter();
                bandpass.type = 'bandpass';
                bandpass.frequency.value = 600;
                bandpass.Q.value = 15;
                
                const gain = this.ctx.createGain();
                const offset = i * 0.08;
                gain.gain.setValueAtTime(0, now + offset);
                gain.gain.linearRampToValueAtTime(0.15, now + offset + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.05);
                
                noise.connect(bandpass);
                bandpass.connect(gain);
                gain.connect(this.masterGain);
                
                noise.start(now + offset);
                noise.stop(now + offset + 0.07);
            }
        } catch (e) {}
    },
    
    /**
     * Success/victory sound - Satisfying crunch
     */
    success() {
        if (!this.ctx || !this.enabled || !this.canPlay('success', 200)) return;
        this.resume();
        
        try {
            const now = this.ctx.currentTime;
            
            // Layered impact + shimmer
            const impact = this.ctx.createBufferSource();
            impact.buffer = this.buffers.brown;
            
            const lowpass = this.ctx.createBiquadFilter();
            lowpass.type = 'lowpass';
            lowpass.frequency.value = 500;
            
            const impactGain = this.ctx.createGain();
            impactGain.gain.setValueAtTime(0.25, now);
            impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            
            // High shimmer
            const shimmer = this.ctx.createBufferSource();
            shimmer.buffer = this.buffers.pink;
            
            const highpass = this.ctx.createBiquadFilter();
            highpass.type = 'highpass';
            highpass.frequency.value = 3000;
            
            const shimmerGain = this.ctx.createGain();
            shimmerGain.gain.setValueAtTime(0, now);
            shimmerGain.gain.linearRampToValueAtTime(0.12, now + 0.02);
            shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            
            impact.connect(lowpass);
            lowpass.connect(impactGain);
            impactGain.connect(this.masterGain);
            
            shimmer.connect(highpass);
            highpass.connect(shimmerGain);
            shimmerGain.connect(this.masterGain);
            
            impact.start(now);
            impact.stop(now + 0.2);
            shimmer.start(now);
            shimmer.stop(now + 0.3);
        } catch (e) {}
    },
    
    /**
     * Tension build - Rumble that increases (for slingshot)
     */
    tensionRumble(tension) {
        if (!this.ctx || !this.enabled || !this.canPlay('tension', 100)) return;
        this.resume();
        
        try {
            const now = this.ctx.currentTime;
            
            // Creak/strain sound - NO OSCILLATORS, pure noise
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.buffers.brown;
            noise.playbackRate.value = 0.5 + tension * 1.5;
            
            const bandpass = this.ctx.createBiquadFilter();
            bandpass.type = 'bandpass';
            bandpass.frequency.value = 150 + tension * 250;
            bandpass.Q.value = 3;
            
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.08 + tension * 0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            
            noise.connect(bandpass);
            bandpass.connect(gain);
            gain.connect(this.masterGain);
            
            noise.start(now);
            noise.stop(now + 0.15);
        } catch (e) {}
    },
    
    /**
     * Release burst - For slingshot release
     */
    releaseBurst(intensity = 1) {
        if (!this.ctx || !this.enabled || !this.canPlay('release', 50)) return;
        this.resume();
        
        try {
            const now = this.ctx.currentTime;
            const duration = 0.2 + intensity * 0.15;
            
            // Snap component
            const snap = this.ctx.createBufferSource();
            snap.buffer = this.buffers.white;
            
            const snapFilter = this.ctx.createBiquadFilter();
            snapFilter.type = 'highpass';
            snapFilter.frequency.value = 2000;
            
            const snapGain = this.ctx.createGain();
            snapGain.gain.setValueAtTime(0.25 * intensity, now);
            snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
            
            // Whoosh component
            const whoosh = this.ctx.createBufferSource();
            whoosh.buffer = this.buffers.pink;
            whoosh.playbackRate.value = 1.3;
            
            const whooshFilter = this.ctx.createBiquadFilter();
            whooshFilter.type = 'bandpass';
            whooshFilter.frequency.setValueAtTime(1000 + intensity * 500, now);
            whooshFilter.frequency.exponentialRampToValueAtTime(200, now + duration);
            whooshFilter.Q.value = 1;
            
            const whooshGain = this.ctx.createGain();
            whooshGain.gain.setValueAtTime(0, now);
            whooshGain.gain.linearRampToValueAtTime(0.25 * intensity, now + 0.015);
            whooshGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
            
            // Thump component
            const thump = this.ctx.createBufferSource();
            thump.buffer = this.buffers.brown;
            
            const thumpFilter = this.ctx.createBiquadFilter();
            thumpFilter.type = 'lowpass';
            thumpFilter.frequency.value = 250;
            
            const thumpGain = this.ctx.createGain();
            thumpGain.gain.setValueAtTime(0.3 * intensity, now);
            thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            
            snap.connect(snapFilter);
            snapFilter.connect(snapGain);
            snapGain.connect(this.masterGain);
            
            whoosh.connect(whooshFilter);
            whooshFilter.connect(whooshGain);
            whooshGain.connect(this.masterGain);
            
            thump.connect(thumpFilter);
            thumpFilter.connect(thumpGain);
            thumpGain.connect(this.masterGain);
            
            snap.start(now);
            snap.stop(now + 0.05);
            whoosh.start(now);
            whoosh.stop(now + duration + 0.05);
            thump.start(now);
            thump.stop(now + 0.15);
        } catch (e) {}
    },
    
    /**
     * Card flip/reveal sound
     */
    cardFlip() {
        if (!this.ctx || !this.enabled || !this.canPlay('cardFlip', 80)) return;
        this.resume();
        
        try {
            const now = this.ctx.currentTime;
            
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.buffers.pink;
            
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(2000, now);
            filter.frequency.exponentialRampToValueAtTime(4000, now + 0.03);
            filter.Q.value = 3;
            
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
            
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            
            noise.start(now);
            noise.stop(now + 0.08);
        } catch (e) {}
    },
    
    /**
     * Score tick - For counting up
     */
    tick() {
        if (!this.ctx || !this.enabled || !this.canPlay('tick', 25)) return;
        this.resume();
        
        try {
            const now = this.ctx.currentTime;
            
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.buffers.white;
            
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = 4000;
            
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
            
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            
            noise.start(now);
            noise.stop(now + 0.025);
        } catch (e) {}
    },
    
    /**
     * Heavy slam - For dramatic moments
     */
    slam() {
        if (!this.ctx || !this.enabled || !this.canPlay('slam', 200)) return;
        this.resume();
        
        try {
            const now = this.ctx.currentTime;
            
            // Deep impact
            const impact = this.ctx.createBufferSource();
            impact.buffer = this.buffers.brown;
            
            const lowpass = this.ctx.createBiquadFilter();
            lowpass.type = 'lowpass';
            lowpass.frequency.setValueAtTime(400, now);
            lowpass.frequency.exponentialRampToValueAtTime(60, now + 0.3);
            
            const impactGain = this.ctx.createGain();
            impactGain.gain.setValueAtTime(0.45, now);
            impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            
            // Sharp attack
            const attack = this.ctx.createBufferSource();
            attack.buffer = this.buffers.white;
            
            const highpass = this.ctx.createBiquadFilter();
            highpass.type = 'bandpass';
            highpass.frequency.value = 1200;
            highpass.Q.value = 2;
            
            const attackGain = this.ctx.createGain();
            attackGain.gain.setValueAtTime(0.3, now);
            attackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            
            impact.connect(lowpass);
            lowpass.connect(impactGain);
            impactGain.connect(this.masterGain);
            
            attack.connect(highpass);
            highpass.connect(attackGain);
            attackGain.connect(this.masterGain);
            
            impact.start(now);
            impact.stop(now + 0.4);
            attack.start(now);
            attack.stop(now + 0.08);
        } catch (e) {}
    },
    
    /**
     * Victory fanfare - Layered impacts (no music!)
     */
    victory() {
        if (!this.ctx || !this.enabled || !this.canPlay('victory', 500)) return;
        this.resume();
        
        try {
            const now = this.ctx.currentTime;
            
            // Series of satisfying impacts
            const times = [0, 0.12, 0.24];
            times.forEach((offset, i) => {
                const intensity = 0.6 + (i * 0.15);
                
                const impact = this.ctx.createBufferSource();
                impact.buffer = this.buffers.brown;
                
                const filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = 200 + i * 100;
                
                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.25 * intensity, now + offset);
                gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.15);
                
                impact.connect(filter);
                filter.connect(gain);
                gain.connect(this.masterGain);
                
                impact.start(now + offset);
                impact.stop(now + offset + 0.2);
                
                // High accent
                const accent = this.ctx.createBufferSource();
                accent.buffer = this.buffers.pink;
                
                const highFilter = this.ctx.createBiquadFilter();
                highFilter.type = 'highpass';
                highFilter.frequency.value = 2500;
                
                const accentGain = this.ctx.createGain();
                accentGain.gain.setValueAtTime(0.1 * intensity, now + offset);
                accentGain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.08);
                
                accent.connect(highFilter);
                highFilter.connect(accentGain);
                accentGain.connect(this.masterGain);
                
                accent.start(now + offset);
                accent.stop(now + offset + 0.1);
            });
        } catch (e) {}
    },
    
    /**
     * Defeat sound - Heavy dull thud
     */
    defeat() {
        if (!this.ctx || !this.enabled || !this.canPlay('defeat', 500)) return;
        this.resume();
        
        try {
            const now = this.ctx.currentTime;
            
            const thud = this.ctx.createBufferSource();
            thud.buffer = this.buffers.brown;
            
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(200, now);
            filter.frequency.exponentialRampToValueAtTime(50, now + 0.4);
            
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            
            thud.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            
            thud.start(now);
            thud.stop(now + 0.6);
        } catch (e) {}
    },
    
    /**
     * Countdown tick - For tournament
     */
    countdownTick() {
        if (!this.ctx || !this.enabled || !this.canPlay('countdown', 150)) return;
        this.resume();
        
        try {
            const now = this.ctx.currentTime;
            
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.buffers.white;
            
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 1500;
            filter.Q.value = 15;
            
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            
            noise.start(now);
            noise.stop(now + 0.1);
        } catch (e) {}
    },
    
    /**
     * Scroll/swipe sound
     */
    scroll() {
        if (!this.ctx || !this.enabled || !this.canPlay('scroll', 80)) return;
        this.resume();
        
        try {
            const now = this.ctx.currentTime;
            
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.buffers.pink;
            noise.playbackRate.value = 1.5;
            
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = 2000;
            
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.04, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            
            noise.start(now);
            noise.stop(now + 0.07);
        } catch (e) {}
    },
    
    /**
     * Modal open
     */
    modalOpen() {
        if (!this.ctx || !this.enabled || !this.canPlay('modalOpen', 150)) return;
        this.resume();
        
        try {
            const now = this.ctx.currentTime;
            
            // Soft woosh up
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.buffers.pink;
            
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(300, now);
            filter.frequency.exponentialRampToValueAtTime(1200, now + 0.12);
            filter.Q.value = 1;
            
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.15, now + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            
            noise.start(now);
            noise.stop(now + 0.18);
        } catch (e) {}
    },
    
    /**
     * Modal close
     */
    modalClose() {
        if (!this.ctx || !this.enabled || !this.canPlay('modalClose', 150)) return;
        this.resume();
        
        try {
            const now = this.ctx.currentTime;
            
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.buffers.pink;
            
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1000, now);
            filter.frequency.exponentialRampToValueAtTime(300, now + 0.1);
            filter.Q.value = 1;
            
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            
            noise.start(now);
            noise.stop(now + 0.15);
        } catch (e) {}
    },
    
    /**
     * Notification/alert pop
     */
    notification() {
        if (!this.ctx || !this.enabled || !this.canPlay('notification', 300)) return;
        this.resume();
        
        try {
            const now = this.ctx.currentTime;
            
            // Two quick pops
            for (let i = 0; i < 2; i++) {
                const noise = this.ctx.createBufferSource();
                noise.buffer = this.buffers.white;
                
                const filter = this.ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.value = 2500 + i * 500;
                filter.Q.value = 12;
                
                const gain = this.ctx.createGain();
                const offset = i * 0.06;
                gain.gain.setValueAtTime(0.12, now + offset);
                gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.04);
                
                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.masterGain);
                
                noise.start(now + offset);
                noise.stop(now + offset + 0.06);
            }
        } catch (e) {}
    },
    
    /**
     * Charging/powering up (for compare/battle)
     */
    charge(progress) {
        if (!this.ctx || !this.enabled || !this.canPlay('charge', 60)) return;
        this.resume();
        
        try {
            const now = this.ctx.currentTime;
            
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.buffers.pink;
            noise.playbackRate.value = 0.8 + progress * 0.8;
            
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 400 + progress * 600;
            filter.Q.value = 2;
            
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.06 + progress * 0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            
            noise.start(now);
            noise.stop(now + 0.1);
        } catch (e) {}
    },
    
    /**
     * Rumble - Continuous low frequency
     */
    rumble(duration = 0.3, intensity = 0.5) {
        if (!this.ctx || !this.enabled || !this.canPlay('rumble', 100)) return;
        this.resume();
        
        try {
            const now = this.ctx.currentTime;
            
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.buffers.brown;
            
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 150;
            
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.2 * intensity, now);
            gain.gain.setValueAtTime(0.2 * intensity, now + duration * 0.7);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
            
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            
            noise.start(now);
            noise.stop(now + duration + 0.05);
        } catch (e) {}
    }
};

// Export for use in other modules
window.AudioManager = AudioManager;
