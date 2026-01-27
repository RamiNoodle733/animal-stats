/**
 * Social Links Module
 * Single source of truth for all social platform links and UI
 */

const SocialLinks = {
    // Platform data - single source of truth
    platforms: [
        {
            id: 'discord',
            name: 'Discord',
            url: 'https://discord.gg/BAaJFCXNTN',
            icon: 'fab fa-discord',
            color: '#5865F2',
            description: 'Join discussions, vote on matchups, suggest animals',
            ariaLabel: 'Join our Discord server'
        },
        {
            id: 'instagram',
            name: 'Instagram',
            url: 'https://www.instagram.com/animalbattlestats',
            icon: 'fab fa-instagram',
            color: '#E4405F',
            description: 'Clips, updates, and new features',
            ariaLabel: 'Follow us on Instagram'
        },
        {
            id: 'x',
            name: 'X',
            url: 'https://x.com/AnimalBattStats',
            icon: 'fab fa-x-twitter',
            iconFallback: 'X',
            color: '#ffffff',
            description: 'Fast updates + matchup posts',
            ariaLabel: 'Follow us on X (Twitter)'
        },
        {
            id: 'reddit',
            name: 'Reddit',
            url: 'https://www.reddit.com/r/AnimalBattleStats/',
            icon: 'fab fa-reddit-alien',
            color: '#FF4500',
            description: 'Forum-style threads and community debates',
            ariaLabel: 'Join our subreddit'
        },
        {
            id: 'github',
            name: 'GitHub',
            url: 'https://github.com/RamiNoodle733/animal-battle-stats',
            icon: 'fab fa-github',
            color: '#ffffff',
            description: 'Dev progress + issues + contributions',
            ariaLabel: 'View our GitHub repository'
        },
        {
            id: 'linkedin',
            name: 'LinkedIn',
            icon: 'fab fa-linkedin-in',
            color: '#0A66C2',
            ariaLabel: 'Connect on LinkedIn',
            hasChildren: true,
            children: [
                {
                    id: 'linkedin-personal',
                    name: 'Founder',
                    fullName: 'LinkedIn (Founder)',
                    url: 'https://www.linkedin.com/in/rami-abdelrazzaq-6742541bb/',
                    description: 'Founder updates and behind-the-scenes',
                    ariaLabel: 'Connect with the founder on LinkedIn'
                },
                {
                    id: 'linkedin-company',
                    name: 'ABS',
                    fullName: 'LinkedIn (ABS)',
                    url: 'https://www.linkedin.com/company/animal-battle-stats',
                    description: 'Official ABS announcements and milestones',
                    ariaLabel: 'Follow Animal Battle Stats on LinkedIn'
                }
            ]
        }
    ],

    // State
    popoverOpen: false,
    linkedInSubOpen: false,
    bottomSheetOpen: false,

    /**
     * Initialize social links UI
     */
    init() {
        this.renderHomepageFollow();
        this.renderAboutSection();
        this.setupEventListeners();
        this.setupAboutLinkNavigation();
        this.injectStyles();
        this.fixXIcon();
    },

    /**
     * Setup About link to use router navigation
     */
    setupAboutLinkNavigation() {
        const aboutLinks = document.querySelectorAll('a[href="/about"]');
        aboutLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.Router) {
                    window.Router.navigate('/about');
                } else {
                    window.location.href = '/about';
                }
            });
        });
    },

    /**
     * Fix X icon display by checking if Font Awesome loaded it properly
     */
    fixXIcon() {
        // Check after a short delay if the X icons are empty
        setTimeout(() => {
            document.querySelectorAll('[data-platform="x"] i').forEach(icon => {
                // Check if the icon is rendering as empty
                const computedStyle = window.getComputedStyle(icon, ':before');
                if (!computedStyle.content || computedStyle.content === 'none' || computedStyle.content === '""') {
                    // Replace with text fallback
                    icon.className = '';
                    icon.textContent = '𝕏';
                    icon.style.fontFamily = 'system-ui, sans-serif';
                    icon.style.fontWeight = '900';
                    icon.style.fontSize = '1.2rem';
                }
            });
        }, 500);
    },

    /**
     * Render the FOLLOW button in homepage footer
     */
    renderHomepageFollow() {
        const footer = document.querySelector('.portal-footer');
        if (!footer) return;

        // Create follow button container
        const followContainer = document.createElement('div');
        followContainer.className = 'social-follow-container';
        followContainer.innerHTML = `
            <div class="portal-footer-divider"></div>
            <button class="social-follow-btn" 
                    id="social-follow-btn"
                    aria-expanded="false" 
                    aria-controls="social-popover"
                    aria-label="Open social links">
                <i class="fas fa-share-nodes"></i>
                <span>FOLLOW</span>
            </button>
            
            <!-- Desktop Popover -->
            <div class="social-popover" id="social-popover" role="dialog" aria-label="Social links">
                <div class="social-popover-arrow"></div>
                <div class="social-popover-content">
                    <div class="social-popover-grid">
                        ${this.renderPopoverIcons()}
                    </div>
                    
                    <!-- LinkedIn Sub-menu -->
                    <div class="social-linkedin-sub" id="social-linkedin-sub" aria-hidden="true">
                        <div class="social-linkedin-sub-header">
                            <button class="social-linkedin-back" aria-label="Back to main menu">
                                <i class="fas fa-chevron-left"></i>
                            </button>
                            <span>Choose LinkedIn</span>
                        </div>
                        <div class="social-linkedin-options">
                            ${this.renderLinkedInOptions()}
                        </div>
                    </div>
                </div>
            </div>
        `;

        footer.appendChild(followContainer);
        
        // Append bottom sheet to body (not footer) to avoid z-index stacking context issues
        // Footer has z-index: 20 which creates a stacking context, limiting child z-index
        if (!document.getElementById('social-bottom-sheet')) {
            const bottomSheet = document.createElement('div');
            bottomSheet.className = 'social-bottom-sheet';
            bottomSheet.id = 'social-bottom-sheet';
            bottomSheet.setAttribute('role', 'dialog');
            bottomSheet.setAttribute('aria-label', 'Social links');
            bottomSheet.setAttribute('aria-hidden', 'true');
            bottomSheet.innerHTML = `
                <div class="social-bottom-sheet-overlay"></div>
                <div class="social-bottom-sheet-content">
                    <div class="social-bottom-sheet-handle"></div>
                    <h3 class="social-bottom-sheet-title">Connect With Us</h3>
                    <div class="social-bottom-sheet-list">
                        ${this.renderBottomSheetItems()}
                    </div>
                </div>
            `;
            document.body.appendChild(bottomSheet);
        }
    },

    /**
     * Render popover icon buttons
     */
    renderPopoverIcons() {
        return this.platforms.map(platform => {
            if (platform.hasChildren) {
                return `
                    <button class="social-popover-icon social-popover-icon--linkedin"
                            data-platform="${platform.id}"
                            aria-label="${platform.ariaLabel}"
                            aria-haspopup="true">
                        <i class="${platform.icon}"></i>
                        <span class="social-tooltip">${platform.name}</span>
                        <span class="social-popover-icon-badge">2</span>
                    </button>
                `;
            }
            
            return `
                <a href="${platform.url}" 
                   class="social-popover-icon"
                   data-platform="${platform.id}"
                   target="_blank"
                   rel="noopener noreferrer"
                   aria-label="${platform.ariaLabel}">
                    <i class="${platform.icon}"></i>
                    <span class="social-tooltip">${platform.name}</span>
                </a>
            `;
        }).join('');
    },

    /**
     * Render LinkedIn sub-options for popover
     */
    renderLinkedInOptions() {
        const linkedin = this.platforms.find(p => p.id === 'linkedin');
        if (!linkedin || !linkedin.children) return '';

        return linkedin.children.map(child => `
            <a href="${child.url}"
               class="social-linkedin-option"
               target="_blank"
               rel="noopener noreferrer"
               aria-label="${child.ariaLabel}">
                <i class="fab fa-linkedin-in"></i>
                <span>${child.name}</span>
            </a>
        `).join('');
    },

    /**
     * Render mobile bottom sheet items
     */
    renderBottomSheetItems() {
        let items = [];
        
        this.platforms.forEach(platform => {
            if (platform.hasChildren) {
                // Render each LinkedIn option separately for mobile
                platform.children.forEach(child => {
                    items.push(`
                        <a href="${child.url}"
                           class="social-bottom-sheet-item"
                           target="_blank"
                           rel="noopener noreferrer"
                           aria-label="${child.ariaLabel}">
                            <div class="social-bottom-sheet-item-icon" style="--platform-color: ${platform.color}">
                                <i class="${platform.icon}"></i>
                            </div>
                            <div class="social-bottom-sheet-item-info">
                                <span class="social-bottom-sheet-item-name">${child.fullName}</span>
                                <span class="social-bottom-sheet-item-desc">${child.description}</span>
                            </div>
                            <i class="fas fa-external-link-alt social-bottom-sheet-item-arrow"></i>
                        </a>
                    `);
                });
            } else {
                items.push(`
                    <a href="${platform.url}"
                       class="social-bottom-sheet-item"
                       target="_blank"
                       rel="noopener noreferrer"
                       aria-label="${platform.ariaLabel}">
                        <div class="social-bottom-sheet-item-icon" style="--platform-color: ${platform.color}">
                            <i class="${platform.icon}"></i>
                        </div>
                        <div class="social-bottom-sheet-item-info">
                            <span class="social-bottom-sheet-item-name">${platform.name}</span>
                            <span class="social-bottom-sheet-item-desc">${platform.description}</span>
                        </div>
                        <i class="fas fa-external-link-alt social-bottom-sheet-item-arrow"></i>
                    </a>
                `);
            }
        });
        
        return items.join('');
    },

    /**
     * Render About page Connect section
     */
    renderAboutSection() {
        const aboutContent = document.querySelector('.about-content');
        if (!aboutContent) return;

        // Create the Connect section
        const connectSection = document.createElement('div');
        connectSection.className = 'about-connect-section';
        connectSection.innerHTML = `
            <h2 class="about-connect-title">
                <i class="fas fa-satellite-dish"></i>
                Connect & Follow
            </h2>
            <p class="about-connect-subtitle">Join our community across these platforms</p>
            <div class="about-connect-grid">
                ${this.renderAboutCards()}
            </div>
        `;

        // Insert after the first paragraph or heading
        const firstP = aboutContent.querySelector('p');
        if (firstP) {
            firstP.after(connectSection);
        } else {
            aboutContent.appendChild(connectSection);
        }
    },

    /**
     * Render About page cards
     */
    renderAboutCards() {
        let cards = [];
        
        this.platforms.forEach(platform => {
            if (platform.hasChildren) {
                // Render each LinkedIn as separate card
                platform.children.forEach(child => {
                    cards.push(this.createAboutCard({
                        id: child.id,
                        name: child.fullName,
                        url: child.url,
                        icon: platform.icon,
                        color: platform.color,
                        description: child.description,
                        ariaLabel: child.ariaLabel
                    }));
                });
            } else {
                cards.push(this.createAboutCard(platform));
            }
        });
        
        return cards.join('');
    },

    /**
     * Create a single About page card
     */
    createAboutCard(platform) {
        return `
            <a href="${platform.url}" 
               class="about-connect-card" 
               data-platform="${platform.id}"
               target="_blank"
               rel="noopener noreferrer"
               aria-label="${platform.ariaLabel}">
                <div class="about-connect-card-icon" style="--platform-color: ${platform.color}">
                    <i class="${platform.icon}"></i>
                </div>
                <div class="about-connect-card-content">
                    <h3 class="about-connect-card-name">${platform.name}</h3>
                    <p class="about-connect-card-desc">${platform.description}</p>
                </div>
                <i class="fas fa-arrow-right about-connect-card-arrow"></i>
                <div class="about-connect-card-glow"></div>
            </a>
        `;
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const followBtn = document.getElementById('social-follow-btn');
        const popover = document.getElementById('social-popover');
        const bottomSheet = document.getElementById('social-bottom-sheet');
        const linkedInSub = document.getElementById('social-linkedin-sub');
        
        if (!followBtn) return;

        // Follow button click
        followBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.innerWidth <= 600) {
                this.toggleBottomSheet();
            } else {
                this.togglePopover();
            }
        });

        // Desktop hover behavior
        const container = document.querySelector('.social-follow-container');
        if (container) {
            let hoverTimeout;
            
            container.addEventListener('mouseenter', () => {
                if (window.innerWidth > 600) {
                    clearTimeout(hoverTimeout);
                    this.openPopover();
                }
            });
            
            container.addEventListener('mouseleave', () => {
                if (window.innerWidth > 600 && !this.linkedInSubOpen) {
                    hoverTimeout = setTimeout(() => {
                        this.closePopover();
                    }, 200);
                }
            });
        }

        // LinkedIn button in popover
        const linkedInBtn = popover?.querySelector('.social-popover-icon--linkedin');
        if (linkedInBtn) {
            linkedInBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showLinkedInSub();
            });
        }

        // LinkedIn back button
        const linkedInBack = linkedInSub?.querySelector('.social-linkedin-back');
        if (linkedInBack) {
            linkedInBack.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hideLinkedInSub();
            });
        }

        // Click outside to close
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.social-follow-container')) {
                this.closePopover();
            }
            if (e.target.closest('.social-bottom-sheet-overlay')) {
                this.closeBottomSheet();
            }
        });

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closePopover();
                this.closeBottomSheet();
            }
        });

        // Close popover when clicking a link
        popover?.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                setTimeout(() => this.closePopover(), 100);
            });
        });

        // Close bottom sheet when clicking a link
        bottomSheet?.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                setTimeout(() => this.closeBottomSheet(), 100);
            });
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth <= 600) {
                this.closePopover();
            } else {
                this.closeBottomSheet();
            }
        });
    },

    /**
     * Toggle popover
     */
    togglePopover() {
        if (this.popoverOpen) {
            this.closePopover();
        } else {
            this.openPopover();
        }
    },

    /**
     * Open popover
     */
    openPopover() {
        const btn = document.getElementById('social-follow-btn');
        const popover = document.getElementById('social-popover');
        if (!btn || !popover) return;

        this.popoverOpen = true;
        btn.setAttribute('aria-expanded', 'true');
        popover.classList.add('social-popover--open');
        btn.classList.add('social-follow-btn--active');
        
        // Hide LinkedIn sub
        this.hideLinkedInSub();
    },

    /**
     * Close popover
     */
    closePopover() {
        const btn = document.getElementById('social-follow-btn');
        const popover = document.getElementById('social-popover');
        if (!btn || !popover) return;

        this.popoverOpen = false;
        btn.setAttribute('aria-expanded', 'false');
        popover.classList.remove('social-popover--open');
        btn.classList.remove('social-follow-btn--active');
        
        // Also hide LinkedIn sub
        this.hideLinkedInSub();
    },

    /**
     * Show LinkedIn sub-menu
     */
    showLinkedInSub() {
        const linkedInSub = document.getElementById('social-linkedin-sub');
        const popover = document.getElementById('social-popover');
        if (!linkedInSub || !popover) return;

        this.linkedInSubOpen = true;
        linkedInSub.setAttribute('aria-hidden', 'false');
        popover.classList.add('social-popover--linkedin-active');
    },

    /**
     * Hide LinkedIn sub-menu
     */
    hideLinkedInSub() {
        const linkedInSub = document.getElementById('social-linkedin-sub');
        const popover = document.getElementById('social-popover');
        if (!linkedInSub || !popover) return;

        this.linkedInSubOpen = false;
        linkedInSub.setAttribute('aria-hidden', 'true');
        popover.classList.remove('social-popover--linkedin-active');
    },

    /**
     * Toggle bottom sheet
     */
    toggleBottomSheet() {
        if (this.bottomSheetOpen) {
            this.closeBottomSheet();
        } else {
            this.openBottomSheet();
        }
    },

    /**
     * Open bottom sheet
     */
    openBottomSheet() {
        const btn = document.getElementById('social-follow-btn');
        const bottomSheet = document.getElementById('social-bottom-sheet');
        if (!btn || !bottomSheet) return;

        this.bottomSheetOpen = true;
        btn.setAttribute('aria-expanded', 'true');
        bottomSheet.classList.add('social-bottom-sheet--open');
        bottomSheet.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    },

    /**
     * Close bottom sheet
     */
    closeBottomSheet() {
        const btn = document.getElementById('social-follow-btn');
        const bottomSheet = document.getElementById('social-bottom-sheet');
        if (!btn || !bottomSheet) return;

        this.bottomSheetOpen = false;
        btn.setAttribute('aria-expanded', 'false');
        bottomSheet.classList.remove('social-bottom-sheet--open');
        bottomSheet.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    },

    /**
     * Inject CSS styles
     */
    injectStyles() {
        if (document.getElementById('social-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'social-styles';
        style.textContent = `
            /* ========================================
               SOCIAL FOLLOW BUTTON
               ======================================== */
            .social-follow-container {
                display: flex;
                align-items: center;
                gap: 12px;
                position: relative;
            }
            
            .social-follow-btn {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 6px 12px;
                background: rgba(0, 212, 255, 0.1);
                border: 1px solid rgba(0, 212, 255, 0.3);
                border-radius: 20px;
                color: rgba(255, 255, 255, 0.7);
                font-family: var(--font-body, 'Inter', sans-serif);
                font-size: 0.65rem;
                font-weight: 600;
                letter-spacing: 1px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .social-follow-btn i {
                font-size: 0.7rem;
                color: #00d4ff;
            }
            
            .social-follow-btn:hover,
            .social-follow-btn--active {
                background: rgba(0, 212, 255, 0.2);
                border-color: rgba(0, 212, 255, 0.5);
                color: #fff;
                box-shadow: 0 0 15px rgba(0, 212, 255, 0.3);
            }
            
            .social-follow-btn:focus-visible {
                outline: 2px solid #00d4ff;
                outline-offset: 2px;
            }
            
            /* ========================================
               DESKTOP POPOVER
               ======================================== */
            .social-popover {
                position: absolute;
                bottom: calc(100% + 15px);
                right: 0;
                width: 180px;
                min-height: 160px;
                padding: 16px;
                padding-top: 40px;
                background: linear-gradient(180deg, rgba(10, 20, 35, 0.98) 0%, rgba(5, 10, 20, 0.98) 100%);
                border: 1px solid rgba(0, 212, 255, 0.3);
                border-radius: 12px;
                box-shadow: 
                    0 10px 40px rgba(0, 0, 0, 0.5),
                    0 0 30px rgba(0, 212, 255, 0.1),
                    inset 0 1px 0 rgba(255, 255, 255, 0.05);
                opacity: 0;
                visibility: hidden;
                transform: translateY(10px) scale(0.95);
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                z-index: 1000;
                overflow: visible;
            }
            
            .social-popover--open {
                opacity: 1;
                visibility: visible;
                transform: translateY(0) scale(1);
            }
            
            .social-popover-arrow {
                position: absolute;
                bottom: -8px;
                right: 24px;
                width: 16px;
                height: 16px;
                background: rgba(5, 10, 20, 0.98);
                border-right: 1px solid rgba(0, 212, 255, 0.3);
                border-bottom: 1px solid rgba(0, 212, 255, 0.3);
                transform: rotate(45deg);
            }
            
            .social-popover-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 8px;
                transition: opacity 0.2s ease, transform 0.2s ease;
            }
            
            .social-popover--linkedin-active .social-popover-grid {
                opacity: 0;
                transform: translateX(-20px);
                pointer-events: none;
            }
            
            .social-popover-icon {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 42px;
                height: 42px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                color: rgba(255, 255, 255, 0.8);
                font-size: 1.1rem;
                text-decoration: none;
                cursor: pointer;
                transition: all 0.2s ease;
                position: relative;
            }
            
            .social-popover-icon:hover {
                background: rgba(0, 212, 255, 0.15);
                border-color: rgba(0, 212, 255, 0.4);
                color: #fff;
                transform: scale(1.1);
                box-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
            }
            
            .social-popover-icon:focus-visible {
                outline: 2px solid #00d4ff;
                outline-offset: 2px;
            }
            
            .social-popover-icon-badge {
                position: absolute;
                top: -4px;
                right: -4px;
                width: 16px;
                height: 16px;
                background: #00d4ff;
                border-radius: 50%;
                font-size: 0.6rem;
                font-weight: 700;
                color: #000;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            /* Tooltip */
            .social-tooltip {
                position: absolute;
                bottom: calc(100% + 8px);
                left: 50%;
                transform: translateX(-50%);
                padding: 4px 8px;
                background: rgba(0, 0, 0, 0.9);
                border-radius: 4px;
                font-size: 0.65rem;
                font-weight: 500;
                color: #fff;
                white-space: nowrap;
                opacity: 0;
                visibility: hidden;
                transition: all 0.15s ease;
                pointer-events: none;
                z-index: 10;
            }
            
            .social-popover-icon:hover .social-tooltip {
                opacity: 1;
                visibility: visible;
            }
            
            /* LinkedIn Sub-menu */
            .social-linkedin-sub {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                padding: 16px;
                background: linear-gradient(180deg, rgba(10, 20, 35, 0.98) 0%, rgba(5, 10, 20, 0.98) 100%);
                border-radius: 12px;
                opacity: 0;
                visibility: hidden;
                transform: translateX(20px);
                transition: all 0.2s ease;
                display: flex;
                flex-direction: column;
            }
            
            .social-popover--linkedin-active .social-linkedin-sub {
                opacity: 1;
                visibility: visible;
                transform: translateX(0);
            }
            
            .social-linkedin-sub-header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 12px;
                padding-bottom: 10px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .social-linkedin-back {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 28px;
                height: 28px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                color: #00d4ff;
                font-size: 0.75rem;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .social-linkedin-back:hover {
                background: rgba(0, 212, 255, 0.15);
                border-color: rgba(0, 212, 255, 0.4);
            }
            
            .social-linkedin-sub-header span {
                font-size: 0.8rem;
                font-weight: 600;
                color: rgba(255, 255, 255, 0.8);
                letter-spacing: 0.5px;
            }
            
            .social-linkedin-options {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .social-linkedin-option {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 12px;
                background: rgba(10, 102, 194, 0.1);
                border: 1px solid rgba(10, 102, 194, 0.3);
                border-radius: 8px;
                color: #fff;
                text-decoration: none;
                font-size: 0.85rem;
                font-weight: 500;
                transition: all 0.2s ease;
            }
            
            .social-linkedin-option i {
                font-size: 1rem;
                color: #0A66C2;
            }
            
            .social-linkedin-option:hover {
                background: rgba(10, 102, 194, 0.2);
                border-color: rgba(10, 102, 194, 0.5);
                box-shadow: 0 0 15px rgba(10, 102, 194, 0.3);
            }
            
            /* ========================================
               MOBILE BOTTOM SHEET
               ======================================== */
            .social-bottom-sheet {
                position: fixed;
                inset: 0;
                z-index: 99999;
                display: flex;
                align-items: flex-end;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s ease, visibility 0.3s ease;
            }
            
            .social-bottom-sheet--open {
                opacity: 1;
                visibility: visible;
            }
            
            .social-bottom-sheet-overlay {
                position: absolute;
                inset: 0;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(4px);
            }
            
            .social-bottom-sheet-content {
                position: relative;
                width: 100%;
                max-height: 85vh;
                padding: 12px 16px 24px;
                padding-bottom: calc(24px + env(safe-area-inset-bottom, 0));
                background: linear-gradient(180deg, rgba(15, 25, 40, 0.98) 0%, rgba(8, 15, 25, 0.98) 100%);
                border-top: 1px solid rgba(0, 212, 255, 0.3);
                border-radius: 20px 20px 0 0;
                overflow-y: auto;
                transform: translateY(100%);
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .social-bottom-sheet--open .social-bottom-sheet-content {
                transform: translateY(0);
            }
            
            .social-bottom-sheet-handle {
                width: 40px;
                height: 4px;
                margin: 0 auto 16px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 2px;
            }
            
            .social-bottom-sheet-title {
                font-family: var(--font-display, 'Bebas Neue', sans-serif);
                font-size: 1.3rem;
                letter-spacing: 2px;
                color: #fff;
                text-align: center;
                margin-bottom: 16px;
            }
            
            .social-bottom-sheet-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .social-bottom-sheet-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 14px;
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 12px;
                text-decoration: none;
                color: #fff;
                transition: all 0.2s ease;
            }
            
            .social-bottom-sheet-item:active {
                background: rgba(0, 212, 255, 0.1);
                border-color: rgba(0, 212, 255, 0.3);
                transform: scale(0.98);
            }
            
            .social-bottom-sheet-item-icon {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 44px;
                height: 44px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid var(--platform-color, rgba(255, 255, 255, 0.2));
                border-radius: 10px;
                font-size: 1.2rem;
                color: var(--platform-color, #fff);
                flex-shrink: 0;
            }
            
            .social-bottom-sheet-item-info {
                flex: 1;
                min-width: 0;
            }
            
            .social-bottom-sheet-item-name {
                display: block;
                font-size: 0.95rem;
                font-weight: 600;
                color: #fff;
                margin-bottom: 2px;
            }
            
            .social-bottom-sheet-item-desc {
                display: block;
                font-size: 0.75rem;
                color: rgba(255, 255, 255, 0.5);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .social-bottom-sheet-item-arrow {
                font-size: 0.75rem;
                color: rgba(255, 255, 255, 0.3);
                flex-shrink: 0;
            }
            
            /* ========================================
               ABOUT PAGE CONNECT SECTION
               ======================================== */
            .about-connect-section {
                margin: 40px 0;
                width: 100%;
            }
            
            .about-connect-title {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                font-family: var(--font-display, 'Bebas Neue', sans-serif);
                font-size: 1.8rem;
                letter-spacing: 3px;
                color: #fff;
                margin-bottom: 8px;
            }
            
            .about-connect-title i {
                color: #00d4ff;
                font-size: 1.4rem;
            }
            
            .about-connect-subtitle {
                text-align: center;
                font-size: 0.9rem;
                color: rgba(255, 255, 255, 0.5);
                margin-bottom: 24px;
            }
            
            .about-connect-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 16px;
            }
            
            .about-connect-card {
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 24px 16px;
                background: linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(0, 0, 0, 0.1) 100%);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 12px;
                text-decoration: none;
                color: #fff;
                overflow: hidden;
                transition: all 0.3s ease;
            }
            
            .about-connect-card:hover {
                transform: translateY(-4px);
                border-color: rgba(0, 212, 255, 0.4);
                box-shadow: 
                    0 10px 30px rgba(0, 0, 0, 0.3),
                    0 0 20px rgba(0, 212, 255, 0.1);
            }
            
            .about-connect-card-icon {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 56px;
                height: 56px;
                background: rgba(255, 255, 255, 0.05);
                border: 2px solid var(--platform-color, rgba(255, 255, 255, 0.2));
                border-radius: 14px;
                font-size: 1.6rem;
                color: var(--platform-color, #fff);
                margin-bottom: 14px;
                transition: all 0.3s ease;
            }
            
            .about-connect-card:hover .about-connect-card-icon {
                background: rgba(var(--platform-color-rgb, 0, 212, 255), 0.15);
                transform: scale(1.1);
                box-shadow: 0 0 25px rgba(var(--platform-color-rgb, 0, 212, 255), 0.3);
            }
            
            .about-connect-card-content {
                text-align: center;
                flex: 1;
            }
            
            .about-connect-card-name {
                font-family: var(--font-display, 'Bebas Neue', sans-serif);
                font-size: 1.1rem;
                letter-spacing: 2px;
                color: #fff;
                margin: 0 0 6px 0;
            }
            
            .about-connect-card-desc {
                font-size: 0.75rem;
                color: rgba(255, 255, 255, 0.5);
                line-height: 1.4;
                margin: 0;
            }
            
            .about-connect-card-arrow {
                position: absolute;
                bottom: 12px;
                right: 12px;
                font-size: 0.75rem;
                color: rgba(255, 255, 255, 0.2);
                transition: all 0.2s ease;
            }
            
            .about-connect-card:hover .about-connect-card-arrow {
                color: #00d4ff;
                transform: translateX(3px);
            }
            
            .about-connect-card-glow {
                position: absolute;
                inset: -50%;
                background: radial-gradient(circle at center, var(--platform-color, rgba(0, 212, 255, 0.1)) 0%, transparent 70%);
                opacity: 0;
                transition: opacity 0.3s ease;
                pointer-events: none;
            }
            
            .about-connect-card:hover .about-connect-card-glow {
                opacity: 0.15;
            }
            
            /* Tablet: 2 columns */
            @media (max-width: 900px) {
                .about-connect-grid {
                    grid-template-columns: repeat(2, 1fr);
                }
            }
            
            /* Mobile: 1 column */
            @media (max-width: 600px) {
                .about-connect-grid {
                    grid-template-columns: 1fr;
                }
                
                .about-connect-card {
                    flex-direction: row;
                    align-items: center;
                    padding: 16px;
                    gap: 14px;
                }
                
                .about-connect-card-icon {
                    width: 48px;
                    height: 48px;
                    font-size: 1.3rem;
                    margin-bottom: 0;
                    flex-shrink: 0;
                }
                
                .about-connect-card-content {
                    text-align: left;
                }
                
                .about-connect-card-arrow {
                    position: static;
                    margin-left: auto;
                }
                
                .about-connect-title {
                    font-size: 1.5rem;
                }
                
                /* Hide desktop popover on mobile */
                .social-popover {
                    display: none !important;
                }
            }
            
            /* Desktop: hide bottom sheet */
            @media (min-width: 601px) {
                .social-bottom-sheet {
                    display: none !important;
                }
            }
            
            /* Very small screens */
            @media (max-width: 360px) {
                .social-follow-btn span {
                    display: none;
                }
                
                .social-follow-btn {
                    padding: 8px;
                    border-radius: 50%;
                }
                
                .social-follow-btn i {
                    font-size: 0.9rem;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SocialLinks.init());
} else {
    SocialLinks.init();
}

// Export for use elsewhere
window.SocialLinks = SocialLinks;
