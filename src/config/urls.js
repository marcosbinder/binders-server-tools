/**
 * @file urls.js
 * @description Centralized URLs for external resources, documentation, invite links and APIs
 */

const urls = {
    // Official Community & Documentation
    supportServer: 'https://dsc.gg/bindersdc',
    discordSupport: 'https://dsc.gg/bindersdc',
    supportServerDirect: 'https://discord.gg/Y2jJadbUmY',
    website: 'https://binders.carrd.co/',
    tos: 'https://binders.carrd.co/#politicas',
    termsOfService: 'https://binders.carrd.co/#politicas',
    privacy: 'https://binders.carrd.co/#politicas',
    privacyPolicy: 'https://binders.carrd.co/#politicas',
    github: 'https://github.com/marcaodosbots/binders-server-tools',
    issues: 'https://github.com/marcaodosbots/binders-server-tools/issues',
    topgg: 'https://top.gg/bot/1310336375261892608/',

    // Public REST APIs
    api: {
        itunesSearch: 'https://itunes.apple.com/search',
        deezerSearch: 'https://api.deezer.com/search',
        spotifySearch: 'https://open.spotify.com/search',
    },

    /**
     * Generates a direct bot invitation URL
     * @param {string} clientId - Application Client ID
     * @returns {string}
     */
    botInvite(clientId) {
        const id = clientId || process.env.CLIENT_ID || '1310336375261892608';
        return `https://discord.com/oauth2/authorize?client_id=${id}&permissions=8&integration_type=0&scope=bot+applications.commands`;
    },

    /**
     * Generates a direct web profile URL for a user
     * @param {string} userId - Discord user snowflake ID
     * @returns {string}
     */
    userProfile(userId) {
        return `https://discord.com/users/${userId}`;
    },
};

// Backward-compatible alias for supportServer
urls.discordSupport = urls.supportServer;

module.exports = urls;

