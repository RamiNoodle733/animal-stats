'use strict';

(function initCommunityGlobe() {
    const CONTINENT_POLYGONS = [
        [
            [-168, 72], [-145, 70], [-130, 60], [-124, 50], [-125, 42],
            [-117, 32], [-106, 24], [-95, 18], [-85, 22], [-80, 27],
            [-81, 33], [-75, 40], [-67, 46], [-60, 52], [-58, 58],
            [-74, 74], [-100, 80], [-135, 78], [-168, 72]
        ],
        [
            [-82, 12], [-74, 5], [-70, -8], [-66, -18], [-62, -30],
            [-60, -42], [-54, -50], [-48, -55], [-42, -50], [-36, -38],
            [-35, -25], [-41, -12], [-48, -2], [-58, 4], [-70, 8],
            [-82, 12]
        ],
        [
            [-10, 72], [10, 72], [32, 64], [40, 55], [28, 45],
            [24, 36], [30, 30], [34, 20], [32, 8], [26, -2],
            [20, -14], [16, -24], [10, -34], [2, -36], [-8, -30],
            [-16, -20], [-18, -5], [-12, 8], [-8, 20], [-2, 32],
            [2, 42], [-4, 50], [-10, 58], [-12, 66], [-10, 72]
        ],
        [
            [26, 74], [50, 72], [78, 70], [104, 64], [124, 54],
            [138, 46], [150, 36], [160, 24], [164, 8], [154, -2],
            [136, -4], [122, 4], [108, 14], [94, 18], [84, 10],
            [72, 8], [62, 18], [56, 30], [50, 40], [40, 48],
            [30, 58], [26, 74]
        ],
        [
            [112, -12], [116, -20], [124, -28], [134, -33], [146, -36],
            [154, -30], [154, -22], [146, -16], [136, -12], [124, -10],
            [112, -12]
        ],
        [
            [-54, 82], [-46, 78], [-38, 72], [-36, 66], [-42, 60],
            [-50, 62], [-56, 68], [-58, 76], [-54, 82]
        ]
    ];

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
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

            this.rotationYaw = 0;
            this.rotationPitch = 0.18;
            this.velocityYaw = 0;
            this.velocityPitch = 0;
            this.autoSpinSpeed = 0.0013;
            this.isPaused = false;
            this.isDragging = false;
            this.dragDistance = 0;
            this.lastPointerX = 0;
            this.lastPointerY = 0;
            this.animationFrame = null;

            this.canvas.style.touchAction = 'none';

            this.bindEvents();
            this.resize();
            this.animate();
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

                    if (this.mode === 'globe') {
                        this.rotationYaw += dx * 0.0055;
                        this.rotationPitch += dy * 0.0042;
                        this.rotationPitch = clamp(this.rotationPitch, -1.1, 1.1);

                        this.velocityYaw = dx * 0.00056;
                        this.velocityPitch = dy * 0.00044;
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
                this.canvas.releasePointerCapture(event.pointerId);
            });

            this.canvas.addEventListener('pointerleave', () => {
                if (this.tooltipEl) {
                    this.tooltipEl.style.display = 'none';
                }
            });
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
        }

        animate() {
            const tick = () => {
                if (!this.isPaused && this.mode === 'globe' && !this.isDragging) {
                    this.rotationYaw += this.autoSpinSpeed + this.velocityYaw;
                    this.rotationPitch += this.velocityPitch;
                    this.rotationPitch = clamp(this.rotationPitch, -1.1, 1.1);

                    this.velocityYaw *= 0.92;
                    this.velocityPitch *= 0.92;
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
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = Math.max(70, Math.min(width, height) * 0.365);

            const outer = ctx.createRadialGradient(
                centerX - (radius * 0.35),
                centerY - (radius * 0.4),
                radius * 0.12,
                centerX,
                centerY,
                radius
            );
            outer.addColorStop(0, '#62bcff');
            outer.addColorStop(0.45, '#2b79c1');
            outer.addColorStop(1, '#0f3558');

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fillStyle = outer;
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
            ctx.strokeStyle = 'rgba(130, 206, 242, 0.18)';
            ctx.lineWidth = 1;

            for (let lat = -60; lat <= 60; lat += 30) {
                this.drawGlobeLine(ctx, centerX, centerY, radius, lat, true);
            }

            for (let lng = -150; lng <= 150; lng += 30) {
                this.drawGlobeLine(ctx, centerX, centerY, radius, lng, false);
            }
        }

        drawGlobeLine(ctx, centerX, centerY, radius, value, isLatitude) {
            const steps = 72;
            let drawing = false;

            ctx.beginPath();
            for (let i = 0; i <= steps; i += 1) {
                const t = i / steps;
                const lat = isLatitude ? value : -90 + (t * 180);
                const lng = isLatitude ? -180 + (t * 360) : value;
                const projected = this.projectToGlobe(lat, lng, centerX, centerY, radius);

                if (projected && projected.visible) {
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
            CONTINENT_POLYGONS.forEach((polygon) => {
                const visiblePoints = [];

                polygon.forEach(([lng, lat]) => {
                    const projected = this.projectToGlobe(lat, lng, centerX, centerY, radius);
                    if (projected && projected.visible) {
                        visiblePoints.push(projected);
                    }
                });

                if (visiblePoints.length < 3) return;

                ctx.beginPath();
                visiblePoints.forEach((point, index) => {
                    if (index === 0) ctx.moveTo(point.x, point.y);
                    else ctx.lineTo(point.x, point.y);
                });
                ctx.closePath();
                ctx.fillStyle = 'rgba(86, 178, 116, 0.45)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(151, 238, 167, 0.35)';
                ctx.lineWidth = 0.9;
                ctx.stroke();
            });
        }

        drawGlobePoints(ctx, centerX, centerY, radius) {
            this.points.forEach((point) => {
                const projected = this.projectToGlobe(point.lat, point.lng, centerX, centerY, radius);
                if (!projected || !projected.visible) return;

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

            const bg = ctx.createLinearGradient(0, mapY, 0, mapY + mapHeight);
            bg.addColorStop(0, '#0b2f4f');
            bg.addColorStop(1, '#082640');
            ctx.fillStyle = bg;
            ctx.fillRect(mapX, mapY, mapWidth, mapHeight);

            ctx.strokeStyle = 'rgba(130, 206, 242, 0.2)';
            ctx.lineWidth = 1;
            for (let lng = -180; lng <= 180; lng += 30) {
                const x = mapX + (((lng + 180) / 360) * mapWidth);
                ctx.beginPath();
                ctx.moveTo(x, mapY);
                ctx.lineTo(x, mapY + mapHeight);
                ctx.stroke();
            }

            for (let lat = -60; lat <= 60; lat += 30) {
                const y = mapY + (((90 - lat) / 180) * mapHeight);
                ctx.beginPath();
                ctx.moveTo(mapX, y);
                ctx.lineTo(mapX + mapWidth, y);
                ctx.stroke();
            }

            CONTINENT_POLYGONS.forEach((polygon) => {
                ctx.beginPath();
                polygon.forEach(([lng, lat], index) => {
                    const point = this.projectToFlat(lat, lng, mapX, mapY, mapWidth, mapHeight);
                    if (index === 0) ctx.moveTo(point.x, point.y);
                    else ctx.lineTo(point.x, point.y);
                });
                ctx.closePath();
                ctx.fillStyle = 'rgba(86, 178, 116, 0.58)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(151, 238, 167, 0.42)';
                ctx.lineWidth = 1;
                ctx.stroke();
            });

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
            ctx.strokeStyle = 'rgba(139, 225, 255, 0.5)';
            ctx.lineWidth = 1.1;
            ctx.strokeRect(mapX, mapY, mapWidth, mapHeight);
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
            const cosYaw = Math.cos(this.rotationYaw);
            const sinYaw = Math.sin(this.rotationYaw);
            const cosPitch = Math.cos(this.rotationPitch);
            const sinPitch = Math.sin(this.rotationPitch);

            const xYaw = (vec.x * cosYaw) - (vec.z * sinYaw);
            const zYaw = (vec.x * sinYaw) + (vec.z * cosYaw);
            const yPitch = (vec.y * cosPitch) - (zYaw * sinPitch);
            const zPitch = (vec.y * sinPitch) + (zYaw * cosPitch);

            return {
                x: xYaw,
                y: yPitch,
                z: zPitch
            };
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
