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
        signupError: null
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
            authContainer: document.getElementById('auth-container'),
            authBtn: document.getElementById('auth-btn'),
            authBtnText: document.getElementById('auth-btn-text'),
            userDropdown: document.getElementById('user-dropdown'),
            userDisplayName: document.getElementById('user-display-name'),
            userAvatar: document.getElementById('user-avatar'),
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
            logoutBtn: document.getElementById('logout-btn')
        };
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Auth button click
        this.elements.authBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.user) {
                this.toggleDropdown();
            } else {
                this.showModal('login');
            }
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
            this.logout();
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.elements.authContainer?.contains(e.target)) {
                this.elements.userDropdown?.classList.remove('show');
            }
        });

        // Escape key closes modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideModal();
                this.elements.userDropdown?.classList.remove('show');
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
            const response = await fetch('/api/auth/me', {
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
     * Toggle user dropdown
     */
    toggleDropdown() {
        this.elements.userDropdown?.classList.toggle('show');
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
            const response = await fetch('/api/auth/login', {
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
            const response = await fetch('/api/auth/signup', {
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
            this.elements.authBtn?.classList.add('logged-in');
            this.elements.authBtnText.textContent = this.user.displayName;
            this.elements.userDisplayName.textContent = this.user.displayName;
            this.elements.authContainer?.classList.add('logged-in');
        } else {
            this.elements.authBtn?.classList.remove('logged-in');
            this.elements.authBtnText.textContent = 'LOG IN';
            this.elements.authContainer?.classList.remove('logged-in');
        }
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
