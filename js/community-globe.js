/* global THREE */

'use strict';

(function initCommunityGlobe() {
    class CommunityGlobe {
        constructor(canvas, options = {}) {
            this.canvas = canvas;
            this.tooltipEl = options.tooltipEl || null;
            this.onPointSelect = null;
            this.isPaused = false;
            this.isDragging = false;
            this.dragDistance = 0;
            this.lastPointerX = 0;
            this.lastPointerY = 0;
            this.velocityX = 0;
            this.velocityY = 0;
            this.rotationX = 0.12;
            this.rotationY = 0;
            this.hotspots = [];
            this.points = [];
            this.projectedHotspots = [];
            this.animationFrame = null;
            this.mode = 'canvas2d';

            this.tryInitThree();
            if (this.mode !== 'three') {
                this.initCanvas2D();
            }

            this.bindEvents();
            this.resize();
            this.animate();
        }

        tryInitThree() {
            if (!window.THREE) return;

            try {
                this.pointer = new THREE.Vector2();
                this.raycaster = new THREE.Raycaster();

                this.scene = new THREE.Scene();
                this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
                this.camera.position.set(0, 0, 3.4);

                this.renderer = new THREE.WebGLRenderer({
                    canvas: this.canvas,
                    alpha: true,
                    antialias: true,
                    powerPreference: 'high-performance'
                });
                this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

                this.globeGroup = new THREE.Group();
                this.scene.add(this.globeGroup);

                this.hotspotGroup = new THREE.Group();
                this.globeGroup.add(this.hotspotGroup);

                this.addThreeLights();
                this.addThreeGlobe();
                this.mode = 'three';
            } catch (error) {
                console.warn('CommunityGlobe: WebGL mode unavailable, using 2D fallback.', error?.message || error);
                this.mode = 'canvas2d';
                this.renderer?.dispose?.();
                this.renderer = null;
            }
        }

        initCanvas2D() {
            this.ctx = this.canvas.getContext('2d');
            if (!this.ctx) {
                throw new Error('CommunityGlobe: Canvas 2D context unavailable');
            }
        }

        addThreeLights() {
            const ambient = new THREE.AmbientLight(0x7fb4ff, 0.68);
            this.scene.add(ambient);

            const key = new THREE.DirectionalLight(0xffffff, 1.05);
            key.position.set(2.4, 2.0, 2.7);
            this.scene.add(key);

            const rim = new THREE.DirectionalLight(0x35d6ff, 0.72);
            rim.position.set(-2.0, -1.2, -2.0);
            this.scene.add(rim);
        }

        addThreeGlobe() {
            const globeGeometry = new THREE.SphereGeometry(1, 64, 64);
            const globeMaterial = new THREE.MeshPhongMaterial({
                color: 0x1d4f86,
                emissive: 0x0b2238,
                emissiveIntensity: 0.9,
                shininess: 46,
                specular: 0x8ddfff,
                transparent: true,
                opacity: 0.98
            });

            this.globeMesh = new THREE.Mesh(globeGeometry, globeMaterial);
            this.globeGroup.add(this.globeMesh);

            const atmosphereGeometry = new THREE.SphereGeometry(1.08, 48, 48);
            const atmosphereMaterial = new THREE.MeshBasicMaterial({
                color: 0x53d7ff,
                transparent: true,
                opacity: 0.16,
                side: THREE.BackSide
            });
            this.atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
            this.globeGroup.add(this.atmosphereMesh);
        }

        bindEvents() {
            this.onResize = () => this.resize();
            window.addEventListener('resize', this.onResize, { passive: true });

            this.canvas.addEventListener('pointerdown', (event) => {
                this.isDragging = true;
                this.dragDistance = 0;
                this.lastPointerX = event.clientX;
                this.lastPointerY = event.clientY;
                this.canvas.setPointerCapture(event.pointerId);
            });

            this.canvas.addEventListener('pointermove', (event) => {
                if (this.isDragging) {
                    const dx = event.clientX - this.lastPointerX;
                    const dy = event.clientY - this.lastPointerY;
                    this.dragDistance += Math.abs(dx) + Math.abs(dy);

                    this.rotationY += dx * 0.0048;
                    this.rotationX += dy * 0.0048;
                    this.rotationX = Math.max(-1.1, Math.min(1.1, this.rotationX));

                    this.velocityX = dx * 0.00045;
                    this.velocityY = dy * 0.00045;

                    this.lastPointerX = event.clientX;
                    this.lastPointerY = event.clientY;
                }

                this.handleHover(event);
            });

            this.canvas.addEventListener('pointerup', (event) => {
                if (this.isDragging && this.dragDistance < 6) {
                    this.handlePointClick(event);
                }
                this.isDragging = false;
                this.canvas.releasePointerCapture(event.pointerId);
            });

            this.canvas.addEventListener('pointerleave', () => {
                if (this.tooltipEl) this.tooltipEl.style.display = 'none';
            });
        }

        latLngToVec(lat, lng) {
            const latRad = lat * (Math.PI / 180);
            const lngRad = (lng + 180) * (Math.PI / 180);

            return {
                x: Math.cos(latRad) * Math.cos(lngRad),
                y: Math.sin(latRad),
                z: Math.cos(latRad) * Math.sin(lngRad)
            };
        }

        rotateVector(vec, rotX, rotY) {
            const cosY = Math.cos(rotY);
            const sinY = Math.sin(rotY);
            const cosX = Math.cos(rotX);
            const sinX = Math.sin(rotX);

            const x1 = (vec.x * cosY) - (vec.z * sinY);
            const z1 = (vec.x * sinY) + (vec.z * cosY);
            const y2 = (vec.y * cosX) - (z1 * sinX);
            const z2 = (vec.y * sinX) + (z1 * cosX);

            return { x: x1, y: y2, z: z2 };
        }

        setPoints(points = []) {
            this.points = Array.isArray(points) ? points.filter(point => (
                typeof point.lat === 'number' && typeof point.lng === 'number'
            )) : [];

            if (this.mode === 'three') {
                this.setThreePoints(this.points);
            }
        }

        setThreePoints(points) {
            this.hotspots.forEach(mesh => {
                this.hotspotGroup.remove(mesh);
                mesh.geometry.dispose();
                mesh.material.dispose();
            });
            this.hotspots = [];

            if (!points.length) return;

            const maxEvents = Math.max(...points.map(point => point.totalEvents || 1), 1);

            points.forEach(point => {
                const strength = Math.min(1, (point.totalEvents || 1) / maxEvents);
                const radius = 0.011 + (strength * 0.043);
                const color = new THREE.Color();
                color.setHSL(0.58 - (strength * 0.16), 0.82, 0.52 - (strength * 0.18));

                const geometry = new THREE.SphereGeometry(radius, 14, 14);
                const material = new THREE.MeshStandardMaterial({
                    color,
                    emissive: color,
                    emissiveIntensity: 0.55 + (strength * 0.95),
                    roughness: 0.2,
                    metalness: 0.2
                });

                const hotspot = new THREE.Mesh(geometry, material);
                hotspot.position.copy(this.latLngToVector3(point.lat, point.lng, 1.02 + (strength * 0.06)));
                hotspot.userData = { ...point, strength };

                this.hotspotGroup.add(hotspot);
                this.hotspots.push(hotspot);
            });
        }

        latLngToVector3(lat, lng, radius = 1.01) {
            const phi = (90 - lat) * (Math.PI / 180);
            const theta = (lng + 180) * (Math.PI / 180);

            const x = -(radius * Math.sin(phi) * Math.cos(theta));
            const y = radius * Math.cos(phi);
            const z = radius * Math.sin(phi) * Math.sin(theta);
            return new THREE.Vector3(x, y, z);
        }

        setOnPointSelect(handler) {
            this.onPointSelect = typeof handler === 'function' ? handler : null;
        }

        setPaused(paused) {
            this.isPaused = Boolean(paused);
        }

        getIntersections(event) {
            if (this.mode !== 'three') return [];

            const rect = this.canvas.getBoundingClientRect();
            if (!rect.width || !rect.height) return [];

            this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);

            this.raycaster.setFromCamera(this.pointer, this.camera);
            return this.raycaster.intersectObjects(this.hotspots, false);
        }

        get2DHit(event) {
            if (this.mode !== 'canvas2d' || !this.projectedHotspots.length) return null;

            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            let best = null;
            let bestDistance = Infinity;

            this.projectedHotspots.forEach(point => {
                const dx = x - point.screenX;
                const dy = y - point.screenY;
                const distance = Math.hypot(dx, dy);
                if (distance <= (point.radius + 4) && distance < bestDistance) {
                    best = point;
                    bestDistance = distance;
                }
            });

            return best;
        }

        handleHover(event) {
            if (!this.tooltipEl) return;

            let target = null;
            if (this.mode === 'three') {
                const intersections = this.getIntersections(event);
                target = intersections.length ? intersections[0].object.userData : null;
            } else {
                target = this.get2DHit(event)?.data || null;
            }

            if (!target) {
                this.tooltipEl.style.display = 'none';
                return;
            }

            const place = target.locationRaw || [target.city, target.region, target.country].filter(Boolean).join(', ') || 'Unknown location';

            this.tooltipEl.innerHTML = `
                <div class="tooltip-place">${this.escapeHtml(place)}</div>
                <div class="tooltip-line">Events: <strong>${this.formatNumber(target.totalEvents || 0)}</strong></div>
                <div class="tooltip-line">Visits: <strong>${this.formatNumber(target.totalVisits || 0)}</strong></div>
            `;

            const rect = this.canvas.getBoundingClientRect();
            this.tooltipEl.style.left = `${event.clientX - rect.left + 12}px`;
            this.tooltipEl.style.top = `${event.clientY - rect.top + 12}px`;
            this.tooltipEl.style.display = 'block';
        }

        handlePointClick(event) {
            if (!this.onPointSelect) return;

            if (this.mode === 'three') {
                const intersections = this.getIntersections(event);
                if (!intersections.length) return;
                this.onPointSelect(intersections[0].object.userData);
                return;
            }

            const hit = this.get2DHit(event);
            if (hit?.data) {
                this.onPointSelect(hit.data);
            }
        }

        animate() {
            const tick = () => {
                if (!this.isPaused) {
                    if (!this.isDragging) {
                        this.rotationY += 0.0016 + this.velocityX;
                        this.rotationX += this.velocityY;
                        this.rotationX = Math.max(-1.1, Math.min(1.1, this.rotationX));
                        this.velocityX *= 0.95;
                        this.velocityY *= 0.95;
                    }
                }

                if (this.mode === 'three') {
                    this.renderThree();
                } else {
                    this.renderCanvas2D();
                }

                this.animationFrame = requestAnimationFrame(tick);
            };

            this.animationFrame = requestAnimationFrame(tick);
        }

        renderThree() {
            if (!this.globeGroup) return;

            this.globeGroup.rotation.y = this.rotationY;
            this.globeGroup.rotation.x = this.rotationX;

            this.hotspots.forEach(hotspot => {
                const pulse = 1 + (Math.sin((Date.now() * 0.0025) + (hotspot.userData.strength * 6)) * 0.07);
                hotspot.scale.set(pulse, pulse, pulse);
            });

            this.renderer.render(this.scene, this.camera);
        }

        renderCanvas2D() {
            if (!this.ctx) return;

            const ctx = this.ctx;
            const width = this.renderWidth;
            const height = this.renderHeight;

            ctx.clearRect(0, 0, width, height);

            const cx = width / 2;
            const cy = height / 2;
            const globeRadius = Math.max(50, Math.min(width, height) * 0.34);

            const gradient = ctx.createRadialGradient(
                cx - (globeRadius * 0.26),
                cy - (globeRadius * 0.32),
                globeRadius * 0.2,
                cx,
                cy,
                globeRadius
            );
            gradient.addColorStop(0, '#5fbaff');
            gradient.addColorStop(0.35, '#2f7fc8');
            gradient.addColorStop(1, '#103a61');

            ctx.beginPath();
            ctx.arc(cx, cy, globeRadius, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(cx, cy, globeRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(141, 225, 255, 0.38)';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            this.draw2DHotspots(ctx, cx, cy, globeRadius);

            ctx.beginPath();
            ctx.arc(cx - (globeRadius * 0.32), cy - (globeRadius * 0.42), globeRadius * 0.18, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(208, 243, 255, 0.18)';
            ctx.fill();
        }

        draw2DHotspots(ctx, cx, cy, globeRadius) {
            this.projectedHotspots = [];
            if (!this.points.length) return;

            const maxEvents = Math.max(...this.points.map(point => point.totalEvents || 1), 1);

            this.points.forEach(point => {
                const base = this.latLngToVec(point.lat, point.lng);
                const rotated = this.rotateVector(base, this.rotationX, this.rotationY);

                if (rotated.z < -0.18) return;

                const screenX = cx + (rotated.x * globeRadius);
                const screenY = cy - (rotated.y * globeRadius);
                const strength = Math.min(1, (point.totalEvents || 1) / maxEvents);
                const depthScale = 0.45 + ((rotated.z + 1) * 0.55);
                const radius = (2.2 + (strength * 8.4)) * depthScale;

                this.projectedHotspots.push({
                    data: { ...point, strength },
                    screenX,
                    screenY,
                    radius
                });
            });

            this.projectedHotspots.sort((a, b) => a.radius - b.radius);

            this.projectedHotspots.forEach(point => {
                const hue = 195 - (point.data.strength * 45);

                ctx.beginPath();
                ctx.arc(point.screenX, point.screenY, point.radius, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${hue}, 90%, ${58 - (point.data.strength * 15)}%, ${0.55 + (point.data.strength * 0.42)})`;
                ctx.shadowColor = `hsla(${hue}, 95%, 72%, 0.95)`;
                ctx.shadowBlur = point.radius * 2.6;
                ctx.fill();
            });

            ctx.shadowBlur = 0;
        }

        resize() {
            const width = Math.max(240, this.canvas.clientWidth || 320);
            const height = Math.max(240, this.canvas.clientHeight || 320);

            this.renderWidth = width;
            this.renderHeight = height;

            if (this.mode === 'three') {
                this.renderer.setSize(width, height, false);
                this.camera.aspect = width / height;
                this.camera.updateProjectionMatrix();
                return;
            }

            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            this.canvas.width = Math.round(width * dpr);
            this.canvas.height = Math.round(height * dpr);
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        destroy() {
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
                this.animationFrame = null;
            }

            window.removeEventListener('resize', this.onResize);

            if (this.mode === 'three') {
                this.renderer?.dispose?.();
            }
        }

        formatNumber(value) {
            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
            if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
            return String(value || 0);
        }

        escapeHtml(value) {
            const str = String(value || '');
            return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }
    }

    window.CommunityGlobe = CommunityGlobe;
})();
