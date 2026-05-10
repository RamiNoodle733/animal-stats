/**
 * Shared moderation helpers for public names and user-generated content.
 *
 * Blocked terms can be configured with a comma-separated environment variable:
 *   MODERATION_BLOCKED_TERMS="term one,term two"
 * or the legacy alias:
 *   BANNED_WORDS="term one,term two"
 *
 * If no environment variable is set, terms are loaded from config/moderation.json.
 */

const moderationConfig = require('../config/moderation.json');

const SEPARATOR_PATTERN = /[\s\-_.|/\\]+/g;
const SEPARATOR_REGEX_SOURCE = '[\\s\\-_.|/\\\\]*';
const LEET_MAP = {
    '0': 'o',
    '1': 'i',
    '!': 'i',
    '|': 'i',
    '3': 'e',
    '4': 'a',
    '@': 'a',
    '5': 's',
    '$': 's',
    '7': 't',
    '+': 't',
    '8': 'b'
};
const CHAR_VARIANTS = {
    a: 'a4@',
    b: 'b8',
    e: 'e3',
    i: 'i1!|',
    o: 'o0',
    s: 's5$',
    t: 't7+'
};

function parseEnvTerms(value) {
    if (!value) return [];
    return value
        .split(',')
        .map(term => term.trim())
        .filter(Boolean);
}

function getConfiguredTerms() {
    const envTerms = parseEnvTerms(process.env.MODERATION_BLOCKED_TERMS || process.env.BANNED_WORDS);
    if (envTerms.length > 0) return envTerms;

    if (Array.isArray(moderationConfig.blockedTerms)) {
        return moderationConfig.blockedTerms;
    }

    return [];
}

function replaceLeetCharacters(text) {
    return text.replace(/[0134578!|@$+]/g, char => LEET_MAP[char] || char);
}

function normalizeForModeration(text) {
    return String(text || '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(SEPARATOR_PATTERN, '')
        .replace(/(.)\1+/g, '$1')
        .split('')
        .map(char => LEET_MAP[char] || char)
        .join('')
        .replace(/[^a-z0-9]/g, '');
}

function normalizeText(text) {
    return normalizeForModeration(text);
}

function getBlockedTerms() {
    return getConfiguredTerms()
        .map(term => ({ raw: term, normalized: normalizeForModeration(term) }))
        .filter(term => term.normalized.length > 0);
}

function containsBlockedTerm(text) {
    const normalizedText = normalizeForModeration(text);
    if (!normalizedText) return false;

    return getBlockedTerms().some(term => normalizedText.includes(term.normalized));
}

function escapeRegexChar(char) {
    return char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function characterPattern(char) {
    const normalizedChar = replaceLeetCharacters(char.toLowerCase());
    const variants = CHAR_VARIANTS[normalizedChar] || normalizedChar;
    const escapedVariants = variants.split('').map(escapeRegexChar).join('');
    return `[${escapedVariants}]+`;
}

function buildTermRegex(term) {
    const normalizedTerm = normalizeForModeration(term);
    if (!normalizedTerm) return null;

    const pattern = normalizedTerm
        .split('')
        .map(characterPattern)
        .join(SEPARATOR_REGEX_SOURCE);

    return new RegExp(pattern, 'gi');
}

function maskMatch(match) {
    const visibleLength = normalizeForModeration(match).length;
    return '*'.repeat(Math.max(4, visibleLength));
}

function maskBlockedTerms(text) {
    let masked = String(text || '');

    getConfiguredTerms().forEach((term) => {
        const regex = buildTermRegex(term);
        if (!regex) return;
        masked = masked.replace(regex, maskMatch);
    });

    return masked;
}

function validatePublicName(text) {
    const value = String(text || '').trim();

    if (!value) {
        return {
            valid: false,
            error: 'Public name cannot be empty'
        };
    }

    if (containsBlockedTerm(value)) {
        return {
            valid: false,
            error: 'Public name contains blocked language. Please choose another name.'
        };
    }

    return { valid: true };
}

module.exports = {
    containsBlockedTerm,
    maskBlockedTerms,
    normalizeText,
    normalizeForModeration,
    validatePublicName
};
