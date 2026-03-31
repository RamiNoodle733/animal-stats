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
            this.dragStartX = 0;
            this.dragStartY = 0;
            this.velocityX = 0;
            this.velocityY = 0;
            this.lastPointerX = 0;
            this.lastPointerY = 0;
            this.pointer = new THREE.Vector2();
            this.raycaster = new THREE.Raycaster();
            this.hotspots = [];
            this.animationFrame = null;

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

            this.addLights();
            this.addGlobe();
            this.bindEvents();
            this.resize();
            this.animate();
        }

        addLights() {
            const ambient = new THREE.AmbientLight(0x6ba8ff, 0.6);
            this.scene.add(ambient);

            const key = new THREE.DirectionalLight(0xffffff, 1.1);
            key.position.set(2.5, 2, 2.5);
            this.scene.add(key);

            const rim = new THREE.DirectionalLight(0x22d6ff, 0.7);
            rim.position.set(-2, -1.2, -2);
            this.scene.add(rim);
        }

        addGlobe() {
            const globeGeometry = new THREE.SphereGeometry(1, 64, 64);
            const globeMaterial = new THREE.MeshPhongMaterial({
                color: 0x0d2a43,
                emissive: 0x04131f,
                emissiveIntensity: 0.6,
                shininess: 28,
                specular: 0x88dfff,
                transparent: true,
                opacity: 0.98
            });

            this.globeMesh = new THREE.Mesh(globeGeometry, globeMaterial);
            this.globeGroup.add(this.globeMesh);

            const atmosphereGeometry = new THREE.SphereGeometry(1.07, 48, 48);
            const atmosphereMaterial = new THREE.MeshBasicMaterial({
                color: 0x4fd4ff,
                transparent: true,
                opacity: 0.1,
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
                this.dragStartX = event.clientX;
                this.dragStartY = event.clientY;
                this.lastPointerX = event.clientX;
                this.lastPointerY = event.clientY;
                this.canvas.setPointerCapture(event.pointerId);
            });

            this.canvas.addEventListener('pointermove', (event) => {
                if (this.isDragging) {
                    const dx = event.clientX - this.lastPointerX;
                    const dy = event.clientY - this.lastPointerY;
                    this.dragDistance += Math.abs(dx) + Math.abs(dy);

                    this.globeGroup.rotation.y += dx * 0.0048;
                    this.globeGroup.rotation.x += dy * 0.0048;
                    this.globeGroup.rotation.x = Math.max(-1.1, Math.min(1.1, this.globeGroup.rotation.x));

                    this.velocityX = dx * 0.00042;
                    this.velocityY = dy * 0.00042;

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
                if (this.tooltipEl) {
                    this.tooltipEl.style.display = 'none';
                }
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

        setPoints(points = []) {
            this.hotspots.forEach(mesh => {
                this.hotspotGroup.remove(mesh);
                mesh.geometry.dispose();
                mesh.material.dispose();
            });
            this.hotspots = [];

            if (!Array.isArray(points) || points.length === 0) {
                return;
            }

            const maxEvents = Math.max(...points.map(point => point.totalEvents || 1), 1);

            points.forEach(point => {
                if (typeof point.lat !== 'number' || typeof point.lng !== 'number') {
                    return;
                }

                const strength = Math.min(1, (point.totalEvents || 1) / maxEvents);
                const radius = 0.011 + (strength * 0.043);
                const color = new THREE.Color();
                color.setHSL(0.58 - (strength * 0.16), 0.82, 0.52 - (strength * 0.18));

                const geometry = new THREE.SphereGeometry(radius, 14, 14);
                const material = new THREE.MeshStandardMaterial({
                    color,
                    emissive: color,
                    emissiveIntensity: 0.45 + (strength * 0.95),
                    roughness: 0.25,
                    metalness: 0.15
                });

                const hotspot = new THREE.Mesh(geometry, material);
                hotspot.position.copy(this.latLngToVector3(point.lat, point.lng, 1.02 + (strength * 0.06)));
                hotspot.userData = {
                    ...point,
                    strength
                };

                this.hotspotGroup.add(hotspot);
                this.hotspots.push(hotspot);
            });
        }

        setOnPointSelect(handler) {
            this.onPointSelect = typeof handler === 'function' ? handler : null;
        }

        setPaused(paused) {
            this.isPaused = Boolean(paused);
        }

        getIntersections(event) {
            const rect = this.canvas.getBoundingClientRect();
            this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);

            this.raycaster.setFromCamera(this.pointer, this.camera);
            return this.raycaster.intersectObjects(this.hotspots, false);
        }

        handleHover(event) {
            if (!this.tooltipEl) return;
            const intersections = this.getIntersections(event);

            if (!intersections.length) {
                this.tooltipEl.style.display = 'none';
                return;
            }

            const target = intersections[0].object.userData;
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
            const intersections = this.getIntersections(event);
            if (!intersections.length || !this.onPointSelect) return;

            const target = intersections[0].object.userData;
            this.onPointSelect(target);
        }

        animate() {
            const tick = () => {
                if (!this.isPaused) {
                    if (!this.isDragging) {
                        this.globeGroup.rotation.y += 0.0016 + this.velocityX;
                        this.globeGroup.rotation.x += this.velocityY;
                        this.globeGroup.rotation.x = Math.max(-1.1, Math.min(1.1, this.globeGroup.rotation.x));

                        this.velocityX *= 0.95;
                        this.velocityY *= 0.95;
                    }

                    this.hotspots.forEach(hotspot => {
                        const pulse = 1 + (Math.sin((Date.now() * 0.0025) + (hotspot.userData.strength * 6)) * 0.07);
                        hotspot.scale.set(pulse, pulse, pulse);
                    });
                }

                this.renderer.render(this.scene, this.camera);
                this.animationFrame = requestAnimationFrame(tick);
            };

            this.animationFrame = requestAnimationFrame(tick);
        }

        resize() {
            const width = Math.max(240, this.canvas.clientWidth || 320);
            const height = Math.max(240, this.canvas.clientHeight || 320);

            this.renderer.setSize(width, height, false);
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        }

        destroy() {
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
                this.animationFrame = null;
            }

            window.removeEventListener('resize', this.onResize);
            this.renderer.dispose();
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
