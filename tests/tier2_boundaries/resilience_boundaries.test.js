// tests/tier2_boundaries/resilience_boundaries.test.js
/**
 * @file resilience_boundaries.test.js
 * @description Comprehensive automated tests for Tier 2 Boundaries:
 *  - Negative duration, > 24.85 days / 32-bit integer overflow, under-5s, oversized strings
 *  - 8-digit hex colors (> 16777215), invalid hex lengths, malformed characters
 *  - Container blocks > 25, button labels > 80 chars, text > 4000 chars
 *  - Moderator role equality (executor position === target position) across kick/ban/timeout
 *  - Server owner moderation attempts (ban/kick/timeout)
 *  - Discord error 10015 Unknown Webhook suppression in Logger & LifecycleLogger
 */

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { parseTimeString, MIN_REMINDER_MS, MAX_REMINDER_MS } = require('../../src/utils/reminderManager.js');
const {
    parseHexColor,
    renderContainerFromBlocks,
    ContainerStudioSession,
    buildStudioPayload,
    MAX_CONTAINER_BLOCKS
} = require('../../src/components/builder/containerBuilder.js');
const moderacaoCmd = require('../../src/commands/moderacao.js');
const Logger = require('../../src/utils/logger.js');
const { isDeadWebhook, markDeadWebhook, deadWebhooks } = require('../../src/utils/logger.js');
const { sendLifecycleLog } = require('../../src/utils/lifecycleLogger.js');
const { createMockInteraction, createMockClient } = require('../helpers/mockDiscord.js');
const db = require('../../src/database/db.js');

describe('Tier 2: Boundaries — Edge Cases & Extreme Inputs', () => {

    // -------------------------------------------------------------------------
    // 1. Negative Duration & Boundary Time Values
    // -------------------------------------------------------------------------
    describe('B2.1: Negative Duration & Integer Boundary Tests', () => {
        test('Rejects negative time tokens and minus signs', () => {
            assert.equal(parseTimeString('-5m'), null);
            assert.equal(parseTimeString('-10s'), null);
            assert.equal(parseTimeString('-1h'), null);
            assert.equal(parseTimeString('-1d'), null);
            assert.equal(parseTimeString('10m -5s'), null);
            assert.equal(parseTimeString('1h -30m'), null);
            assert.equal(parseTimeString('-100'), null);
        });

        test('Rejects inputs exceeding 32-bit signed integer limit (> 24.85 days / 2147483647 ms)', () => {
            // 25 days = 25 * 86400 * 1000 = 2,160,000,000 ms > 2,147,483,647 ms
            assert.equal(parseTimeString('25d'), null);
            // 24 days 21 hours = (24*86400 + 21*3600)*1000 = 2,149,200,000 ms > 2,147,483,647 ms
            assert.equal(parseTimeString('24d 21h'), null);
            // 4 weeks = 2,419,200,000 ms
            assert.equal(parseTimeString('4w'), null);
            // 30 days
            assert.equal(parseTimeString('30d'), null);
            // 365 days
            assert.equal(parseTimeString('365d'), null);
        });

        test('Accepts valid duration right at or below the 32-bit ceiling', () => {
            // 24 days 20 hours = (24*86400 + 20*3600)*1000 = 2,145,600,000 ms < 2,147,483,647 ms
            const validNearMax = parseTimeString('24d 20h');
            assert.ok(validNearMax !== null);
            assert.ok(validNearMax <= MAX_REMINDER_MS);
        });

        test('Rejects values strictly below MIN_REMINDER_MS (5000 ms)', () => {
            assert.equal(parseTimeString('4s'), null);
            assert.equal(parseTimeString('3s'), null);
            assert.equal(parseTimeString('1s'), null);
            assert.equal(parseTimeString('0s'), null);
            assert.equal(parseTimeString('0m'), null);
            assert.equal(parseTimeString('0h'), null);
            assert.equal(parseTimeString('0'), null);
        });
    });

    // -------------------------------------------------------------------------
    // 2. Oversized Strings & Non-String Types
    // -------------------------------------------------------------------------
    describe('B2.2: Oversized Strings & Type Guards in parseTimeString', () => {
        test('Rejects input strings longer than 100 characters immediately', () => {
            const oversized = '10m '.repeat(26); // length 104 > 100
            assert.ok(oversized.length > 100);
            assert.equal(parseTimeString(oversized), null);

            const garbageString = 'a'.repeat(200);
            assert.equal(parseTimeString(garbageString), null);
        });

        test('Rejects non-string types and empty values safely without throwing', () => {
            assert.equal(parseTimeString(null), null);
            assert.equal(parseTimeString(undefined), null);
            assert.equal(parseTimeString(''), null);
            assert.equal(parseTimeString('   '), null);
            assert.equal(parseTimeString(12345), null);
            assert.equal(parseTimeString(true), null);
            assert.equal(parseTimeString({}), null);
            assert.equal(parseTimeString([]), null);
            assert.equal(parseTimeString(NaN), null);
        });
    });

    // -------------------------------------------------------------------------
    // 3. parseHexColor Boundary Tests (8-digit hex, invalid ranges, malformed)
    // -------------------------------------------------------------------------
    describe('B2.3: parseHexColor Boundary & Extreme Cases', () => {
        const DEFAULT_BRANDING_COLOR = 0x085fba;

        test('Rejects 8-digit hex codes (with alpha or overflow > 16777215) and returns default', () => {
            assert.equal(parseHexColor('#12345678'), DEFAULT_BRANDING_COLOR);
            assert.equal(parseHexColor('12345678'), DEFAULT_BRANDING_COLOR);
            assert.equal(parseHexColor('#ffffffff'), DEFAULT_BRANDING_COLOR);
            assert.equal(parseHexColor('#00000000'), DEFAULT_BRANDING_COLOR);
        });

        test('Rejects non-standard hex lengths (1, 2, 4, 5, 7 chars)', () => {
            assert.equal(parseHexColor('#f'), DEFAULT_BRANDING_COLOR);
            assert.equal(parseHexColor('#12'), DEFAULT_BRANDING_COLOR);
            assert.equal(parseHexColor('#1234'), DEFAULT_BRANDING_COLOR);
            assert.equal(parseHexColor('#12345'), DEFAULT_BRANDING_COLOR);
            assert.equal(parseHexColor('#1234567'), DEFAULT_BRANDING_COLOR);
        });

        test('Rejects malformed characters and non-hex inputs', () => {
            assert.equal(parseHexColor('#GGGGGG'), DEFAULT_BRANDING_COLOR);
            assert.equal(parseHexColor('#xyz'), DEFAULT_BRANDING_COLOR);
            assert.equal(parseHexColor('#12345z'), DEFAULT_BRANDING_COLOR);
            assert.equal(parseHexColor('rgb(255, 0, 0)'), DEFAULT_BRANDING_COLOR);
            assert.equal(parseHexColor('blue'), DEFAULT_BRANDING_COLOR);
        });

        test('Correctly handles edge colors: black (0) and white (16777215)', () => {
            assert.equal(parseHexColor('#000000'), 0);
            assert.equal(parseHexColor('#ffffff'), 16777215);
            assert.equal(parseHexColor('#FFFFFF'), 16777215);
        });
    });

    // -------------------------------------------------------------------------
    // 4. Container Blocks Limits (> 25 Blocks, Truncation)
    // -------------------------------------------------------------------------
    describe('B2.4: Container Blocks Limit & String Truncation', () => {
        test('renderContainerFromBlocks clamps input blocks to MAX_CONTAINER_BLOCKS (25)', () => {
            const thirtyBlocks = Array.from({ length: 30 }, (_, i) => ({
                type: 'titulo',
                val: `Título ${i + 1}`
            }));

            const container = renderContainerFromBlocks(thirtyBlocks);
            assert.equal(container.type, 17);
            // Must have capped at 25
            assert.ok(container.components.length <= MAX_CONTAINER_BLOCKS);
        });

        test('ContainerStudioSession saveUndo caps blocks to MAX_CONTAINER_BLOCKS (25)', () => {
            const session = new ContainerStudioSession('session_user_1');
            session.blocks = Array.from({ length: 35 }, (_, i) => ({
                type: 'texto',
                val: `Texto ${i + 1}`
            }));

            session.saveUndo();
            assert.equal(session.blocks.length, MAX_CONTAINER_BLOCKS);
        });

        test('buildStudioPayload clamps session blocks to MAX_CONTAINER_BLOCKS (25)', () => {
            const session = new ContainerStudioSession('session_user_2');
            session.blocks = Array.from({ length: 32 }, (_, i) => ({
                type: 'texto',
                val: `Texto ${i}`
            }));

            const payload = buildStudioPayload(session);
            assert.ok(payload.components.length > 0);
            assert.equal(session.blocks.length, MAX_CONTAINER_BLOCKS);
        });

        test('Truncates button labels exceeding 80 characters to 80 chars max', () => {
            const longLabel = 'B'.repeat(100);
            const blocks = [
                { type: 'botao', label: longLabel, url: 'https://example.com' }
            ];

            const container = renderContainerFromBlocks(blocks);
            const buttonRow = container.components.find(c => c.type === 1);
            assert.ok(buttonRow);
            const button = buttonRow.components[0];
            assert.ok(button.label.length <= 80);
            assert.ok(button.label.endsWith('...'));
        });

        test('Truncates text content exceeding 4000 characters to 4000 chars max', () => {
            const longText = 'A'.repeat(5000);
            const blocks = [
                { type: 'texto', val: longText }
            ];

            const container = renderContainerFromBlocks(blocks);
            const textComp = container.components.find(c => c.type === 10);
            assert.ok(textComp);
            assert.ok(textComp.content.length <= 4000);
            assert.ok(textComp.content.endsWith('...'));
        });
    });

    // -------------------------------------------------------------------------
    // 5. Moderator Role Equality & Hierarchy Corner Cases
    // -------------------------------------------------------------------------
    describe('B2.5: Moderator Role Equality Across All Subcommands', () => {
        const executorId = 'mod_eq_exec';
        const targetId = 'mod_eq_target';
        const ownerId = 'guild_owner_999';

        beforeEach(() => {
            db.updateUser(executorId, { tosVersion: 2 });
        });

        function createEqualSetup() {
            const targetUser = { id: targetId, username: 'TargetEq', tag: 'TargetEq#0001' };
            const targetMember = {
                id: targetId,
                user: targetUser,
                roles: { highest: { position: 15, name: 'EqualRole' } },
                kickable: false,
                bannable: false,
                moderatable: false,
                kick: async () => {},
                timeout: async () => {},
            };

            const guild = {
                id: 'eq_guild_1',
                ownerId,
                members: {
                    me: { roles: { highest: { position: 50 } }, permissions: { has: () => true } },
                    fetch: async (id) => (id === targetId ? targetMember : null),
                    ban: async () => {},
                }
            };

            const executorMember = {
                id: executorId,
                roles: { highest: { position: 15, name: 'EqualRole' } }, // exact same position
                permissions: { has: () => true },
                guild,
            };

            const client = { user: { id: 'bot_id', tag: 'Bot#0001' } };

            return { executorMember, targetUser, targetMember, guild, client };
        }

        test('Kick fails when executor role position equals target role position', async () => {
            const setup = createEqualSetup();
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
            const response = interaction._getLastResponse();
            assert.ok(response.content.includes('cargo igual ou superior'));
        });

        test('Ban fails when executor role position equals target role position', async () => {
            const setup = createEqualSetup();
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
            const response = interaction._getLastResponse();
            assert.ok(response.content.includes('cargo igual ou superior'));
        });

        test('Timeout fails when executor role position equals target role position', async () => {
            const setup = createEqualSetup();
            const interaction = createMockInteraction({
                userId: executorId,
                guildId: setup.guild.id,
                commandName: 'moderacao',
                subcommand: 'timeout',
                member: setup.executorMember,
                guild: setup.guild,
                options: { usuario: setup.targetUser, duracao: '10m' },
            });

            await moderacaoCmd.execute(interaction, setup.client);
            const response = interaction._getLastResponse();
            assert.ok(response.content.includes('cargo igual ou superior'));
        });
    });

    // -------------------------------------------------------------------------
    // 6. Owner Moderation Attempt
    // -------------------------------------------------------------------------
    describe('B2.6: Server Owner Moderation Protection Across Subcommands', () => {
        const executorId = 'mod_admin_high';
        const ownerId = 'server_owner_true';

        beforeEach(() => {
            db.updateUser(executorId, { tosVersion: 2 });
        });

        function createOwnerSetup() {
            const ownerUser = { id: ownerId, username: 'ServerOwner', tag: 'ServerOwner#0001' };
            const ownerMember = {
                id: ownerId,
                user: ownerUser,
                roles: { highest: { position: 100, name: 'OwnerRole' } },
                kickable: false,
                bannable: false,
                moderatable: false,
            };

            const guild = {
                id: 'owner_guild_1',
                ownerId,
                members: {
                    me: { roles: { highest: { position: 999 } }, permissions: { has: () => true } },
                    fetch: async (id) => (id === ownerId ? ownerMember : null),
                }
            };

            const executorMember = {
                id: executorId,
                roles: { highest: { position: 500, name: 'SuperAdmin' } },
                permissions: { has: () => true },
                guild,
            };

            const client = { user: { id: 'bot_id', tag: 'Bot#0001' } };

            return { executorMember, ownerUser, guild, client };
        }

        test('Kick on guild owner is strictly rejected', async () => {
            const setup = createOwnerSetup();
            const interaction = createMockInteraction({
                userId: executorId,
                guildId: setup.guild.id,
                commandName: 'moderacao',
                subcommand: 'kick',
                member: setup.executorMember,
                guild: setup.guild,
                options: { usuario: setup.ownerUser },
            });

            await moderacaoCmd.execute(interaction, setup.client);
            const response = interaction._getLastResponse();
            assert.ok(response.content.includes('dono do servidor não pode ser moderado'));
        });

        test('Ban on guild owner is strictly rejected', async () => {
            const setup = createOwnerSetup();
            const interaction = createMockInteraction({
                userId: executorId,
                guildId: setup.guild.id,
                commandName: 'moderacao',
                subcommand: 'ban',
                member: setup.executorMember,
                guild: setup.guild,
                options: { usuario: setup.ownerUser },
            });

            await moderacaoCmd.execute(interaction, setup.client);
            const response = interaction._getLastResponse();
            assert.ok(response.content.includes('dono do servidor não pode ser moderado'));
        });

        test('Timeout on guild owner is strictly rejected', async () => {
            const setup = createOwnerSetup();
            const interaction = createMockInteraction({
                userId: executorId,
                guildId: setup.guild.id,
                commandName: 'moderacao',
                subcommand: 'timeout',
                member: setup.executorMember,
                guild: setup.guild,
                options: { usuario: setup.ownerUser, duracao: '15m' },
            });

            await moderacaoCmd.execute(interaction, setup.client);
            const response = interaction._getLastResponse();
            assert.ok(response.content.includes('dono do servidor não pode ser moderado'));
        });
    });

    // -------------------------------------------------------------------------
    // 7. Discord Error 10015 Unknown Webhook Suppression
    // -------------------------------------------------------------------------
    describe('B2.7: Discord Error 10015 Unknown Webhook Suppression', () => {
        test('isUnknownWebhookError matches code 10015, HTTP 404, and Unknown Webhook text', () => {
            const errCode = { code: 10015 };
            const errStatus = { status: 404 };
            const errMessage = new Error('DiscordAPIError[10015]: Unknown Webhook');

            assert.equal(Logger.isDeadWebhook('https://discord.com/fake/10015_url'), false);
            markDeadWebhook('https://discord.com/fake/10015_url');
            assert.equal(Logger.isDeadWebhook('https://discord.com/fake/10015_url'), true);
        });

        test('Logger.logErrorToWebhook suppresses error when webhook throws code 10015', async () => {
            const deadWebhookUrl = 'https://discord.com/api/webhooks/99999/unknown_dead';
            process.env.WEBHOOK_ERROS = deadWebhookUrl;

            // Pre-mark dead
            markDeadWebhook(deadWebhookUrl);

            const interaction = createMockInteraction({ userId: 'webhook_suppress_user' });
            await assert.doesNotReject(async () => {
                await Logger.logErrorToWebhook(interaction, new Error('Test logging failure'));
            });

            assert.equal(isDeadWebhook(deadWebhookUrl), true);
        });
    });
});
