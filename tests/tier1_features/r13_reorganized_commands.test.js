/**
 * @file r13_reorganized_commands.test.js
 * @description Test suite for reorganized /binder subcommands and standalone commands:
 * /ping, /coinflip, /convidar, /botinfo, /userinfo, /serverinfo, /useravatar, /serveravatar, /developers,
 * statusDashboard, guildCreate webhook, and interactionWebhookLogger.
 */

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { createMockClient, createMockInteraction } = require('../helpers/mockDiscord.js');
const db = require('../../src/database/db.js');
const config = require('../../src/config/index.js');

// Commands
const binderCommand = require('../../src/commands/binder.js');
const pingCommand = require('../../src/commands/ping.js');
const coinflipCommand = require('../../src/commands/coinflip.js');
const convidarCommand = require('../../src/commands/convidar.js');
const botinfoCommand = require('../../src/commands/botinfo.js');
const userCommand = require('../../src/commands/user.js');
const serverCommand = require('../../src/commands/server.js');
const containerbuilderCommand = require('../../src/commands/containerbuilder.js');
const developersCommand = require('../../src/commands/developers.js');

// Events & Utils
const guildCreateEvent = require('../../src/events/guildCreate.js');
const {
    queueInteractionLog,
    flushQueue,
    getQueueSize,
    clearQueue,
    shouldLogInteraction,
} = require('../../src/utils/interactionWebhookLogger.js');
const { updateStatusDashboard } = require('../../src/utils/statusDashboard.js');

const OWNER_ID = '659214571634032667';
const TEST_DEV_ID = '777888999000111222';
const REGULAR_USER_ID = '111222333444555666';

describe('Requirement R13: Reorganized Commands, New Standalones & Infrastructure', () => {

    beforeEach(async () => {
        clearQueue();
        // Ensure regular user has accepted ToS
        await db.updateUser(REGULAR_USER_ID, {
            tosVersion: config.currentTosVersion,
            language: 'lang_pt_br',
            isDeveloper: 0,
        });
        // Ensure owner has accepted ToS and is dev
        await db.updateUser(OWNER_ID, {
            tosVersion: config.currentTosVersion,
            language: 'lang_pt_br',
            isDeveloper: 1,
        });
        // Ensure test dev has accepted ToS
        await db.updateUser(TEST_DEV_ID, {
            tosVersion: config.currentTosVersion,
            language: 'lang_pt_br',
            isDeveloper: 0,
        });
    });

    // -------------------------------------------------------------------------
    // 1. /binder Subcommands Suite
    // -------------------------------------------------------------------------
    describe('1. /binder Subcommand Structure & Routing', () => {
        test('/binder data registers all required subcommands with localizations', () => {
            const subcommands = binderCommand.data.options.map(o => o.name);
            const expected = ['ajuda', 'info', 'ping', 'convidar', 'feedback', 'bugreport', 'novidades', 'idioma'];
            for (const name of expected) {
                assert.ok(subcommands.includes(name), `Missing subcommand: ${name}`);
            }
        });

        test('/binder ajuda executes and returns help payload', async () => {
            const client = createMockClient();
            const interaction = createMockInteraction({
                userId: REGULAR_USER_ID,
                commandName: 'binder',
                subcommand: 'ajuda',
            });

            await binderCommand.execute(interaction, client);
            assert.equal(interaction._replies.length, 1);
            const res = interaction._getLastResponse();
            assert.ok(res.embeds && res.embeds.length > 0);
            assert.ok(res.embeds[0].data.title.includes('Ajuda') || res.embeds[0].data.title.includes('Help'));
        });

        test('/binder novidades executes and returns changelog', async () => {
            const client = createMockClient();
            const interaction = createMockInteraction({
                userId: REGULAR_USER_ID,
                commandName: 'binder',
                subcommand: 'novidades',
            });

            await binderCommand.execute(interaction, client);
            assert.equal(interaction._replies.length, 1);
            const res = interaction._getLastResponse();
            assert.ok(res.embeds[0].data.title.includes('Novidades') || res.embeds[0].data.title.includes('News'));
        });

        test('/binder convidar executes and returns invite links', async () => {
            const client = createMockClient();
            const interaction = createMockInteraction({
                userId: REGULAR_USER_ID,
                commandName: 'binder',
                subcommand: 'convidar',
            });

            await binderCommand.execute(interaction, client);
            assert.equal(interaction._replies.length, 1);
            const res = interaction._getLastResponse();
            assert.ok(res.components && res.components.length > 0);
        });

        test('/binder feedback rejects message with < 10 characters', async () => {
            const client = createMockClient();
            const interaction = createMockInteraction({
                userId: REGULAR_USER_ID,
                commandName: 'binder',
                subcommand: 'feedback',
                options: { mensagem: 'curto' },
            });

            await binderCommand.execute(interaction, client);
            const res = interaction._getLastResponse();
            assert.ok(res.content.includes('curta') || res.content.includes('short'));
        });

        test('/binder feedback succeeds with valid input >= 10 chars', async () => {
            const client = createMockClient();
            const interaction = createMockInteraction({
                userId: REGULAR_USER_ID,
                commandName: 'binder',
                subcommand: 'feedback',
                options: { mensagem: 'Sugestão detalhada com mais de 10 caracteres' },
            });

            await binderCommand.execute(interaction, client);
            const res = interaction._getLastResponse();
            assert.ok(res.embeds && res.embeds.length > 0);
        });

        test('/binder bugreport rejects short description', async () => {
            const client = createMockClient();
            const interaction = createMockInteraction({
                userId: REGULAR_USER_ID,
                commandName: 'binder',
                subcommand: 'bugreport',
                options: { descricao: 'bug' },
            });

            await binderCommand.execute(interaction, client);
            const res = interaction._getLastResponse();
            assert.ok(res.content.includes('curta') || res.content.includes('short'));
        });

        test('/binder bugreport succeeds with valid description', async () => {
            const client = createMockClient();
            const interaction = createMockInteraction({
                userId: REGULAR_USER_ID,
                commandName: 'binder',
                subcommand: 'bugreport',
                options: { descricao: 'Erro detectado ao abrir menu de ajuda interativo' },
            });

            await binderCommand.execute(interaction, client);
            const res = interaction._getLastResponse();
            assert.ok(res.embeds && res.embeds.length > 0);
        });
    });

    // -------------------------------------------------------------------------
    // 2. Standalone Commands Suite
    // -------------------------------------------------------------------------
    describe('2. Standalone Commands: /ping, /coinflip, /convidar, /botinfo', () => {
        test('/ping calculates latency and returns embed', async () => {
            const client = createMockClient({ ping: 32 });
            const interaction = createMockInteraction({
                userId: REGULAR_USER_ID,
                commandName: 'ping',
            });

            await pingCommand.execute(interaction, client);
            assert.equal(interaction._replies.length, 1);
            assert.ok(interaction._editReplies.length > 0);
            const res = interaction._getLastResponse();
            assert.ok(res.embeds[0].data.title.includes('Latência') || res.embeds[0].data.title.includes('Latency'));
        });

        test('/coinflip returns either Cara or Coroa with valid embed', async () => {
            const client = createMockClient();
            const interaction = createMockInteraction({
                userId: REGULAR_USER_ID,
                commandName: 'coinflip',
            });

            await coinflipCommand.execute(interaction, client);
            assert.equal(interaction._replies.length, 1);
            const res = interaction._getLastResponse();
            const desc = res.embeds[0].data.description;
            assert.ok(desc.includes('Cara') || desc.includes('Coroa') || desc.includes('Heads') || desc.includes('Tails'));
        });

        test('/convidar returns invite embed with action buttons', async () => {
            const client = createMockClient();
            const interaction = createMockInteraction({
                userId: REGULAR_USER_ID,
                commandName: 'convidar',
            });

            await convidarCommand.execute(interaction, client);
            assert.equal(interaction._replies.length, 1);
            const res = interaction._getLastResponse();
            assert.ok(res.embeds && res.embeds.length > 0);
            assert.ok(res.components[0].components.length >= 2);
        });

        test('/botinfo displays system metrics, identity, and credits', async () => {
            const client = createMockClient({ ping: 25 });
            const interaction = createMockInteraction({
                userId: REGULAR_USER_ID,
                commandName: 'botinfo',
            });

            await botinfoCommand.execute(interaction, client);
            assert.equal(interaction._replies.length, 1);
            const res = interaction._getLastResponse();
            assert.ok(res.embeds[0].data.fields.some(f => f.name.includes('Identidade') || f.name.includes('Identity')));
            assert.ok(res.embeds[0].data.fields.some(f => f.name.includes('Estatísticas') || f.name.includes('Statistics')));
        });
    });

    // -------------------------------------------------------------------------
    // 3. User & Server Profile Commands
    // -------------------------------------------------------------------------
    // -------------------------------------------------------------------------
    // 3. User & Server Profile Commands (/user info, /user avatar, /server info, /server avatar)
    // -------------------------------------------------------------------------
    describe('3. Profile & Media Commands: /user (info, avatar) & /server (info, avatar)', () => {
        test('/user info includes Developer badge for user with isDeveloper = 1', async () => {
            const client = createMockClient();
            const devInteraction = createMockInteraction({
                userId: REGULAR_USER_ID,
                commandName: 'user',
                subcommand: 'info',
                options: {
                    usuario: {
                        id: OWNER_ID,
                        username: 'MarcosBinder',
                        displayAvatarURL: () => 'https://cdn.discordapp.com/avatars/marcos.png',
                    },
                },
            });

            await userCommand.execute(devInteraction, client);
            assert.equal(devInteraction._replies.length, 1);
            const res = devInteraction._getLastResponse();
            const badgeField = res.embeds[0].data.fields.find(f => f.name.includes('Badges'));
            assert.ok(badgeField && badgeField.value.includes('Desenvolvedor'), 'Must display Developer badge');
        });

        test('/user info resolves target user flags and guild hierarchy', async () => {
            const client = createMockClient();
            const interaction = createMockInteraction({
                userId: REGULAR_USER_ID,
                commandName: 'user',
                subcommand: 'info',
                options: {
                    usuario: {
                        id: '888777666555444333',
                        username: 'RegularTester',
                        flags: { toArray: () => ['HypeSquadOnlineHouse1'] },
                        displayAvatarURL: () => 'https://cdn.discordapp.com/avatars/reg.png',
                    },
                },
                targetMember: {
                    roles: {
                        cache: new Map([['1', { name: 'Membro' }]]),
                        highest: { name: 'Membro' },
                    },
                    joinedAt: new Date(),
                },
            });

            await userCommand.execute(interaction, client);
            assert.equal(interaction._replies.length, 1);
            const res = interaction._getLastResponse();
            const badgeField = res.embeds[0].data.fields.find(f => f.name.includes('Badges'));
            assert.ok(badgeField && badgeField.value.includes('Bravery'), 'Must map HypeSquad badge');
        });

        test('/user avatar renders user avatar with format buttons', async () => {
            const client = createMockClient();
            const interaction = createMockInteraction({
                userId: REGULAR_USER_ID,
                commandName: 'user',
                subcommand: 'avatar',
            });

            await userCommand.execute(interaction, client);
            assert.equal(interaction._replies.length, 1);
            const res = interaction._getLastResponse();
            assert.ok(res.components[0].components.some(b => b.data.label === 'PNG'));
            assert.ok(res.components[0].components.some(b => b.data.label === 'WEBP'));
        });

        test('/server info in guild renders comprehensive stats', async () => {
            const client = createMockClient();
            const interaction = createMockInteraction({
                userId: REGULAR_USER_ID,
                commandName: 'server',
                subcommand: 'info',
                guild: {
                    id: '987654321098765432',
                    name: 'Servidor de Teste Oficial',
                    ownerId: OWNER_ID,
                    memberCount: 500,
                    verificationLevel: 2,
                    premiumTier: 1,
                    premiumSubscriptionCount: 5,
                    createdTimestamp: Date.now() - 10000000,
                    iconURL: () => 'https://cdn.discordapp.com/icons/server.png',
                    channels: { cache: new Map() },
                    roles: { cache: new Map([['1', { name: 'Admin' }]]) },
                    emojis: { cache: new Map() },
                    stickers: { cache: new Map() },
                    members: { cache: new Map() },
                },
            });

            await serverCommand.execute(interaction, client);
            assert.equal(interaction._replies.length, 1);
            const res = interaction._getLastResponse();
            assert.ok(res.embeds[0].data.fields.some(f => f.name.includes('Identificação') || f.name.includes('Identification')));
            assert.ok(res.embeds[0].data.fields.some(f => f.name.includes('Membros') || f.name.includes('Members')));
        });

        test('/server info rejects execution in DM context', async () => {
            const client = createMockClient();
            const interaction = createMockInteraction({
                userId: REGULAR_USER_ID,
                guildId: null,
                guild: null,
                commandName: 'server',
                subcommand: 'info',
            });

            await serverCommand.execute(interaction, client);
            const res = interaction._getLastResponse();
            assert.ok(res.content.includes('servidor') || res.content.includes('server'));
        });

        test('/server avatar in guild renders server icon and buttons', async () => {
            const client = createMockClient();
            const interaction = createMockInteraction({
                userId: REGULAR_USER_ID,
                commandName: 'server',
                subcommand: 'avatar',
                guild: {
                    name: 'Guild Icon Server',
                    iconURL: () => 'https://cdn.discordapp.com/icons/guild_icon.png',
                    bannerURL: () => 'https://cdn.discordapp.com/banners/guild_banner.png',
                },
            });

            await serverCommand.execute(interaction, client);
            assert.equal(interaction._replies.length, 1);
            const res = interaction._getLastResponse();
            assert.ok(res.components[0].components.length >= 1);
        });

        test('/server avatar rejects in DM context', async () => {
            const client = createMockClient();
            const interaction = createMockInteraction({
                userId: REGULAR_USER_ID,
                guildId: null,
                guild: null,
                commandName: 'server',
                subcommand: 'avatar',
            });

            await serverCommand.execute(interaction, client);
            const res = interaction._getLastResponse();
            assert.ok(res.content.includes('servidor') || res.content.includes('server'));
        });

        test('/containerbuilder rejects member without ManageMessages permission', async () => {
            const client = createMockClient();
            const interaction = createMockInteraction({
                userId: REGULAR_USER_ID,
                commandName: 'containerbuilder',
                guild: { id: '999888777' },
                member: {
                    permissions: {
                        has: () => false,
                    },
                },
            });

            await containerbuilderCommand.execute(interaction, client);
            const res = interaction._getLastResponse();
            assert.ok(res.content.includes('permissão') || res.content.includes('permission'));
        });

        test('/containerbuilder rejects in DM context', async () => {
            const client = createMockClient();
            const interaction = createMockInteraction({
                userId: REGULAR_USER_ID,
                guild: null,
                guildId: null,
                commandName: 'containerbuilder',
            });

            await containerbuilderCommand.execute(interaction, client);
            const res = interaction._getLastResponse();
            assert.ok(res.content.includes('servidor') || res.content.includes('server'));
        });
    });

    // -------------------------------------------------------------------------
    // 4. /developers Suite (eval, adicionar, remover, stats)
    // -------------------------------------------------------------------------
    describe('4. /developers Management & Security Restrictions', () => {
        test('/developers eval allows execution by bot owner', async () => {
            const client = createMockClient();
            const interaction = createMockInteraction({
                userId: OWNER_ID,
                commandName: 'developers',
                subcommand: 'eval',
                options: { codigo: '1 + 2 + 3' },
            });

            await developersCommand.execute(interaction, client);
            const res = interaction._getLastResponse();
            assert.ok(res.embeds[0].data.title.includes('Concluído'));
            assert.ok(res.embeds[0].data.description.includes('6'));
        });

        test('/developers eval rejects execution by non-owner', async () => {
            const client = createMockClient();
            const interaction = createMockInteraction({
                userId: REGULAR_USER_ID,
                commandName: 'developers',
                subcommand: 'eval',
                options: { codigo: 'process.exit(1)' },
            });

            await developersCommand.execute(interaction, client);
            const res = interaction._getLastResponse();
            assert.ok(res.content.includes('proprietário') || res.content.includes('owner'));
        });

        test('/developers adicionar allows owner to grant developer access', async () => {
            const client = createMockClient();
            const interaction = createMockInteraction({
                userId: OWNER_ID,
                commandName: 'developers',
                subcommand: 'adicionar',
                options: {
                    usuario: { id: TEST_DEV_ID, username: 'NewDev' },
                },
            });

            await developersCommand.execute(interaction, client);
            const res = interaction._getLastResponse();
            assert.ok(res.embeds[0].data.title.includes('Adicionado') || res.embeds[0].data.title.includes('Added'));

            // Check database
            const user = await db.getUser(TEST_DEV_ID);
            assert.equal(user.isDeveloper, 1);
        });

        test('/developers adicionar rejects execution by non-owner', async () => {
            const client = createMockClient();
            const interaction = createMockInteraction({
                userId: REGULAR_USER_ID,
                commandName: 'developers',
                subcommand: 'adicionar',
                options: {
                    usuario: { id: TEST_DEV_ID, username: 'NewDev' },
                },
            });

            await developersCommand.execute(interaction, client);
            const res = interaction._getLastResponse();
            assert.ok(res.content.includes('proprietário') || res.content.includes('owner'));
        });

        test('/developers remover allows owner to revoke developer access', async () => {
            // First set dev
            await db.updateUser(TEST_DEV_ID, { isDeveloper: 1 });

            const client = createMockClient();
            const interaction = createMockInteraction({
                userId: OWNER_ID,
                commandName: 'developers',
                subcommand: 'remover',
                options: {
                    usuario: { id: TEST_DEV_ID, username: 'FormerDev' },
                },
            });

            await developersCommand.execute(interaction, client);
            const res = interaction._getLastResponse();
            assert.ok(res.embeds[0].data.title.includes('Removido') || res.embeds[0].data.title.includes('Removed'));

            const user = await db.getUser(TEST_DEV_ID);
            assert.equal(user.isDeveloper, 0);
        });

        test('/developers remover prevents removing the owner', async () => {
            const client = createMockClient();
            const interaction = createMockInteraction({
                userId: OWNER_ID,
                commandName: 'developers',
                subcommand: 'remover',
                options: {
                    usuario: { id: OWNER_ID, username: 'Owner' },
                },
            });

            await developersCommand.execute(interaction, client);
            const res = interaction._getLastResponse();
            assert.ok(res.content.includes('não pode ser removido') || res.content.includes('cannot be removed'));
        });

        test('/developers stats displays memory, uptime, and database status to devs', async () => {
            const client = createMockClient();
            const interaction = createMockInteraction({
                userId: OWNER_ID, // Owner is developer
                commandName: 'developers',
                subcommand: 'stats',
            });

            await developersCommand.execute(interaction, client);
            const res = interaction._getLastResponse();
            assert.ok(res.embeds[0].data.fields.some(f => f.name.includes('Memória') || f.name.includes('RAM')));
            assert.ok(res.embeds[0].data.fields.some(f => f.name.includes('Banco de Dados')));
        });

        test('/developers stats rejects non-developer user', async () => {
            const client = createMockClient();
            const interaction = createMockInteraction({
                userId: REGULAR_USER_ID,
                commandName: 'developers',
                subcommand: 'stats',
            });

            await developersCommand.execute(interaction, client);
            const res = interaction._getLastResponse();
            assert.ok(res.content.includes('restrito') || res.content.includes('restricted'));
        });
    });

    // -------------------------------------------------------------------------
    // 5. Infrastructure: Webhook Logger, GuildCreate & Status Dashboard
    // -------------------------------------------------------------------------
    describe('5. Infrastructure: Webhook Logger, GuildCreate & Status Dashboard', () => {
        test('interactionWebhookLogger filters command types properly', () => {
            const slashInter = { isChatInputCommand: () => true, isContextMenuCommand: () => false };
            const contextInter = { isChatInputCommand: () => false, isContextMenuCommand: () => true };
            const buttonInter = { isChatInputCommand: () => false, isContextMenuCommand: () => false, isButton: () => true };
            const modalInter = { isChatInputCommand: () => false, isContextMenuCommand: () => false, isModalSubmit: () => true };

            assert.equal(shouldLogInteraction(slashInter), true);
            assert.equal(shouldLogInteraction(contextInter), true);
            assert.equal(shouldLogInteraction(buttonInter), false, 'Buttons must NOT be logged');
            assert.equal(shouldLogInteraction(modalInter), false, 'Modals must NOT be logged');
        });

        test('queueInteractionLog enqueues slash commands and ignores buttons', () => {
            process.env.WEBHOOK_INTERACTIONS = 'https://discord.com/api/webhooks/mock/interactions';
            const slashInter = {
                commandName: 'ping',
                isChatInputCommand: () => true,
                isContextMenuCommand: () => false,
                user: { id: '123', tag: 'User#1234' },
                guild: { id: '456', name: 'Guild' },
            };

            const buttonInter = {
                customId: 'btn_click',
                isChatInputCommand: () => false,
                isContextMenuCommand: () => false,
                isButton: () => true,
            };

            assert.equal(queueInteractionLog(slashInter, 'SUCCESS', 25), true);
            assert.equal(queueInteractionLog(buttonInter, 'SUCCESS', 10), false);
            assert.equal(getQueueSize(), 1);
        });

        test('guildCreate event executes and builds join notification without error', async () => {
            const mockGuild = {
                id: '123456789012345678',
                name: 'New Joined Server',
                memberCount: 250,
                ownerId: OWNER_ID,
                createdTimestamp: Date.now() - 5000000,
                iconURL: () => 'https://cdn.discordapp.com/icons/join.png',
            };
            const client = createMockClient();

            await assert.doesNotReject(async () => {
                await guildCreateEvent.execute(mockGuild, client);
            });
        });

        test('updateStatusDashboard safely finds or creates fixed dashboard embed', async () => {
            let sentEmbed = null;
            let editedEmbed = null;

            const mockChannel = {
                id: '1358542780275888501',
                messages: {
                    fetch: async (opts) => {
                        if (typeof opts === 'object') {
                            return [{
                                id: 'existing_dashboard_msg',
                                author: { id: '1310336375261892608' },
                                embeds: [{ title: '📊 Binder\'s Server Tools • Status Dashboard' }],
                                edit: async (payload) => {
                                    editedEmbed = payload;
                                    return { id: 'existing_dashboard_msg' };
                                },
                            }];
                        }
                        return null;
                    },
                },
                send: async (payload) => {
                    sentEmbed = payload;
                    return { id: 'new_dashboard_msg' };
                },
            };

            const client = createMockClient({
                user: { id: '1310336375261892608', displayAvatarURL: () => 'https://cdn.discordapp.com/avatar.png' },
                channels: {
                    cache: new Map([['1358542780275888501', mockChannel]]),
                    fetch: async () => mockChannel,
                },
            });

            await assert.doesNotReject(async () => {
                const res = await updateStatusDashboard(client);
                assert.ok(res, 'Dashboard update must return message');
            });
            assert.ok(editedEmbed || sentEmbed, 'Dashboard must have been updated or created');
        });
    });

    // -------------------------------------------------------------------------
    // 6. Database Outbox Sync Queue & Cache Safety
    // -------------------------------------------------------------------------
    describe('6. Database Outbox Sync Queue & Cache Safety', () => {
        test('enqueueSync increments sync queue size', () => {
            const initialSize = db.getSyncQueueSize();
            db.enqueueSync('UPDATE_USER', '999111222', { language: 'pt_BR' });
            assert.equal(db.getSyncQueueSize(), initialSize + 1);
        });

        test('flushSyncQueue executes without throwing and processes queued items', async () => {
            await assert.doesNotReject(async () => {
                const result = await db.flushSyncQueue();
                assert.ok(typeof result.processed === 'number');
            });
        });

        test('invalidateUserCache and invalidateGuildCache run safely', () => {
            assert.doesNotThrow(() => {
                db.invalidateUserCache('test_user_id');
                db.invalidateGuildCache('test_guild_id');
            });
        });
    });
});
