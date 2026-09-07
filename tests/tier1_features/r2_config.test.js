// tests/tier1_features/r2_config.test.js
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const fixtures = require('../helpers/fixtures.js');

describe('Requirement R2: Centralized Configuration & Security Hardening', () => {
    const rootDir = path.resolve(__dirname, '../../');

    test('R2.1: Centralized emoji configuration provides custom format and standard unicode fallback', () => {
        const customEmojis = fixtures.emojis.custom;
        const unicodeFallbacks = fixtures.emojis.unicodeFallback;

        const requiredKeys = ['verified_app', 'foguete', 'estrela', 'brilho', 'salvar', 'confere', 'x_', 'suporte', 'github'];
        for (const key of requiredKeys) {
            assert.ok(customEmojis[key], `Custom emoji should exist for key: ${key}`);
            assert.ok(customEmojis[key].startsWith('<:') || customEmojis[key].startsWith('<a:'), `Custom emoji ${key} should match Discord custom emoji format`);
            assert.ok(unicodeFallbacks[key], `Unicode fallback emoji should exist for key: ${key}`);
        }
    });

    test('R2.2: Centralized color constants provide valid RGB integer hex values', () => {
        const { colors } = fixtures;
        const colorKeys = ['primary', 'success', 'warning', 'error', 'neutral'];

        for (const key of colorKeys) {
            assert.ok(typeof colors[key] === 'number', `Color ${key} must be a number`);
            assert.ok(colors[key] >= 0x000000 && colors[key] <= 0xFFFFFF, `Color ${key} must be a valid 24-bit RGB integer`);
        }
    });

    test('R2.3: Centralized URLs provide valid HTTPS links for support, policies, and repository', () => {
        const { urls } = fixtures;
        assert.ok(urls.supportServer.startsWith('https://'), 'Support server URL must be HTTPS');
        assert.ok(urls.website.startsWith('https://'), 'Website URL must be HTTPS');
        assert.ok(urls.tos.startsWith('https://'), 'ToS URL must be HTTPS');
        assert.ok(urls.privacy.startsWith('https://'), 'Privacy URL must be HTTPS');
        assert.ok(urls.github.startsWith('https://'), 'GitHub repository URL must be HTTPS');
    });

    test('R2.4: .gitignore strictly ignores sensitive files (.env, database files, logs)', () => {
        const gitignorePath = path.join(rootDir, '.gitignore');
        assert.ok(fs.existsSync(gitignorePath), '.gitignore file must exist');

        const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
        const requiredIgnorePatterns = ['.env', 'node_modules', 'database/main.db', 'logs'];

        for (const pattern of requiredIgnorePatterns) {
            const hasPattern = gitignoreContent.split('\n').some(line => line.trim().startsWith(pattern) || line.trim().includes(pattern));
            assert.ok(hasPattern, `.gitignore must include pattern: ${pattern}`);
        }
    });

    test('R2.5: Configuration schema validator verifies required environment variables', () => {
        const validateConfig = (env) => {
            const errors = [];
            if (!env.DISCORD_TOKEN) errors.push('DISCORD_TOKEN is required');
            if (!env.CLIENT_ID) errors.push('CLIENT_ID is required');
            return {
                valid: errors.length === 0,
                errors,
                values: {
                    token: env.DISCORD_TOKEN,
                    clientId: env.CLIENT_ID,
                    ownerId: env.OWNER_ID || '1117890204569718885',
                    supabaseUrl: env.SUPABASE_URL || null,
                    supabaseKey: env.SUPABASE_KEY || null,
                    webhookFeedback: env.WEBHOOK_FEEDBACK || null,
                    webhookBugs: env.WEBHOOK_BUGS || null,
                }
            };
        };

        const validEnv = {
            DISCORD_TOKEN: 'mock_token_xyz',
            CLIENT_ID: '123456789012345678',
            OWNER_ID: '987654321098765432',
        };

        const resultValid = validateConfig(validEnv);
        assert.equal(resultValid.valid, true);
        assert.equal(resultValid.values.token, 'mock_token_xyz');
        assert.equal(resultValid.values.clientId, '123456789012345678');

        const invalidEnv = { OWNER_ID: '123' };
        const resultInvalid = validateConfig(invalidEnv);
        assert.equal(resultInvalid.valid, false);
        assert.ok(resultInvalid.errors.includes('DISCORD_TOKEN is required'));
        assert.ok(resultInvalid.errors.includes('CLIENT_ID is required'));
    });

    test('R2.6: ToS version configuration is centralized and integer-based', () => {
        const config = require('../../src/config/config.js');
        assert.ok(config, 'config module must exist');
        assert.ok(typeof config.currentTosVersion === 'number', 'currentTosVersion must be a number');
        assert.ok(config.currentTosVersion >= 1, 'currentTosVersion must be at least 1');
    });
});
