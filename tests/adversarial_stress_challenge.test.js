// tests/adversarial_stress_challenge.test.js
/**
 * @file adversarial_stress_challenge.test.js
 * @description Adversarial stress testing harness for Challenger 2:
 *  - ToS Onboarding lifecycle (new users vs returning users, language persistence, ephemeral state transitions)
 *  - Help menu navigation, customId verification (help_nav_${userId}), unauthorized interaction rejection
 *  - Context menus (User & Message) in DM and Guild contexts
 *  - Multi-provider music lookup failover resilience & duration formatting
 *  - High-concurrency rate-limiter stress & interaction routing
 */

const { test, describe, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createMockInteraction, createMockClient } = require('./helpers/mockDiscord.js');
const { createMockDatabase } = require('./helpers/mockDatabase.js');
const mockHttp = require('./helpers/mockHttp.js');
const config = require('../src/config/config.js');
const fixtures = require('./helpers/fixtures.js');

describe('Adversarial Challenge Suite — Challenger 2', () => {
    let mockDb;
    let tosCheck;
    let getLanguage;
    let tosAcceptHandler;
    let langSelectHandler;
    let helpMenuBuilder;
    let ajudaCommand;
    let ajudaCategorySelect;
    let showHelpButton;
    let contextUserCommand;
    let contextMessageCommand;
    let musicProvider;
    let rateLimiter;
    let interactionHandler;

    before(() => {
        mockDb = createMockDatabase();

        // Inject mock DB into require cache for src/database/db.js and database/db.js
        const dbPath1 = path.resolve(__dirname, '../src/database/db.js');
        const dbPath2 = path.resolve(__dirname, '../database/db.js');
        require.cache[dbPath1] = { id: dbPath1, filename: dbPath1, loaded: true, exports: mockDb };
        require.cache[dbPath2] = { id: dbPath2, filename: dbPath2, loaded: true, exports: mockDb };

        tosCheck = require('../src/utils/tosCheck.js');
        getLanguage = require('../src/utils/getLanguage.js');
        tosAcceptHandler = require('../src/interactions/buttons/tos_accept.js');
        langSelectHandler = require('../src/interactions/selects/lang_select.js');
        helpMenuBuilder = require('../src/utils/helpMenuBuilder.js');
        ajudaCommand = require('../src/commands/ajuda.js');
        ajudaCategorySelect = require('../src/interactions/selects/ajuda_category.js');
        showHelpButton = require('../src/interactions/buttons/show_help_menu.js');
        contextUserCommand = require('../src/commands/contextUser.js');
        contextMessageCommand = require('../src/commands/contextMessage.js');
        musicProvider = require('../src/utils/musicProvider.js');
        rateLimiter = require('../src/utils/rateLimiter.js');
        interactionHandler = require('../src/events/interactionHandler.js');
    });

    beforeEach(() => {
        if (rateLimiter.cooldowns) {
            rateLimiter.cooldowns.clear();
        }
    });

    // =========================================================================
    // SECTION 1: Onboarding Flow, ToS Migration, & Ephemeral State Transitions
    // =========================================================================
    describe('1. Onboarding & Terms of Service Lifecycle', () => {
        // Pure numeric Discord snowflake IDs
        const newUserId = '100100100100100101';
        const returningUserId = '100200200200200202';
        const futureUserId = '100300300300300303';
        const attackerId = '999999999999999999';

        beforeEach(() => {
            // New user (tosVersion: 0)
            mockDb.getUser(newUserId);
            mockDb.updateUser(newUserId, { tosVersion: 0, language: 'lang_auto' });

            // Returning user with outdated ToS version (tosVersion: 1) and custom language
            mockDb.getUser(returningUserId);
            mockDb.updateUser(returningUserId, { tosVersion: config.currentTosVersion - 1, language: 'lang_pt_br' });

            // User already on future ToS version
            mockDb.getUser(futureUserId);
            mockDb.updateUser(futureUserId, { tosVersion: config.currentTosVersion + 1, language: 'lang_en_us' });

            // Attacker user
            mockDb.getUser(attackerId);
            mockDb.updateUser(attackerId, { tosVersion: config.currentTosVersion, language: 'lang_auto' });
        });

        test('T1.1: Complete New User Onboarding Lifecycle: Blocked -> Prompted -> tos_accept -> lang_select -> Unlocked', async () => {
            // Step 1: User tries protected command
            const cmdInteraction = createMockInteraction({
                userId: newUserId,
                commandName: 'ajuda',
                locale: 'pt-BR',
            });

            const canProceed = await tosCheck(cmdInteraction);
            assert.equal(canProceed, false, 'New user must be blocked by tosCheck');
            assert.equal(cmdInteraction._replies.length, 1, 'Should reply with ToS prompt');

            const welcomeReply = cmdInteraction._getLastResponse();
            assert.ok(welcomeReply.embeds && welcomeReply.embeds.length > 0);
            assert.ok(welcomeReply.embeds[0].data.title.includes('Termos de Serviço'));
            assert.ok(welcomeReply.flags.includes(64), 'Must be Ephemeral (flag 64)');

            // Step 2: User clicks ToS accept button
            const acceptBtnInteraction = createMockInteraction({
                userId: newUserId,
                customId: `tos_accept_${newUserId}`,
                locale: 'pt-BR',
                type: 'button',
            });

            await tosAcceptHandler.execute(acceptBtnInteraction);

            // DB check: ToS version updated to current
            const dbAfterAccept = mockDb.getUser(newUserId);
            assert.equal(dbAfterAccept.tosVersion, config.currentTosVersion, 'tosVersion must be updated');

            // Response check: Should present language selector menu
            assert.equal(acceptBtnInteraction._updates.length, 1, 'Should call interaction.update with language menu');
            const langPrompt = acceptBtnInteraction._updates[0];
            assert.ok(langPrompt.embeds[0].data.title.includes('personalizar') || langPrompt.embeds[0].data.title.includes('personalize'));
            assert.ok(langPrompt.components.length > 0);
            const selectComponent = langPrompt.components[0].components.find(c => c.data.custom_id.startsWith('lang_select'));
            assert.ok(selectComponent, 'Must contain lang_select component');

            // Step 3: User selects English language
            const selectInteraction = createMockInteraction({
                userId: newUserId,
                customId: `lang_select_${newUserId}`,
                values: ['lang_en_us'],
                locale: 'pt-BR',
                type: 'select',
            });

            await langSelectHandler.execute(selectInteraction);

            // DB check: Language updated to lang_en_us
            const dbAfterLang = mockDb.getUser(newUserId);
            assert.equal(dbAfterLang.language, 'lang_en_us', 'Language preference must be persisted');

            // Response check: Confirmation embed rendered and select menu retained for reselection
            assert.equal(selectInteraction._updates.length, 1);
            const finalConfirmation = selectInteraction._updates[0];
            assert.ok(finalConfirmation.embeds[0].data.title.includes('Settings Saved') || finalConfirmation.embeds[0].data.title.includes('Configuração Salva'));
            assert.equal(finalConfirmation.components.length, 1, 'Select menu must remain attached for reselection');

            // Step 4: Subsequent command execution allows user immediately
            const retryInteraction = createMockInteraction({
                userId: newUserId,
                commandName: 'ajuda',
                locale: 'pt-BR',
            });

            const retryAllowed = await tosCheck(retryInteraction);
            assert.equal(retryAllowed, true, 'User must now be permitted without prompt');
            assert.equal(retryInteraction._replies.length, 0, 'No prompt should be generated');
            assert.equal(getLanguage(retryInteraction), 'en_US', 'getLanguage must resolve chosen lang_en_us');
        });

        test('T1.2: Returning User Migration: Blocked -> Update Prompt -> tos_accept -> Direct Confirmation without Language Reset', async () => {
            // User had previously configured pt-BR
            const initialUser = mockDb.getUser(returningUserId);
            assert.equal(initialUser.language, 'lang_pt_br');

            // Step 1: Outdated user executes protected command
            const cmdInteraction = createMockInteraction({
                userId: returningUserId,
                commandName: 'ajuda',
                locale: 'pt-BR',
            });

            const canProceed = await tosCheck(cmdInteraction);
            assert.equal(canProceed, false, 'Outdated user must be intercepted');
            assert.equal(cmdInteraction._replies.length, 1);
            assert.ok(cmdInteraction._getLastResponse().embeds[0].data.title.includes('Atualizados') || cmdInteraction._getLastResponse().embeds[0].data.title.includes('Updated'));

            // Step 2: Returning user clicks accept button
            const acceptBtnInteraction = createMockInteraction({
                userId: returningUserId,
                customId: `tos_accept_${returningUserId}`,
                locale: 'pt-BR',
                type: 'button',
            });

            await tosAcceptHandler.execute(acceptBtnInteraction);

            // DB check: ToS version updated, but custom language NOT overwritten
            const updatedUser = mockDb.getUser(returningUserId);
            assert.equal(updatedUser.tosVersion, config.currentTosVersion);
            assert.equal(updatedUser.language, 'lang_pt_br', 'Custom language must not be reset to lang_auto');

            // Response check: Direct confirmation without language select menu
            assert.equal(acceptBtnInteraction._updates.length, 1);
            const directConfirm = acceptBtnInteraction._updates[0];
            assert.deepEqual(directConfirm.components, [], 'Components must be empty');
            assert.ok(directConfirm.embeds[0].data.title.includes('Atualizados') || directConfirm.embeds[0].data.title.includes('Updated'));

            // Subsequent check passes
            assert.equal(await tosCheck(cmdInteraction), true);
            assert.equal(getLanguage(cmdInteraction), 'pt_BR');
        });

        test('T1.3: User with future or equal ToS version is never blocked', async () => {
            const futureInteraction = createMockInteraction({
                userId: futureUserId,
                commandName: 'ajuda',
            });

            const canProceed = await tosCheck(futureInteraction);
            assert.equal(canProceed, true);
            assert.equal(futureInteraction._replies.length, 0);
        });

        test('T1.4: Ephemeral state transition: tosCheck handles button triggers via interaction.update', async () => {
            const buttonInteraction = createMockInteraction({
                userId: newUserId,
                customId: 'start_tos',
                type: 'button',
                isButton: true,
            });

            const canProceed = await tosCheck(buttonInteraction);
            assert.equal(canProceed, false);
            assert.equal(buttonInteraction._updates.length, 1, 'Should call interaction.update on button interactions');
            assert.equal(buttonInteraction._replies.length, 0);
        });

        test('T1.5: Adversarial hijack of tos_accept button is rejected and does not mutate victim state', async () => {
            // Attacker tries to click accept button meant for newUserId
            const hijackInteraction = createMockInteraction({
                userId: attackerId, // intruder ID
                customId: `tos_accept_${newUserId}`, // victim target
                locale: 'pt-BR',
                type: 'button',
            });

            await tosAcceptHandler.execute(hijackInteraction);

            // Victim's DB record must remain tosVersion 0
            const victimDb = mockDb.getUser(newUserId);
            assert.equal(victimDb.tosVersion, 0, 'Victim ToS version must NOT be modified by attacker');

            // Attacker must receive ephemeral rejection
            assert.equal(hijackInteraction._replies.length, 1);
            const reply = hijackInteraction._getLastResponse();
            assert.ok(reply.content.includes('inxerido') || reply.content.includes('privada') || reply.content.includes('pertence') || reply.content.includes('outro usuário') || reply.content.includes('quadrado'));
            assert.equal(hijackInteraction._updates.length, 0, 'Should not update original prompt');
        });

        test('T1.6: Adversarial hijack of lang_select menu is rejected and does not mutate victim language', async () => {
            const hijackInteraction = createMockInteraction({
                userId: attackerId,
                customId: `lang_select_${newUserId}`,
                values: ['lang_pt_br'],
                locale: 'en-US',
                type: 'select',
            });

            await langSelectHandler.execute(hijackInteraction);

            // Victim's language should remain unchanged
            const victimDb = mockDb.getUser(newUserId);
            assert.equal(victimDb.language, 'lang_auto');

            // Attacker receives ephemeral rejection
            assert.equal(hijackInteraction._replies.length, 1);
            assert.ok(hijackInteraction._getLastResponse().content.includes('meddler') || hijackInteraction._getLastResponse().content.includes('private') || hijackInteraction._getLastResponse().content.includes('belong') || hijackInteraction._getLastResponse().content.includes('someone else') || hijackInteraction._getLastResponse().content.includes('business'));
        });
    });

    // =========================================================================
    // SECTION 2: Help Menu Navigation & Ownership Boundary Verification
    // =========================================================================
    describe('2. Help Menu Navigation & CustomId Ownership Verification', () => {
        const ownerId = '200100200300400500';
        const intruderId = '900200300400500600';

        beforeEach(() => {
            mockDb.getUser(ownerId);
            mockDb.updateUser(ownerId, { tosVersion: config.currentTosVersion, language: 'lang_pt_br' });

            mockDb.getUser(intruderId);
            mockDb.updateUser(intruderId, { tosVersion: config.currentTosVersion, language: 'lang_en_us' });
        });

        test('T2.1: /ajuda command generates interactive help menu scoped to triggering user', async () => {
            const interaction = createMockInteraction({
                userId: ownerId,
                commandName: 'ajuda',
                locale: 'pt-BR',
            });

            await ajudaCommand.execute(interaction);

            assert.equal(interaction._replies.length, 1);
            const response = interaction._getLastResponse();
            assert.ok(response.embeds && response.embeds.length > 0);
            assert.equal(response.embeds[0].data.title, 'Central de Ajuda • Binder');
            assert.ok(response.components && response.components.length > 0);

            // Check customId has ownerId suffix
            const select = response.components[0].components[0];
            assert.equal(select.data.custom_id, `help_nav_${ownerId}`);
            assert.ok(select.options.length >= 5);
        });

        test('T2.2: Category navigation round-trip loads all valid categories correctly', async () => {
            const categories = ['home', 'sistema', 'utilidades', 'moderacao', 'builder', 'seguranca'];

            for (const cat of categories) {
                const selectInteraction = createMockInteraction({
                    userId: ownerId,
                    customId: `help_nav_${ownerId}`,
                    values: [cat],
                    locale: 'pt-BR',
                    type: 'select',
                });

                await ajudaCategorySelect.execute(selectInteraction);

                assert.equal(selectInteraction._updates.length, 1, `Category ${cat} must trigger interaction.update`);
                const updatePayload = selectInteraction._updates[0];
                const embed = updatePayload.embeds[0];
                assert.ok(embed.data.title, `Category ${cat} must have a title`);
                assert.ok(embed.data.description, `Category ${cat} must have a description`);
                assert.ok(Array.isArray(embed.data.fields), `Category ${cat} must have fields array`);
            }
        });

        test('T2.3: Adversarial category input falls back safely to home category without throwing', async () => {
            const invalidInputs = [
                ['__malicious_category_injection__'],
                ['undefined'],
                [],
            ];

            for (const inputValues of invalidInputs) {
                const selectInteraction = createMockInteraction({
                    userId: ownerId,
                    customId: `help_nav_${ownerId}`,
                    values: inputValues,
                    locale: 'pt-BR',
                    type: 'select',
                });

                await ajudaCategorySelect.execute(selectInteraction);

                assert.equal(selectInteraction._updates.length, 1);
                const updatePayload = selectInteraction._updates[0];
                assert.equal(updatePayload.embeds[0].data.title, 'Central de Ajuda • Binder');
            }
        });

        test('T2.4: Unauthorized user attempting to switch categories is strictly rejected', async () => {
            const intruderInteraction = createMockInteraction({
                userId: intruderId, // Not owner
                customId: `help_nav_${ownerId}`,
                values: ['moderacao'],
                locale: 'en-US',
                type: 'select',
            });

            await ajudaCategorySelect.execute(intruderInteraction);

            assert.equal(intruderInteraction._updates.length, 0, 'Intruder must not update the view');
            assert.equal(intruderInteraction._replies.length, 1, 'Intruder must receive rejection reply');
            const reply = intruderInteraction._getLastResponse();
            assert.ok(reply.content.includes('meddler') || reply.content.includes('private') || reply.content.includes('belong') || reply.content.includes('someone else') || reply.content.includes('business'));
            assert.ok(reply.flags.includes(64), 'Rejection must be Ephemeral');
        });

        test('T2.5: Mention reply button show_help_menu executes and replies with Ephemeral help payload', async () => {
            const buttonInteraction = createMockInteraction({
                userId: ownerId,
                customId: `show_help_menu_${ownerId}`,
                locale: 'pt-BR',
                type: 'button',
            });

            await showHelpButton.execute(buttonInteraction);

            assert.equal(buttonInteraction._replies.length, 1);
            const response = buttonInteraction._getLastResponse();
            assert.ok(response.flags.includes(64), 'Mention help menu must be Ephemeral');
            assert.equal(response.embeds[0].data.title, 'Central de Ajuda • Binder');
        });

        test('T2.6: Malformed customId boundary handling', async () => {
            const checkOwnership = require('../src/utils/interactionOwnership.js');

            // 1. No underscore (treated as public)
            const publicInter = createMockInteraction({ userId: intruderId, customId: 'publicbutton' });
            assert.equal(await checkOwnership(publicInter), true);

            // 2. Trailing underscore (targetId is empty string, doesn't match intruder)
            const trailingUnderscore = createMockInteraction({ userId: intruderId, customId: 'button_' });
            assert.equal(await checkOwnership(trailingUnderscore), false);

            // 3. Multi-segment customId with valid snowflake as last token
            const multiSegment = createMockInteraction({ userId: ownerId, customId: `nested_sub_action_${ownerId}` });
            assert.equal(await checkOwnership(multiSegment), true);
        });
    });

    // =========================================================================
    // SECTION 3: Context Menus in DM and Guild Contexts
    // =========================================================================
    describe('3. Context Menus in DM and Guild Contexts', () => {
        const guildUserId = '300100300400500600';
        const targetUserId = '300200300400500700';
        const client = createMockClient({
            usersMap: {
                [targetUserId]: {
                    id: targetUserId,
                    username: 'TargetGuildUser',
                    displayName: 'TargetGuildUser',
                    tag: 'TargetGuildUser#0001',
                    bot: false,
                    banner: 'custom_banner_hash',
                    hexAccentColor: '#9b59b6',
                    flags: { toArray: () => ['ActiveDeveloper', 'HypeSquadOnlineHouse1'] },
                    displayAvatarURL: (opts) => 'https://cdn.discordapp.com/avatars/target/avatar.png',
                    bannerURL: (opts) => 'https://cdn.discordapp.com/banners/target/banner.png',
                },
            }
        });

        beforeEach(() => {
            mockDb.getUser(guildUserId);
            mockDb.updateUser(guildUserId, { tosVersion: config.currentTosVersion, language: 'lang_pt_br' });

            mockDb.getUser(targetUserId);
            mockDb.updateUser(targetUserId, { tosVersion: config.currentTosVersion, isDeveloper: 1, badges: '["Tester", "VIP"]' });
        });

        test('T3.1: User Context Menu in Guild renders complete hierarchy, booster, join date, badges, banner', async () => {
            const interaction = createMockInteraction({
                userId: guildUserId,
                guildId: '987654321098765432',
                type: 'userContext',
                isUserContextMenuCommand: true,
                locale: 'pt-BR',
                client,
                targetUser: {
                    id: targetUserId,
                    username: 'TargetGuildUser',
                    tag: 'TargetGuildUser#0001',
                    flags: { toArray: () => ['ActiveDeveloper'] },
                    displayAvatarURL: () => 'https://cdn.discordapp.com/avatars/target/avatar.png',
                },
                targetMember: {
                    id: targetUserId,
                    roles: {
                        cache: new Map([['1', { name: 'Admin' }], ['2', { name: 'Moderator' }], ['3', { name: '@everyone' }]]),
                        highest: { name: 'Admin', position: 10 },
                    },
                    premiumSince: new Date('2024-03-01T00:00:00Z'),
                    joinedAt: new Date('2023-01-15T12:00:00Z'),
                    displayHexColor: '#e91e63',
                },
            });

            await contextUserCommand.execute(interaction, client);

            assert.equal(interaction._replies.length, 1);
            const response = interaction._getLastResponse();
            assert.ok(response.embeds && response.embeds.length > 0);
            const embed = response.embeds[0];

            assert.equal(embed.data.title, 'Informações de TargetGuildUser');
            assert.equal(embed.data.color, 0xe91e63);

            // Check fields
            const fields = embed.data.fields;
            assert.ok(fields.some(f => f.name.includes('Identificação') && f.value.includes(targetUserId)));
            assert.ok(fields.some(f => f.name.includes('Badges') && f.value.includes('Desenvolvedor')));
            assert.ok(fields.some(f => f.name.includes('Hierarquia') && f.value.includes('Admin')));
            assert.ok(fields.some(f => f.name.includes('Booster') && f.value.includes('Desde')));
            assert.ok(fields.some(f => f.name.includes('Entrada no Servidor')));

            // Check buttons (View Avatar, View Banner)
            assert.ok(response.components && response.components.length > 0);
            const buttons = response.components[0].components;
            assert.equal(buttons.length, 2);
            assert.ok(buttons.some(b => b.data.label.includes('Avatar')));
            assert.ok(buttons.some(b => b.data.label.includes('Banner')));
        });

        test('T3.2: User Context Menu in DM context cleanly omits guild hierarchy without crashing', async () => {
            const interaction = createMockInteraction({
                userId: guildUserId,
                guildId: null, // DM Context
                guild: null,
                member: null,
                targetMember: null,
                type: 'userContext',
                isUserContextMenuCommand: true,
                locale: 'pt-BR',
                client,
                targetUser: {
                    id: targetUserId,
                    username: 'TargetGuildUser',
                    tag: 'TargetGuildUser#0001',
                    flags: { toArray: () => [] },
                    displayAvatarURL: () => 'https://cdn.discordapp.com/avatars/target/avatar.png',
                },
            });

            await contextUserCommand.execute(interaction, client);

            assert.equal(interaction._replies.length, 1);
            const response = interaction._getLastResponse();
            const embed = response.embeds[0];

            assert.equal(embed.data.title, 'Informações de TargetGuildUser');
            const fields = embed.data.fields;
            // Hierarchy & booster fields must be absent in DM
            assert.equal(fields.some(f => f.name.includes('Hierarquia')), false);
            assert.equal(fields.some(f => f.name.includes('Booster')), false);
            assert.equal(fields.some(f => f.name.includes('Entrada no Servidor')), false);
        });

        test('T3.3: User Context Menu is blocked if initiator has not accepted ToS', async () => {
            const blockedUserId = '300300300300300303';
            mockDb.getUser(blockedUserId);
            mockDb.updateUser(blockedUserId, { tosVersion: 0 });

            const interaction = createMockInteraction({
                userId: blockedUserId,
                type: 'userContext',
                isUserContextMenuCommand: true,
                targetUser: { id: targetUserId, username: 'Target', tag: 'Target#0001' },
            });

            await contextUserCommand.execute(interaction, client);

            assert.equal(interaction._replies.length, 1);
            assert.ok(interaction._getLastResponse().embeds[0].data.title.includes('Termos de Serviço'));
        });

        test('T3.4: Message Context Menu in Guild extracts author, channel, attachments, embeds, timestamps, jump link', async () => {
            const interaction = createMockInteraction({
                userId: guildUserId,
                guildId: '987654321098765432',
                type: 'messageContext',
                isMessageContextMenuCommand: true,
                locale: 'pt-BR',
                targetMessage: {
                    id: 'msg_99887766',
                    content: 'A detailed moderation log announcement message.',
                    author: { tag: 'ModLeader#0001', id: '11223344' },
                    channel: { name: 'mod-logs', id: '998877' },
                    attachments: { size: 3 },
                    embeds: [{ title: 'Log Embed' }],
                    pinned: true,
                    createdTimestamp: 1700000000000,
                    editedTimestamp: 1700005000000,
                    url: 'https://discord.com/channels/987654321098765432/998877/msg_99887766',
                },
            });

            await contextMessageCommand.execute(interaction, client);

            assert.equal(interaction._replies.length, 1);
            const response = interaction._getLastResponse();
            const embed = response.embeds[0];

            assert.equal(embed.data.title, 'Informações da Mensagem');
            const fields = embed.data.fields;
            assert.ok(fields.some(f => f.name.includes('Autor') && f.value.includes('ModLeader#0001')));
            assert.ok(fields.some(f => f.name.includes('Canal') && f.value.includes('#mod-logs')));
            assert.ok(fields.some(f => f.name.includes('Caracteres') && f.value.includes('47')));
            assert.ok(fields.some(f => f.name.includes('Anexos') && f.value.includes('3')));
            assert.ok(fields.some(f => f.name.includes('Embeds') && f.value.includes('1')));
            assert.ok(fields.some(f => f.name.includes('Fixada') && f.value.includes('Sim')));
            assert.ok(fields.some(f => f.name.includes('Enviada')));
            assert.ok(fields.some(f => f.name.includes('Editada')));

            // Jump link button
            assert.ok(response.components && response.components.length > 0);
            assert.equal(response.components[0].components[0].data.url, 'https://discord.com/channels/987654321098765432/998877/msg_99887766');
        });

        test('T3.5: Message Context Menu in DM context handles missing channel name without crashing', async () => {
            const enUserId = '300500300500300505';
            mockDb.getUser(enUserId);
            mockDb.updateUser(enUserId, { tosVersion: config.currentTosVersion, language: 'lang_en_us' });

            const interaction = createMockInteraction({
                userId: enUserId,
                guildId: null,
                guild: null,
                type: 'messageContext',
                isMessageContextMenuCommand: true,
                locale: 'en-US',
                targetMessage: {
                    id: 'dm_msg_112233',
                    content: 'Hello in DMs',
                    author: { tag: 'Friend#9999', id: '55667788' },
                    channelId: 'dm_channel_445566',
                    channel: null, // No channel object in DM
                    attachments: [],
                    embeds: [],
                    pinned: false,
                    createdTimestamp: 1700000000000,
                    editedTimestamp: null,
                    url: null,
                },
            });

            await contextMessageCommand.execute(interaction, client);

            assert.equal(interaction._replies.length, 1);
            const response = interaction._getLastResponse();
            const embed = response.embeds[0];

            assert.equal(embed.data.title, 'Message Information');
            const fields = embed.data.fields;
            assert.ok(fields.some(f => f.name.includes('Channel') && f.value.includes('ID: dm_channel_445566')));
            assert.ok(fields.some(f => f.name.includes('Attachments') && f.value.includes('0')));
            assert.ok(fields.some(f => f.name.includes('Embeds') && f.value.includes('0')));
            assert.ok(fields.some(f => f.name.includes('Pinned') && f.value.includes('No')));
            // Edited timestamp & Jump URL should be omitted
            assert.equal(fields.some(f => f.name.includes('Edited')), false);
            assert.deepEqual(response.components, []);
        });

        test('T3.6: Message Context Menu is blocked if initiator has not accepted ToS', async () => {
            const blockedUserId = '300400300400300404';
            mockDb.getUser(blockedUserId);
            mockDb.updateUser(blockedUserId, { tosVersion: 0 });

            const interaction = createMockInteraction({
                userId: blockedUserId,
                type: 'messageContext',
                isMessageContextMenuCommand: true,
                targetMessage: { content: 'Test' },
            });

            await contextMessageCommand.execute(interaction, client);

            assert.equal(interaction._replies.length, 1);
            assert.ok(interaction._getLastResponse().embeds[0].data.title.includes('Termos de Serviço'));
        });
    });

    // =========================================================================
    // SECTION 4: Multi-Provider Music Lookup & Duration Formatting
    // =========================================================================
    describe('4. Multi-Provider Music Lookups & Failover Resilience', () => {
        test('T4.1: iTunes primary search returns high-fidelity metadata and 1000x1000 artwork', async () => {
            const mockFetch = async () => ({
                ok: true,
                status: 200,
                json: async () => ({
                    results: [{
                        trackName: 'Bohemian Rhapsody',
                        artistName: 'Queen',
                        collectionName: 'A Night at the Opera',
                        trackTimeMillis: 354320,
                        releaseDate: '1975-10-31T08:00:00Z',
                        primaryGenreName: 'Rock',
                        artworkUrl100: 'https://is1-ssl.mzstatic.com/image/thumb/Music/v4/100x100bb.jpg',
                        previewUrl: 'https://audio-ssl.itunes.apple.com/preview.m4a',
                        trackViewUrl: 'https://music.apple.com/track/12345',
                    }],
                }),
            });

            const result = await musicProvider.searchMusicWithFallback('Queen Bohemian Rhapsody', mockFetch);

            assert.equal(result.provider, 'iTunes / Apple Music');
            assert.equal(result.title, 'Bohemian Rhapsody');
            assert.equal(result.artist, 'Queen');
            assert.equal(result.album, 'A Night at the Opera');
            assert.equal(result.duration, '5:54');
            assert.equal(result.artworkUrl, 'https://is1-ssl.mzstatic.com/image/thumb/Music/v4/1000x1000bb.jpg');
            assert.equal(result.previewUrl, 'https://audio-ssl.itunes.apple.com/preview.m4a');
        });

        test('T4.2: iTunes HTTP 500 error triggers automatic cascade to Deezer API', async () => {
            let callCount = 0;
            const fallbackFetch = async (url) => {
                callCount++;
                if (url.includes('itunes.apple.com')) {
                    return { ok: false, status: 500, statusText: 'Internal Server Error' };
                }
                if (url.includes('api.deezer.com')) {
                    return {
                        ok: true,
                        json: async () => ({
                            data: [{
                                title: 'Hotel California',
                                artist: { name: 'Eagles' },
                                album: { title: 'Hotel California', cover_xl: 'https://e-cdns-images.dzcdn.net/cover_xl.jpg' },
                                duration: 391, // 6m 31s
                                preview: 'https://cdns-preview.dzcdn.net/preview.mp3',
                                link: 'https://www.deezer.com/track/54321',
                            }],
                        }),
                    };
                }
                throw new Error('Unexpected URL: ' + url);
            };

            const result = await musicProvider.searchMusicWithFallback('Hotel California', fallbackFetch);

            assert.equal(callCount, 2, 'Should query iTunes then Deezer');
            assert.equal(result.provider, 'Deezer');
            assert.equal(result.title, 'Hotel California');
            assert.equal(result.artist, 'Eagles');
            assert.equal(result.duration, '6:31');
            assert.equal(result.artworkUrl, 'https://e-cdns-images.dzcdn.net/cover_xl.jpg');
        });

        test('T4.3: Complete external API blackout cascades to Spotify Search Link generator', async () => {
            const blackoutFetch = async () => {
                throw new Error('External API Down');
            };

            const result = await musicProvider.searchMusicWithFallback('Stairway to Heaven & Led Zeppelin', blackoutFetch);

            assert.equal(result.provider, 'Spotify Search Link');
            assert.equal(result.title, 'Stairway to Heaven & Led Zeppelin');
            assert.ok(result.url.includes('open.spotify.com/search/Stairway%20to%20Heaven%20%26%20Led%20Zeppelin'));
            assert.equal(result.previewUrl, null);
        });

        test('T4.4: Duration formatting stress test across raw seconds, milliseconds, and extreme values', () => {
            const format = musicProvider.formatDuration;

            assert.equal(format(null), '0:00');
            assert.equal(format(undefined), '0:00');
            assert.equal(format(0), '0:00');
            assert.equal(format(500), '8:20'); // 500s = 8m 20s
            assert.equal(format(45), '0:45'); // 45 seconds
            assert.equal(format(65), '1:05'); // 65 seconds
            assert.equal(format(215000), '3:35'); // 215000ms = 215s = 3m 35s
            assert.equal(format(3600000), '60:00'); // 1 hour in ms
            assert.equal(format(7205000), '120:05'); // 2 hours 5 seconds in ms
        });

        test('T4.5: Special & adversarial search query strings encode safely', async () => {
            const blackoutFetch = async () => {
                throw new Error('API Error');
            };

            const queries = [
                '🎵 Funk Hits 2026',
                "'; DROP TABLE users; --",
                '<script>alert("xss")</script>',
                'Question? & Answer=True #Hash',
            ];

            for (const q of queries) {
                const res = await musicProvider.searchMusicWithFallback(q, blackoutFetch);
                assert.equal(res.provider, 'Spotify Search Link');
                assert.ok(res.url.startsWith('https://open.spotify.com/search/'));
                // Verify URL doesn't contain raw unencoded special characters
                assert.equal(res.url.includes('<script>'), false);
                assert.equal(res.url.includes('; DROP'), false);
            }
        });
    });

    // =========================================================================
    // SECTION 5: High-Concurrency Rate Limiting & Interaction Router
    // =========================================================================
    describe('5. High-Concurrency Rate Limiting & Router Integration', () => {
        test('T5.1: High-concurrency command spam: 100 rapid requests permit only 1 and block 99', () => {
            const spammerId = '500100500100500101';
            let allowedCount = 0;
            let blockedCount = 0;

            for (let i = 0; i < 100; i++) {
                const check = rateLimiter.check(spammerId, 'cmd:ajuda', 3000, false);
                if (check.limited) {
                    blockedCount++;
                } else {
                    allowedCount++;
                }
            }

            assert.equal(allowedCount, 1, 'Exactly 1 request should be permitted');
            assert.equal(blockedCount, 99, '99 requests must be rate-limited');
        });

        test('T5.2: Multi-user concurrency: 20 concurrent users each execute once without collision', () => {
            let totalAllowed = 0;

            for (let i = 0; i < 20; i++) {
                const userId = `5002005002005002${i.toString().padStart(2, '0')}`;
                const check = rateLimiter.check(userId, 'cmd:ajuda', 3000, false);
                if (!check.limited) totalAllowed++;
            }

            assert.equal(totalAllowed, 20, 'All 20 distinct users must be allowed');
        });

        test('T5.3: Developer bypasses cooldown under rapid fire burst', () => {
            const devId = '500300500300500303';
            let devAllowed = 0;

            for (let i = 0; i < 25; i++) {
                const check = rateLimiter.check(devId, 'cmd:ajuda', 3000, true);
                if (!check.limited) devAllowed++;
            }

            assert.equal(devAllowed, 25, 'Developer must bypass all rate limits');
        });

        test('T5.4: Central interactionHandler routes chat command, context menu, and enforces rate limit', async () => {
            const userId = '500400500400500404';
            mockDb.getUser(userId);
            mockDb.updateUser(userId, { tosVersion: config.currentTosVersion, language: 'lang_pt_br' });

            const client = createMockClient();
            client.commands.set('ajuda', ajudaCommand);

            // 1. Initial valid command
            const inter1 = createMockInteraction({
                userId,
                commandName: 'ajuda',
                locale: 'pt-BR',
                client,
            });

            await interactionHandler.execute(inter1, client);
            assert.equal(inter1._replies.length, 1);
            assert.equal(inter1._getLastResponse().embeds[0].data.title, 'Central de Ajuda • Binder');

            // 2. Immediate spam attempt on same command
            const inter2 = createMockInteraction({
                userId,
                commandName: 'ajuda',
                locale: 'pt-BR',
                client,
            });

            await interactionHandler.execute(inter2, client);
            assert.equal(inter2._replies.length, 1);
            assert.ok(inter2._getLastResponse().content.includes('Calma aí!'));
            assert.ok(inter2._getLastResponse().flags.includes(64));
        });
    });
});
