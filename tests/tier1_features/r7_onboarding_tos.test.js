// tests/tier1_features/r7_onboarding_tos.test.js
const { test, describe, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createMockInteraction } = require('../helpers/mockDiscord.js');
const { createMockDatabase } = require('../helpers/mockDatabase.js');
const config = require('../../src/config/config.js');
const fixtures = require('../helpers/fixtures.js');

describe('Requirement R7: Onboarding & Terms of Service Flow', () => {
    let mockDb;
    let tosCheck;
    let getLanguage;
    let tosAcceptHandler;
    let langSelectHandler;

    const newUser = fixtures.users.newUser;
    const outdatedUser = fixtures.users.outdatedTosUser;
    const acceptedUser = fixtures.users.acceptedUserPtBr;

    before(() => {
        mockDb = createMockDatabase();

        // Mock database module cache
        const dbPath = path.resolve(__dirname, '../../database/db.js');
        require.cache[dbPath] = {
            id: dbPath,
            filename: dbPath,
            loaded: true,
            exports: mockDb,
        };

        tosCheck = require('../../src/utils/tosCheck.js');
        getLanguage = require('../../src/utils/getLanguage.js');
        tosAcceptHandler = require('../../src/interactions/buttons/tos_accept.js');
        langSelectHandler = require('../../src/interactions/selects/lang_select.js');
    });

    beforeEach(() => {
        // Setup in-memory test users
        mockDb.getUser(newUser.userId);
        mockDb.updateUser(newUser.userId, 'tosVersion', 0);
        mockDb.updateUser(newUser.userId, 'language', 'lang_auto');

        mockDb.getUser(outdatedUser.userId);
        mockDb.updateUser(outdatedUser.userId, 'tosVersion', config.currentTosVersion - 1);

        mockDb.getUser(acceptedUser.userId);
        mockDb.updateUser(acceptedUser.userId, 'tosVersion', config.currentTosVersion);
        mockDb.updateUser(acceptedUser.userId, 'language', 'lang_pt_br');
    });

    test('R7.1: tosCheck allows users with current ToS version to proceed immediately', async () => {
        const interaction = createMockInteraction({
            userId: acceptedUser.userId,
            locale: 'pt-BR',
        });

        const allowed = await tosCheck(interaction);
        assert.equal(allowed, true, 'User with valid ToS should be allowed to proceed');
        assert.equal(interaction._replies.length, 0, 'No prompt should be shown to accepted users');
    });

    test('R7.2: tosCheck intercepts new users (tosVersion === 0) with welcome ToS prompt', async () => {
        const interaction = createMockInteraction({
            userId: newUser.userId,
            locale: 'pt-BR',
        });

        const allowed = await tosCheck(interaction);
        assert.equal(allowed, false, 'New user must be intercepted');
        assert.equal(interaction._replies.length, 1, 'Should send ToS prompt');

        const reply = interaction._getLastResponse();
        assert.ok(reply.embeds && reply.embeds.length > 0);
        assert.ok(reply.components && reply.components.length > 0);
        
        // Embed should contain welcome text
        const embed = reply.embeds[0];
        assert.ok(embed.data.title.includes('Termos de Serviço') || embed.data.title.includes('Terms of Service'));
    });

    test('R7.3: tosCheck intercepts outdated ToS users with update notice', async () => {
        const interaction = createMockInteraction({
            userId: outdatedUser.userId,
            locale: 'en-US',
        });

        const allowed = await tosCheck(interaction);
        assert.equal(allowed, false, 'Outdated user must be intercepted');
        assert.equal(interaction._replies.length, 1);

        const reply = interaction._getLastResponse();
        const embed = reply.embeds[0];
        assert.ok(embed.data.title.includes('Atualizados') || embed.data.title.includes('Updated'));
    });

    test('R7.4: tos_accept button updates ToS version and prompts language selector for new users', async () => {
        const interaction = createMockInteraction({
            userId: newUser.userId,
            customId: `tos_accept_${newUser.userId}`,
            locale: 'pt-BR',
        });

        await tosAcceptHandler.execute(interaction);

        // Database should be updated
        const dbUser = mockDb.getUser(newUser.userId);
        assert.equal(dbUser.tosVersion, config.currentTosVersion, 'User tosVersion should be updated');

        // Should present language selector
        assert.equal(interaction._updates.length, 1);
        const updatePayload = interaction._updates[0];
        assert.ok(updatePayload.components && updatePayload.components.length > 0);
        assert.ok(updatePayload.components[0].components.some(c => c.data.custom_id.startsWith('lang_select')));
    });

    test('R7.5: tos_accept button directly confirms re-acceptance for returning users without re-prompting language', async () => {
        const interaction = createMockInteraction({
            userId: outdatedUser.userId,
            customId: `tos_accept_${outdatedUser.userId}`,
            locale: 'pt-BR',
        });

        await tosAcceptHandler.execute(interaction);

        const dbUser = mockDb.getUser(outdatedUser.userId);
        assert.equal(dbUser.tosVersion, config.currentTosVersion);

        assert.equal(interaction._updates.length, 1);
        const updatePayload = interaction._updates[0];
        // Components should be empty array on direct confirmation
        assert.deepEqual(updatePayload.components, []);
        assert.ok(updatePayload.embeds[0].data.title.includes('Atualizados') || updatePayload.embeds[0].data.title.includes('Updated'));
    });

    test('R7.6: lang_select menu updates language preference and shows localized confirmation', async () => {
        const interaction = createMockInteraction({
            userId: newUser.userId,
            customId: `lang_select_${newUser.userId}`,
            values: ['lang_en_us'],
            locale: 'pt-BR',
        });

        await langSelectHandler.execute(interaction);

        // Verify DB update
        const dbUser = mockDb.getUser(newUser.userId);
        assert.equal(dbUser.language, 'lang_en_us');

        // Verify confirmation message
        assert.equal(interaction._updates.length, 1);
        const updatePayload = interaction._updates[0];
        assert.ok(updatePayload.embeds[0].data.title.includes('Settings Saved') || updatePayload.embeds[0].data.title.includes('Configuração Salva'));
    });

    test('R7.7: getLanguage resolves user preference with fallback hierarchy', () => {
        // Explicit pt-BR
        const ctxPt = { user: { id: acceptedUser.userId }, locale: 'en-US' };
        assert.equal(getLanguage(ctxPt), 'pt_BR');

        // Explicit en-US
        mockDb.updateUser(acceptedUser.userId, 'language', 'lang_en_us');
        const ctxEn = { user: { id: acceptedUser.userId }, locale: 'pt-BR' };
        assert.equal(getLanguage(ctxEn), 'en_US');

        // Auto mode matching Discord pt-BR
        mockDb.updateUser(newUser.userId, 'language', 'lang_auto');
        const ctxAutoPt = { user: { id: newUser.userId }, locale: 'pt-BR' };
        assert.equal(getLanguage(ctxAutoPt), 'pt_BR');

        // Auto mode defaulting non-pt-BR locales (e.g., fr, de, ja) to en_US
        const ctxAutoFr = { user: { id: newUser.userId }, locale: 'fr' };
        assert.equal(getLanguage(ctxAutoFr), 'en_US');
    });
});
