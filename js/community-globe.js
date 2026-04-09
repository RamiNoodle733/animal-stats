'use strict';

(function initCommunityGlobe() {
    const LAND_DATA_PATH = '/data/ne_110m_land.geojson';
    const INTEGER_FORMATTER = new Intl.NumberFormat();

    const FALLBACK_RINGS = [
        [[-168, 72], [-145, 70], [-130, 60], [-124, 50], [-125, 42], [-117, 32], [-106, 24], [-95, 18], [-85, 22], [-80, 27], [-81, 33], [-75, 40], [-67, 46], [-60, 52], [-58, 58], [-74, 74], [-100, 80], [-135, 78], [-168, 72]],
        [[-82, 12], [-74, 5], [-70, -8], [-66, -18], [-62, -30], [-60, -42], [-54, -50], [-48, -55], [-42, -50], [-36, -38], [-35, -25], [-41, -12], [-48, -2], [-58, 4], [-70, 8], [-82, 12]],
        [[-10, 72], [10, 72], [32, 64], [40, 55], [28, 45], [24, 36], [30, 30], [34, 20], [32, 8], [26, -2], [20, -14], [16, -24], [10, -34], [2, -36], [-8, -30], [-16, -20], [-18, -5], [-12, 8], [-8, 20], [-2, 32], [2, 42], [-4, 50], [-10, 58], [-12, 66], [-10, 72]],
        [[26, 74], [50, 72], [78, 70], [104, 64], [124, 54], [138, 46], [150, 36], [160, 24], [164, 8], [154, -2], [136, -4], [122, 4], [108, 14], [94, 18], [84, 10], [72, 8], [62, 18], [56, 30], [50, 40], [40, 48], [30, 58], [26, 74]],
        [[112, -12], [116, -20], [124, -28], [134, -33], [146, -36], [154, -30], [154, -22], [146, -16], [136, -12], [124, -10], [112, -12]]
    ];

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function normalize(vec) {
        const length = Math.hypot(vec.x, vec.y, vec.z);
        if (length < 1e-8) return null;
        return {
            x: vec.x / length,
            y: vec.y / length,
            z: vec.z / length
        };
    }

    function cross(a, b) {
        return {
            x: (a.y * b.z) - (a.z * b.y),
            y: (a.z * b.x) - (a.x * b.z),
            z: (a.x * b.y) - (a.y * b.x)
        };
    }

    function dot(a, b) {
        return (a.x * b.x) + (a.y * b.y) + (a.z * b.z);
    }

    function identityMatrix() {
        return [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1]
        ];
    }

    function multiplyMatrices(a, b) {
        const out = identityMatrix();
        for (let row = 0; row < 3; row += 1) {
            for (let col = 0; col < 3; col += 1) {
                out[row][col] = (a[row][0] * b[0][col]) + (a[row][1] * b[1][col]) + (a[row][2] * b[2][col]);
            }
        }
        return out;
    }

    function applyMatrix(matrix, vec) {
        return {
            x: (matrix[0][0] * vec.x) + (matrix[0][1] * vec.y) + (matrix[0][2] * vec.z),
            y: (matrix[1][0] * vec.x) + (matrix[1][1] * vec.y) + (matrix[1][2] * vec.z),
            z: (matrix[2][0] * vec.x) + (matrix[2][1] * vec.y) + (matrix[2][2] * vec.z)
        };
    }

    function rotationMatrixFromAxisAngle(axisInput, angle) {
        const axis = normalize(axisInput);
        if (!axis || Math.abs(angle) < 1e-8) {
            return identityMatrix();
        }

        const x = axis.x;
        const y = axis.y;
        const z = axis.z;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const oneMinus = 1 - cos;

        return [
            [cos + (x * x * oneMinus), (x * y * oneMinus) - (z * sin), (x * z * oneMinus) + (y * sin)],
            [(y * x * oneMinus) + (z * sin), cos + (y * y * oneMinus), (y * z * oneMinus) - (x * sin)],
            [(z * x * oneMinus) - (y * sin), (z * y * oneMinus) + (x * sin), cos + (z * z * oneMinus)]
        ];
    }

    class CommunityGlobe {
        constructor(canvas, options = {}) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d', { alpha: true });
            if (!this.ctx) {
                throw new Error('Unable to initialize canvas context for community globe');
            }

            this.tooltipEl = options.tooltipEl || null;
            this.onPointSelect = null;
            this.mode = 'globe';
            this.points = [];
            this.projectedPoints = [];
            this.maxEvents = 1;
            this.landRings = [...FALLBACK_RINGS];

            this.rotationMatrix = rotationMatrixFromAxisAngle({ x: 1, y: 0, z: 0 }, 0.18);
            this.dragVector = null;
            this.inertiaAxis = { x: 0, y: 1, z: 0 };
            this.inertiaSpeed = 0;
            this.autoSpinSpeed = 0.00125;

            this.isPaused = false;
            this.isDragging = false;
            this.dragDistance = 0;
            this.lastPointerX = 0;
            this.lastPointerY = 0;
            this.animationFrame = null;
            this.flatBaseCanvas = null;
            this.flatBaseHash = '';

            this.canvas.style.touchAction = 'none';

            this.bindEvents();
            this.resize();
            this.loadLandGeometry();
            this.animate();
        }

        async loadLandGeometry() {
            try {
                const response = await fetch(LAND_DATA_PATH, { cache: 'force-cache' });
                if (!response.ok) throw new Error(`Failed to load land data (${response.status})`);

                const geojson = await response.json();
                const rings = this.extractLandRings(geojson);
                if (rings.length) {
                    this.landRings = rings;
                    this.flatBaseHash = '';
                }
            } catch (error) {
                console.warn('CommunityGlobe: using fallback continent rings.', error?.message || error);
            }
        }

        extractLandRings(geojson) {
            const rings = [];
            const features = Array.isArray(geojson?.features) ? geojson.features : [];

            const addRing = (ring) => {
                if (!Array.isArray(ring) || ring.length < 3) return;
                const parsed = ring
                    .map((point) => {
                        if (!Array.isArray(point) || point.length < 2) return null;
                        const lng = Number(point[0]);
                        const lat = Number(point[1]);
                        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
                        return [lng, lat];
                    })
                    .filter(Boolean);

                if (parsed.length >= 3) {
                    rings.push(parsed);
                }
            };

            features.forEach((feature) => {
                const geometry = feature?.geometry;
                if (!geometry || !Array.isArray(geometry.coordinates)) return;

                if (geometry.type === 'Polygon') {
                    geometry.coordinates.forEach(addRing);
                } else if (geometry.type === 'MultiPolygon') {
                    geometry.coordinates.forEach((polygon) => {
                        if (Array.isArray(polygon)) {
                            polygon.forEach(addRing);
                        }
                    });
                }
            });

            return rings;
        }

        bindEvents() {
            this.onResize = () => this.resize();
            window.addEventListener('resize', this.onResize, { passive: true });

            this.canvas.addEventListener('pointerdown', (event) => {
                this.isDragging = true;
                this.dragDistance = 0;
                this.lastPointerX = event.clientX;
                this.lastPointerY = event.clientY;
                this.dragVector = this.mode === 'globe' ? this.projectPointerToTrackball(event) : null;
                this.canvas.setPointerCapture(event.pointerId);
            });

            this.canvas.addEventListener('pointermove', (event) => {
                if (this.isDragging) {
                    const dx = event.clientX - this.lastPointerX;
                    const dy = event.clientY - this.lastPointerY;
                    this.dragDistance += Math.abs(dx) + Math.abs(dy);

                    if (this.mode === 'globe') {
                        const currentVector = this.projectPointerToTrackball(event);
                        if (this.dragVector && currentVector) {
                            const rotationAxisRaw = cross(this.dragVector, currentVector);
                            const rotationAxis = normalize(rotationAxisRaw);
                            const rotationDot = clamp(dot(this.dragVector, currentVector), -1, 1);
                            const rotationAngle = Math.acos(rotationDot);

                            if (rotationAxis && rotationAngle > 1e-5) {
                                const delta = rotationMatrixFromAxisAngle(rotationAxis, rotationAngle * 1.1);
                                this.rotationMatrix = multiplyMatrices(delta, this.rotationMatrix);
                                this.inertiaAxis = rotationAxis;
                                this.inertiaSpeed = rotationAngle * 0.72;
                            }
                        }
                        this.dragVector = currentVector;
                    }

                    this.lastPointerX = event.clientX;
                    this.lastPointerY = event.clientY;
                }

                this.handleHover(event);
            });

            this.canvas.addEventListener('pointerup', (event) => {
                if (this.isDragging && this.dragDistance < 7) {
                    this.handlePointClick(event);
                }

                this.isDragging = false;
                this.dragVector = null;
                this.canvas.releasePointerCapture(event.pointerId);
            });

            this.canvas.addEventListener('pointerleave', () => {
                if (this.tooltipEl) {
                    this.tooltipEl.style.display = 'none';
                }
            });
        }

        getGlobeLayout(width = this.renderWidth, height = this.renderHeight) {
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = Math.max(70, Math.min(width, height) * 0.365);
            return { centerX, centerY, radius };
        }

        projectPointerToTrackball(event) {
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            const { centerX, centerY, radius } = this.getGlobeLayout();

            let nx = (x - centerX) / radius;
            let ny = (centerY - y) / radius;

            const distanceSq = (nx * nx) + (ny * ny);
            if (distanceSq > 1) {
                const scale = 1 / Math.sqrt(distanceSq);
                nx *= scale;
                ny *= scale;
                return { x: nx, y: ny, z: 0 };
            }

            return {
                x: nx,
                y: ny,
                z: Math.sqrt(1 - distanceSq)
            };
        }

        setMode(mode) {
            this.mode = mode === 'flat' ? 'flat' : 'globe';
            if (this.tooltipEl) {
                this.tooltipEl.style.display = 'none';
            }
        }

        setPoints(points = []) {
            this.points = Array.isArray(points)
                ? points.filter((point) => typeof point.lat === 'number' && typeof point.lng === 'number')
                : [];
            this.maxEvents = Math.max(...this.points.map((point) => point.totalEvents || 1), 1);
        }

        setOnPointSelect(handler) {
            this.onPointSelect = typeof handler === 'function' ? handler : null;
        }

        setPaused(paused) {
            this.isPaused = Boolean(paused);
        }

        resize() {
            const width = Math.max(220, this.canvas.clientWidth || 320);
            const height = Math.max(220, this.canvas.clientHeight || 320);
            this.renderWidth = width;
            this.renderHeight = height;

            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            this.canvas.width = Math.round(width * dpr);
            this.canvas.height = Math.round(height * dpr);
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            this.flatBaseHash = '';
        }

        animate() {
            const tick = () => {
                if (!this.isPaused && this.mode === 'globe' && !this.isDragging) {
                    if (this.inertiaSpeed > 0.00005) {
                        const inertiaDelta = rotationMatrixFromAxisAngle(this.inertiaAxis, this.inertiaSpeed);
                        this.rotationMatrix = multiplyMatrices(inertiaDelta, this.rotationMatrix);
                        this.inertiaSpeed *= 0.92;
                    } else {
                        this.inertiaSpeed = 0;
                    }

                    const autoSpinDelta = rotationMatrixFromAxisAngle({ x: 0, y: 1, z: 0 }, this.autoSpinSpeed);
                    this.rotationMatrix = multiplyMatrices(autoSpinDelta, this.rotationMatrix);
                }

                this.draw();
                this.animationFrame = requestAnimationFrame(tick);
            };

            this.animationFrame = requestAnimationFrame(tick);
        }

        draw() {
            const ctx = this.ctx;
            const width = this.renderWidth;
            const height = this.renderHeight;

            ctx.clearRect(0, 0, width, height);
            this.projectedPoints = [];

            if (this.mode === 'flat') {
                this.drawFlatMap(ctx, width, height);
            } else {
                this.drawGlobe(ctx, width, height);
            }
        }

        drawGlobe(ctx, width, height) {
            const { centerX, centerY, radius } = this.getGlobeLayout(width, height);

            const oceanGradient = ctx.createRadialGradient(
                centerX - (radius * 0.35),
                centerY - (radius * 0.4),
                radius * 0.12,
                centerX,
                centerY,
                radius
            );
            oceanGradient.addColorStop(0, '#62bcff');
            oceanGradient.addColorStop(0.45, '#2b79c1');
            oceanGradient.addColorStop(1, '#0f3558');

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fillStyle = oceanGradient;
            ctx.fill();

            ctx.save();
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.clip();

            this.drawGlobeGraticule(ctx, centerX, centerY, radius);
            this.drawGlobeContinents(ctx, centerX, centerY, radius);
            this.drawGlobePoints(ctx, centerX, centerY, radius);

            ctx.restore();

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(125, 215, 255, 0.65)';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(centerX - (radius * 0.32), centerY - (radius * 0.42), radius * 0.18, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(208, 243, 255, 0.18)';
            ctx.fill();
        }

        drawGlobeGraticule(ctx, centerX, centerY, radius) {
            ctx.strokeStyle = 'rgba(130, 206, 242, 0.16)';
            ctx.lineWidth = 1;

            for (let lat = -60; lat <= 60; lat += 30) {
                this.drawGlobeLine(ctx, centerX, centerY, radius, lat, true);
            }

            for (let lng = -150; lng <= 150; lng += 30) {
                this.drawGlobeLine(ctx, centerX, centerY, radius, lng, false);
            }
        }

        drawGlobeLine(ctx, centerX, centerY, radius, value, isLatitude) {
            const steps = 96;
            let drawing = false;

            ctx.beginPath();
            for (let i = 0; i <= steps; i += 1) {
                const t = i / steps;
                const lat = isLatitude ? value : -90 + (t * 180);
                const lng = isLatitude ? -180 + (t * 360) : value;
                const projected = this.projectToGlobe(lat, lng, centerX, centerY, radius);

                if (projected.visible) {
                    if (!drawing) {
                        ctx.moveTo(projected.x, projected.y);
                        drawing = true;
                    } else {
                        ctx.lineTo(projected.x, projected.y);
                    }
                } else {
                    drawing = false;
                }
            }
            ctx.stroke();
        }

        drawGlobeContinents(ctx, centerX, centerY, radius) {
            const rings = this.landRings.length ? this.landRings : FALLBACK_RINGS;
            ctx.strokeStyle = 'rgba(143, 234, 164, 0.72)';
            ctx.lineWidth = 1.1;

            rings.forEach((ring) => {
                const points = ring.concat([ring[0]]);
                let drawing = false;

                ctx.beginPath();
                for (let index = 0; index < points.length; index += 1) {
                    const [lng, lat] = points[index];
                    const projected = this.projectToGlobe(lat, lng, centerX, centerY, radius);
                    if (projected.visible) {
                        if (!drawing) {
                            ctx.moveTo(projected.x, projected.y);
                            drawing = true;
                        } else {
                            ctx.lineTo(projected.x, projected.y);
                        }
                    } else {
                        drawing = false;
                    }
                }

                ctx.stroke();
            });
        }

        drawGlobePoints(ctx, centerX, centerY, radius) {
            this.points.forEach((point) => {
                const projected = this.projectToGlobe(point.lat, point.lng, centerX, centerY, radius);
                if (!projected.visible) return;

                const strength = clamp((point.totalEvents || 1) / this.maxEvents, 0.05, 1);
                const depthScale = 0.4 + ((projected.depth + 1) * 0.35);
                const dotRadius = (2.1 + (strength * 8.8)) * depthScale;
                const hue = 170 - (strength * 90);

                ctx.beginPath();
                ctx.arc(projected.x, projected.y, dotRadius, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${hue}, 92%, ${55 - (strength * 18)}%, ${0.62 + (strength * 0.34)})`;
                ctx.shadowColor = `hsla(${hue}, 95%, 72%, 0.9)`;
                ctx.shadowBlur = dotRadius * 2.2;
                ctx.fill();

                this.projectedPoints.push({
                    x: projected.x,
                    y: projected.y,
                    radius: dotRadius + 4,
                    data: { ...point, strength }
                });
            });

            ctx.shadowBlur = 0;
        }

        drawFlatMap(ctx, width, height) {
            const padding = 10;
            const mapX = padding;
            const mapY = padding;
            const mapWidth = width - (padding * 2);
            const mapHeight = height - (padding * 2);

            const hash = `${width}x${height}::${this.landRings.length}`;
            if (!this.flatBaseCanvas || this.flatBaseHash !== hash) {
                this.flatBaseCanvas = document.createElement('canvas');
                this.flatBaseCanvas.width = Math.max(1, Math.round(width));
                this.flatBaseCanvas.height = Math.max(1, Math.round(height));

                const baseCtx = this.flatBaseCanvas.getContext('2d');
                if (baseCtx) {
                    const bg = baseCtx.createLinearGradient(0, mapY, 0, mapY + mapHeight);
                    bg.addColorStop(0, '#0b2f4f');
                    bg.addColorStop(1, '#082640');
                    baseCtx.fillStyle = bg;
                    baseCtx.fillRect(mapX, mapY, mapWidth, mapHeight);

                    baseCtx.strokeStyle = 'rgba(130, 206, 242, 0.2)';
                    baseCtx.lineWidth = 1;
                    for (let lng = -180; lng <= 180; lng += 30) {
                        const x = mapX + (((lng + 180) / 360) * mapWidth);
                        baseCtx.beginPath();
                        baseCtx.moveTo(x, mapY);
                        baseCtx.lineTo(x, mapY + mapHeight);
                        baseCtx.stroke();
                    }

                    for (let lat = -60; lat <= 60; lat += 30) {
                        const y = mapY + (((90 - lat) / 180) * mapHeight);
                        baseCtx.beginPath();
                        baseCtx.moveTo(mapX, y);
                        baseCtx.lineTo(mapX + mapWidth, y);
                        baseCtx.stroke();
                    }

                    const rings = this.landRings.length ? this.landRings : FALLBACK_RINGS;
                    rings.forEach((ring) => {
                        if (ring.length < 3) return;
                        baseCtx.beginPath();
                        ring.forEach(([lng, lat], index) => {
                            const point = this.projectToFlat(lat, lng, mapX, mapY, mapWidth, mapHeight);
                            if (index === 0) baseCtx.moveTo(point.x, point.y);
                            else baseCtx.lineTo(point.x, point.y);
                        });
                        baseCtx.closePath();
                        baseCtx.fillStyle = 'rgba(86, 178, 116, 0.6)';
                        baseCtx.fill();
                        baseCtx.strokeStyle = 'rgba(151, 238, 167, 0.45)';
                        baseCtx.lineWidth = 1;
                        baseCtx.stroke();
                    });

                    baseCtx.strokeStyle = 'rgba(139, 225, 255, 0.5)';
                    baseCtx.lineWidth = 1.1;
                    baseCtx.strokeRect(mapX, mapY, mapWidth, mapHeight);
                }

                this.flatBaseHash = hash;
            }

            if (this.flatBaseCanvas) {
                ctx.drawImage(this.flatBaseCanvas, 0, 0, width, height);
            }

            this.points.forEach((point) => {
                const projected = this.projectToFlat(point.lat, point.lng, mapX, mapY, mapWidth, mapHeight);
                const strength = clamp((point.totalEvents || 1) / this.maxEvents, 0.05, 1);
                const dotRadius = 2.4 + (strength * 10.5);
                const hue = 170 - (strength * 90);

                ctx.beginPath();
                ctx.arc(projected.x, projected.y, dotRadius, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${hue}, 92%, ${52 - (strength * 14)}%, ${0.66 + (strength * 0.3)})`;
                ctx.shadowColor = `hsla(${hue}, 95%, 72%, 0.9)`;
                ctx.shadowBlur = dotRadius * 2.1;
                ctx.fill();

                this.projectedPoints.push({
                    x: projected.x,
                    y: projected.y,
                    radius: dotRadius + 5,
                    data: { ...point, strength }
                });
            });

            ctx.shadowBlur = 0;
        }

        projectToFlat(lat, lng, mapX, mapY, mapWidth, mapHeight) {
            return {
                x: mapX + (((lng + 180) / 360) * mapWidth),
                y: mapY + (((90 - lat) / 180) * mapHeight)
            };
        }

        latLngToVector(lat, lng) {
            const latRad = lat * (Math.PI / 180);
            const lngRad = (lng + 180) * (Math.PI / 180);
            return {
                x: Math.cos(latRad) * Math.cos(lngRad),
                y: Math.sin(latRad),
                z: Math.cos(latRad) * Math.sin(lngRad)
            };
        }

        rotateVector(vec) {
            return applyMatrix(this.rotationMatrix, vec);
        }

        projectToGlobe(lat, lng, centerX, centerY, radius) {
            const base = this.latLngToVector(lat, lng);
            const rotated = this.rotateVector(base);
            const visible = rotated.z > 0.02;

            if (!visible) {
                return { visible: false, x: 0, y: 0, depth: rotated.z };
            }

            return {
                visible: true,
                x: centerX + (rotated.x * radius),
                y: centerY - (rotated.y * radius),
                depth: rotated.z
            };
        }

        getPointHit(event) {
            if (!this.projectedPoints.length) return null;

            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            let best = null;
            let closest = Infinity;

            this.projectedPoints.forEach((point) => {
                const dx = x - point.x;
                const dy = y - point.y;
                const distance = Math.hypot(dx, dy);

                if (distance <= point.radius && distance < closest) {
                    best = point;
                    closest = distance;
                }
            });

            return best;
        }

        handleHover(event) {
            if (!this.tooltipEl) return;
            const hit = this.getPointHit(event);

            if (!hit) {
                this.tooltipEl.style.display = 'none';
                return;
            }

            const target = hit.data;
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
            const hit = this.getPointHit(event);
            if (hit?.data) {
                this.onPointSelect(hit.data);
            }
        }

        destroy() {
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
                this.animationFrame = null;
            }

            window.removeEventListener('resize', this.onResize);
        }

        formatNumber(value) {
            const numeric = Number(value);
            if (!Number.isFinite(numeric)) return '0';
            return INTEGER_FORMATTER.format(Math.trunc(numeric));
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
