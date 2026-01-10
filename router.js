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
        this.handleRoute(window.location.pathname);
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

        // Prevent duplicate navigation
        if (this.isNavigating) return;
        
        // Don't navigate if already on this route (unless forced)
        if (url === window.location.pathname && !options.force) return;

        this.isNavigating = true;

        // Check if we're opening an overlay route
        const isOverlayRoute = this.overlayRoutes.some(r => url.startsWith(r));
        const currentIsOverlay = this.overlayRoutes.some(r => window.location.pathname.startsWith(r));

        // Store base route when opening overlay
        if (isOverlayRoute && !currentIsOverlay) {
            this.baseRoute = window.location.pathname;
        }

        // Update browser history
        if (replace) {
            history.replaceState({ baseRoute: this.baseRoute }, '', url);
        } else {
            history.pushState({ baseRoute: this.baseRoute }, '', url);
        }

        // Handle the route
        if (!skipHandler) {
            this.handleRoute(url);
        }

        this.isNavigating = false;
    }

    /**
     * Handle popstate (back/forward navigation)
     */
    handlePopState(e) {
        // Restore base route if stored in state
        if (e.state?.baseRoute) {
            this.baseRoute = e.state.baseRoute;
        }
        this.handleRoute(window.location.pathname);
    }

    /**
     * Handle a route
     * @param {string} path - URL path to handle
     */
    handleRoute(path) {
        this.previousRoute = this.currentRoute;
        this.currentRoute = path;

        // Toggle page classes for header visibility and instant view display
        const html = document.documentElement;
        
        // Clear all route-specific classes first
        html.classList.remove('is-home', 'is-login', 'is-signup');
        
        // Add appropriate classes based on route
        if (path === '/' || path === '') {
            html.classList.add('is-home');
        } else if (path === '/login') {
            html.classList.add('is-home', 'is-login');
        } else if (path === '/signup') {
            html.classList.add('is-home', 'is-signup');
        }

        // Find matching route
        for (const route of this.routes) {
            const match = path.match(route.pattern);
            if (match) {
                // Extract params
                const params = {};
                route.paramNames.forEach((name, index) => {
                    params[name] = decodeURIComponent(match[index + 1]);
                });

                // Call handler
                route.handler(params);
                return;
            }
        }

        // No route matched - default to home or 404 behavior
        console.warn(`No route matched for: ${path}`);
        // Fallback to home
        this.navigate('/', { replace: true });
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
