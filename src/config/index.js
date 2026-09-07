/**
 * @file index.js
 * @description Centralized configuration aggregator and environment validator
 */

require('dotenv').config();

const colors = require('./colors.js');
const emojis = require('./emojis.js');
const urls = require('./urls.js');
const constants = require('./constants.js');

/**
 * Validates environment configuration
 * @param {NodeJS.ProcessEnv} env - Process environment object
 * @returns {{ valid: boolean, errors: string[], values: Object }}
 */
function validateConfig(env = process.env) {
    const errors = [];
    if (!env.DISCORD_TOKEN) errors.push('DISCORD_TOKEN is required');
    if (!env.CLIENT_ID) errors.push('CLIENT_ID is required');

    return {
        valid: errors.length === 0,
        errors,
        values: {
            token: env.DISCORD_TOKEN || '',
            clientId: env.CLIENT_ID || '',
            ownerId: env.OWNER_ID || '659214571634032667',
            guildId: env.GUILD_ID || null,
            supabaseUrl: env.SUPABASE_URL || null,
            supabaseKey: env.SUPABASE_KEY || null,
            webhookFeedback: env.WEBHOOK_FEEDBACK || null,
            webhookBugs: env.WEBHOOK_BUGS || null,
            webhookBugsFeedback: env.WEBHOOK_BUGS_FEEDBACK || null,
            webhookJoins: env.WEBHOOK_JOINS || null,
            webhookInteractions: env.WEBHOOK_INTERACTIONS || null,
            webhookErros: env.WEBHOOK_ERROS || null,
            webhookUpdatesPv: env.WEBHOOK_UPDATES_PV || null,
            channelUpdates: env.CHANNEL_UPDATES_ID || '1358542780275888501',
            channelBugsFeedback: env.CHANNEL_BUGS_FEEDBACK_ID || '1358542784294031402',
            channelJoins: env.CHANNEL_JOINS_ID || '1358542802484728019',
            channelInteractions: env.CHANNEL_INTERACTIONS_ID || '1358542800781840545',
            port: Number(env.PORT) || 3000,
            nodeEnv: env.NODE_ENV || 'development',
        },
    };
}

const configValidation = validateConfig(process.env);

const config = {
    bot: {
        token: process.env.DISCORD_TOKEN || '',
        clientId: process.env.CLIENT_ID || '',
        ownerId: process.env.OWNER_ID || '659214571634032667',
        guildId: process.env.GUILD_ID || null,
    },
    tos: {
        currentVersion: constants.TOS.CURRENT_VERSION,
        currentTosVersion: constants.TOS.CURRENT_VERSION,
    },
    currentTosVersion: constants.TOS.CURRENT_VERSION,
    server: {
        port: Number(process.env.PORT) || 3000,
        env: process.env.NODE_ENV || 'development',
    },
    database: {
        supabaseUrl: process.env.SUPABASE_URL || null,
        supabaseKey: process.env.SUPABASE_KEY || null,
    },
    webhooks: {
        feedback: process.env.WEBHOOK_FEEDBACK || null,
        bugs: process.env.WEBHOOK_BUGS || null,
        bugsFeedback: process.env.WEBHOOK_BUGS_FEEDBACK || null,
        joins: process.env.WEBHOOK_JOINS || null,
        interactions: process.env.WEBHOOK_INTERACTIONS || null,
        erros: process.env.WEBHOOK_ERROS || null,
        updatesPv: process.env.WEBHOOK_UPDATES_PV || null,
    },
    channels: {
        updates: process.env.CHANNEL_UPDATES_ID || '1358542780275888501',
        bugsFeedback: process.env.CHANNEL_BUGS_FEEDBACK_ID || '1358542784294031402',
        joins: process.env.CHANNEL_JOINS_ID || '1358542802484728019',
        interactions: process.env.CHANNEL_INTERACTIONS_ID || '1358542800781840545',
    },
    colors,
    emojis,
    urls,
    constants,
    currentTosVersion: 2,
    validateConfig,
    isValid: configValidation.valid,
    validationErrors: configValidation.errors,
};

module.exports = config;
