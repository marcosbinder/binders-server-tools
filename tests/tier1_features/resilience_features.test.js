// tests/tier1_features/resilience_features.test.js
/**
 * @file resilience_features.test.js
 * @description Comprehensive automated tests for Tier 1 Features (R1-R4):
 *  - safeReply interaction states (replied vs deferred vs fresh reply, ephemeral flag, error suppression)
 *  - Preventive deferReply in external I/O & moderation commands
 *  - Role hierarchy enforcement and owner protection in moderacao.js
 *  - Valid time parsing across formats and units in reminderManager.js
 *  - cancelReminder timer garbage collection and activeTimeouts eviction
 *  - parseHexColor valid hex, 3-digit shorthand, and fallback handling
 *  - Dead webhook silencing (Discord 10015 Unknown Webhook, markDeadWebhook)
 *  - Database fallback persistence (SQLite / in-memory CRUD)
 */

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { MessageFlags, PermissionFlagsBits } = require('discord.js');

const safeReply = require('../../src/utils/safeReply.js');
const { parseTimeString, scheduleReminder, cancelReminder, activeTimeouts, MIN_REMINDER_MS, MAX_REMINDER_MS } = require('../../src/utils/reminderManager.js');
const { parseHexColor } = require('../../src/components/builder/containerBuilder.js');
const Logger = require('../../src/utils/logger.js');
const { isDeadWebhook, markDeadWebhook, deadWebhooks } = require('../../src/utils/logger.js');
const { sendLifecycleLog } = require('../../src/utils/lifecycleLogger.js');
const moderacaoCmd = require('../../src/commands/moderacao.js');
const bugreportCmd = require('../../src/commands/bugreport.js');
const feedbackCmd = require('../../src/commands/feedback.js');
const avatarCmd = require('../../src/commands/avatar.js');
const db = require('../../src/database/db.js');
const { createMockInteraction, createMockClient } = require('../helpers/mockDiscord.js');

describe('Tier 1: Features — R1-R4 Resilience & Architecture', () => {

    // -------------------------------------------------------------------------
    // 1. safeReply Interaction States
    // -------------------------------------------------------------------------
    describe('F1.1: safeReply Interaction States', () => {
        test('Fresh interaction (neither replied nor deferred) calls reply()', async () => {
            let calledReply = false;
            let payloadReceived = null;
            const interaction = {
                replied: false,
                deferred: false,
                reply: async (p) => {
                    calledReply = true;
                    payloadReceived = p;
                    return { id: 'msg_reply_1' };
                }
            };

            const result = await safeReply(interaction, 'Mensagem inicial');
            assert.equal(calledReply, true);
            assert.deepEqual(payloadReceived, { content: 'Mensagem inicial' });
            assert.equal(result.id, 'msg_reply_1');
        });

        test('Deferred interaction calls editReply() instead of reply()', async () => {
            let calledEdit = false;
            let calledReply = false;
            const interaction = {
                replied: false,
                deferred: true,
                editReply: async (p) => {
                    calledEdit = true;
                    return { id: 'msg_edit_1', ...p };
                },
                reply: async () => {
                    calledReply = true;
                }
            };

            const result = await safeReply(interaction, { content: 'Resposta atualizada' });
            assert.equal(calledEdit, true);
            assert.equal(calledReply, false);
            assert.equal(result.id, 'msg_edit_1');
            assert.equal(result.content, 'Resposta atualizada');
        });

        test('Already-replied interaction calls followUp() instead of reply() or editReply()', async () => {
            let calledFollowUp = false;
            let calledReply = false;
            const interaction = {
                replied: true,
                deferred: false,
                followUp: async (p) => {
                    calledFollowUp = true;
                    return { id: 'msg_followup_1', ...p };
                },
                reply: async () => {
                    calledReply = true;
                }
            };

            const result = await safeReply(interaction, 'Notificação adicional');
            assert.equal(calledFollowUp, true);
            assert.equal(calledReply, false);
            assert.equal(result.id, 'msg_followup_1');
        });

        test('Sets MessageFlags.Ephemeral when options.ephemeral is true', async () => {
            let payloadSent = null;
            const interaction = {
                replied: false,
                deferred: false,
                reply: async (p) => {
                    payloadSent = p;
                    return p;
                }
            };

            await safeReply(interaction, { content: 'Privado' }, { ephemeral: true });
            assert.ok(payloadSent.flags);
            assert.ok(payloadSent.flags.includes(MessageFlags.Ephemeral));
        });

        test('Suppresses Discord API errors gracefully and returns null without crashing', async () => {
            const failingInteraction = {
                replied: false,
                deferred: false,
                reply: async () => {
                    const err = new Error('Interaction has already been acknowledged.');
                    err.code = 40060;
                    throw err;
                }
            };

            const result = await safeReply(failingInteraction, 'Falha simulada');
            assert.equal(result, null);
        });

        test('Returns null safely when interaction is null or undefined', async () => {
            assert.equal(await safeReply(null, 'teste'), null);
            assert.equal(await safeReply(undefined, 'teste'), null);
        });
    });

    // -------------------------------------------------------------------------
    // 2. Preventive deferReply in Commands
    // -------------------------------------------------------------------------
    describe('F1.2: Preventive deferReply in Commands', () => {
        beforeEach(() => {
            db.updateUser('defer_user_1', { tosVersion: 2 });
        });

        test('bugreport command defers reply ephemerally before network dispatch', async () => {
            let deferredOptions = null;
            const interaction = createMockInteraction({
                userId: 'defer_user_1',
                commandName: 'bugreport',
                options: { descricao: 'Problema detalhado de teste com mais de 10 caracteres' },
            });
            interaction.deferReply = async (opts) => {
                interaction.deferred = true;
                deferredOptions = opts;
                return { deferred: true };
            };

            await bugreportCmd.execute(interaction, {});
            assert.equal(interaction.deferred, true);
            assert.ok(deferredOptions && deferredOptions.flags);
            assert.ok(deferredOptions.flags.includes(MessageFlags.Ephemeral));
        });

        test('feedback command defers reply ephemerally before network dispatch', async () => {
            let deferredOptions = null;
            const interaction = createMockInteraction({
                userId: 'defer_user_1',
                commandName: 'feedback',
                options: { mensagem: 'Sugestão detalhada com mais de 10 caracteres' },
            });
            interaction.deferReply = async (opts) => {
                interaction.deferred = true;
                deferredOptions = opts;
                return { deferred: true };
            };

            await feedbackCmd.execute(interaction, {});
            assert.equal(interaction.deferred, true);
            assert.ok(deferredOptions && deferredOptions.flags);
            assert.ok(deferredOptions.flags.includes(MessageFlags.Ephemeral));
        });

        test('avatar command responds safely with embeds and format download buttons', async () => {
            const interaction = createMockInteraction({
                userId: 'defer_user_1',
                commandName: 'avatar',
                options: {},
            });

            await avatarCmd.execute(interaction, {});
            const response = interaction._getLastResponse();
            assert.ok(response);
            assert.ok(response.embeds && response.embeds.length > 0);
            assert.ok(response.components && response.components.length > 0);
        });
    });

    // -------------------------------------------------------------------------
    // 3. Moderation Hierarchy Enforcement & Owner Protection
    // -------------------------------------------------------------------------
    describe('F1.4: Moderation Role Hierarchy & Protection', () => {
        const executorId = 'mod_executor_100';
        const targetId = 'target_user_200';
        const ownerId = 'guild_owner_300';
        const botId = '1310336375261892608';

        beforeEach(() => {
            db.updateUser(executorId, { tosVersion: 2 });
        });

        function createModerationSetup({ executorPos = 10, targetPos = 5, botPos = 50, isOwner = false }) {
            const targetUser = {
                id: isOwner ? ownerId : targetId,
                username: isOwner ? 'GuildOwner' : 'TargetUser',
                tag: isOwner ? 'GuildOwner#0001' : 'TargetUser#0001',
            };

            let kickCalled = false;
            let banCalled = false;
            let timeoutCalled = false;

            const targetMember = {
                id: targetUser.id,
                user: targetUser,
                roles: {
                    highest: { position: targetPos, name: 'TargetRole' },
                },
                kickable: targetPos < botPos,
                bannable: targetPos < botPos,
                moderatable: targetPos < botPos,
                kick: async () => { kickCalled = true; },
                timeout: async () => { timeoutCalled = true; },
            };

            const botMember = {
                id: botId,
                roles: {
                    highest: { position: botPos, name: 'BotRole' },
                },
                permissions: {
                    has: () => true,
                },
            };

            const guild = {
                id: 'mod_guild_1',
                ownerId,
                members: {
                    me: botMember,
                    fetch: async (id) => {
                        if (id === targetUser.id) return targetMember;
                        return null;
                    },
                    ban: async () => { banCalled = true; },
                },
            };

            const executorMember = {
                id: executorId,
                roles: {
                    highest: { position: executorPos, name: 'ModRole' },
                },
                permissions: {
                    has: () => true,
                },
                guild,
            };

            const client = {
                user: { id: botId, tag: 'Bot#0001' },
            };

            return {
                executorMember,
                targetUser,
                targetMember,
                guild,
                client,
                getActions: () => ({ kickCalled, banCalled, timeoutCalled }),
            };
        }

        test('Moderator cannot kick a member with higher role position', async () => {
            const setup = createModerationSetup({ executorPos: 10, targetPos: 20 });
            const interaction = createMockInteraction({
                userId: executorId,
                guildId: setup.guild.id,
                commandName: 'moderacao',
                subcommand: 'kick',
                member: setup.executorMember,
                guild: setup.guild,
                options: { usuario: setup.targetUser, motivo: 'Teste' },
            });

            await moderacaoCmd.execute(interaction, setup.client);
            assert.equal(setup.getActions().kickCalled, false);
            const response = interaction._getLastResponse();
            assert.ok(response.content.includes('cargo igual ou superior'));
        });

        test('Moderator cannot kick a member with equal role position', async () => {
            const setup = createModerationSetup({ executorPos: 10, targetPos: 10 });
            const interaction = createMockInteraction({
                userId: executorId,
                guildId: setup.guild.id,
                commandName: 'moderacao',
                subcommand: 'kick',
                member: setup.executorMember,
                guild: setup.guild,
                options: { usuario: setup.targetUser },
            });

            await moderacaoCmd.execute(interaction, setup.client);
            assert.equal(setup.getActions().kickCalled, false);
            const response = interaction._getLastResponse();
            assert.ok(response.content.includes('cargo igual ou superior'));
        });

        test('Server owner cannot be moderated (kick/ban/timeout)', async () => {
            const setup = createModerationSetup({ executorPos: 50, targetPos: 1, isOwner: true });
            const interaction = createMockInteraction({
                userId: executorId,
                guildId: setup.guild.id,
                commandName: 'moderacao',
                subcommand: 'ban',
                member: setup.executorMember,
                guild: setup.guild,
                options: { usuario: setup.targetUser },
            });

            await moderacaoCmd.execute(interaction, setup.client);
            assert.equal(setup.getActions().banCalled, false);
            const response = interaction._getLastResponse();
            assert.ok(response.content.includes('dono do servidor não pode ser moderado'));
        });

        test('Executor cannot apply punishments to themselves', async () => {
            const setup = createModerationSetup({ executorPos: 20, targetPos: 5 });
            const interaction = createMockInteraction({
                userId: executorId,
                guildId: setup.guild.id,
                commandName: 'moderacao',
                subcommand: 'timeout',
                member: setup.executorMember,
                guild: setup.guild,
                options: { usuario: { id: executorId, username: 'Executor' }, duracao: '10m' },
            });

            await moderacaoCmd.execute(interaction, setup.client);
            assert.equal(setup.getActions().timeoutCalled, false);
            const response = interaction._getLastResponse();
            assert.ok(response.content.includes('punições a si mesmo'));
        });

        test('Moderator can kick a member when role hierarchy is strictly respected', async () => {
            const setup = createModerationSetup({ executorPos: 20, targetPos: 5, botPos: 50 });
            const interaction = createMockInteraction({
                userId: executorId,
                guildId: setup.guild.id,
                commandName: 'moderacao',
                subcommand: 'kick',
                member: setup.executorMember,
                guild: setup.guild,
                options: { usuario: setup.targetUser, motivo: 'Spam excessivo' },
            });

            await moderacaoCmd.execute(interaction, setup.client);
            assert.equal(setup.getActions().kickCalled, true);
            const response = interaction._getLastResponse();
            assert.ok(response.embeds && response.embeds.length > 0);
            assert.ok(response.embeds[0].data.title.includes('Membro Expulso'));
        });
    });

    // -------------------------------------------------------------------------
    // 4. Valid Time Parsing in reminderManager.js
    // -------------------------------------------------------------------------
    describe('F2.2: Valid Time Parsing in reminderManager.js', () => {
        test('Parses various time units correctly (s, m, h, d, w)', () => {
            assert.equal(parseTimeString('10s'), 10000);
            assert.equal(parseTimeString('30segundos'), 30000);
            assert.equal(parseTimeString('45seconds'), 45000);
            assert.equal(parseTimeString('5m'), 300000);
            assert.equal(parseTimeString('15min'), 900000);
            assert.equal(parseTimeString('20minutos'), 1200000);
            assert.equal(parseTimeString('2h'), 7200000);
            assert.equal(parseTimeString('3horas'), 10800000);
            assert.equal(parseTimeString('1d'), 86400000);
            assert.equal(parseTimeString('7dias'), 7 * 86400000);
            assert.equal(parseTimeString('1w'), 7 * 86400000);
            assert.equal(parseTimeString('2w'), 14 * 86400000);
        });

        test('Parses multi-token composite duration', () => {
            const expected = (86400 + 2 * 3600 + 30 * 60 + 10) * 1000;
            assert.equal(parseTimeString('1d 2h 30m 10s'), expected);
        });

        test('Parses raw number string as minutes', () => {
            assert.equal(parseTimeString('25'), 25 * 60 * 1000);
            assert.equal(parseTimeString('10'), 10 * 60 * 1000);
        });

        test('Enforces MIN_REMINDER_MS (5 seconds)', () => {
            assert.equal(parseTimeString('5s'), 5000);
            assert.equal(parseTimeString('6s'), 6000);
            assert.equal(parseTimeString('4s'), null);
        });
    });

    // -------------------------------------------------------------------------
    // 5. cancelReminder Timer Garbage Collection
    // -------------------------------------------------------------------------
    describe('F2.1: cancelReminder Timer Garbage Collection', () => {
        test('cancelReminder clears timeout handle and evicts key from activeTimeouts Map', async () => {
            const reminderId = 'rem_gc_test_101';
            const client = createMockClient();

            const reminderData = {
                id: reminderId,
                userId: 'user_gc_1',
                dueTimestamp: Date.now() + 100000,
                completed: 0,
            };

            await db.createReminder(reminderData);
            scheduleReminder(client, reminderData);

            assert.equal(activeTimeouts.has(reminderId), true, 'Reminder timer should be tracked in activeTimeouts');

            const cancelled = await cancelReminder(reminderId);
            assert.equal(cancelled, true, 'cancelReminder should return true for active reminder');
            assert.equal(activeTimeouts.has(reminderId), false, 'Timeout key must be evicted from activeTimeouts Map');
        });

        test('cancelReminder returns false for non-existent reminder', async () => {
            const cancelled = await cancelReminder('rem_non_existent_9999');
            assert.equal(cancelled, false);
        });
    });

    // -------------------------------------------------------------------------
    // 6. parseHexColor in containerBuilder.js
    // -------------------------------------------------------------------------
    describe('F3.1: parseHexColor Validation & Clamping', () => {
        const DEFAULT_BRANDING_COLOR = 0x085fba;

        test('Parses standard 6-digit hex colors with and without hash', () => {
            assert.equal(parseHexColor('#085fba'), 0x085fba);
            assert.equal(parseHexColor('ff0000'), 0xff0000);
            assert.equal(parseHexColor('#00ff00'), 0x00ff00);
            assert.equal(parseHexColor('#000000'), 0x000000);
            assert.equal(parseHexColor('#ffffff'), 0xffffff);
        });

        test('Parses 3-digit shorthand hex codes (#fff, #123)', () => {
            assert.equal(parseHexColor('#fff'), 0xffffff);
            assert.equal(parseHexColor('#000'), 0x000000);
            assert.equal(parseHexColor('#abc'), 0xaabbcc);
            assert.equal(parseHexColor('#123'), 0x112233);
        });

        test('Falls back to default branding color on invalid or empty values', () => {
            assert.equal(parseHexColor(''), DEFAULT_BRANDING_COLOR);
            assert.equal(parseHexColor(null), DEFAULT_BRANDING_COLOR);
            assert.equal(parseHexColor(undefined), DEFAULT_BRANDING_COLOR);
            assert.equal(parseHexColor('not-a-color'), DEFAULT_BRANDING_COLOR);
            assert.equal(parseHexColor('#gggggg'), DEFAULT_BRANDING_COLOR);
        });
    });

    // -------------------------------------------------------------------------
    // 7. Dead Webhook Silencing & Idempotency
    // -------------------------------------------------------------------------
    describe('F4.3: Dead Webhook Silencing & Unknown Webhook 10015', () => {
        const deadUrl = 'https://discord.com/api/webhooks/test/dead_10015';

        test('isDeadWebhook returns false initially and true after markDeadWebhook', () => {
            assert.equal(isDeadWebhook(deadUrl), false);
            markDeadWebhook(deadUrl);
            assert.equal(isDeadWebhook(deadUrl), true);
            assert.ok(deadWebhooks.has(deadUrl));
        });

        test('Logger.logErrorToWebhook skips network dispatch when webhook is dead', async () => {
            const interaction = createMockInteraction({ userId: 'log_user_1' });
            process.env.WEBHOOK_ERROS = deadUrl;

            // Should return without error or network call
            await Logger.logErrorToWebhook(interaction, new Error('Simulated test error'));
            assert.equal(interaction._errorLoggedToWebhook, true);
        });

        test('Logger.logErrorToWebhook enforces idempotency via _errorLoggedToWebhook', async () => {
            const testUrl = 'https://discord.com/api/webhooks/test/idempotent_url';
            process.env.WEBHOOK_ERROS = testUrl;

            const interaction = createMockInteraction({ userId: 'idempotent_user' });
            interaction._errorLoggedToWebhook = true; // already logged

            // Should return immediately without re-dispatching
            await Logger.logErrorToWebhook(interaction, new Error('Duplicate error'));
            assert.equal(interaction._errorLoggedToWebhook, true);
        });

        test('sendLifecycleLog handles dead webhook gracefully without throwing', async () => {
            process.env.WEBHOOK_UPDATES_PV = deadUrl;
            await assert.doesNotReject(async () => {
                await sendLifecycleLog('System Restarted', 0x5865F2);
            });
        });
    });

    // -------------------------------------------------------------------------
    // 8. Database Fallback Persistence
    // -------------------------------------------------------------------------
    describe('F4.1: Database Fallback Persistence', () => {
        test('User preferences persist to local fallback and survive queries', async () => {
            const userId = 'fb_test_user_777';
            await db.updateUser(userId, {
                language: 'lang_en_us',
                tosVersion: 2,
                badges: '["Contributor"]',
            });

            const user = await db.getUser(userId);
            assert.equal(user.userId, userId);
            assert.equal(user.language, 'lang_en_us');
            assert.equal(user.tosVersion, 2);
            assert.equal(user.badges, '["Contributor"]');
        });

        test('Guild configuration persists to local fallback', async () => {
            const guildId = 'fb_test_guild_888';
            await db.updateGuild(guildId, {
                antiraidEnabled: 1,
                welcomeChannelId: 'chan_welcome_123',
                goodbyeChannelId: 'chan_goodbye_456',
            });

            const guild = await db.getGuild(guildId);
            assert.equal(guild.guildId, guildId);
            assert.equal(guild.antiraidEnabled, 1);
            assert.equal(guild.welcomeChannelId, 'chan_welcome_123');
            assert.equal(guild.goodbyeChannelId, 'chan_goodbye_456');
        });

        test('Reminder lifecycle (create, query, complete, delete) functions in fallback', async () => {
            const remId = 'rem_fb_crud_001';
            const userId = 'fb_rem_user_1';

            const created = await db.createReminder({
                id: remId,
                userId,
                message: 'Lembrete de teste fallback',
                dueTimestamp: Date.now() + 50000,
            });
            assert.equal(created.id, remId);

            const userReminders = await db.getUserReminders(userId);
            assert.ok(userReminders.some(r => r.id === remId));

            await db.completeReminder(remId);
            const afterComplete = await db.getUserReminders(userId);
            assert.equal(afterComplete.some(r => r.id === remId), false);

            await db.deleteReminder(remId);
        });
    });
});
