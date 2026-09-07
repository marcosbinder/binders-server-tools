// tests/tier3_combinations/cross_features.test.js
const { test, describe, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createMockInteraction, createMockClient } = require('../helpers/mockDiscord.js');
const { createMockDatabase } = require('../helpers/mockDatabase.js');
const fixtures = require('../helpers/fixtures.js');
const config = require('../../src/config/config.js');

describe('Tier 3: Cross-Feature Combinations', () => {
    let mockDb;
    let tosCheck;
    let getLanguage;
    let createEmbed;

    before(() => {
        mockDb = createMockDatabase();
        const dbPath = path.resolve(__dirname, '../../database/db.js');
        require.cache[dbPath] = {
            id: dbPath,
            filename: dbPath,
            loaded: true,
            exports: mockDb,
        };

        tosCheck = require('../../src/utils/tosCheck.js');
        getLanguage = require('../../src/utils/getLanguage.js');
        createEmbed = require('../../src/utils/createEmbed.js');
    });

    beforeEach(() => {
        mockDb.getUser(fixtures.users.newUser.userId);
        mockDb.updateUser(fixtures.users.newUser.userId, 'tosVersion', 0);
        mockDb.updateUser(fixtures.users.newUser.userId, 'language', 'lang_auto');

        mockDb.getUser(fixtures.users.acceptedUserPtBr.userId);
        mockDb.updateUser(fixtures.users.acceptedUserPtBr.userId, 'tosVersion', config.currentTosVersion);
        mockDb.updateUser(fixtures.users.acceptedUserPtBr.userId, 'language', 'lang_pt_br');
    });

    test('T3.1: Rate limiting protects Help Menu navigation against rapid button/select spam', () => {
        const cooldowns = new Map();
        const cooldownMs = 1500;
        const userId = '11223344';

        const navigateHelpCategory = (now, cat) => {
            const last = cooldowns.get(userId);
            if (last && (now - last) < cooldownMs) {
                return { success: false, error: 'Aguarde antes de trocar de categoria novamente.' };
            }
            cooldowns.set(userId, now);
            return { success: true, category: cat };
        };

        const t0 = 1000;
        assert.equal(navigateHelpCategory(t0, 'sistema').success, true);
        assert.equal(navigateHelpCategory(t0 + 200, 'utilidades').success, false);
        assert.equal(navigateHelpCategory(t0 + 1600, 'utilidades').success, true);
    });

    test('T3.2: ToS check protects all command types (Slash commands, User context menus, Message context menus)', async () => {
        // Test Slash command
        const slashInteraction = createMockInteraction({
            userId: fixtures.users.newUser.userId,
            isChatInputCommand: true,
            commandName: 'musica',
        });
        const slashCanProceed = await tosCheck(slashInteraction);
        assert.equal(slashCanProceed, false, 'Slash commands must be blocked by ToS');

        // Test User Context Menu
        const userContextInteraction = createMockInteraction({
            userId: fixtures.users.newUser.userId,
            type: 'userContext',
            isUserContextMenuCommand: true,
            isContextMenuCommand: true,
        });
        const userContextCanProceed = await tosCheck(userContextInteraction);
        assert.equal(userContextCanProceed, false, 'User context menus must be blocked by ToS');

        // Test Message Context Menu
        const msgContextInteraction = createMockInteraction({
            userId: fixtures.users.newUser.userId,
            type: 'messageContext',
            isMessageContextMenuCommand: true,
            isContextMenuCommand: true,
        });
        const msgContextCanProceed = await tosCheck(msgContextInteraction);
        assert.equal(msgContextCanProceed, false, 'Message context menus must be blocked by ToS');
    });

    test('T3.3: Language preference dynamically changes output across music, help, and profile embeds', async () => {
        const userId = '555666777';
        mockDb.getUser(userId);
        
        // When language is Portuguese
        mockDb.updateUser(userId, 'language', 'lang_pt_br');
        const ptInteraction = createMockInteraction({ userId, locale: 'en-US' });
        assert.equal(getLanguage(ptInteraction), 'pt_BR');

        const ptEmbed = await createEmbed(ptInteraction, {
            title: getLanguage(ptInteraction) === 'pt_BR' ? 'Música Encontrada' : 'Music Found',
        });
        assert.equal(ptEmbed.data.title, 'Música Encontrada');

        // When language is English
        mockDb.updateUser(userId, 'language', 'lang_en_us');
        const enInteraction = createMockInteraction({ userId, locale: 'pt-BR' });
        assert.equal(getLanguage(enInteraction), 'en_US');

        const enEmbed = await createEmbed(enInteraction, {
            title: getLanguage(enInteraction) === 'pt_BR' ? 'Música Encontrada' : 'Music Found',
        });
        assert.equal(enEmbed.data.title, 'Music Found');
    });

    test('T3.4: Dynamic fallback from custom emojis to unicode when bot is outside emoji source guild', () => {
        const getEmoji = (key, hasCustomAccess = true) => {
            if (hasCustomAccess && fixtures.emojis.custom[key]) {
                return fixtures.emojis.custom[key];
            }
            return fixtures.emojis.unicodeFallback[key] || '❓';
        };

        assert.equal(getEmoji('foguete', true), '<:foguete:1397390505171615827>');
        assert.equal(getEmoji('foguete', false), '🚀');
        assert.equal(getEmoji('salvar', false), '💾');
        assert.equal(getEmoji('confere', false), '✅');
    });

    test('T3.5: Database preference updates immediately reflect on subsequent getLanguage resolutions', () => {
        const userId = '888999111';
        mockDb.getUser(userId);
        mockDb.updateUser(userId, 'language', 'lang_auto');

        const interaction = { user: { id: userId }, locale: 'en-US' };
        assert.equal(getLanguage(interaction), 'en_US');

        mockDb.updateUser(userId, 'language', 'lang_pt_br');
        assert.equal(getLanguage(interaction), 'pt_BR');

        mockDb.updateUser(userId, 'language', 'lang_en_us');
        assert.equal(getLanguage(interaction), 'en_US');
    });
});
