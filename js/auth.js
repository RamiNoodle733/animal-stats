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
            // Profile Page Elements (retro style)
            retroDisplayName: document.getElementById('retro-display-name'),
            retroUsername: document.getElementById('retro-username'),
            retroSaveBtn: document.getElementById('retro-save-btn'),
            retroUnsavedIndicator: document.getElementById('retro-unsaved-indicator'),
            retroLogoutBtn: document.getElementById('retro-logout-btn'),
            // Avatar Picker Modal
            avatarPickerModal: document.getElementById('avatar-picker-modal'),
            avatarPickerClose: document.getElementById('avatar-picker-close'),
            avatarGrid: document.getElementById('avatar-grid'),
            avatarSearch: document.getElementById('avatar-search'),
            avatarPreviewCurrent: document.getElementById('avatar-preview-current'),
            avatarPreviewName: document.getElementById('avatar-preview-name'),
            avatarSaveBtn: document.getElementById('avatar-save-btn'),
            avatarCancelBtn: document.getElementById('avatar-cancel-btn')
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

        // Profile link - use router for navigation
        this.elements.userProfileMini?.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.Router) {
                window.Router.navigate('/profile');
            }
        });
        
        // Logout button on profile page
        this.elements.retroLogoutBtn?.addEventListener('click', () => {
            this.logout();
        });

        // Avatar picker close
        this.elements.avatarPickerClose?.addEventListener('click', () => this.closeAvatarPicker());
        this.elements.avatarPickerModal?.addEventListener('click', (e) => {
            if (e.target === this.elements.avatarPickerModal) this.closeAvatarPicker();
        });
        
        // Avatar picker cancel button
        this.elements.avatarCancelBtn?.addEventListener('click', () => this.closeAvatarPicker());
        
        // Avatar picker save button
        this.elements.avatarSaveBtn?.addEventListener('click', () => this.saveAvatarSelection());

        // Avatar search
        this.elements.avatarSearch?.addEventListener('input', (e) => this.filterAvatars(e.target.value));

        // Profile page inputs - track changes
        this.elements.retroDisplayName?.addEventListener('input', (e) => {
            this.pendingChanges.displayName = e.target.value.trim();
            this.updateSaveButtonState();
        });

        this.elements.retroUsername?.addEventListener('input', (e) => {
            this.pendingChanges.username = e.target.value.trim();
            this.updateSaveButtonState();
        });

        // Save all changes button (profile page)
        this.elements.retroSaveBtn?.addEventListener('click', () => this.saveProfileChanges());

        // Escape key closes modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideModal();
                this.closeAvatarPicker();
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

        // Check if this element has an overlay (like the profile pic)
        const hasOverlay = element.classList.contains('clickable');
        const overlayHtml = hasOverlay ? `<div class="abs-avatar-overlay"><i class="fas fa-camera"></i><span>Change</span></div>` : '';

        if (animalName && window.app?.state?.animals) {
            const animal = window.app.state.animals.find(a => 
                a.name.toLowerCase() === animalName.toLowerCase()
            );
            if (animal?.image) {
                element.innerHTML = `<img src="${animal.image}" alt="${animalName}">${overlayHtml}`;
                return;
            }
        }
        // Default icon
        element.innerHTML = `<i class="fas fa-user-circle"></i>${overlayHtml}`;
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
     * Get current user
     */
    getUser() {
        return this.user;
    },

    /**
     * Initialize profile page with user data
     * Called when navigating to /profile
     */
    async initProfilePage() {
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

        // Populate edit form
        if (this.elements.retroDisplayName) {
            this.elements.retroDisplayName.value = this.user.displayName || '';
        }
        if (this.elements.retroUsername) {
            this.elements.retroUsername.value = this.user.username || '';
        }

        // Reset save button state
        this.updateSaveButtonState();
    },

    /**
     * Open avatar picker popup
     */
    openAvatarPicker() {
        // Store the current selection to restore if cancelled
        this.tempAvatarSelection = null;
        
        // Populate the avatar grid
        this.populateAvatarGrid();
        
        // Update preview with current avatar
        this.updateAvatarPickerPreview(this.user?.profileAnimal);
        
        // Disable save button initially (no selection made yet)
        if (this.elements.avatarSaveBtn) {
            this.elements.avatarSaveBtn.disabled = true;
        }
        
        this.elements.avatarPickerModal?.classList.add('active');
        
        // Clear search and focus it
        if (this.elements.avatarSearch) {
            this.elements.avatarSearch.value = '';
            this.elements.avatarSearch.focus();
        }
    },

    /**
     * Close avatar picker popup
     */
    closeAvatarPicker() {
        this.tempAvatarSelection = null;
        this.elements.avatarPickerModal?.classList.remove('active');
    },
    
    /**
     * Update the preview in the avatar picker
     */
    updateAvatarPickerPreview(animalName) {
        const animals = window.app?.state?.animals || [];
        const animal = animals.find(a => a.name.toLowerCase() === animalName?.toLowerCase());
        
        if (this.elements.avatarPreviewCurrent) {
            if (animal?.image && !animal.image.includes('via.placeholder')) {
                this.elements.avatarPreviewCurrent.innerHTML = `<img src="${animal.image}" alt="${animal.name}" onerror="this.src=FALLBACK_IMAGE">`;
            } else if (animal) {
                this.elements.avatarPreviewCurrent.innerHTML = `<img src="${FALLBACK_IMAGE}" alt="${animal.name}">`;
            } else {
                const initial = this.user?.displayName?.[0]?.toUpperCase() || '?';
                this.elements.avatarPreviewCurrent.innerHTML = `<span class="avatar-preview-initial">${initial}</span>`;
            }
        }
        
        if (this.elements.avatarPreviewName) {
            this.elements.avatarPreviewName.textContent = animal?.name || 'None';
        }
    },

    /**
     * Check if there are unsaved changes (profile page)
     */
    hasUnsavedChanges() {
        // Check if we're on the profile page
        if (!document.body.classList.contains('is-profile')) return false;

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

        if (this.elements.retroSaveBtn) {
            this.elements.retroSaveBtn.disabled = !hasChanges;
        }
        if (this.elements.retroUnsavedIndicator) {
            this.elements.retroUnsavedIndicator.classList.toggle('show', hasChanges);
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

        // Sort: current avatar first, then alphabetically
        const sorted = [...filteredAnimals].sort((a, b) => {
            const aSelected = a.name.toLowerCase() === currentAnimal;
            const bSelected = b.name.toLowerCase() === currentAnimal;
            if (aSelected && !bSelected) return -1;
            if (!aSelected && bSelected) return 1;
            return a.name.localeCompare(b.name);
        });

        // Render grid - show temp selection if any, otherwise current
        const selectedAnimal = this.tempAvatarSelection?.toLowerCase() ?? currentAnimal;
        this.elements.avatarGrid.innerHTML = sorted.slice(0, 100).map(animal => {
            const isSelected = animal.name.toLowerCase() === selectedAnimal?.toLowerCase();
            const imgSrc = (animal.image && !animal.image.includes('via.placeholder')) ? animal.image : FALLBACK_IMAGE;
            return `
                <div class="avatar-option ${isSelected ? 'selected' : ''}" 
                     data-animal="${animal.name}" 
                     title="${animal.name}">
                    <img src="${imgSrc}" alt="${animal.name}" loading="lazy"
                         onerror="this.src=FALLBACK_IMAGE">
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
     * Select an avatar (marks as temp selection in picker)
     */
    selectAvatar(animalName) {
        this.tempAvatarSelection = animalName;

        // Update visual selection in grid
        this.elements.avatarGrid?.querySelectorAll('.avatar-option').forEach(option => {
            option.classList.toggle('selected', option.dataset.animal === animalName);
        });

        // Update the preview in the picker
        this.updateAvatarPickerPreview(animalName);
        
        // Enable save button
        if (this.elements.avatarSaveBtn) {
            this.elements.avatarSaveBtn.disabled = false;
        }
    },
    
    /**
     * Save the avatar selection (called when clicking Save in picker)
     */
    async saveAvatarSelection() {
        if (!this.tempAvatarSelection || !this.token) return;
        
        const animalName = this.tempAvatarSelection;
        const btn = this.elements.avatarSaveBtn;
        
        // Show loading state
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }
        
        try {
            const response = await fetch('/api/auth?action=profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ profileAnimal: animalName })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Update local user data
                this.user.profileAnimal = animalName;
                
                // Update avatar display on profile page
                const profilePic = document.getElementById('retro-profile-pic');
                if (profilePic) {
                    this.updateAvatarDisplay(profilePic, animalName);
                }
                
                // Update avatar in the stats bar
                this.updateUserStatsBar();
                
                // Close the picker
                this.closeAvatarPicker();
                
                // Show success message
                this.showToast('Avatar updated!');
            } else {
                this.showToast(result.error || 'Failed to update avatar');
            }
        } catch (error) {
            console.error('Avatar save error:', error);
            this.showToast('Failed to save avatar');
        } finally {
            // Reset button
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-check"></i> Save Avatar';
            }
        }
    },

    /**
     * Save all profile changes
     */
    async saveProfileChanges() {
        if (!this.token || !this.hasUnsavedChanges()) return;

        const btn = this.elements.retroSaveBtn;
        if (btn) {
            btn.classList.add('saving');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
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
                this.updateSaveButtonState();

                // Update profile page if visible
                if (window.app?.updateProfilePage) {
                    window.app.updateProfilePage();
                }

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
