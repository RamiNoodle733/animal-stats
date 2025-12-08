/**
 * Authentication Module for Animal Stats
 * Handles login, signup, and session management
 */

'use strict';

const Auth = {
    // Current user state
    user: null,
    token: null,

    // DOM Elements
    elements: {
        authContainer: null,
        authBtn: null,
        authBtnText: null,
        userDropdown: null,
        userDisplayName: null,
        userAvatar: null,
        authModal: null,
        loginForm: null,
        signupForm: null,
        loginError: null,
        signupError: null,
        // User Stats Bar elements
        userStatsBar: null,
        userProfileMini: null,
        userAvatarMini: null,
        userNameMini: null,
        userLevelBadge: null,
        xpBarFill: null,
        xpBarText: null,
        bpAmount: null,
        // Profile Modal elements
        profileModal: null,
        profileModalClose: null,
        profileAvatarLarge: null,
        profileUsername: null,
        profileLevelBadge: null,
        profileXpFill: null,
        profileXpText: null,
        profileBpValue: null,
        profileTotalXp: null,
        profileLevelValue: null,
        avatarGrid: null,
        avatarSearch: null,
        displayNameInput: null,
        saveDisplayNameBtn: null,
        profileMemberSince: null,
        profileBtn: null
    },

    /**
     * Initialize auth module
     */
    init() {
        this.cacheElements();
        this.bindEvents();
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
            profileLevelBadge: document.getElementById('profile-level-badge'),
            profileXpFill: document.getElementById('profile-xp-fill'),
            profileXpText: document.getElementById('profile-xp-text'),
            profileBpValue: document.getElementById('profile-bp-value'),
            profileTotalXp: document.getElementById('profile-total-xp'),
            profileLevelValue: document.getElementById('profile-level-value'),
            avatarGrid: document.getElementById('avatar-grid'),
            avatarSearch: document.getElementById('avatar-search'),
            displayNameInput: document.getElementById('display-name-input'),
            saveDisplayNameBtn: document.getElementById('save-display-name-btn'),
            profileMemberSince: document.getElementById('profile-member-since')
        };
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Login button click (when logged out)
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

        // Profile button
        this.elements.profileBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.openProfileModal();
        });

        // Profile modal close
        this.elements.profileModalClose?.addEventListener('click', () => this.closeProfileModal());
        this.elements.profileModal?.addEventListener('click', (e) => {
            if (e.target === this.elements.profileModal) this.closeProfileModal();
        });

        // Avatar search
        this.elements.avatarSearch?.addEventListener('input', (e) => this.filterAvatars(e.target.value));

        // Save display name
        this.elements.saveDisplayNameBtn?.addEventListener('click', () => this.saveDisplayName());
        this.elements.displayNameInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveDisplayName();
        });

        // Escape key closes modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideModal();
                this.closeProfileModal();
            }
        });
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
     * Show auth modal
     */
    showModal(type = 'login') {
        this.clearErrors();
        this.elements.loginForm.style.display = type === 'login' ? 'block' : 'none';
        this.elements.signupForm.style.display = type === 'signup' ? 'block' : 'none';
        this.elements.authModal.classList.add('show');
        
        // Focus first input
        setTimeout(() => {
            if (type === 'login') {
                document.getElementById('login-email')?.focus();
            } else {
                document.getElementById('signup-username')?.focus();
            }
        }, 100);
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
        fetch('/api/health', {
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
        if (this.user) {
            // Hide login button, show stats bar
            if (this.elements.authLoginBtn) {
                this.elements.authLoginBtn.style.display = 'none';
            }
            if (this.elements.userStatsBar) {
                this.elements.userStatsBar.style.display = 'flex';
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
        }
    },

    /**
     * Update user stats bar in header
     */
    updateUserStatsBar() {
        if (!this.user) return;

        const { displayName, level = 1, xp = 0, battlePoints = 0, profileAnimal } = this.user;

        // Calculate XP progress
        const xpForCurrentLevel = this.calculateXpForLevel(level);
        const xpForNextLevel = this.calculateXpForLevel(level + 1);
        const xpProgress = xp - xpForCurrentLevel;
        const xpNeeded = xpForNextLevel - xpForCurrentLevel;
        const xpPercentage = Math.min(100, Math.round((xpProgress / xpNeeded) * 100));

        // Update mini profile
        if (this.elements.userNameMini) {
            this.elements.userNameMini.textContent = displayName;
        }
        if (this.elements.userLevelBadge) {
            this.elements.userLevelBadge.textContent = `LV ${level}`;
        }
        if (this.elements.xpBarFill) {
            this.elements.xpBarFill.style.width = `${xpPercentage}%`;
        }
        if (this.elements.xpBarText) {
            this.elements.xpBarText.textContent = `${xpProgress} / ${xpNeeded} XP`;
        }
        if (this.elements.bpAmount) {
            this.elements.bpAmount.textContent = this.formatNumber(battlePoints);
        }

        // Update avatar
        this.updateAvatarDisplay(this.elements.userAvatarMini, profileAnimal);
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
     * Calculate XP needed for a level
     */
    calculateXpForLevel(level) {
        if (level <= 1) return 0;
        return Math.floor(100 * Math.pow(level - 1, 1.5));
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
     */
    async openProfileModal() {
        if (!this.user) return;

        // Fetch fresh profile data
        await this.fetchProfile();

        // Update profile modal UI
        this.updateProfileModal();

        // Populate avatar grid
        this.populateAvatarGrid();

        // Show modal
        this.elements.profileModal?.classList.add('active');
    },

    /**
     * Close profile modal
     */
    closeProfileModal() {
        this.elements.profileModal?.classList.remove('active');
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
            profileAnimal, createdAt, xpProgress, xpNeeded, xpPercentage 
        } = this.user;

        // Calculate XP if not provided
        const calcXpForLevel = this.calculateXpForLevel.bind(this);
        const currentLevelXp = calcXpForLevel(level);
        const nextLevelXp = calcXpForLevel(level + 1);
        const progress = xpProgress ?? (xp - currentLevelXp);
        const needed = xpNeeded ?? (nextLevelXp - currentLevelXp);
        const percentage = xpPercentage ?? Math.min(100, Math.round((progress / needed) * 100));

        // Update elements
        if (this.elements.profileUsername) {
            this.elements.profileUsername.textContent = displayName || username;
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
            this.elements.profileTotalXp.textContent = this.formatNumber(xp);
        }
        if (this.elements.profileLevelValue) {
            this.elements.profileLevelValue.textContent = level;
        }
        if (this.elements.displayNameInput) {
            this.elements.displayNameInput.value = displayName || '';
        }
        if (this.elements.profileMemberSince && createdAt) {
            const date = new Date(createdAt);
            this.elements.profileMemberSince.textContent = date.toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
        }

        // Update large avatar
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

        // Render grid
        this.elements.avatarGrid.innerHTML = sorted.slice(0, 100).map(animal => {
            const isSelected = animal.name.toLowerCase() === currentAnimal;
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
     * Select an avatar
     */
    async selectAvatar(animalName) {
        if (!this.token) return;

        try {
            const response = await fetch('/api/auth?action=profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ profileAnimal: animalName })
            });

            const result = await response.json();

            if (result.success) {
                this.user = { ...this.user, ...result.data.user };
                this.updateUserStatsBar();
                this.updateProfileModal();
                this.populateAvatarGrid(this.elements.avatarSearch?.value || '');
                this.showToast(`Avatar changed to ${animalName}!`);
            } else {
                this.showToast(result.error || 'Failed to update avatar');
            }
        } catch (error) {
            console.error('Avatar update error:', error);
            this.showToast('Error updating avatar');
        }
    },

    /**
     * Save display name
     */
    async saveDisplayName() {
        const newName = this.elements.displayNameInput?.value.trim();
        if (!newName || !this.token) return;

        if (newName.length > 30) {
            this.showToast('Display name must be 30 characters or less');
            return;
        }

        try {
            const response = await fetch('/api/auth?action=profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ displayName: newName })
            });

            const result = await response.json();

            if (result.success) {
                this.user = { ...this.user, ...result.data.user };
                this.updateUI();
                this.updateProfileModal();
                this.showToast('Display name updated!');
            } else {
                this.showToast(result.error || 'Failed to update name');
            }
        } catch (error) {
            console.error('Name update error:', error);
            this.showToast('Error updating name');
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
