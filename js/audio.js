/**
 * AUDIO MANAGER - Site-wide Sound Effects System
 * 
 * All sounds are procedurally generated using Web Audio API.
 * NO MUSIC - Only dry mechanical sounds: clicks, whooshes, impacts, etc.
 * NO OSCILLATORS - All sounds use filtered noise for non-musical character.
 * NO RHYTHMIC PATTERNS - Single sounds, no repeating beats.
 * 
 * Sound Categories:
 * - UI: clicks, hovers, toggles, pops
 * - Navigation: different swooshes for different contexts
 * - Actions: squishes, thumps, crunches
 * - Combat/Game: impacts, explosions, slams
 * - Transitions: slides, reveals
 */

'use strict';

const AudioManager = {
    ctx: null,
    masterGain: null,
    enabled: true,
    volume: 0.5,
    buffers: { white: null, pink: null, brown: null, crackle: null },
    cooldowns: {},
    
    init() {
        if (this.ctx) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = this.volume;
            this.masterGain.connect(this.ctx.destination);
            this.createNoiseBuffers();
            this.loadPreferences();
            console.log('[AudioManager] Initialized');
        } catch (e) {
            console.warn('[AudioManager] Failed to initialize:', e);
        }
    },
    
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },
    
    createNoiseBuffers() {
        if (!this.ctx) return;
        const sr = this.ctx.sampleRate, dur = 2, size = sr * dur;
        
        // White noise
        this.buffers.white = this.ctx.createBuffer(1, size, sr);
        const wd = this.buffers.white.getChannelData(0);
        for (let i = 0; i < size; i++) wd[i] = Math.random() * 2 - 1;
        
        // Pink noise
        this.buffers.pink = this.ctx.createBuffer(1, size, sr);
        const pd = this.buffers.pink.getChannelData(0);
        let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
        for (let i = 0; i < size; i++) {
            const w = Math.random() * 2 - 1;
            b0 = 0.99886*b0 + w*0.0555179;
            b1 = 0.99332*b1 + w*0.0750759;
            b2 = 0.96900*b2 + w*0.1538520;
            b3 = 0.86650*b3 + w*0.3104856;
            b4 = 0.55000*b4 + w*0.5329522;
            b5 = -0.7616*b5 - w*0.0168980;
            pd[i] = (b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11;
            b6 = w*0.115926;
        }
        
        // Brown noise
        this.buffers.brown = this.ctx.createBuffer(1, size, sr);
        const bd = this.buffers.brown.getChannelData(0);
        let lo = 0;
        for (let i = 0; i < size; i++) {
            const w = Math.random() * 2 - 1;
            bd[i] = (lo + 0.02*w) / 1.02;
            lo = bd[i];
            bd[i] *= 3.5;
        }
        
        // Crackle noise
        this.buffers.crackle = this.ctx.createBuffer(1, size, sr);
        const cd = this.buffers.crackle.getChannelData(0);
        for (let i = 0; i < size; i++) {
            cd[i] = Math.random() < 0.15 ? (Math.random()*2-1)*Math.random() : 0;
        }
    },
    
    canPlay(id, cd = 50) {
        const now = Date.now();
        if (this.cooldowns[id] && now - this.cooldowns[id] < cd) return false;
        this.cooldowns[id] = now;
        return true;
    },
    
    setVolume(v) {
        this.volume = Math.max(0, Math.min(1, v));
        if (this.masterGain) this.masterGain.gain.value = this.volume;
        this.savePreferences();
    },
    
    toggle() {
        this.enabled = !this.enabled;
        if (this.masterGain) this.masterGain.gain.value = this.enabled ? this.volume : 0;
        this.savePreferences();
        return this.enabled;
    },
    
    toggleMute() { return this.toggle(); },
    isEnabled() { return this.enabled; },
    
    savePreferences() {
        try { localStorage.setItem('abs_audio_prefs', JSON.stringify({enabled:this.enabled,volume:this.volume})); } catch(e){}
    },
    
    loadPreferences() {
        try {
            const p = JSON.parse(localStorage.getItem('abs_audio_prefs'));
            if (p) {
                this.enabled = p.enabled !== false;
                this.volume = typeof p.volume === 'number' ? p.volume : 0.5;
                if (this.masterGain) this.masterGain.gain.value = this.enabled ? this.volume : 0;
            }
        } catch(e){}
    },
    
    // ========== UI SOUNDS ==========
    
    click(intensity = 0.5) {
        if (!this.ctx || !this.enabled || !this.canPlay('click', 30)) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            const n = this.ctx.createBufferSource();
            n.buffer = this.buffers.white;
            const f = this.ctx.createBiquadFilter();
            f.type = 'bandpass'; f.frequency.value = 2000 + intensity*2000; f.Q.value = 5;
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(0.15*intensity, now+0.002);
            g.gain.exponentialRampToValueAtTime(0.001, now+0.04);
            n.connect(f); f.connect(g); g.connect(this.masterGain);
            n.start(now); n.stop(now+0.05);
        } catch(e){}
    },
    
    hover() {
        if (!this.ctx || !this.enabled || !this.canPlay('hover', 50)) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            const n = this.ctx.createBufferSource();
            n.buffer = this.buffers.pink;
            const f = this.ctx.createBiquadFilter();
            f.type = 'highpass'; f.frequency.value = 3000;
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(0.025, now+0.01);
            g.gain.exponentialRampToValueAtTime(0.001, now+0.05);
            n.connect(f); f.connect(g); g.connect(this.masterGain);
            n.start(now); n.stop(now+0.07);
        } catch(e){}
    },
    
    toggle_sound(on = true) {
        if (!this.ctx || !this.enabled || !this.canPlay('toggle', 50)) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            const n = this.ctx.createBufferSource();
            n.buffer = this.buffers.white;
            const f = this.ctx.createBiquadFilter();
            f.type = 'bandpass'; f.frequency.value = on ? 3500 : 2000; f.Q.value = 8;
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.1, now);
            g.gain.exponentialRampToValueAtTime(0.001, now+0.035);
            n.connect(f); f.connect(g); g.connect(this.masterGain);
            n.start(now); n.stop(now+0.05);
        } catch(e){}
    },
    
    select() {
        if (!this.ctx || !this.enabled || !this.canPlay('select', 60)) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            const n = this.ctx.createBufferSource();
            n.buffer = this.buffers.white;
            const f = this.ctx.createBiquadFilter();
            f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 10;
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.15, now);
            g.gain.exponentialRampToValueAtTime(0.001, now+0.05);
            n.connect(f); f.connect(g); g.connect(this.masterGain);
            n.start(now); n.stop(now+0.07);
        } catch(e){}
    },
    
    // Fighter selection - meatier
    fighterSelect() {
        if (!this.ctx || !this.enabled || !this.canPlay('fighterSelect', 100)) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            // Thump
            const t = this.ctx.createBufferSource();
            t.buffer = this.buffers.brown;
            const tf = this.ctx.createBiquadFilter();
            tf.type = 'lowpass'; tf.frequency.value = 300;
            const tg = this.ctx.createGain();
            tg.gain.setValueAtTime(0.2, now);
            tg.gain.exponentialRampToValueAtTime(0.001, now+0.1);
            // Snap
            const s = this.ctx.createBufferSource();
            s.buffer = this.buffers.white;
            const sf = this.ctx.createBiquadFilter();
            sf.type = 'highpass'; sf.frequency.value = 2500;
            const sg = this.ctx.createGain();
            sg.gain.setValueAtTime(0.15, now);
            sg.gain.exponentialRampToValueAtTime(0.001, now+0.03);
            t.connect(tf); tf.connect(tg); tg.connect(this.masterGain);
            s.connect(sf); sf.connect(sg); sg.connect(this.masterGain);
            t.start(now); t.stop(now+0.12);
            s.start(now); s.stop(now+0.05);
        } catch(e){}
    },
    
    // ========== SQUISH SOUNDS ==========
    
    squish(intensity = 0.6) {
        if (!this.ctx || !this.enabled || !this.canPlay('squish', 80)) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            // Low squelch
            const l = this.ctx.createBufferSource();
            l.buffer = this.buffers.brown;
            l.playbackRate.value = 0.7 + Math.random()*0.3;
            const lf = this.ctx.createBiquadFilter();
            lf.type = 'lowpass';
            lf.frequency.setValueAtTime(400, now);
            lf.frequency.exponentialRampToValueAtTime(150, now+0.08);
            const lg = this.ctx.createGain();
            lg.gain.setValueAtTime(0.25*intensity, now);
            lg.gain.exponentialRampToValueAtTime(0.001, now+0.1);
            // Mid body
            const m = this.ctx.createBufferSource();
            m.buffer = this.buffers.pink;
            m.playbackRate.value = 0.6;
            const mf = this.ctx.createBiquadFilter();
            mf.type = 'bandpass';
            mf.frequency.setValueAtTime(600, now);
            mf.frequency.exponentialRampToValueAtTime(200, now+0.06);
            mf.Q.value = 2;
            const mg = this.ctx.createGain();
            mg.gain.setValueAtTime(0.2*intensity, now);
            mg.gain.exponentialRampToValueAtTime(0.001, now+0.08);
            l.connect(lf); lf.connect(lg); lg.connect(this.masterGain);
            m.connect(mf); mf.connect(mg); mg.connect(this.masterGain);
            l.start(now); l.stop(now+0.12);
            m.start(now); m.stop(now+0.1);
        } catch(e){}
    },
    
    splat() {
        if (!this.ctx || !this.enabled || !this.canPlay('splat', 100)) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            const t = this.ctx.createBufferSource();
            t.buffer = this.buffers.brown;
            const tf = this.ctx.createBiquadFilter();
            tf.type = 'lowpass'; tf.frequency.value = 250;
            const tg = this.ctx.createGain();
            tg.gain.setValueAtTime(0.3, now);
            tg.gain.exponentialRampToValueAtTime(0.001, now+0.12);
            const s = this.ctx.createBufferSource();
            s.buffer = this.buffers.pink;
            s.playbackRate.value = 0.8;
            const sf = this.ctx.createBiquadFilter();
            sf.type = 'bandpass';
            sf.frequency.setValueAtTime(800, now);
            sf.frequency.exponentialRampToValueAtTime(300, now+0.1);
            sf.Q.value = 1;
            const sg = this.ctx.createGain();
            sg.gain.setValueAtTime(0.18, now+0.01);
            sg.gain.exponentialRampToValueAtTime(0.001, now+0.15);
            t.connect(tf); tf.connect(tg); tg.connect(this.masterGain);
            s.connect(sf); sf.connect(sg); sg.connect(this.masterGain);
            t.start(now); t.stop(now+0.15);
            s.start(now); s.stop(now+0.18);
        } catch(e){}
    },
    
    // ========== TRANSITION SOUNDS (all different) ==========
    
    slideTransition(dir = 1) {
        if (!this.ctx || !this.enabled || !this.canPlay('slide', 150)) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            const n = this.ctx.createBufferSource();
            n.buffer = this.buffers.pink;
            n.playbackRate.value = dir > 0 ? 1.1 : 0.9;
            const f = this.ctx.createBiquadFilter();
            f.type = 'bandpass';
            f.frequency.setValueAtTime(dir > 0 ? 350 : 900, now);
            f.frequency.exponentialRampToValueAtTime(dir > 0 ? 900 : 350, now+0.18);
            f.Q.value = 0.7;
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(0.12, now+0.02);
            g.gain.exponentialRampToValueAtTime(0.001, now+0.2);
            n.connect(f); f.connect(g); g.connect(this.masterGain);
            n.start(now); n.stop(now+0.22);
        } catch(e){}
    },
    
    swipe() {
        if (!this.ctx || !this.enabled || !this.canPlay('swipe', 100)) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            const n = this.ctx.createBufferSource();
            n.buffer = this.buffers.white;
            n.playbackRate.value = 1.4;
            const f = this.ctx.createBiquadFilter();
            f.type = 'highpass';
            f.frequency.setValueAtTime(1500, now);
            f.frequency.exponentialRampToValueAtTime(4000, now+0.06);
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.08, now);
            g.gain.exponentialRampToValueAtTime(0.001, now+0.08);
            n.connect(f); f.connect(g); g.connect(this.masterGain);
            n.start(now); n.stop(now+0.1);
        } catch(e){}
    },
    
    rush() {
        if (!this.ctx || !this.enabled || !this.canPlay('rush', 200)) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            const n = this.ctx.createBufferSource();
            n.buffer = this.buffers.pink;
            n.playbackRate.value = 0.9;
            const f = this.ctx.createBiquadFilter();
            f.type = 'bandpass';
            f.frequency.setValueAtTime(200, now);
            f.frequency.exponentialRampToValueAtTime(1500, now+0.25);
            f.Q.value = 0.5;
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(0.2, now+0.08);
            g.gain.exponentialRampToValueAtTime(0.001, now+0.3);
            n.connect(f); f.connect(g); g.connect(this.masterGain);
            n.start(now); n.stop(now+0.35);
        } catch(e){}
    },
    
    // ========== IMPACT / COMBAT SOUNDS ==========
    
    punch() {
        if (!this.ctx || !this.enabled || !this.canPlay('punch', 100)) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            const t = this.ctx.createBufferSource();
            t.buffer = this.buffers.brown;
            const tf = this.ctx.createBiquadFilter();
            tf.type = 'lowpass';
            tf.frequency.setValueAtTime(350, now);
            tf.frequency.exponentialRampToValueAtTime(100, now+0.1);
            const tg = this.ctx.createGain();
            tg.gain.setValueAtTime(0.35, now);
            tg.gain.exponentialRampToValueAtTime(0.001, now+0.12);
            const s = this.ctx.createBufferSource();
            s.buffer = this.buffers.white;
            const sf = this.ctx.createBiquadFilter();
            sf.type = 'highpass'; sf.frequency.value = 1800;
            const sg = this.ctx.createGain();
            sg.gain.setValueAtTime(0.2, now);
            sg.gain.exponentialRampToValueAtTime(0.001, now+0.025);
            t.connect(tf); tf.connect(tg); tg.connect(this.masterGain);
            s.connect(sf); sf.connect(sg); sg.connect(this.masterGain);
            t.start(now); t.stop(now+0.15);
            s.start(now); s.stop(now+0.04);
        } catch(e){}
    },
    
    slam() {
        if (!this.ctx || !this.enabled || !this.canPlay('slam', 200)) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            const b = this.ctx.createBufferSource();
            b.buffer = this.buffers.brown;
            const bf = this.ctx.createBiquadFilter();
            bf.type = 'lowpass';
            bf.frequency.setValueAtTime(300, now);
            bf.frequency.exponentialRampToValueAtTime(50, now+0.3);
            const bg = this.ctx.createGain();
            bg.gain.setValueAtTime(0.5, now);
            bg.gain.exponentialRampToValueAtTime(0.001, now+0.35);
            const c = this.ctx.createBufferSource();
            c.buffer = this.buffers.white;
            const cf = this.ctx.createBiquadFilter();
            cf.type = 'bandpass'; cf.frequency.value = 1500; cf.Q.value = 2;
            const cg = this.ctx.createGain();
            cg.gain.setValueAtTime(0.3, now);
            cg.gain.exponentialRampToValueAtTime(0.001, now+0.04);
            b.connect(bf); bf.connect(bg); bg.connect(this.masterGain);
            c.connect(cf); cf.connect(cg); cg.connect(this.masterGain);
            b.start(now); b.stop(now+0.4);
            c.start(now); c.stop(now+0.06);
        } catch(e){}
    },
    
    explosion() {
        if (!this.ctx || !this.enabled || !this.canPlay('explosion', 300)) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            // Blast
            const bl = this.ctx.createBufferSource();
            bl.buffer = this.buffers.brown;
            const blf = this.ctx.createBiquadFilter();
            blf.type = 'lowpass';
            blf.frequency.setValueAtTime(500, now);
            blf.frequency.exponentialRampToValueAtTime(40, now+0.4);
            const blg = this.ctx.createGain();
            blg.gain.setValueAtTime(0.55, now);
            blg.gain.exponentialRampToValueAtTime(0.001, now+0.45);
            // Debris
            const d = this.ctx.createBufferSource();
            d.buffer = this.buffers.crackle;
            d.playbackRate.value = 0.8;
            const df = this.ctx.createBiquadFilter();
            df.type = 'highpass'; df.frequency.value = 800;
            const dg = this.ctx.createGain();
            dg.gain.setValueAtTime(0, now);
            dg.gain.linearRampToValueAtTime(0.25, now+0.02);
            dg.gain.exponentialRampToValueAtTime(0.001, now+0.35);
            // Burst
            const bu = this.ctx.createBufferSource();
            bu.buffer = this.buffers.white;
            const buf = this.ctx.createBiquadFilter();
            buf.type = 'bandpass'; buf.frequency.value = 2000; buf.Q.value = 1;
            const bug = this.ctx.createGain();
            bug.gain.setValueAtTime(0.25, now);
            bug.gain.exponentialRampToValueAtTime(0.001, now+0.08);
            bl.connect(blf); blf.connect(blg); blg.connect(this.masterGain);
            d.connect(df); df.connect(dg); dg.connect(this.masterGain);
            bu.connect(buf); buf.connect(bug); bug.connect(this.masterGain);
            bl.start(now); bl.stop(now+0.5);
            d.start(now); d.stop(now+0.4);
            bu.start(now); bu.stop(now+0.1);
        } catch(e){}
    },
    
    impact(intensity = 0.7) {
        if (!this.ctx || !this.enabled || !this.canPlay('impact', 100)) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            const t = this.ctx.createBufferSource();
            t.buffer = this.buffers.brown;
            const tf = this.ctx.createBiquadFilter();
            tf.type = 'lowpass';
            tf.frequency.setValueAtTime(300+intensity*200, now);
            tf.frequency.exponentialRampToValueAtTime(80, now+0.15);
            const tg = this.ctx.createGain();
            tg.gain.setValueAtTime(0.35*intensity, now);
            tg.gain.exponentialRampToValueAtTime(0.001, now+0.18);
            const c = this.ctx.createBufferSource();
            c.buffer = this.buffers.white;
            const cf = this.ctx.createBiquadFilter();
            cf.type = 'highpass'; cf.frequency.value = 1500;
            const cg = this.ctx.createGain();
            cg.gain.setValueAtTime(0.18*intensity, now);
            cg.gain.exponentialRampToValueAtTime(0.001, now+0.035);
            t.connect(tf); tf.connect(tg); tg.connect(this.masterGain);
            c.connect(cf); cf.connect(cg); cg.connect(this.masterGain);
            t.start(now); t.stop(now+0.22);
            c.start(now); c.stop(now+0.05);
        } catch(e){}
    },
    
    // ========== MATCHUP SOUNDS ==========
    
    matchupIntro() {
        if (!this.ctx || !this.enabled || !this.canPlay('matchupIntro', 200)) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            // Rumble build
            const r = this.ctx.createBufferSource();
            r.buffer = this.buffers.brown;
            r.playbackRate.value = 0.6;
            const rf = this.ctx.createBiquadFilter();
            rf.type = 'lowpass';
            rf.frequency.setValueAtTime(80, now);
            rf.frequency.linearRampToValueAtTime(200, now+0.3);
            const rg = this.ctx.createGain();
            rg.gain.setValueAtTime(0, now);
            rg.gain.linearRampToValueAtTime(0.25, now+0.15);
            rg.gain.exponentialRampToValueAtTime(0.001, now+0.4);
            // Air
            const a = this.ctx.createBufferSource();
            a.buffer = this.buffers.pink;
            const af = this.ctx.createBiquadFilter();
            af.type = 'bandpass';
            af.frequency.setValueAtTime(200, now);
            af.frequency.exponentialRampToValueAtTime(800, now+0.35);
            af.Q.value = 0.5;
            const ag = this.ctx.createGain();
            ag.gain.setValueAtTime(0, now);
            ag.gain.linearRampToValueAtTime(0.15, now+0.1);
            ag.gain.exponentialRampToValueAtTime(0.001, now+0.4);
            r.connect(rf); rf.connect(rg); rg.connect(this.masterGain);
            a.connect(af); af.connect(ag); ag.connect(this.masterGain);
            r.start(now); r.stop(now+0.45);
            a.start(now); a.stop(now+0.45);
        } catch(e){}
    },
    
    vsClash() {
        if (!this.ctx || !this.enabled || !this.canPlay('vsClash', 200)) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            // Impact
            const i = this.ctx.createBufferSource();
            i.buffer = this.buffers.brown;
            const iif = this.ctx.createBiquadFilter();
            iif.type = 'lowpass';
            iif.frequency.setValueAtTime(400, now);
            iif.frequency.exponentialRampToValueAtTime(60, now+0.25);
            const ig = this.ctx.createGain();
            ig.gain.setValueAtTime(0.5, now);
            ig.gain.exponentialRampToValueAtTime(0.001, now+0.3);
            // Clang
            const c = this.ctx.createBufferSource();
            c.buffer = this.buffers.white;
            const cf = this.ctx.createBiquadFilter();
            cf.type = 'bandpass'; cf.frequency.value = 2200; cf.Q.value = 15;
            const cg = this.ctx.createGain();
            cg.gain.setValueAtTime(0.2, now);
            cg.gain.exponentialRampToValueAtTime(0.001, now+0.15);
            // Debris
            const d = this.ctx.createBufferSource();
            d.buffer = this.buffers.crackle;
            const df = this.ctx.createBiquadFilter();
            df.type = 'highpass'; df.frequency.value = 1500;
            const dg = this.ctx.createGain();
            dg.gain.setValueAtTime(0.15, now+0.02);
            dg.gain.exponentialRampToValueAtTime(0.001, now+0.2);
            i.connect(iif); iif.connect(ig); ig.connect(this.masterGain);
            c.connect(cf); cf.connect(cg); cg.connect(this.masterGain);
            d.connect(df); df.connect(dg); dg.connect(this.masterGain);
            i.start(now); i.stop(now+0.35);
            c.start(now); c.stop(now+0.18);
            d.start(now); d.stop(now+0.25);
        } catch(e){}
    },
    
    victoryCrunch() {
        if (!this.ctx || !this.enabled || !this.canPlay('victoryCrunch', 500)) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            // Impact
            const i = this.ctx.createBufferSource();
            i.buffer = this.buffers.brown;
            const iif = this.ctx.createBiquadFilter();
            iif.type = 'lowpass';
            iif.frequency.setValueAtTime(350, now);
            iif.frequency.exponentialRampToValueAtTime(50, now+0.35);
            const ig = this.ctx.createGain();
            ig.gain.setValueAtTime(0.45, now);
            ig.gain.exponentialRampToValueAtTime(0.001, now+0.4);
            // Crunch
            const c = this.ctx.createBufferSource();
            c.buffer = this.buffers.crackle;
            c.playbackRate.value = 1.2;
            const cf = this.ctx.createBiquadFilter();
            cf.type = 'bandpass'; cf.frequency.value = 1800; cf.Q.value = 1;
            const cg = this.ctx.createGain();
            cg.gain.setValueAtTime(0.2, now);
            cg.gain.exponentialRampToValueAtTime(0.001, now+0.2);
            // Shimmer
            const s = this.ctx.createBufferSource();
            s.buffer = this.buffers.pink;
            const sf = this.ctx.createBiquadFilter();
            sf.type = 'highpass'; sf.frequency.value = 4000;
            const sg = this.ctx.createGain();
            sg.gain.setValueAtTime(0, now+0.05);
            sg.gain.linearRampToValueAtTime(0.1, now+0.1);
            sg.gain.exponentialRampToValueAtTime(0.001, now+0.35);
            i.connect(iif); iif.connect(ig); ig.connect(this.masterGain);
            c.connect(cf); cf.connect(cg); cg.connect(this.masterGain);
            s.connect(sf); sf.connect(sg); sg.connect(this.masterGain);
            i.start(now); i.stop(now+0.45);
            c.start(now); c.stop(now+0.25);
            s.start(now); s.stop(now+0.4);
        } catch(e){}
    },
    
    // ========== UTILITY SOUNDS ==========
    
    error() {
        if (!this.ctx || !this.enabled || !this.canPlay('error', 200)) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            const n = this.ctx.createBufferSource();
            n.buffer = this.buffers.white;
            const f = this.ctx.createBiquadFilter();
            f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 12;
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.15, now);
            g.gain.exponentialRampToValueAtTime(0.001, now+0.12);
            n.connect(f); f.connect(g); g.connect(this.masterGain);
            n.start(now); n.stop(now+0.15);
        } catch(e){}
    },
    
    success() {
        if (!this.ctx || !this.enabled || !this.canPlay('success', 200)) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            const t = this.ctx.createBufferSource();
            t.buffer = this.buffers.brown;
            const tf = this.ctx.createBiquadFilter();
            tf.type = 'lowpass'; tf.frequency.value = 400;
            const tg = this.ctx.createGain();
            tg.gain.setValueAtTime(0.2, now);
            tg.gain.exponentialRampToValueAtTime(0.001, now+0.1);
            const p = this.ctx.createBufferSource();
            p.buffer = this.buffers.pink;
            const pf = this.ctx.createBiquadFilter();
            pf.type = 'highpass'; pf.frequency.value = 2500;
            const pg = this.ctx.createGain();
            pg.gain.setValueAtTime(0.12, now);
            pg.gain.exponentialRampToValueAtTime(0.001, now+0.08);
            t.connect(tf); tf.connect(tg); tg.connect(this.masterGain);
            p.connect(pf); pf.connect(pg); pg.connect(this.masterGain);
            t.start(now); t.stop(now+0.12);
            p.start(now); p.stop(now+0.1);
        } catch(e){}
    },
    
    modalOpen() {
        if (!this.ctx || !this.enabled || !this.canPlay('modalOpen', 150)) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            const n = this.ctx.createBufferSource();
            n.buffer = this.buffers.pink;
            const f = this.ctx.createBiquadFilter();
            f.type = 'bandpass';
            f.frequency.setValueAtTime(300, now);
            f.frequency.exponentialRampToValueAtTime(1000, now+0.1);
            f.Q.value = 1;
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(0.1, now+0.03);
            g.gain.exponentialRampToValueAtTime(0.001, now+0.12);
            n.connect(f); f.connect(g); g.connect(this.masterGain);
            n.start(now); n.stop(now+0.15);
        } catch(e){}
    },
    
    modalClose() {
        if (!this.ctx || !this.enabled || !this.canPlay('modalClose', 150)) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            const n = this.ctx.createBufferSource();
            n.buffer = this.buffers.pink;
            const f = this.ctx.createBiquadFilter();
            f.type = 'bandpass';
            f.frequency.setValueAtTime(800, now);
            f.frequency.exponentialRampToValueAtTime(300, now+0.08);
            f.Q.value = 1;
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.1, now);
            g.gain.exponentialRampToValueAtTime(0.001, now+0.1);
            n.connect(f); f.connect(g); g.connect(this.masterGain);
            n.start(now); n.stop(now+0.12);
        } catch(e){}
    },
    
    tensionRumble(tension) {
        if (!this.ctx || !this.enabled || !this.canPlay('tension', 100)) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            const n = this.ctx.createBufferSource();
            n.buffer = this.buffers.brown;
            n.playbackRate.value = 0.5 + tension*1.2;
            const f = this.ctx.createBiquadFilter();
            f.type = 'bandpass'; f.frequency.value = 120+tension*200; f.Q.value = 3;
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.06+tension*0.08, now);
            g.gain.exponentialRampToValueAtTime(0.001, now+0.1);
            n.connect(f); f.connect(g); g.connect(this.masterGain);
            n.start(now); n.stop(now+0.12);
        } catch(e){}
    },
    
    releaseBurst(intensity = 1) {
        if (!this.ctx || !this.enabled || !this.canPlay('release', 50)) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            const s = this.ctx.createBufferSource();
            s.buffer = this.buffers.white;
            const sf = this.ctx.createBiquadFilter();
            sf.type = 'highpass'; sf.frequency.value = 2000;
            const sg = this.ctx.createGain();
            sg.gain.setValueAtTime(0.2*intensity, now);
            sg.gain.exponentialRampToValueAtTime(0.001, now+0.025);
            const t = this.ctx.createBufferSource();
            t.buffer = this.buffers.brown;
            const tf = this.ctx.createBiquadFilter();
            tf.type = 'lowpass'; tf.frequency.value = 200;
            const tg = this.ctx.createGain();
            tg.gain.setValueAtTime(0.25*intensity, now);
            tg.gain.exponentialRampToValueAtTime(0.001, now+0.1);
            s.connect(sf); sf.connect(sg); sg.connect(this.masterGain);
            t.connect(tf); tf.connect(tg); tg.connect(this.masterGain);
            s.start(now); s.stop(now+0.04);
            t.start(now); t.stop(now+0.12);
        } catch(e){}
    },
    
    // Legacy aliases
    whoosh() { this.rush(); },
    swoosh(d) { this.slideTransition(d); },
    victory() { this.victoryCrunch(); },
    defeat() { this.impact(0.5); }
};

window.AudioManager = AudioManager;
