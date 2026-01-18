/**
 * Mobile Scroll Lock with Cool Animation
 * Prevents page from scrolling normally on mobile
 * Triggers cool pop animation on animal images when scrolling
 */

class MobileScrollLock {
    constructor() {
        this.scrollTimeout = null;
        this.isAnimating = false;
        this.lastScrollPos = 0;
        this.scrollDirection = 0; // 1 for down, -1 for up
        
        this.init();
    }
    
    init() {
        // Only apply on mobile (max-width: 768px)
        if (window.innerWidth > 768) return;
        
        this.setupScrollLock();
        window.addEventListener('resize', () => this.handleResize());
    }
    
    handleResize() {
        // Reapply on resize if we hit mobile breakpoint
        if (window.innerWidth <= 768) {
            this.setupScrollLock();
        }
    }
    
    setupScrollLock() {
        // Prevent default scroll behavior
        document.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        
        // Listen for scroll events
        window.addEventListener('scroll', () => this.handleScroll());
    }
    
    handleWheel(e) {
        // Allow scroll on scrollable containers, lock on main page
        const target = e.target;
        const scrollableParent = this.findScrollableParent(target);
        
        if (!scrollableParent) {
            e.preventDefault();
            this.triggerScrollAnimation(e.deltaY);
        }
    }
    
    handleTouchMove(e) {
        const target = e.target;
        const scrollableParent = this.findScrollableParent(target);
        
        if (!scrollableParent) {
            e.preventDefault();
        }
    }
    
    handleScroll() {
        // Prevent page from scrolling
        if (window.scrollY !== 0) {
            window.scrollTo(0, 0);
        }
    }
    
    findScrollableParent(element) {
        let current = element;
        while (current) {
            if (current === document.body || current === document.documentElement) {
                return null;
            }
            
            const style = window.getComputedStyle(current);
            const hasOverflow = style.overflow === 'auto' || 
                               style.overflow === 'scroll' ||
                               style.overflowY === 'auto' ||
                               style.overflowY === 'scroll';
            
            if (hasOverflow && current.scrollHeight > current.clientHeight) {
                return current;
            }
            
            current = current.parentElement;
        }
        return null;
    }
    
    triggerScrollAnimation(delta) {
        this.scrollDirection = delta > 0 ? 1 : -1;
        
        // Get all animal images on current page
        const images = document.querySelectorAll(
            '.fighter-image, .fighter__image, #animal-1-image, #animal-2-image'
        );
        
        images.forEach(img => {
            if (img.style.display !== 'none') {
                this.animateImage(img);
            }
        });
        
        // Reset animation after scroll stops
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => this.resetAnimation(images), 300);
    }
    
    animateImage(img) {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        
        // Pop/grow animation based on scroll direction
        const scale = this.scrollDirection > 0 ? 1.15 : 0.92;
        const duration = 150;
        
        img.style.transition = `transform ${duration}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
        img.style.transform = `scale(${scale})`;
    }
    
    resetAnimation(images) {
        images.forEach(img => {
            img.style.transition = 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)';
            img.style.transform = 'scale(1)';
            
            setTimeout(() => {
                img.style.transition = '';
            }, 400);
        });
        
        this.isAnimating = false;
    }
}

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new MobileScrollLock());
} else {
    new MobileScrollLock();
}
