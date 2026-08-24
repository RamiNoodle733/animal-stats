/**
 * Client-side Router for Animal Battle Stats
 * Provides URL-based routing with History API
 * 
 * Routes:
 * - /              Home page
 * - /stats         Stats view (default animal)
 * - /stats/:slug   Stats view with specific animal
 * - /compare       Compare view
 * - /rankings      Rankings view
 * - /community     Community view
 * - /tournament    Tournament modal/view
 * - /profile       Profile modal/view
 */

'use strict';


/**
 * Route asset loader registry.
 * Scripts/styles are injected once and cached for repeat navigations.
 */
const CHART_JS_URL = 'https://cdn.jsdelivr.net/npm/chart.js';
const ASSET_REVISION = '2.9.0';

function versionedAsset(path) {
    return `${path}?v=${ASSET_REVISION}`;
}

const ROUTE_ASSET_DEFINITIONS = {
    home: {
        styles: [versionedAsset('/css/pages/homepage.css')],
        scripts: [versionedAsset('/js/homepage.js'), versionedAsset('/js/social.js')]
    },
    about: {
        styles: [versionedAsset('/css/pages/homepage.css')],
        scripts: [versionedAsset('/js/social.js')]
    },
    stats: {
        styles: [],
        scripts: [CHART_JS_URL]
    },
    rankings: {
        styles: [versionedAsset('/css/pages/rankings.css')],
        scripts: [versionedAsset('/js/rankings.js')]
    },
    tournament: {
        styles: [versionedAsset('/tournament-v4.css'), versionedAsset('/css/pages/tournament.css')],
        scripts: [CHART_JS_URL, versionedAsset('/js/tournament.js')]
    },
    community: {
        styles: [
            versionedAsset('/community-page.css'),
            versionedAsset('/css/pages/community.css'),
            versionedAsset('/css/pages/community-globe.css')
        ],
        stylesAfterMobile: [versionedAsset('/css/pages/community-v2.css')],
        scripts: [
            CHART_JS_URL,
            versionedAsset('/js/community-globe.js'),
            versionedAsset('/js/community-manager.js'),
            versionedAsset('/js/community.js')
        ]
    },
    compare: {
        styles: [
            versionedAsset('/css/components/match-intro.css'),
            versionedAsset('/compare-page.css'),
            versionedAsset('/css/pages/compare.css')
        ],
        scripts: [CHART_JS_URL, versionedAsset('/js/compare.js')]
    },
    battlepoints: {
        styles: [versionedAsset('/css/pages/battlepoints.css')],
        scripts: [versionedAsset('/js/battlepoints.js')]
    }
};

const routeAssetPromises = new Map();
const routeStylePromises = new Map();
const routeScriptPromises = new Map();

function loadStylesheetOnce(href, options = {}) {
    const afterMobile = options.afterMobile === true;
    const cacheKey = `${href}:${afterMobile ? 'after-mobile' : 'before-mobile'}`;
    if (routeStylePromises.has(cacheKey)) return routeStylePromises.get(cacheKey);

    const existing = document.querySelector(`link[rel="stylesheet"][href="${href}"]`);
    if (existing) {
        const promise = Promise.resolve(existing);
        routeStylePromises.set(cacheKey, promise);
        return promise;
    }

    const promise = new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.dataset.routeAsset = 'true';
        link.onload = () => resolve(link);
        link.onerror = () => reject(new Error(`Failed to load stylesheet: ${href}`));
        // Route styles must remain before the mobile override sheet. Appending
        // them at the end caused the layout regressions that originally led to
        // every route stylesheet being loaded globally.
        const mobileOverrides = document.querySelector('link[rel="stylesheet"][href^="/css/mobile.css"]');
        if (afterMobile && mobileOverrides) {
            mobileOverrides.after(link);
        } else {
            document.head.insertBefore(link, mobileOverrides || null);
        }
    });

    routeStylePromises.set(cacheKey, promise);
    return promise;
}

function loadScriptOnce(src) {
    if (routeScriptPromises.has(src)) return routeScriptPromises.get(src);

    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
        const promise = Promise.resolve(existing);
        routeScriptPromises.set(src, promise);
        return promise;
    }

    const promise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.dataset.routeAsset = 'true';
        script.onload = () => resolve(script);
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.body.appendChild(script);
    });

    routeScriptPromises.set(src, promise);
    return promise;
}

function loadRouteAssets(routeName) {
    const assets = ROUTE_ASSET_DEFINITIONS[routeName];
    if (!assets) return Promise.resolve();
    if (routeAssetPromises.has(routeName)) return routeAssetPromises.get(routeName);

    const promise = (async () => {
        await Promise.all((assets.styles || []).map(loadStylesheetOnce));
        await Promise.all((assets.stylesAfterMobile || []).map((href) => (
            loadStylesheetOnce(href, { afterMobile: true })
        )));

        // Load scripts in order so route dependencies are available before managers initialize.
        for (const src of (assets.scripts || [])) {
            await loadScriptOnce(src);
        }
    })();

    routeAssetPromises.set(routeName, promise);
    return promise;
}

window.loadRouteAssets = loadRouteAssets;
window.routeAssetRegistry = {
    definitions: ROUTE_ASSET_DEFINITIONS,
    loaded: routeAssetPromises
};

class Router {
    constructor() {
        this.routes = [];
        this.currentRoute = null;
        this.previousRoute = null;
        this.isNavigating = false;
        
        // Store overlay states (tournament, profile)
        this.overlayRoutes = ['/tournament', '/profile'];
        this.baseRoute = null; // Route before overlay was opened
    }

    /**
     * Initialize the router
     */
    init() {
        // Handle browser back/forward navigation
        window.addEventListener('popstate', (e) => {
            this.handlePopState(e);
        });

        // Intercept link clicks for client-side navigation
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href]');
            if (link && this.shouldIntercept(link)) {
                e.preventDefault();
                this.navigate(link.getAttribute('href'));
            }
        });

        // Handle initial route
        this.handleRoute(this.normalizePath(window.location.pathname));
    }

    /**
     * Register a route handler
     * @param {string} path - Route pattern (supports :params)
     * @param {function} handler - Handler function
     */
    on(path, handler) {
        // Convert path to regex pattern
        const paramNames = [];
        const pattern = path.replace(/:[^/]+/g, (match) => {
            paramNames.push(match.slice(1));
            return '([^/]+)';
        });
        
        this.routes.push({
            path,
            pattern: new RegExp(`^${pattern}$`),
            paramNames,
            handler
        });
    }

    /**
     * Navigate to a URL
     * @param {string} url - URL to navigate to
     * @param {object} options - Navigation options
     */
    navigate(url, options = {}) {
        const { replace = false, skipHandler = false } = options;
        const normalizedUrl = this.normalizePath(url);
        const currentPath = this.normalizePath(window.location.pathname);

        // Prevent duplicate navigation
        if (this.isNavigating) return;
        
        // Don't navigate if already on this route (unless forced)
        if (normalizedUrl === currentPath && !options.force) return;

        this.isNavigating = true;

        // Check if we're opening an overlay route
        const isOverlayRoute = this.overlayRoutes.some(r => normalizedUrl === r || normalizedUrl.startsWith(`${r}/`));
        const currentIsOverlay = this.overlayRoutes.some(r => currentPath === r || currentPath.startsWith(`${r}/`));

        // Store base route when opening overlay
        if (isOverlayRoute && !currentIsOverlay) {
            this.baseRoute = currentPath;
        }

        // Update browser history
        if (replace) {
            history.replaceState({ baseRoute: this.baseRoute }, '', normalizedUrl);
        } else {
            history.pushState({ baseRoute: this.baseRoute }, '', normalizedUrl);
        }

        // Handle the route
        if (!skipHandler) {
            this.handleRoute(normalizedUrl);
        }

        this.isNavigating = false;
    }

    /**
     * Handle popstate (back/forward navigation)
     */
    handlePopState(e) {
        // Restore base route if stored in state
        if (e.state?.baseRoute) {
            this.baseRoute = this.normalizePath(e.state.baseRoute);
        }
        this.handleRoute(this.normalizePath(window.location.pathname));
    }

    /**
     * Handle a route
     * @param {string} path - URL path to handle
     */
    handleRoute(path) {
        const normalizedPath = this.normalizePath(path);

        this.previousRoute = this.currentRoute;
        this.currentRoute = normalizedPath;

        // Toggle page classes for header visibility and instant view display
        const html = document.documentElement;
        
        // Clear all route-specific classes first
        html.classList.remove('is-home', 'is-login', 'is-signup', 'is-forgot', 'is-reset', 'is-about');
        
        // Add appropriate classes based on route
        if (normalizedPath === '/' || normalizedPath === '') {
            html.classList.add('is-home');
        } else if (normalizedPath === '/login') {
            html.classList.add('is-home', 'is-login');
        } else if (normalizedPath === '/signup') {
            html.classList.add('is-home', 'is-signup');
        } else if (normalizedPath === '/forgot-password') {
            html.classList.add('is-home', 'is-login', 'is-forgot');
        } else if (normalizedPath === '/reset-password') {
            html.classList.add('is-home', 'is-login', 'is-reset');
        } else if (normalizedPath === '/about') {
            html.classList.add('is-home', 'is-about');
        }

        // Find matching route
        for (const route of this.routes) {
            const match = normalizedPath.match(route.pattern);
            if (match) {
                // Extract params
                const params = {};
                route.paramNames.forEach((name, index) => {
                    params[name] = decodeURIComponent(match[index + 1]);
                });

                // Call handler. Route handlers may lazily load assets before switching views.
                const result = route.handler(params);
                if (result && typeof result.catch === 'function') {
                    result.catch((error) => {
                        console.error(`Error handling route ${route.path}:`, error);
                    });
                }
                return;
            }
        }

        // No route matched - default to home or 404 behavior
        console.warn(`No route matched for: ${normalizedPath}`);
        // Fallback to home
        this.navigate('/', { replace: true });
    }

    normalizePath(pathOrUrl) {
        if (!pathOrUrl) return '/';

        let pathname = pathOrUrl;

        try {
            pathname = new URL(pathOrUrl, window.location.origin).pathname;
        } catch {
            pathname = String(pathOrUrl).split('?')[0].split('#')[0] || '/';
        }

        if (!pathname.startsWith('/')) {
            pathname = `/${pathname}`;
        }

        pathname = pathname.replace(/\/+/g, '/');

        if (pathname.length > 1) {
            pathname = pathname.replace(/\/+$/, '');
        }

        return pathname || '/';
    }

    /**
     * Go back in history, or to base route if in overlay
     */
    back() {
        const currentPath = window.location.pathname;
        const isOverlay = this.overlayRoutes.some(r => currentPath.startsWith(r));
        
        if (isOverlay && this.baseRoute) {
            // Navigate to the stored base route
            this.navigate(this.baseRoute);
            this.baseRoute = null;
        } else {
            // Use browser back
            history.back();
        }
    }

    /**
     * Check if a link should be intercepted for client-side routing
     */
    shouldIntercept(link) {
        // External links
        if (link.host !== window.location.host) return false;
        
        // Links with target="_blank"
        if (link.target === '_blank') return false;
        
        // Links with download attribute
        if (link.hasAttribute('download')) return false;
        
        // API routes
        if (link.pathname.startsWith('/api/')) return false;

        // Hash-only links
        if (link.getAttribute('href').startsWith('#')) return false;

        return true;
    }

    /**
     * Generate slug from animal name
     * @param {string} name - Animal name
     * @returns {string} URL-safe slug
     */
    static slugify(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    /**
     * Get current path
     */
    getCurrentPath() {
        return window.location.pathname;
    }

    /**
     * Check if current route matches a pattern
     */
    isRoute(pattern) {
        if (typeof pattern === 'string') {
            return window.location.pathname === pattern || 
                   window.location.pathname.startsWith(pattern + '/');
        }
        return pattern.test(window.location.pathname);
    }
}

// Create global router instance
window.Router = new Router();
