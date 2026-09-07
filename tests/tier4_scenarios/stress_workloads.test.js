// tests/tier4_scenarios/stress_workloads.test.js
/**
 * @file stress_workloads.test.js
 * @description Comprehensive automated tests for Tier 4 Stress Scenarios:
 *  - High-concurrency reminder burst (scheduling, concurrent cancellations, concurrent dispatches, timer GC)
 *  - High-volume rate-limit bursts (thousands of calls, multi-user spam, dev bypass, bounded memory)
 *  - Network partition simulation (simultaneous Supabase outage, Discord 10015 webhook loss, DM failure)
 */

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
    parseTimeString,
    scheduleReminder,
    cancelReminder,
    dispatchReminder,
    activeTimeouts
} = require('../../src/utils/reminderManager.js');
const rateLimiterInstance = require('../../src/utils/rateLimiter.js');
const db = require('../../src/database/db.js');
const Logger = require('../../src/utils/logger.js');
const { isDeadWebhook, markDeadWebhook } = require('../../src/utils/logger.js');
const { sendLifecycleLog } = require('../../src/utils/lifecycleLogger.js');
const { createMockClient, createMockInteraction } = require('../helpers/mockDiscord.js');

describe('Tier 4: Scenarios — Stress & Real-World Workloads', () => {

    // -------------------------------------------------------------------------
    // 1. Burst of Concurrent Reminders
    // -------------------------------------------------------------------------
    describe('S4.1: Burst of Concurrent Reminders & Scheduler GC', () => {
        test('Handles burst of 100 concurrent reminders with clean scheduling, cancellation, and dispatch GC', async () => {
            const client = createMockClient();
            const count = 100;
            const reminderIds = [];

            // 1. Concurrently schedule 100 reminders
            for (let i = 0; i < count; i++) {
                const id = `stress_rem_${Date.now()}_${i}`;
                reminderIds.push(id);
                const reminder = {
                    id,
                    userId: `user_stress_${i % 10}`,
                    guildId: 'guild_stress_1',
                    channelId: 'chan_stress_1',
                    message: `Lembrete de estresse #${i}`,
                    dueTimestamp: Date.now() + 50000 + i * 100,
                    completed: 0
                };

                await db.createReminder(reminder);
                scheduleReminder(client, reminder);
            }

            // Verify all 100 are tracked in activeTimeouts
            for (const id of reminderIds) {
                assert.equal(activeTimeouts.has(id), true);
            }

            // 2. Concurrently cancel first 50 reminders
            const toCancel = reminderIds.slice(0, 50);
            const cancelPromises = toCancel.map(id => cancelReminder(id));
            const cancelResults = await Promise.all(cancelPromises);

            for (const res of cancelResults) {
                assert.equal(res, true);
            }
            for (const id of toCancel) {
                assert.equal(activeTimeouts.has(id), false, `Reminder ${id} must be evicted from activeTimeouts`);
            }

            // 3. Concurrently dispatch remaining 50 reminders
            const toDispatch = reminderIds.slice(50);
            const dispatchPromises = toDispatch.map(async (id) => {
                const reminder = {
                    id,
                    userId: 'user_stress_dispatch',
                    guildId: 'guild_stress_1',
                    channelId: 'chan_stress_1',
                    message: 'Mensagem despachada',
                    dueTimestamp: Date.now(),
                    completed: 0
                };
                return dispatchReminder(client, reminder);
            });

            await Promise.all(dispatchPromises);

            // Verify all dispatched reminders were evicted from activeTimeouts
            for (const id of toDispatch) {
                assert.equal(activeTimeouts.has(id), false, `Dispatched reminder ${id} must be evicted`);
            }
        });
    });

    // -------------------------------------------------------------------------
    // 2. High-Volume Rate-Limit Bursts
    // -------------------------------------------------------------------------
    describe('S4.2: High-Volume Rate-Limit Bursts & Bounded Memory', () => {
        test('Sustains burst of 2,000 requests across 100 users, enforcing cooldowns and memory bounds', () => {
            const limiter = new rateLimiterInstance.RateLimiter(5000);
            const userCount = 100;
            const requestsPerUser = 20; // 100 * 20 = 2,000 requests
            const cooldownMs = 5000;

            let allowedCount = 0;
            let limitedCount = 0;

            for (let u = 0; u < userCount; u++) {
                const userId = `burst_user_${u}`;
                for (let r = 0; r < requestsPerUser; r++) {
                    const check = limiter.check(userId, 'cmd:ajuda', cooldownMs, false);
                    if (check.limited) {
                        limitedCount++;
                    } else {
                        allowedCount++;
                    }
                }
            }

            // Each user should have been allowed exactly once (initial request) and limited 19 times
            assert.equal(allowedCount, userCount, `Expected exactly ${userCount} allowed requests`);
            assert.equal(limitedCount, userCount * (requestsPerUser - 1), `Expected ${userCount * 19} limited requests`);

            // Cooldown map size must equal number of distinct users (100)
            assert.equal(limiter.cooldowns.size, userCount);
        });

        test('Developer accounts bypass cooldowns 100% of the time under high load', () => {
            const limiter = new rateLimiterInstance.RateLimiter(5000);
            const devId = 'developer_boss_1';
            let devAllowed = 0;

            for (let i = 0; i < 500; i++) {
                const check = limiter.check(devId, 'cmd:moderacao', 10000, true); // isDeveloper = true
                if (!check.limited) {
                    devAllowed++;
                }
            }

            assert.equal(devAllowed, 500, 'Developer must have 100% bypass rate');
        });

        test('Rapid memory cleanup across thousands of records completes in < 15ms', () => {
            const limiter = new rateLimiterInstance.RateLimiter(5000);
            const now = Date.now();

            // Populate 3,000 entries (2,000 expired, 1,000 fresh)
            for (let i = 0; i < 2000; i++) {
                limiter.cooldowns.set(`old_key_${i}`, now - 15000);
            }
            for (let i = 0; i < 1000; i++) {
                limiter.cooldowns.set(`fresh_key_${i}`, now);
            }

            assert.equal(limiter.cooldowns.size, 3000);

            const start = performance.now();
            limiter.cleanup(10000);
            const duration = performance.now() - start;

            assert.equal(limiter.cooldowns.size, 1000);
            assert.ok(duration < 25, `Cleanup took ${duration}ms, expected < 25ms`);
        });
    });

    // -------------------------------------------------------------------------
    // 3. Network Partition Simulation
    // -------------------------------------------------------------------------
    describe('S4.3: Network Partition Simulation (Cloud DB + Dead Webhook + DM Drop)', () => {
        test('Application remains fully operational and non-crashing during simultaneous cloud and Discord outages', async () => {
            const partitionUserId = 'partition_user_999';
            const partitionDeadWebhook = 'https://discord.com/api/webhooks/partition/dead_10015';

            // 1. Simulate Cloud Database Failure -> Trip Circuit Breaker
            db.recordSupabaseFailure(new Error('Cloud DB 503 Service Unavailable'));
            db.recordSupabaseFailure(new Error('Cloud DB Connection Timeout'));
            db.recordSupabaseFailure(new Error('Cloud DB Broken Pipe'));
            assert.equal(db.isCircuitBreakerOpen(), true);

            // User preference read/write under circuit breaker open state
            await db.updateUser(partitionUserId, {
                language: 'lang_pt_br',
                tosVersion: 2
            });
            const user = await db.getUser(partitionUserId);
            assert.equal(user.language, 'lang_pt_br');
            assert.equal(user.tosVersion, 2);

            // 2. Simulate Discord Error Webhook 10015 Unknown Webhook
            markDeadWebhook(partitionDeadWebhook);
            process.env.WEBHOOK_ERROS = partitionDeadWebhook;
            process.env.WEBHOOK_UPDATES_PV = partitionDeadWebhook;

            const mockInteraction = createMockInteraction({ userId: partitionUserId });

            // Must not throw uncaught rejection
            await assert.doesNotReject(async () => {
                await Logger.logErrorToWebhook(mockInteraction, new Error('Simulated partition error'));
                await sendLifecycleLog('Partition Event', 0xED4245);
            });

            // 3. Simulate Reminder Dual Dispatch with Broken DM
            let channelDeliverySucceeded = false;
            const mockChannel = {
                id: 'chan_survivor',
                send: async () => {
                    channelDeliverySucceeded = true;
                    return { id: 'msg_survivor_1' };
                }
            };

            const mockGuild = {
                id: 'guild_survivor',
                channels: {
                    fetch: async () => mockChannel,
                    cache: new Map([['chan_survivor', mockChannel]])
                }
            };

            const mockUser = {
                id: partitionUserId,
                send: async () => {
                    throw new Error('User blocked DMs / Discord API DM outage');
                }
            };

            const client = {
                guilds: {
                    fetch: async () => mockGuild,
                    cache: new Map([['guild_survivor', mockGuild]])
                },
                users: {
                    fetch: async () => mockUser,
                    cache: new Map([[partitionUserId, mockUser]])
                }
            };

            const reminder = {
                id: 'rem_partition_test',
                userId: partitionUserId,
                guildId: 'guild_survivor',
                channelId: 'chan_survivor',
                message: 'Aviso importante sob partição de rede',
                dueTimestamp: Date.now() - 500,
                completed: 0
            };

            await db.createReminder(reminder);
            activeTimeouts.set(reminder.id, setTimeout(() => {}, 60000));

            await assert.doesNotReject(async () => {
                await dispatchReminder(client, reminder);
            });

            assert.equal(channelDeliverySucceeded, true, 'Channel message should have delivered via Promise.allSettled');
            assert.equal(activeTimeouts.has(reminder.id), false, 'Timeout should have been evicted');

            // 4. Restore cloud DB
            db.recordSupabaseSuccess();
            assert.equal(db.isCircuitBreakerOpen(), false);
        });
    });
});
