/**
 * High-performance userspace text layout engine.
 *
 * Goals:
 * - Avoid DOM text measurement loops
 * - Use canvas metrics with aggressive caching
 * - Provide deterministic, reusable text fitting and truncation
 */

'use strict';

(function initTextLayoutEngine() {
    class TextLayoutEngine {
        constructor() {
            this._canvas = null;
            this._ctx = null;
            this._widthCache = new Map();
            this._maxCacheEntries = 20000;
            this._pretext = null;
            this._pretextReady = false;
            this._pretextPreparedCache = new Map();

            this._loadPretext();
        }

        async _loadPretext() {
            try {
                const module = await import('https://esm.sh/@chenglou/pretext@0.0.2');
                if (module?.prepareWithSegments && module?.layoutWithLines) {
                    this._pretext = module;
                    this._pretextReady = true;
                    console.log('[TextLayout] Using @chenglou/pretext');
                }
            } catch {
                // Fallback to internal canvas strategy when CDN/modules are unavailable.
                this._pretextReady = false;
            }
        }

        _extractFontSizePx(font) {
            const match = String(font).match(/(\d+(?:\.\d+)?)px/);
            return match ? Number(match[1]) : 14;
        }

        _getPreparedPretext(text, font) {
            const key = `${font}|${text}`;
            const cached = this._pretextPreparedCache.get(key);
            if (cached) return cached;

            const prepared = this._pretext.prepareWithSegments(text, font);
            if (this._pretextPreparedCache.size > 4000) {
                const oldest = this._pretextPreparedCache.keys().next().value;
                if (oldest) this._pretextPreparedCache.delete(oldest);
            }
            this._pretextPreparedCache.set(key, prepared);
            return prepared;
        }

        _getContext() {
            if (this._ctx) return this._ctx;

            if (typeof OffscreenCanvas !== 'undefined') {
                this._canvas = new OffscreenCanvas(1, 1);
            } else {
                this._canvas = document.createElement('canvas');
                this._canvas.width = 1;
                this._canvas.height = 1;
            }

            this._ctx = this._canvas.getContext('2d');
            return this._ctx;
        }

        _normalizeText(text) {
            return String(text || '').replace(/\s+/g, ' ').trim();
        }

        _makeCacheKey(text, font, letterSpacingPx) {
            return `${font}|${letterSpacingPx}|${text}`;
        }

        _evictIfNeeded() {
            if (this._widthCache.size < this._maxCacheEntries) return;
            const iterator = this._widthCache.keys();
            const firstKey = iterator.next().value;
            if (firstKey) this._widthCache.delete(firstKey);
        }

        measureTextWidth(text, options = {}) {
            const normalized = this._normalizeText(text);
            if (!normalized) return 0;

            const font = options.font || "600 14px 'Inter', sans-serif";
            const letterSpacingPx = Number.isFinite(options.letterSpacingPx) ? options.letterSpacingPx : 0;
            const cacheKey = this._makeCacheKey(normalized, font, letterSpacingPx);

            const cached = this._widthCache.get(cacheKey);
            if (cached !== undefined) return cached;

            const ctx = this._getContext();
            ctx.font = font;

            const baseWidth = ctx.measureText(normalized).width;
            const width = baseWidth + Math.max(0, normalized.length - 1) * letterSpacingPx;

            this._evictIfNeeded();
            this._widthCache.set(cacheKey, width);
            return width;
        }

        ellipsize(text, maxWidth, options = {}) {
            const normalized = this._normalizeText(text);
            if (!normalized) return '';

            const safeMaxWidth = Math.max(0, Number(maxWidth) || 0);
            if (safeMaxWidth <= 0) return '';

            const font = options.font || "600 14px 'Inter', sans-serif";
            const letterSpacingPx = Number.isFinite(options.letterSpacingPx) ? options.letterSpacingPx : 0;
            const ellipsis = options.ellipsis || '...';

            const fullWidth = this.measureTextWidth(normalized, { font, letterSpacingPx });
            if (fullWidth <= safeMaxWidth) return normalized;

            const ellipsisWidth = this.measureTextWidth(ellipsis, { font, letterSpacingPx });
            if (ellipsisWidth > safeMaxWidth) return '';

            let low = 0;
            let high = normalized.length;
            let best = ellipsis;

            while (low <= high) {
                const mid = (low + high) >> 1;
                const candidate = `${normalized.slice(0, mid).trimEnd()}${ellipsis}`;
                const candidateWidth = this.measureTextWidth(candidate, { font, letterSpacingPx });

                if (candidateWidth <= safeMaxWidth) {
                    best = candidate;
                    low = mid + 1;
                } else {
                    high = mid - 1;
                }
            }

            return best;
        }

        fitTextToLines(text, maxWidth, options = {}) {
            const normalized = this._normalizeText(text);
            if (!normalized) {
                return { text: '', lines: [] };
            }

            const safeMaxWidth = Math.max(0, Number(maxWidth) || 0);
            if (safeMaxWidth <= 0) {
                return { text: '', lines: [] };
            }

            const maxLines = Math.max(1, Number(options.maxLines) || 1);
            const font = options.font || "600 14px 'Inter', sans-serif";
            const letterSpacingPx = Number.isFinite(options.letterSpacingPx) ? options.letterSpacingPx : 0;

            if (this._pretextReady && this._pretext) {
                try {
                    const prepared = this._getPreparedPretext(normalized, font);
                    const lineHeightPx = Number(options.lineHeightPx) || Math.max(14, this._extractFontSizePx(font) * 1.25);
                    const result = this._pretext.layoutWithLines(prepared, safeMaxWidth, lineHeightPx);

                    if (Array.isArray(result?.lines) && result.lines.length > 0) {
                        let lines = result.lines.map((line) => line.text);
                        if (lines.length > maxLines) {
                            lines = lines.slice(0, maxLines);
                            const lastIndex = lines.length - 1;
                            lines[lastIndex] = this.ellipsize(lines[lastIndex], safeMaxWidth, {
                                font,
                                letterSpacingPx,
                                ellipsis: options.ellipsis || '...'
                            });
                        }

                        return {
                            text: lines.join('\n'),
                            lines
                        };
                    }
                } catch {
                    // Fall through to canvas-based strategy.
                }
            }

            const words = normalized.split(' ');
            const lines = [];
            let current = '';

            const fits = (value) => this.measureTextWidth(value, { font, letterSpacingPx }) <= safeMaxWidth;

            for (let i = 0; i < words.length; i++) {
                const word = words[i];
                const candidate = current ? `${current} ${word}` : word;

                if (fits(candidate)) {
                    current = candidate;
                    continue;
                }

                if (!current) {
                    current = this.ellipsize(word, safeMaxWidth, { font, letterSpacingPx });
                }

                lines.push(current);
                current = word;

                if (lines.length === maxLines) {
                    const joined = lines.join(' ');
                    const trimmed = this.ellipsize(joined, safeMaxWidth * maxLines, { font, letterSpacingPx });
                    return {
                        text: trimmed,
                        lines: [trimmed]
                    };
                }
            }

            if (current) lines.push(current);

            if (lines.length <= maxLines) {
                return {
                    text: lines.join('\n'),
                    lines
                };
            }

            const kept = lines.slice(0, maxLines);
            const lastIndex = kept.length - 1;
            kept[lastIndex] = this.ellipsize(kept[lastIndex], safeMaxWidth, { font, letterSpacingPx });

            return {
                text: kept.join('\n'),
                lines: kept
            };
        }

        fitElement(element, options = {}) {
            if (!element) return '';

            const sourceAttr = options.sourceAttr || 'data-text-source';
            const providedSource = typeof options.sourceText === 'string' ? options.sourceText : null;

            const source = providedSource !== null
                ? providedSource
                : (element.getAttribute(sourceAttr) || element.textContent || '');

            const normalizedSource = this._normalizeText(source);
            if (!normalizedSource) {
                element.textContent = '';
                return '';
            }

            if (providedSource !== null || !element.hasAttribute(sourceAttr)) {
                element.setAttribute(sourceAttr, normalizedSource);
            }

            const computed = window.getComputedStyle(element);
            const font = options.font || `${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
            const letterSpacingPx = Number.isFinite(options.letterSpacingPx)
                ? options.letterSpacingPx
                : (Number.parseFloat(computed.letterSpacing) || 0);
            const maxLines = Math.max(1, Number(options.maxLines) || 1);
            const maxWidth = Math.max(0, Number(options.maxWidth) || element.clientWidth || 0);

            if (!maxWidth) {
                element.textContent = normalizedSource;
                return normalizedSource;
            }

            let fittedText;
            if (maxLines === 1) {
                fittedText = this.ellipsize(normalizedSource, maxWidth, {
                    font,
                    letterSpacingPx,
                    ellipsis: options.ellipsis || '...'
                });
            } else {
                const fitted = this.fitTextToLines(normalizedSource, maxWidth, {
                    maxLines,
                    font,
                    letterSpacingPx,
                    ellipsis: options.ellipsis || '...'
                });
                fittedText = fitted.lines.join(' ');
            }

            if (element.textContent !== fittedText) {
                element.textContent = fittedText;
            }

            if (fittedText !== normalizedSource) {
                element.setAttribute('title', normalizedSource);
            } else {
                element.removeAttribute('title');
            }

            return fittedText;
        }

        fitAll(selector, options = {}) {
            const elements = document.querySelectorAll(selector);
            elements.forEach((element) => {
                this.fitElement(element, options);
            });
        }
    }

    if (!window.TextLayoutEngine) {
        window.TextLayoutEngine = new TextLayoutEngine();
    }
})();
