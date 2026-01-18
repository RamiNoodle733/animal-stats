/**
 * Mobile Section Scroll Animation
 * Adds cool animation to animal images and stats when scrolling within specific sections
 * Only targets the middle section on stats page and compare page
 */

class MobileSectionScrollAnimation {
    constructor() {
        this.lastScrollPos = 0;
        this.scrollTimeout = null;
        
        this.init();
    }
    
    init() {
        // Only apply on mobile (max-width: 768px)
        if (window.innerWidth > 768) return;
        
        // Setup scroll listeners for specific sections
        this.setupStatsPageAnimation();
        this.setupComparePageAnimation();
    }
    
    setupStatsPageAnimation() {
        // Find the middle section on stats page (the scrollable stats area)
        const statsContainer = document.querySelector('#stats-view .character-grid');
        if (!statsContainer) return;
        
        // Listen for scroll on the character grid
        statsContainer.addEventListener('scroll', (e) => {
            this.handleStatsScroll(e, statsContainer);
        });
    }
    
    setupComparePageAnimation() {
        // Find the fight-screen container on compare page
        const fightScreen = document.querySelector('#compare-view .fight-screen');
        if (!fightScreen) return;
        
        // We mainly just want to ensure it scrolls internally without moving the page
        // The page should not scroll when interacting with this area
        fightScreen.addEventListener('touchstart', () => {
            document.body.style.overscrollBehavior = 'contain';
        }, false);
        
        fightScreen.addEventListener('touchend', () => {
            document.body.style.overscrollBehavior = 'auto';
        }, false);
    }
    
    handleStatsScroll(e, container) {
        const scrollPos = container.scrollTop;
        const scrollDelta = scrollPos - this.lastScrollPos;
        
        // Get animal image and stat elements
        const animalImg = container.querySelector('.fighter-image, .fighter__image, img[id*="animal"]');
        const statPanels = container.querySelectorAll('.stats-panel, .stat-item');
        
        if (!animalImg) {
            this.lastScrollPos = scrollPos;
            return;
        }
        
        // Trigger animation based on scroll direction
        const moveDistance = Math.min(Math.abs(scrollDelta), 10);
        const direction = scrollDelta > 0 ? 1 : -1; // 1 = down, -1 = up
        
        // Move image based on scroll
        const translateY = direction * moveDistance * 0.5;
        
        animalImg.style.transition = 'none';
        animalImg.style.transform = `translateY(${translateY}px)`;
        
        // Also move stat panels slightly in opposite direction for parallax effect
        statPanels.forEach(panel => {
            panel.style.transition = 'none';
            panel.style.transform = `translateY(${-translateY * 0.3}px)`;
        });
        
        // Reset animation after scrolling stops
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => {
            animalImg.style.transition = 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)';
            animalImg.style.transform = 'translateY(0)';
            
            statPanels.forEach(panel => {
                panel.style.transition = 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)';
                panel.style.transform = 'translateY(0)';
            });
            
            // Clean up transition after animation
            setTimeout(() => {
                animalImg.style.transition = '';
                statPanels.forEach(panel => {
                    panel.style.transition = '';
                });
            }, 400);
        }, 150);
        
        this.lastScrollPos = scrollPos;
    }
}

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new MobileSectionScrollAnimation());
} else {
    new MobileSectionScrollAnimation();
}

