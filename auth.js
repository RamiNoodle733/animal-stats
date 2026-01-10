/**
 * Authentication Module for Animal Stats
 * Handles login, signup, and session management
 */

'use strict';

const Auth = {
    // Current user state
    user: null,
    token: null,
    
    // Return URL after login/signup
    returnUrl: null,

    // Profile editing state
    pendingChanges: {
        displayName: null,
        profileAnimal: null
    },
    originalValues: {
        displayName: null,
        profileAnimal: null
    },

    // DOM Elements
    elements: {},

    /**
     * Initialize auth module
     */
    init() {
        this.cacheElements();
        this.bindEvents();
        this.bindPageEvents();
        this.bindCloseButtons();
        this.checkExistingSession();
    },

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            // Auth area
            authArea: document.getElementById('auth-area'),
            authLoginBtn: document.getElementById('auth-login-btn'),
            authModal: document.getElementById('auth-modal'),
            authModalClose: document.getElementById('auth-modal-close'),
            loginForm: document.getElementById('login-form'),
            signupForm: document.getElementById('signup-form'),
            loginError: document.getElementById('login-error'),
            signupError: document.getElementById('signup-error'),
            loginSubmit: document.getElementById('login-submit'),
            signupSubmit: document.getElementById('signup-submit'),
            showSignup: document.getElementById('show-signup'),
            showLogin: document.getElementById('show-login'),
            // Auth Page Elements
            loginPageForm: document.getElementById('login-page-form'),
            loginPageEmail: document.getElementById('login-page-email'),
            loginPagePassword: document.getElementById('login-page-password'),
            loginPageError: document.getElementById('login-page-error'),
            loginPageSubmit: document.getElementById('login-page-submit'),
            signupPageForm: document.getElementById('signup-page-form'),
            signupPageUsername: document.getElementById('signup-page-username'),
            signupPageEmail: document.getElementById('signup-page-email'),
            signupPagePassword: document.getElementById('signup-page-password'),
            signupPageError: document.getElementById('signup-page-error'),
            signupPageSubmit: document.getElementById('signup-page-submit'),
            // User Stats Bar
            userStatsBar: document.getElementById('user-stats-bar'),
            userProfileMini: document.getElementById('user-profile-mini'),
            userAvatarMini: document.getElementById('user-avatar-mini'),
            userNameMini: document.getElementById('user-name-mini'),
            userLevelBadge: document.getElementById('user-level-badge'),
            xpBarFill: document.getElementById('xp-bar-fill'),
            xpBarText: document.getElementById('xp-bar-text'),
            bpAmount: document.getElementById('bp-amount'),
            // Profile Dropdown
            profileDropdown: document.getElementById('profile-dropdown'),
            profileBtn: document.getElementById('profile-btn'),
            logoutBtn: document.getElementById('logout-btn'),
            // Profile Modal
            profileModal: document.getElementById('profile-modal'),
            profileModalClose: document.getElementById('profile-modal-close'),
            profileAvatarLarge: document.getElementById('profile-avatar-large'),
            profileUsername: document.getElementById('profile-username'),
            profileLoginUsername: document.getElementById('profile-login-username'),
            profileLevelBadge: document.getElementById('profile-level-badge'),
            profileXpFill: document.getElementById('profile-xp-fill'),
            profileXpText: document.getElementById('profile-xp-text'),
            profileBpValue: document.getElementById('profile-bp-value'),
            profileTotalXp: document.getElementById('profile-total-xp'),
            profileLevelValue: document.getElementById('profile-level-value'),
            avatarGrid: document.getElementById('avatar-grid'),
            avatarSearch: document.getElementById('avatar-search'),
            displayNameInput: document.getElementById('display-name-input'),
            usernameInput: document.getElementById('username-input'),
            usernameChangesRemaining: document.getElementById('username-changes-remaining'),
            profileMemberSince: document.getElementById('profile-member-since'),
            profileSaveBtn: document.getElementById('profile-save-btn'),
            profileUnsavedIndicator: document.getElementById('profile-unsaved-indicator'),
            // Avatar Picker Modal
            avatarPickerModal: document.getElementById('avatar-picker-modal'),
            avatarPickerClose: document.getElementById('avatar-picker-close')
        };
    },

    /**
     * Bind event listeners for modal forms (legacy)
     */
    bindEvents() {
        // Login button click (when logged out) - now navigates to page
        this.elements.authLoginBtn?.addEventListener('click', () => {
            this.showModal('login');
        });

        // Close modal
        this.elements.authModalClose?.addEventListener('click', () => this.hideModal());
        this.elements.authModal?.addEventListener('click', (e) => {
            if (e.target === this.elements.authModal) this.hideModal();
        });

        // Switch forms
        this.elements.showSignup?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showModal('signup');
        });
        this.elements.showLogin?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showModal('login');
        });

        // Submit forms
        this.elements.loginSubmit?.addEventListener('click', () => this.handleLogin());
        this.elements.signupSubmit?.addEventListener('click', () => this.handleSignup());

        // Enter key on inputs
        document.getElementById('login-password')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });
        document.getElementById('signup-confirm')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSignup();
        });

        // Logout
        this.elements.logoutBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.logout();
        });

        // Profile button - use router if available
        this.elements.profileBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.Router) {
                window.Router.navigate('/profile');
            } else {
                this.openProfileModal();
            }
        });

        // Profile modal close - with unsaved changes check
        this.elements.profileModalClose?.addEventListener('click', () => this.tryCloseProfileModal());
        this.elements.profileModal?.addEventListener('click', (e) => {
            if (e.target === this.elements.profileModal) this.tryCloseProfileModal();
        });

        // Avatar picker trigger - clicking the profile avatar header opens the picker
        this.elements.profileAvatarLarge?.addEventListener('click', () => this.openAvatarPicker());

        // Avatar picker close
        this.elements.avatarPickerClose?.addEventListener('click', () => this.closeAvatarPicker());
        this.elements.avatarPickerModal?.addEventListener('click', (e) => {
            if (e.target === this.elements.avatarPickerModal) this.closeAvatarPicker();
        });

        // Avatar search
        this.elements.avatarSearch?.addEventListener('input', (e) => this.filterAvatars(e.target.value));

        // Display name input - track changes (unlimited)
        this.elements.displayNameInput?.addEventListener('input', (e) => {
            this.pendingChanges.displayName = e.target.value.trim();
            this.updateSaveButtonState();
        });

        // Username input - track changes (3/week limit)
        this.elements.usernameInput?.addEventListener('input', (e) => {
            this.pendingChanges.username = e.target.value.trim();
            this.updateSaveButtonState();
        });

        // Save all changes button
        this.elements.profileSaveBtn?.addEventListener('click', () => this.saveProfileChanges());

        // Escape key closes modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideModal();
                this.closeAvatarPicker();
                this.tryCloseProfileModal();
            }
        });

        // Warn before leaving page with unsaved changes
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges()) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    },

    /**
     * Bind event listeners for auth page forms
     */
    bindPageEvents() {
        // Login page form submission
        this.elements.loginPageForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handlePageLogin();
        });

        // Signup page form submission
        this.elements.signupPageForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handlePageSignup();
        });

        // Enter key handlers for page forms
        this.elements.loginPagePassword?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handlePageLogin();
            }
        });

        this.elements.signupPagePassword?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handlePageSignup();
            }
        });
    },

    /**
     * Bind close button events for auth pages
     */
    bindCloseButtons() {
        const loginCloseBtn = document.getElementById('login-close-btn');
        const signupCloseBtn = document.getElementById('signup-close-btn');
        
        const handleClose = () => {
            // Check if we have a stored return URL
            if (this.returnUrl) {
                const returnTo = this.returnUrl;
                this.returnUrl = null;
                if (window.Router) {
                    window.Router.navigate(returnTo);
                }
            } else if (window.history.length > 1) {
                // Use browser back if we came from another page on the site
                window.history.back();
            } else {
                // Fallback to home if no history
                if (window.Router) {
                    window.Router.navigate('/');
                }
            }
        };
        
        loginCloseBtn?.addEventListener('click', handleClose);
        signupCloseBtn?.addEventListener('click', handleClose);
    },

    /**
     * Handle login from page form
     */
    async handlePageLogin() {
        const login = this.elements.loginPageEmail?.value.trim();
        const password = this.elements.loginPagePassword?.value;

        if (!login || !password) {
            this.showPageError('login', 'Please fill in all fields');
            return;
        }

        this.setPageLoading('login', true);

        try {
            const response = await fetch('/api/auth?action=login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login, password })
            });

            const result = await response.json();

            if (result.success) {
                this.token = result.data.token;
                this.user = result.data.user;
                localStorage.setItem('auth_token', this.token);
                this.updateUI();
                this.showToast(`Welcome back, ${this.user.displayName}!`);
                
                // Redirect to return URL or home after successful login
                if (window.Router) {
                    const returnTo = this.returnUrl || '/';
                    this.returnUrl = null; // Clear it
                    window.Router.navigate(returnTo);
                }
            } else {
                this.showPageError('login', result.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showPageError('login', 'Network error. Please try again.');
        } finally {
            this.setPageLoading('login', false);
        }
    },

    /**
     * Handle signup from page form
     */
    async handlePageSignup() {
        const username = this.elements.signupPageUsername?.value.trim();
        const email = this.elements.signupPageEmail?.value.trim();
        const password = this.elements.signupPagePassword?.value;

        // Validation
        if (!username || !email || !password) {
            this.showPageError('signup', 'Please fill in all fields');
            return;
        }

        if (password.length < 6) {
            this.showPageError('signup', 'Password must be at least 6 characters');
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            this.showPageError('signup', 'Username can only contain letters, numbers, and underscores');
            return;
        }

        this.setPageLoading('signup', true);

        try {
            const response = await fetch('/api/auth?action=signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            const result = await response.json();

            if (result.success) {
                this.token = result.data.token;
                this.user = result.data.user;
                localStorage.setItem('auth_token', this.token);
                this.updateUI();
                this.showToast(`Welcome to Animal Battle Stats, ${this.user.displayName}!`);
                
                // Redirect to return URL or home after successful signup
                if (window.Router) {
                    const returnTo = this.returnUrl || '/';
                    this.returnUrl = null; // Clear it
                    window.Router.navigate(returnTo);
                }
            } else {
                this.showPageError('signup', result.error || 'Signup failed');
            }
        } catch (error) {
            console.error('Signup error:', error);
            this.showPageError('signup', 'Network error. Please try again.');
        } finally {
            this.setPageLoading('signup', false);
        }
    },

    /**
     * Show error on auth page
     */
    showPageError(type, message) {
        const errorEl = type === 'login' ? this.elements.loginPageError : this.elements.signupPageError;
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.add('show');
        }
    },

    /**
     * Clear page errors
     */
    clearPageErrors() {
        this.elements.loginPageError?.classList.remove('show');
        this.elements.signupPageError?.classList.remove('show');
    },

    /**
     * Set loading state on page form
     */
    setPageLoading(type, loading) {
        const submitBtn = type === 'login' ? this.elements.loginPageSubmit : this.elements.signupPageSubmit;
        if (submitBtn) {
            submitBtn.disabled = loading;
            submitBtn.classList.toggle('loading', loading);
        }
    },

    /**
     * Check for existing session on page load
     */
    async checkExistingSession() {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        try {
            const response = await fetch('/api/auth?action=me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data.user) {
                    this.token = token;
                    this.user = result.data.user;
                    this.updateUI();
                    
                    // If on login/signup page and already logged in, redirect to home
                    if (window.Router) {
                        const path = window.location.pathname;
                        if (path === '/login' || path === '/signup') {
                            window.Router.navigate('/');
                        }
                    }
                }
            } else {
                // Token invalid, clear it
                localStorage.removeItem('auth_token');
            }
        } catch (error) {
            console.error('Session check failed:', error);
        }
    },

    /**
     * Show auth page (navigate to login/signup page)
     * @param {string} type - 'login' or 'signup'
     */
    showModal(type = 'login') {
        // Store current path for return navigation
        const currentPath = window.location.pathname;
        // Don't store auth pages as return URL
        if (currentPath !== '/login' && currentPath !== '/signup') {
            this.returnUrl = currentPath;
        }
        
        // Navigate to the auth page instead of showing modal
        if (window.Router) {
            window.Router.navigate(type === 'signup' ? '/signup' : '/login');
        }
    },

    /**
     * Hide auth modal
     */
    hideModal() {
        this.elements.authModal?.classList.remove('show');
        this.clearErrors();
        this.clearForms();
    },

    /**
     * Handle login form submission
     */
    async handleLogin() {
        const login = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        if (!login || !password) {
            this.showError('login', 'Please fill in all fields');
            return;
        }

        this.setLoading('login', true);

        try {
            const response = await fetch('/api/auth?action=login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login, password })
            });

            const result = await response.json();

            if (result.success) {
                this.token = result.data.token;
                this.user = result.data.user;
                localStorage.setItem('auth_token', this.token);
                this.updateUI();
                this.hideModal();
                this.showToast(`Welcome back, ${this.user.displayName}!`);
            } else {
                this.showError('login', result.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('login', 'Network error. Please try again.');
        } finally {
            this.setLoading('login', false);
        }
    },

    /**
     * Handle signup form submission
     */
    async handleSignup() {
        const username = document.getElementById('signup-username').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const confirm = document.getElementById('signup-confirm').value;

        // Validation
        if (!username || !email || !password || !confirm) {
            this.showError('signup', 'Please fill in all fields');
            return;
        }

        if (password !== confirm) {
            this.showError('signup', 'Passwords do not match');
            return;
        }

        if (password.length < 6) {
            this.showError('signup', 'Password must be at least 6 characters');
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            this.showError('signup', 'Username can only contain letters, numbers, and underscores');
            return;
        }

        this.setLoading('signup', true);

        try {
            const response = await fetch('/api/auth?action=signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            const result = await response.json();

            if (result.success) {
                this.token = result.data.token;
                this.user = result.data.user;
                localStorage.setItem('auth_token', this.token);
                this.updateUI();
                this.hideModal();
                this.showToast(`Welcome to Animal Stats, ${this.user.displayName}!`);
            } else {
                this.showError('signup', result.error || 'Signup failed');
            }
        } catch (error) {
            console.error('Signup error:', error);
            this.showError('signup', 'Network error. Please try again.');
        } finally {
            this.setLoading('signup', false);
        }
    },

    /**
     * Logout user
     */
    logout() {
        const username = this.user?.username || this.user?.displayName || 'Unknown';
        fetch('/api/animals?action=notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'logout', username })
        }).catch(() => {});
        this.user = null;
        this.token = null;
        localStorage.removeItem('auth_token');
        this.updateUI();
        this.elements.userDropdown?.classList.remove('show');
        this.showToast('You have been logged out');
    },

    /**
     * Update UI based on auth state
     */
    updateUI() {
        // Home page auth corner elements
        const homeAuthButtons = document.getElementById('home-auth-buttons');
        const homeProfileLink = document.getElementById('home-profile-link');
        const homeProfileAvatar = document.getElementById('home-profile-avatar');
        const homeProfileName = document.getElementById('home-profile-name');
        
        if (this.user) {
            // Hide login button, show stats bar
            if (this.elements.authLoginBtn) {
                this.elements.authLoginBtn.style.display = 'none';
            }
            if (this.elements.userStatsBar) {
                this.elements.userStatsBar.style.display = 'flex';
            }
            
            // Home page: hide auth buttons, show profile link
            if (homeAuthButtons) {
                homeAuthButtons.style.display = 'none';
            }
            if (homeProfileLink) {
                homeProfileLink.style.display = 'flex';
                // Update profile name
                if (homeProfileName) {
                    homeProfileName.textContent = this.user.displayName || 'Profile';
                }
                // Update avatar if user has one
                if (homeProfileAvatar && this.user.profileAnimal) {
                    homeProfileAvatar.innerHTML = `<img src="/images/animals/${this.user.profileAnimal}.png" alt="Profile">`;
                }
            }
            
            // Update user stats bar
            this.updateUserStatsBar();
        } else {
            // Show login button, hide stats bar
            if (this.elements.authLoginBtn) {
                this.elements.authLoginBtn.style.display = 'flex';
            }
            if (this.elements.userStatsBar) {
                this.elements.userStatsBar.style.display = 'none';
            }
            
            // Home page: show auth buttons, hide profile link
            if (homeAuthButtons) {
                homeAuthButtons.style.display = 'flex';
            }
            if (homeProfileLink) {
                homeProfileLink.style.display = 'none';
            }
        }
    },

    /**
     * Update user stats bar in header
     */
    updateUserStatsBar() {
        if (!this.user) return;

        const { 
            displayName, 
            level = 1, 
            xp = 0, 
            xpToNext,
            prestige = 0,
            battlePoints = 0, 
            profileAnimal,
            isPrestigeReady = false
        } = this.user;

        // Use server-provided xpToNext or calculate it
        const xpNeeded = xpToNext || this.xpToNextLevel(level);
        const xpPercentage = Math.min(100, Math.round((xp / xpNeeded) * 100));

        // Update mini profile
        if (this.elements.userNameMini) {
            this.elements.userNameMini.textContent = displayName;
        }
        if (this.elements.userLevelBadge) {
            // Show prestige if > 0
            const prestigeIcon = prestige > 0 ? `⭐${prestige} ` : '';
            this.elements.userLevelBadge.textContent = `${prestigeIcon}LV ${level}`;
        }
        if (this.elements.xpBarFill) {
            this.elements.xpBarFill.style.width = `${xpPercentage}%`;
            // Change color if prestige ready
            if (isPrestigeReady) {
                this.elements.xpBarFill.classList.add('prestige-ready');
            } else {
                this.elements.xpBarFill.classList.remove('prestige-ready');
            }
        }
        if (this.elements.xpBarText) {
            if (isPrestigeReady) {
                this.elements.xpBarText.textContent = 'PRESTIGE READY!';
            } else {
                this.elements.xpBarText.textContent = `${xp} / ${xpNeeded} XP`;
            }
        }
        if (this.elements.bpAmount) {
            this.elements.bpAmount.textContent = this.formatNumber(battlePoints);
        }

        // Update avatar
        this.updateAvatarDisplay(this.elements.userAvatarMini, profileAnimal);
    },

    /**
     * XP needed to level up (mirrors server-side xpSystem.js)
     * Formula: 25 + 3*x + 0.03*x^2 rounded to nearest 5
     */
    xpToNextLevel(level) {
        if (level >= 100) return Infinity;
        if (level < 1) return 25;
        
        const x = level - 1;
        const raw = 25 + 3 * x + 0.03 * x * x;
        return Math.max(25, Math.round(raw / 5) * 5);
    },

    /**
     * Update avatar display element with animal image or default icon
     */
    updateAvatarDisplay(element, animalName) {
        if (!element) return;

        if (animalName && window.app?.state?.animals) {
            const animal = window.app.state.animals.find(a => 
                a.name.toLowerCase() === animalName.toLowerCase()
            );
            if (animal?.image) {
                element.innerHTML = `<img src="${animal.image}" alt="${animalName}">`;
                return;
            }
        }
        // Default icon
        element.innerHTML = '<i class="fas fa-user-circle"></i>';
    },

    /**
     * Refresh user stats from the rewards API (call after earning XP/BP)
     */
    async refreshUserStats() {
        if (!this.isLoggedIn()) return;
        
        try {
            const response = await fetch('/api/auth?action=rewards', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.getToken()}`
                }
            });

            const result = await response.json();

            if (result.success) {
                // Update local user data with all progression fields
                this.user.xp = result.data.xp;
                this.user.level = result.data.level;
                this.user.xpToNext = result.data.xpToNext;
                this.user.prestige = result.data.prestige || 0;
                this.user.lifetimeXp = result.data.lifetimeXp || 0;
                this.user.battlePoints = result.data.battlePoints;
                this.user.isPrestigeReady = result.data.isPrestigeReady || false;
                
                // Save to localStorage
                localStorage.setItem('user', JSON.stringify(this.user));
                
                // Update UI
                this.updateUserStatsBar();
            }
        } catch (error) {
            console.error('Error refreshing user stats:', error);
        }
    },

    /**
     * Format number with commas
     */
    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },

    /**
     * Show error message
     */
    showError(form, message) {
        const errorEl = form === 'login' ? this.elements.loginError : this.elements.signupError;
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        }
    },

    /**
     * Clear all error messages
     */
    clearErrors() {
        if (this.elements.loginError) {
            this.elements.loginError.textContent = '';
            this.elements.loginError.style.display = 'none';
        }
        if (this.elements.signupError) {
            this.elements.signupError.textContent = '';
            this.elements.signupError.style.display = 'none';
        }
    },

    /**
     * Clear form inputs
     */
    clearForms() {
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
        document.getElementById('signup-username').value = '';
        document.getElementById('signup-email').value = '';
        document.getElementById('signup-password').value = '';
        document.getElementById('signup-confirm').value = '';
    },

    /**
     * Set loading state on submit button
     */
    setLoading(form, isLoading) {
        const btn = form === 'login' ? this.elements.loginSubmit : this.elements.signupSubmit;
        if (btn) {
            const text = btn.querySelector('.btn-text');
            const loader = btn.querySelector('.btn-loader');
            if (isLoading) {
                btn.disabled = true;
                text.style.display = 'none';
                loader.style.display = 'inline-block';
            } else {
                btn.disabled = false;
                text.style.display = 'inline';
                loader.style.display = 'none';
            }
        }
    },

    /**
     * Show toast notification
     */
    showToast(message) {
        // Remove existing toast
        const existing = document.querySelector('.auth-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'auth-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 10);

        // Remove after delay
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    /**
     * Get current user
     */
    getUser() {
        return this.user;
    },

    /**
     * Open profile modal
     * @param {boolean} updateUrl - Whether to update URL (default true)
     */
    async openProfileModal(updateUrl = true) {
        if (!this.user) return;

        // Fetch fresh profile data
        await this.fetchProfile();

        // Store original values for change detection
        this.originalValues = {
            displayName: this.user.displayName || '',
            username: this.user.username || '',
            profileAnimal: this.user.profileAnimal || null
        };

        // Reset pending changes
        this.pendingChanges = {
            displayName: null,
            username: null,
            profileAnimal: null
        };

        // Update profile modal UI
        this.updateProfileModal();

        // Reset save button state
        this.updateSaveButtonState();

        // Show modal
        this.elements.profileModal?.classList.add('active');
        
        // Update URL if requested
        if (updateUrl && window.Router) {
            window.Router.navigate('/profile', { skipHandler: true });
        }
    },

    /**
     * Try to close profile modal (check for unsaved changes)
     */
    tryCloseProfileModal() {
        if (this.hasUnsavedChanges()) {
            if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
                this.closeProfileModal();
            }
        } else {
            this.closeProfileModal();
        }
    },

    /**
     * Close profile modal
     */
    closeProfileModal() {
        this.elements.profileModal?.classList.remove('active');
        this.closeAvatarPicker();
        // Reset pending changes
        this.pendingChanges = { displayName: null, username: null, profileAnimal: null };
        
        // Navigate back using router
        if (window.Router && window.Router.getCurrentPath() === '/profile') {
            window.Router.back();
        }
    },

    /**
     * Open avatar picker popup
     */
    openAvatarPicker() {
        // Populate the avatar grid
        this.populateAvatarGrid();
        this.elements.avatarPickerModal?.classList.add('active');
        // Clear search and focus it
        if (this.elements.avatarSearch) {
            this.elements.avatarSearch.value = '';
        }
    },

    /**
     * Close avatar picker popup
     */
    closeAvatarPicker() {
        this.elements.avatarPickerModal?.classList.remove('active');
    },

    /**
     * Check if there are unsaved changes
     */
    hasUnsavedChanges() {
        if (!this.elements.profileModal?.classList.contains('active')) return false;

        const displayNameChanged = this.pendingChanges.displayName !== null && 
            this.pendingChanges.displayName !== this.originalValues.displayName;
        const usernameChanged = this.pendingChanges.username !== null && 
            this.pendingChanges.username !== this.originalValues.username;
        const avatarChanged = this.pendingChanges.profileAnimal !== null && 
            this.pendingChanges.profileAnimal !== this.originalValues.profileAnimal;

        return displayNameChanged || usernameChanged || avatarChanged;
    },

    /**
     * Update save button state based on pending changes
     */
    updateSaveButtonState() {
        const hasChanges = this.hasUnsavedChanges();

        if (this.elements.profileSaveBtn) {
            this.elements.profileSaveBtn.disabled = !hasChanges;
        }
        if (this.elements.profileUnsavedIndicator) {
            this.elements.profileUnsavedIndicator.classList.toggle('visible', hasChanges);
        }
    },

    /**
     * Fetch user profile from API
     */
    async fetchProfile() {
        if (!this.token) return;

        try {
            const response = await fetch('/api/auth?action=profile', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data.user) {
                    this.user = { ...this.user, ...result.data.user };
                    this.updateUserStatsBar();
                }
            }
        } catch (error) {
            console.error('Profile fetch error:', error);
        }
    },

    /**
     * Update profile modal with user data
     */
    updateProfileModal() {
        if (!this.user) return;

        const { 
            username, displayName, level = 1, xp = 0, battlePoints = 0, 
            profileAnimal, createdAt, xpToNext, prestige = 0, lifetimeXp = 0 
        } = this.user;

        // New XP system: xp is progress toward next level, xpToNext is amount needed
        const needed = xpToNext || this.xpToNextLevel(level);
        const progress = Math.max(0, xp); // xp is already progress, not cumulative
        const percentage = level >= 100 ? 100 : Math.min(100, Math.round((progress / needed) * 100));

        // Update elements
        if (this.elements.profileUsername) {
            this.elements.profileUsername.textContent = displayName || username;
        }
        if (this.elements.profileLoginUsername) {
            this.elements.profileLoginUsername.textContent = `@${username}`;
        }
        if (this.elements.profileLevelBadge) {
            this.elements.profileLevelBadge.textContent = `LEVEL ${level}`;
        }
        if (this.elements.profileXpFill) {
            this.elements.profileXpFill.style.width = `${percentage}%`;
        }
        if (this.elements.profileXpText) {
            this.elements.profileXpText.textContent = `${progress} / ${needed} XP`;
        }
        if (this.elements.profileBpValue) {
            this.elements.profileBpValue.textContent = this.formatNumber(battlePoints);
        }
        if (this.elements.profileTotalXp) {
            this.elements.profileTotalXp.textContent = this.formatNumber(lifetimeXp);
        }
        if (this.elements.profileLevelValue) {
            this.elements.profileLevelValue.textContent = level;
        }
        // Show prestige in profile if > 0
        if (this.elements.profileLevelBadge && prestige > 0) {
            this.elements.profileLevelBadge.textContent = `⭐${prestige} LEVEL ${level}`;
        }
        // Display name input (unlimited changes)
        if (this.elements.displayNameInput) {
            this.elements.displayNameInput.value = displayName || '';
        }
        // Username input (3/week limit)
        if (this.elements.usernameInput) {
            this.elements.usernameInput.value = username || '';
        }
        if (this.elements.profileMemberSince && createdAt) {
            const date = new Date(createdAt);
            this.elements.profileMemberSince.textContent = date.toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
        }

        // Update username changes remaining indicator
        if (this.elements.usernameChangesRemaining) {
            const remaining = this.user.usernameChangesRemaining ?? 3;
            this.elements.usernameChangesRemaining.textContent = `${remaining} change${remaining !== 1 ? 's' : ''} remaining this week`;
            this.elements.usernameChangesRemaining.classList.remove('warning', 'error');
            if (remaining === 0) {
                this.elements.usernameChangesRemaining.classList.add('error');
            } else if (remaining === 1) {
                this.elements.usernameChangesRemaining.classList.add('warning');
            }
        }

        // Update large avatar in profile header (this is now clickable to open picker)
        this.updateAvatarDisplay(this.elements.profileAvatarLarge, profileAnimal);
    },

    /**
     * Populate avatar grid with animals
     */
    populateAvatarGrid(filter = '') {
        if (!this.elements.avatarGrid) return;

        const animals = window.app?.state?.animals || [];
        const currentAnimal = this.user?.profileAnimal?.toLowerCase();

        // Filter animals
        const filteredAnimals = filter 
            ? animals.filter(a => a.name.toLowerCase().includes(filter.toLowerCase()))
            : animals;

        // Sort: selected first, then alphabetically
        const sorted = [...filteredAnimals].sort((a, b) => {
            const aSelected = a.name.toLowerCase() === currentAnimal;
            const bSelected = b.name.toLowerCase() === currentAnimal;
            if (aSelected && !bSelected) return -1;
            if (!aSelected && bSelected) return 1;
            return a.name.localeCompare(b.name);
        });

        // Render grid - show pending selection if any
        const selectedAnimal = this.pendingChanges.profileAnimal ?? currentAnimal;
        this.elements.avatarGrid.innerHTML = sorted.slice(0, 100).map(animal => {
            const isSelected = animal.name.toLowerCase() === selectedAnimal?.toLowerCase();
            return `
                <div class="avatar-option ${isSelected ? 'selected' : ''}" 
                     data-animal="${animal.name}" 
                     title="${animal.name}">
                    <img src="${animal.image}" alt="${animal.name}" loading="lazy"
                         onerror="this.src='https://via.placeholder.com/70?text=?'">
                </div>
            `;
        }).join('');

        // Add click handlers
        this.elements.avatarGrid.querySelectorAll('.avatar-option').forEach(option => {
            option.addEventListener('click', () => this.selectAvatar(option.dataset.animal));
        });
    },

    /**
     * Filter avatars based on search
     */
    filterAvatars(searchTerm) {
        this.populateAvatarGrid(searchTerm);
    },

    /**
     * Select an avatar (just marks as pending, doesn't save yet)
     */
    selectAvatar(animalName) {
        this.pendingChanges.profileAnimal = animalName;

        // Update visual selection in grid
        this.elements.avatarGrid?.querySelectorAll('.avatar-option').forEach(option => {
            option.classList.toggle('selected', option.dataset.animal === animalName);
        });

        // Update preview avatar in profile header
        this.updateAvatarDisplay(this.elements.profileAvatarLarge, animalName);

        // Close the avatar picker popup
        this.closeAvatarPicker();

        // Update save button state
        this.updateSaveButtonState();
    },

    /**
     * Save all profile changes
     */
    async saveProfileChanges() {
        if (!this.token || !this.hasUnsavedChanges()) return;

        const btn = this.elements.profileSaveBtn;
        if (btn) {
            btn.classList.add('saving');
            btn.innerHTML = '<i class="fas fa-spinner"></i> Saving...';
        }

        const updates = {};
        // Display name - unlimited changes
        if (this.pendingChanges.displayName !== null && 
            this.pendingChanges.displayName !== this.originalValues.displayName) {
            updates.displayName = this.pendingChanges.displayName;
        }
        // Username - 3/week limit (login credential)
        if (this.pendingChanges.username !== null && 
            this.pendingChanges.username !== this.originalValues.username) {
            updates.username = this.pendingChanges.username;
        }
        // Profile animal
        if (this.pendingChanges.profileAnimal !== null && 
            this.pendingChanges.profileAnimal !== this.originalValues.profileAnimal) {
            updates.profileAnimal = this.pendingChanges.profileAnimal;
        }

        try {
            const response = await fetch('/api/auth?action=profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(updates)
            });

            const result = await response.json();

            if (result.success) {
                this.user = { ...this.user, ...result.data.user };

                // Update original values
                this.originalValues = {
                    displayName: this.user.displayName || '',
                    username: this.user.username || '',
                    profileAnimal: this.user.profileAnimal || null
                };

                // Reset pending changes
                this.pendingChanges = { displayName: null, username: null, profileAnimal: null };

                // Update all UI
                this.updateUserStatsBar();
                this.updateProfileModal();
                this.updateSaveButtonState();

                // Update all user avatars on the page
                this.refreshAllUserAvatars();

                this.showToast('Profile saved successfully!');
            } else {
                this.showToast(result.error || 'Failed to save profile');
            }
        } catch (error) {
            console.error('Profile save error:', error);
            this.showToast('Error saving profile');
        } finally {
            if (btn) {
                btn.classList.remove('saving');
                btn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
            }
        }
    },

    /**
     * Refresh all user avatars displayed on the page
     */
    refreshAllUserAvatars() {
        if (!this.user) return;

        // Update all elements with data-user-avatar attribute
        document.querySelectorAll(`[data-user-id="${this.user.id}"]`).forEach(el => {
            const avatarEl = el.querySelector('.comment-avatar, .chat-avatar, .message-avatar');
            if (avatarEl) {
                this.updateAvatarDisplay(avatarEl, this.user.profileAnimal);
            }
        });

        // Also update any visible comments/chats (trigger re-render if needed)
        if (window.app?.refreshComments) {
            window.app.refreshComments();
        }
    },

    /**
     * Show a toast notification
     */
    showToast(message, duration = 3000) {
        // Remove existing toasts
        const existingToast = document.querySelector('.auth-toast');
        if (existingToast) existingToast.remove();

        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'auth-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Remove after duration
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    /**
     * Check if user is logged in
     */
    isLoggedIn() {
        return !!this.user;
    },

    /**
     * Get auth token
     */
    getToken() {
        return this.token;
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
});

// Export for use in other scripts
window.Auth = Auth;
