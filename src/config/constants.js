/**
 * @file constants.js
 * @description Centralized system constants, rate limits, validation bounds, and category identifiers
 */

const constants = {
    // Terms of Service Configuration
    TOS: {
        CURRENT_VERSION: 2,
        REQUIRE_ONBOARDING: true,
    },

    // Anti-Spam Rate Limits (in milliseconds)
    RATE_LIMITS: {
        COMMAND_COOLDOWN_MS: 3000,
        COMPONENT_COOLDOWN_MS: 1500,
        CLEANUP_INTERVAL_MS: 60000,
        SWEEP_TTL_MS: 60000,
        MAX_VIOLATIONS: 5,
        TEMPORARY_BLOCK_MS: 10000,
    },

    // Supported Locales and Preferences
    LANGUAGES: {
        SUPPORTED_CODES: ['pt_BR', 'en_US'],
        DEFAULT_LOCALE: 'pt_BR',
        FALLBACK_LOCALE: 'en_US',
        MAPPING: {
            lang_auto: 'auto',
            lang_pt_br: 'pt_BR',
            lang_en_us: 'en_US',
        },
    },

    // Help Center Category Identifiers
    HELP_CATEGORIES: {
        HOME: 'home',
        SISTEMA: 'sistema',
        UTILIDADES: 'utilidades',
        MODERACAO: 'moderacao',
        SEGURANCA: 'seguranca',
    },

    // Validation Limits for Feedback and Bug Reporting
    FEEDBACK: {
        MIN_LENGTH: 10,
        MAX_LENGTH: 2000,
    },

    BUG_REPORT: {
        MIN_LENGTH: 5,
        MAX_LENGTH: 2000,
    },

    // Music Lookup Configuration
    MUSIC: {
        SEARCH_TIMEOUT_MS: 6000,
        DEFAULT_PREVIEW_DURATION_SEC: 30,
    },
};

module.exports = constants;
