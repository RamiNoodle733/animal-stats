/**
 * ============================================
 * CORE - Shared Utilities & Configuration
 * ============================================
 * 
 * This file contains:
 * - Global configuration
 * - Helper functions used across all pages
 * - API configuration
 * - Shared constants
 */

'use strict';

// ========================================
// CONSTANTS
// ========================================

// Fallback placeholder image (inline SVG)
const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect fill='%23222' width='100' height='100'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='%23666' font-size='32' font-family='sans-serif'%3E%3F%3C/text%3E%3C/svg%3E";

// API Configuration
const API_CONFIG = {
    baseUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? '' 
        : '',
    endpoints: {
        animals: '/api/animals',
        search: '/api/search',
        random: '/api/random',
        stats: '/api/stats',
        health: '/api/animals?action=health',
        rankings: '/api/rankings',
        battles: '/api/battles',
        votes: '/api/votes',
        comments: '/api/comments',
        community: '/api/community',
        chat: '/api/chat'
    },
    useFallback: true
};

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Format number with commas (e.g., 1000 -> "1,000")
 */
function formatNumber(num) {
    if (num === null || num === undefined) return null;
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format stat with consistent decimals
 */
function formatStat(num, decimals = 1) {
    if (num === null || num === undefined) return null;
    if (num === 100) return '100';
    const fixed = Number(num).toFixed(decimals);
    const parts = fixed.split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.length > 1 ? `${intPart}.${parts[1]}` : intPart;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format relative time (e.g., "5m ago", "2h ago")
 */
function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
}

/**
 * Debounce function for search/filter inputs
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Generate URL-friendly slug from animal name
 */
function getAnimalSlug(animal) {
    if (!animal || !animal.name) return '';
    return animal.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Calculate tier grade from stat value
 */
function calculateTier(value) {
    if (value >= 90) return { letter: 'S', class: 'tier-s' };
    if (value >= 75) return { letter: 'A', class: 'tier-a' };
    if (value >= 55) return { letter: 'B', class: 'tier-b' };
    if (value >= 35) return { letter: 'C', class: 'tier-c' };
    if (value >= 20) return { letter: 'D', class: 'tier-d' };
    return { letter: 'F', class: 'tier-f' };
}

/**
 * Calculate overall grade for animal
 */
function calculateGrade(animal) {
    if (!animal) return 'F';
    
    const stats = [
        animal.attack || 0,
        animal.defense || 0,
        animal.agility || 0,
        animal.stamina || 0,
        animal.intelligence || 0,
        animal.special_attack || 0
    ];
    
    const avg = stats.reduce((a, b) => a + b, 0) / stats.length;
    
    if (avg >= 85) return 'S';
    if (avg >= 70) return 'A';
    if (avg >= 55) return 'B';
    if (avg >= 40) return 'C';
    if (avg >= 25) return 'D';
    return 'F';
}

/**
 * Get diet type from animal data
 */
function getDietType(animal) {
    if (!animal) return 'unknown';
    const diet = (animal.diet || '').toLowerCase();
    if (diet.includes('carnivor')) return 'carnivore';
    if (diet.includes('herbivor')) return 'herbivore';
    if (diet.includes('omnivor')) return 'omnivore';
    if (diet.includes('insectivor')) return 'insectivore';
    if (diet.includes('piscivor')) return 'piscivore';
    return 'other';
}

/**
 * Make API request with error handling
 */
async function apiRequest(endpoint, options = {}) {
    const url = API_CONFIG.baseUrl + endpoint;
    
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`API request failed: ${endpoint}`, error);
        throw error;
    }
}

/**
 * Make authenticated API request
 */
async function authApiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('authToken');
    
    return apiRequest(endpoint, {
        ...options,
        headers: {
            ...options.headers,
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
    });
}

// ========================================
// GLOBAL APP STATE
// ========================================

// Shared application state accessible by all modules
window.AppState = {
    animals: [],
    filteredAnimals: [],
    selectedAnimal: null,
    currentView: 'stats',
    isLoading: false,
    apiAvailable: false,
    
    // User preferences
    weightUnit: 'kg',
    speedUnit: 'kmh',
    
    // Filters
    filters: {
        search: '',
        class: 'all',
        diet: 'all',
        biome: 'all',
        sort: 'rank',
        classes: [],
        diets: [],
        biomes: []
    }
};

// ========================================
// EVENT BUS (for cross-module communication)
// ========================================

window.EventBus = {
    events: {},
    
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    },
    
    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    },
    
    emit(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach(callback => callback(data));
    }
};

// Export for use in other modules
window.CoreUtils = {
    formatNumber,
    formatStat,
    escapeHtml,
    formatTimeAgo,
    debounce,
    getAnimalSlug,
    calculateTier,
    calculateGrade,
    getDietType,
    apiRequest,
    authApiRequest,
    FALLBACK_IMAGE,
    API_CONFIG
};

console.log('[Core] Utilities loaded');
