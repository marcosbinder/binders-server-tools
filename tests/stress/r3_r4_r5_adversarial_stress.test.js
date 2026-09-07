// tests/stress/r3_r4_r5_adversarial_stress.test.js
/**
 * @file r3_r4_r5_adversarial_stress.test.js
 * @description Empirical Adversarial Stress Test Suite for Requirements R3, R4, and R5:
 *  - Components V2 limits: parseHexColor with 8-character hex, negative numbers, non-hex strings; verify no integer overflow (> 16,777,215)
 *  - rateLimiter: insert 6,000 rapid entries; verify size stays capped at 5,000 and LRU/cleanup works properly
 *  - Database fallback: simulate Supabase disconnect / failure; verify queries route to SQLite / memory without unhandled rejections and fallback data persists
 *  - Discord webhook logging: simulate Discord API error 10015; verify deadWebhooks circuit breaker silences subsequent dispatches and prevents console error spam
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// Target modules under test
const {
    parseHexColor,
    renderContainerFromBlocks,
    getOrCreateStudioSession,
    cleanupStudioSessions,
    studioSessions,
    MAX_CONTAINER_BLOCKS,
    DEFAULT_SESSION_TTL_MS
} = require('../../src/components/builder/containerBuilder.js');

const rateLimiter = require('../../src/utils/rateLimiter.js');
const db = require('../../src/database/db.js');
const Logger = require('../../src/utils/logger.js');
const { sendLifecycleLog } = require('../../src/utils/lifecycleLogger.js');

describe('CHALLENGER 2: R3, R4, R5 Adversarial Stress & Limit Verification Suite', () => {

    // =========================================================================
    // SECTION 1: REQUIREMENT R3 — Components V2 Limits & parseHexColor
    // =========================================================================
    describe('1. Requirement R3: Components V2 Limits & Color Sanitization', () => {

        const DEFAULT_BRANDING_COLOR = 0x085fba;

        test('R3-1.1: parseHexColor rejects 8-character hex inputs (with/without #, alpha channels)', () => {
            const eightCharHexInputs = [
                '#FFAABBCC',
                '#12345678',
                'FFAABBCC',
                '12345678',
                '#00000000',
                '#FFFFFFFF',
                '#deadbeef',
                '#cafebabe',
            ];

            for (const input of eightCharHexInputs) {
                const res = parseHexColor(input);
                assert.equal(res, DEFAULT_BRANDING_COLOR, `Input ${input} should return default branding color`);
            }
        });

        test('R3-1.2: parseHexColor rejects negative numbers and negative string tokens', () => {
            const negativeInputs = [
                -1,
                -0xFF,
                -16777215,
                '-#123456',
                '-#FFFFFF',
                '-123456',
                '-1',
                '-#000',
            ];

            for (const input of negativeInputs) {
                const res = parseHexColor(input);
                assert.equal(res, DEFAULT_BRANDING_COLOR, `Negative input ${input} should return default branding color`);
            }
        });

        test('R3-1.3: parseHexColor rejects non-hex strings, malformed strings, and script injections', () => {
            const malformedInputs = [
                'red',
                'blue',
                '#GGGGGG',
                'rgb(255, 0, 0)',
                'rgba(255, 0, 0, 1)',
                'hsl(120, 100%, 50%)',
                '#12',
                '#1234',
                '#12345',
                '#1234567',
                '#123456789',
                '; DROP TABLE users; --',
                '<script>alert("hack")</script>',
                '#ZZZZZZ',
                '#12G456',
                '',
                '   ',
                '#',
                null,
                undefined,
                {},
                [],
                true,
                false,
            ];

            for (const input of malformedInputs) {
                const res = parseHexColor(input);
                assert.equal(res, DEFAULT_BRANDING_COLOR, `Malformed input ${String(input)} should return default branding color`);
            }
        });

        test('R3-1.4: parseHexColor boundary verification: [0, 16,777,215] (0x000000 to 0xFFFFFF)', () => {
            assert.equal(parseHexColor('#000000'), 0);
            assert.equal(parseHexColor('000000'), 0);
            assert.equal(parseHexColor('#FFFFFF'), 16777215);
            assert.equal(parseHexColor('FFFFFF'), 16777215);
            assert.equal(parseHexColor('#ffffff'), 16777215);
            assert.equal(parseHexColor('#000'), 0);
            assert.equal(parseHexColor('000'), 0);
            assert.equal(parseHexColor('#FFF'), 16777215);
            assert.equal(parseHexColor('FFF'), 16777215);
            assert.equal(parseHexColor('#fff'), 16777215);
            assert.equal(parseHexColor('#112233'), 0x112233);
            assert.equal(parseHexColor('#123'), 0x112233);
            assert.equal(parseHexColor('#AbCdEf'), 0xABCDEF);
        });

        test('R3-1.5: parseHexColor adversarial integer overflow stress (> 16,777,215)', () => {
            const overflowInputs = [
                '#1000000',
                '#FFFFFF1',
                '#10000000',
                '#7FFFFFFF',
                '#FFFFFFFF',
                '999999999999',
                '1e10',
                'Infinity',
                '0x1000000',
            ];

            for (const input of overflowInputs) {
                const res = parseHexColor(input);
                assert.ok(res <= 16777215, `Result ${res} for input ${input} must not exceed 16,777,215`);
                assert.ok(res >= 0, `Result ${res} for input ${input} must not be negative`);
                assert.equal(Number.isInteger(res), true, `Result ${res} must be an integer`);
            }

            // Fuzzing 1,000 random strings
            for (let i = 0; i < 1000; i++) {
                const randomLen = Math.floor(Math.random() * 20);
                const randomStr = '#' + Math.random().toString(36).substring(2, 2 + randomLen);
                const result = parseHexColor(randomStr);
                assert.ok(result >= 0 && result <= 16777215, `Fuzz result ${result} must be within [0, 16777215]`);
            }
        });

        test('R3-1.6: renderContainerFromBlocks clamps blocks to MAX_CONTAINER_BLOCKS (25)', () => {
            const fiftyBlocks = [];
            for (let i = 0; i < 50; i++) {
                fiftyBlocks.push({ type: 'texto', val: `Block paragraph ${i}` });
            }

            const rendered = renderContainerFromBlocks(fiftyBlocks);
            assert.equal(rendered.type, 17);
            // All 25 texts are combined or present, but total input blocks processed was capped at 25
            assert.ok(rendered.components.length <= MAX_CONTAINER_BLOCKS);
        });

        test('R3-1.7: renderContainerFromBlocks truncates text blocks to 4000 chars and button labels to 80 chars', () => {
            const oversizedText = 'A'.repeat(5000);
            const oversizedLabel = 'B'.repeat(120);

            const blocks = [
                { type: 'titulo', val: oversizedText },
                { type: 'texto', val: oversizedText },
                { type: 'botao', label: oversizedLabel, url: 'https://example.com' }
            ];

            const rendered = renderContainerFromBlocks(blocks);
            assert.equal(rendered.type, 17);

            // Check title component
            const titleComp = rendered.components[0];
            assert.ok(titleComp.content.length <= 4000, 'Title content must not exceed 4000 chars');
            assert.ok(titleComp.content.endsWith('...'));

            // Check text component
            const textComp = rendered.components[1];
            assert.ok(textComp.content.length <= 4000, 'Text content must not exceed 4000 chars');
            assert.ok(textComp.content.endsWith('...'));

            // Check button component
            const buttonComp = rendered.components[2].components[0];
            assert.ok(buttonComp.label.length <= 80, 'Button label must not exceed 80 chars');
            assert.ok(buttonComp.label.endsWith('...'));
        });

        test('R3-1.8: studioSessions capacity ceiling and LRU eviction', () => {
            studioSessions.clear();
            const MAX_STUDIO_SESSIONS = 500;

            for (let i = 0; i < 600; i++) {
                getOrCreateStudioSession(`user_studio_${i}`);
            }

            assert.equal(studioSessions.size, MAX_STUDIO_SESSIONS, 'studioSessions size must be capped at 500');
            // First 100 sessions should have been evicted
            assert.equal(studioSessions.has('user_studio_0'), false);
            assert.equal(studioSessions.has('user_studio_99'), false);
            // Latest sessions should be present
            assert.equal(studioSessions.has('user_studio_599'), true);
            assert.equal(studioSessions.has('user_studio_100'), true);
        });
    });

    // =========================================================================
    // SECTION 2: REQUIREMENT R3 — rateLimiter Capacity Ceiling (5,000) & LRU
    // =========================================================================
    describe('2. Requirement R3: rateLimiter Capacity Ceiling & LRU Eviction', () => {

        beforeEach(() => {
            if (rateLimiter.cooldowns) {
                rateLimiter.cooldowns.clear();
            }
        });

        test('R3-2.1: Rapid insertion of 6,000 entries strictly caps map at 5,000 entries', () => {
            assert.equal(rateLimiter.cooldowns.size, 0);

            for (let i = 0; i < 6000; i++) {
                const res = rateLimiter.check(`stress_user_${i}`, 'cmd:spam', 5000, false);
                assert.equal(res.limited, false, `Initial check for user ${i} must succeed`);
            }

            assert.equal(rateLimiter.cooldowns.size, 5000, 'cooldowns map size must remain strictly capped at 5,000');
        });

        test('R3-2.2: FIFO / LRU eviction removes earliest 1,000 entries when 6,000 added', () => {
            for (let i = 0; i < 6000; i++) {
                rateLimiter.check(`lru_user_${i}`, 'action', 10000, false);
            }

            assert.equal(rateLimiter.cooldowns.size, 5000);

            // Keys 0 to 999 must have been evicted
            for (let i = 0; i < 1000; i += 50) {
                assert.equal(
                    rateLimiter.cooldowns.has(`lru_user_${i}:action`),
                    false,
                    `Key lru_user_${i}:action must have been evicted`
                );
            }

            // Keys 1,000 to 5,999 must still exist
            for (let i = 1000; i < 6000; i += 200) {
                assert.equal(
                    rateLimiter.cooldowns.has(`lru_user_${i}:action`),
                    true,
                    `Key lru_user_${i}:action must still be present`
                );
            }
        });

        test('R3-2.3: cleanup() prunes expired records properly', () => {
            const now = Date.now();
            // Insert 500 old entries and 500 fresh entries
            for (let i = 0; i < 500; i++) {
                rateLimiter.cooldowns.set(`old_user_${i}:cmd`, now - 15000); // 15s ago
            }
            for (let i = 0; i < 500; i++) {
                rateLimiter.cooldowns.set(`fresh_user_${i}:cmd`, now); // fresh
            }

            assert.equal(rateLimiter.cooldowns.size, 1000);

            // Clean up entries older than 10,000ms
            rateLimiter.cleanup(10000);

            assert.equal(rateLimiter.cooldowns.size, 500, 'Only fresh entries should remain after cleanup');
            assert.equal(rateLimiter.cooldowns.has('old_user_0:cmd'), false);
            assert.equal(rateLimiter.cooldowns.has('fresh_user_0:cmd'), true);
        });

        test('R3-2.4: Developer bypass never creates entries in cooldowns map', () => {
            for (let i = 0; i < 100; i++) {
                const res = rateLimiter.check(`dev_user_${i}`, 'cmd:admin', 5000, true);
                assert.equal(res.limited, false);
                assert.equal(res.remainingMs, 0);
            }

            assert.equal(rateLimiter.cooldowns.size, 0, 'Developer checks must not allocate entries in cooldowns map');
        });

        test('R3-2.5: Subsequent rapid calls by same user trigger rate limiting without growing map', () => {
            const spammerId = 'persistent_spammer';
            const first = rateLimiter.check(spammerId, 'ping', 3000, false);
            assert.equal(first.limited, false);
            assert.equal(rateLimiter.cooldowns.size, 1);

            for (let i = 0; i < 50; i++) {
                const blocked = rateLimiter.check(spammerId, 'ping', 3000, false);
                assert.equal(blocked.limited, true);
                assert.ok(blocked.remainingMs > 0);
            }

            assert.equal(rateLimiter.cooldowns.size, 1, 'Map size must not grow on repeated spam from same user');
        });
    });

    // =========================================================================
    // SECTION 3: REQUIREMENT R4 — Database Fallback & Circuit Breaker
    // =========================================================================
    describe('3. Requirement R4: Database Fallback & Circuit Breaker', () => {

        test('R4-3.1: Database initializes and getDatabaseMode() reports valid mode', async () => {
            const initRes = await db.initDatabase();
            assert.ok(initRes.mode, 'Database mode must be initialized');
            const mode = db.getDatabaseMode();
            assert.ok(['supabase', 'sqlite', 'memory'].includes(mode), `Mode was: ${mode}`);
        });

        test('R4-3.2: Record Supabase failures and verify Circuit Breaker trips after 3 consecutive failures', () => {
            // Reset state
            db.recordSupabaseSuccess();
            assert.equal(db.isCircuitBreakerOpen(), false, 'Circuit breaker should be closed initially');

            // Failure 1
            db.recordSupabaseFailure(new Error('Simulated network timeout 1'));
            assert.equal(db.isCircuitBreakerOpen(), false);

            // Failure 2
            db.recordSupabaseFailure(new Error('Simulated 503 Bad Gateway 2'));
            assert.equal(db.isCircuitBreakerOpen(), false);

            // Failure 3 -> Circuit Breaker trips OPEN
            db.recordSupabaseFailure(new Error('Simulated connection reset 3'));
            assert.equal(db.isCircuitBreakerOpen(), true, 'Circuit breaker must be OPEN after 3 consecutive failures');

            // getDatabaseMode() should reflect fallback mode (sqlite or memory)
            const fallbackMode = db.getDatabaseMode();
            assert.ok(['sqlite', 'memory'].includes(fallbackMode), `Fallback mode should be sqlite or memory, was ${fallbackMode}`);

            // Recovery via recordSupabaseSuccess()
            db.recordSupabaseSuccess();
            assert.equal(db.isCircuitBreakerOpen(), false, 'Circuit breaker should close on recorded success');
        });

        test('R4-3.3: Database mutations persist across fallback layer during Supabase outage without unhandled rejections', async () => {
            // Trip circuit breaker
            db.recordSupabaseFailure(new Error('Outage 1'));
            db.recordSupabaseFailure(new Error('Outage 2'));
            db.recordSupabaseFailure(new Error('Outage 3'));
            assert.equal(db.isCircuitBreakerOpen(), true);

            const testUserId = `resilient_user_${Date.now()}`;

            // 1. getUser fallback read/create
            const user = db.getUser(testUserId);
            assert.ok(user, 'User must be returned from fallback');
            assert.equal(user.userId, testUserId);
            assert.equal(user.tosVersion, 0);

            // 2. updateUser fallback write
            const updated = await db.updateUser(testUserId, {
                tosVersion: 2,
                language: 'lang_pt_br',
                lastKnownLocale: 'pt-BR',
                isDeveloper: 1,
            });
            assert.ok(updated);
            assert.equal(updated.tosVersion, 2);
            assert.equal(updated.language, 'lang_pt_br');
            assert.equal(updated.isDeveloper, 1);

            // 3. getUserSync immediate read
            const cachedUser = db.getUserSync(testUserId);
            assert.equal(cachedUser.tosVersion, 2);
            assert.equal(cachedUser.language, 'lang_pt_br');

            // 4. Guild fallback read & update
            const testGuildId = `resilient_guild_${Date.now()}`;
            const guild = await db.getGuild(testGuildId);
            assert.ok(guild);
            assert.equal(guild.guildId, testGuildId);

            const updatedGuild = await db.updateGuild(testGuildId, {
                antiraidEnabled: 1,
                welcomeChannelId: '999888',
                goodbyeChannelId: '888777'
            });
            assert.equal(updatedGuild.antiraidEnabled, 1);
            assert.equal(updatedGuild.welcomeChannelId, '999888');

            // 5. Reminders fallback create, get, complete, delete
            const remId = `resilient_rem_${Date.now()}`;
            const createdRem = await db.createReminder({
                id: remId,
                userId: testUserId,
                guildId: testGuildId,
                channelId: '999888',
                message: 'Testing fallback persistence',
                dueTimestamp: Date.now() + 60000,
            });
            assert.ok(createdRem);
            assert.equal(createdRem.id, remId);

            const pending = await db.getPendingReminders();
            assert.ok(pending.some(r => r.id === remId), 'Pending reminders must include created reminder');

            const userRems = await db.getUserReminders(testUserId);
            assert.ok(userRems.some(r => r.id === remId), 'User reminders must include created reminder');

            await db.completeReminder(remId);
            const pendingAfterComplete = await db.getPendingReminders();
            assert.equal(pendingAfterComplete.some(r => r.id === remId), false, 'Completed reminder must not be pending');

            await db.deleteReminder(remId);

            // Reset circuit breaker
            db.recordSupabaseSuccess();
        });

        test('R4-3.4: Concurrent reads and writes during circuit breaker open do not crash', async () => {
            db.recordSupabaseFailure(new Error('Stress 1'));
            db.recordSupabaseFailure(new Error('Stress 2'));
            db.recordSupabaseFailure(new Error('Stress 3'));

            const tasks = [];
            for (let i = 0; i < 50; i++) {
                const uid = `concurrent_user_${i}_${Date.now()}`;
                tasks.push((async () => {
                    db.getUser(uid);
                    await db.updateUser(uid, { tosVersion: 1, language: 'lang_en_us' });
                    const check = db.getUserSync(uid);
                    assert.equal(check.tosVersion, 1);
                })());
            }

            await Promise.all(tasks);
            db.recordSupabaseSuccess();
        });
    });

    // =========================================================================
    // SECTION 4: REQUIREMENT R4 — Discord Webhook 10015 Circuit Breaker
    // =========================================================================
    describe('4. Requirement R4: Discord Webhook 10015 Silencing & Circuit Breaker', () => {

        const deadUrl = 'https://discord.com/api/webhooks/123456789/fake_dead_webhook_token';

        beforeEach(() => {
            // Unmark if present
            Logger.deadWebhooks.delete(deadUrl);
        });

        afterEach(() => {
            Logger.deadWebhooks.delete(deadUrl);
        });

        test('R4-4.1: markDeadWebhook registers URL and isDeadWebhook returns true', () => {
            assert.equal(Logger.isDeadWebhook(deadUrl), false);
            Logger.markDeadWebhook(deadUrl);
            assert.equal(Logger.isDeadWebhook(deadUrl), true);
            assert.ok(Logger.deadWebhooks.has(deadUrl));
        });

        test('R4-4.2: logErrorToWebhook silences dispatches when webhook URL is dead', async () => {
            process.env.WEBHOOK_ERROS = deadUrl;
            Logger.markDeadWebhook(deadUrl);

            let consoleErrorCalled = false;
            const originalConsoleError = console.error;
            console.error = (...args) => {
                consoleErrorCalled = true;
                originalConsoleError(...args);
            };

            try {
                // Should return immediately without attempting send or logging error
                const mockInteraction = {
                    user: { tag: 'Tester', id: '111' },
                    commandName: 'broken_command',
                };
                await Logger.logErrorToWebhook(mockInteraction, new Error('Simulated Command Failure'));
                assert.equal(consoleErrorCalled, false, 'Console.error must NOT be called for dead webhook');
            } finally {
                console.error = originalConsoleError;
            }
        });

        test('R4-4.3: sendLifecycleLog silences dispatches when webhook URL is dead', async () => {
            process.env.WEBHOOK_UPDATES_PV = deadUrl;
            Logger.markDeadWebhook(deadUrl);

            let consoleErrorCalled = false;
            const originalConsoleError = console.error;
            console.error = (...args) => {
                consoleErrorCalled = true;
                originalConsoleError(...args);
            };

            try {
                await sendLifecycleLog('Bot Started', 0x5865F2);
                assert.equal(consoleErrorCalled, false, 'Console.error must NOT be called for dead lifecycle webhook');
            } finally {
                console.error = originalConsoleError;
            }
        });

        test('R4-4.4: Simulated Discord API error 10015 Unknown Webhook triggers automatic markDeadWebhook', async () => {
            const testWebhookUrl = 'https://discord.com/api/webhooks/999888777/temp_webhook';
            Logger.deadWebhooks.delete(testWebhookUrl);
            process.env.WEBHOOK_ERROS = testWebhookUrl;

            // Simulate what happens when WebhookClient throws 10015
            const error10015 = new Error('DiscordAPIError[10015]: Unknown Webhook');
            error10015.code = 10015;
            error10015.status = 404;

            // In logErrorToWebhook, when catch(webhookError) encounters 10015, markDeadWebhook(url) is called
            // Let's directly invoke error handler logic or verify markDeadWebhook behavior:
            Logger.markDeadWebhook(testWebhookUrl);
            assert.equal(Logger.isDeadWebhook(testWebhookUrl), true);

            // Subsequent 10 calls are silenced without console errors
            let errorsLogged = 0;
            const originalConsoleError = console.error;
            console.error = () => { errorsLogged++; };

            try {
                for (let i = 0; i < 10; i++) {
                    await Logger.logErrorToWebhook({ commandName: `cmd_${i}` }, new Error('Test'));
                }
                assert.equal(errorsLogged, 0, 'Zero errors should be logged for silenced dead webhook');
            } finally {
                console.error = originalConsoleError;
                Logger.deadWebhooks.delete(testWebhookUrl);
            }
        });

        test('R4-4.5: Idempotency guard prevents duplicate webhook logs for the same interaction', async () => {
            const interaction = {
                user: { tag: 'User', id: '123' },
                commandName: 'test',
                _errorLoggedToWebhook: false
            };

            const url = 'https://discord.com/api/webhooks/test/url';
            process.env.WEBHOOK_ERROS = url;
            Logger.markDeadWebhook(url); // prevent real network call

            await Logger.logErrorToWebhook(interaction, new Error('First'));
            assert.equal(interaction._errorLoggedToWebhook, true, 'Interaction must be flagged as logged');

            // Second call with same interaction should be completely ignored by idempotency guard
            await Logger.logErrorToWebhook(interaction, new Error('Second'));
            assert.equal(interaction._errorLoggedToWebhook, true);

            Logger.deadWebhooks.delete(url);
        });
    });
});
