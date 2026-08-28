/**
 * Route-aware visual motion for v2.10.0.
 * Presentation only: no application state or network behavior lives here.
 */
'use strict';

(function initializeArcadeMotion() {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

    class ArcadeMotionController {
        constructor() {
            this.cleanups = [];
            this.activeView = null;
            this.onRouteEnter = this.onRouteEnter.bind(this);
            this.onRouteLeave = this.onRouteLeave.bind(this);
            window.addEventListener('abs:route-enter', this.onRouteEnter);
            window.addEventListener('abs:route-leave', this.onRouteLeave);
            window.addEventListener('pagehide', () => this.cancel());
        }

        cancel() {
            this.cleanups.splice(0).forEach((cleanup) => cleanup());
            if (this.activeView) {
                this.activeView.getAnimations().forEach((animation) => animation.cancel());
                this.activeView.classList.remove('arcade-route-enter');
            }
            this.activeView = null;
        }

        onRouteLeave() {
            this.cancel();
        }

        onRouteEnter(event) {
            this.cancel();
            const routeName = event.detail?.routeName;
            this.activeView = this.findView(routeName);
            if (!this.activeView || reducedMotion.matches) return;

            this.activeView.classList.remove('arcade-route-enter');
            void this.activeView.offsetWidth;
            this.activeView.classList.add('arcade-route-enter');

            const endRouteAnimation = () => this.activeView?.classList.remove('arcade-route-enter');
            this.activeView.addEventListener('animationend', endRouteAnimation, { once: true });
            this.cleanups.push(() => this.activeView?.removeEventListener('animationend', endRouteAnimation));

            if (finePointer.matches) this.bindTilt(this.activeView);
        }

        findView(routeName) {
            const viewId = {
                home: 'home-view', about: 'about-view', stats: 'stats-view', compare: 'compare-view',
                rankings: 'rankings-view', community: 'community-view', battlepoints: 'battlepoints-view',
                login: 'login-view', signup: 'signup-view', profile: 'profile-view'
            }[routeName];
            return viewId ? document.getElementById(viewId) : document.querySelector('.view-container.active-view');
        }

        bindTilt(view) {
            const selectors = [
                '.portal-nav-btn', '.portal-tournament-btn', '.character-card',
                '#compare-view .fighter-section', '.rankings-hero-banner', '.ranking-row',
                '.t-animal-card', '.globe-total-card'
            ];
            view.querySelectorAll(selectors.join(',')).forEach((element) => {
                element.dataset.arcadeTilt = '';
                const move = (event) => {
                    const rect = element.getBoundingClientRect();
                    const x = ((event.clientX - rect.left) / rect.width) - 0.5;
                    const y = ((event.clientY - rect.top) / rect.height) - 0.5;
                    element.style.setProperty('--tilt-x', `${(-y * 3.5).toFixed(2)}deg`);
                    element.style.setProperty('--tilt-y', `${(x * 4.5).toFixed(2)}deg`);
                };
                const leave = () => {
                    element.style.removeProperty('--tilt-x');
                    element.style.removeProperty('--tilt-y');
                };
                element.addEventListener('pointermove', move, { passive: true });
                element.addEventListener('pointerleave', leave, { passive: true });
                this.cleanups.push(() => {
                    element.removeEventListener('pointermove', move);
                    element.removeEventListener('pointerleave', leave);
                    element.removeAttribute('data-arcade-tilt');
                    leave();
                });
            });
        }
    }

    window.ArcadeMotion = new ArcadeMotionController();
})();
