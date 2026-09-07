// tests/tier3_combinations/resilience_combinations.test.js
/**
 * @file resilience_combinations.test.js
 * @description Comprehensive automated tests for Tier 3 Combinations:
 *  - Dual dispatch partial failure with Promise.allSettled (channel down + DM up, DM down + channel up, both down)
 *  - Rate limiter capacity ceiling (MAX_ENTRIES = 5000) with LRU eviction and memory bounds
 *  - Database circuit breaker failover under consecutive cloud errors (3 failures -> open -> local fallback -> recovery)
 */

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
    dispatchReminder,
    activeTimeouts,
    scheduleReminder
} = require('../../src/utils/reminderManager.js');
const rateLimiterInstance = require('../../src/utils/rateLimiter.js');
const db = require('../../src/database/db.js');
const { createMockClient, createMockInteraction } = require('../helpers/mockDiscord.js');

describe('Tier 3: Combinations — Cross-Feature & Failover Integration', () => {

    // -------------------------------------------------------------------------
    // 1. Dual Dispatch Partial Failure with Promise.allSettled
    // -------------------------------------------------------------------------
    describe('C3.1: Dual Dispatch Partial Failures (Channel & DM)', () => {
        beforeEach(() => {
            db.updateUser('dual_user_1', { tosVersion: 2, language: 'lang_pt_br' });
        });

        test('Channel succeeds when User DM fails (DMs closed/blocked)', async () => {
            let channelMessageSent = null;
            let dmAttempted = false;

            const mockChannel = {
                id: 'chan_up_1',
                send: async (payload) => {
                    channelMessageSent = payload;
                    return { id: 'msg_chan_sent_1', ...payload };
                }
            };

            const mockGuild = {
                id: 'guild_dual_1',
                channels: {
                    fetch: async (id) => (id === 'chan_up_1' ? mockChannel : null),
                    cache: new Map([['chan_up_1', mockChannel]])
                }
            };

            const mockUser = {
                id: 'dual_user_1',
                send: async () => {
                    dmAttempted = true;
                    const err = new Error('Cannot send messages to this user (50007)');
                    err.code = 50007;
                    throw err;
                }
            };

            const client = {
                guilds: {
                    fetch: async (id) => (id === 'guild_dual_1' ? mockGuild : null),
                    cache: new Map([['guild_dual_1', mockGuild]])
                },
                users: {
                    fetch: async (id) => (id === 'dual_user_1' ? mockUser : null),
                    cache: new Map([['dual_user_1', mockUser]])
                }
            };

            const reminder = {
                id: 'rem_dual_chan_ok',
                userId: 'dual_user_1',
                guildId: 'guild_dual_1',
                channelId: 'chan_up_1',
                message: 'Comprar leite no mercado',
                dueTimestamp: Date.now() - 1000,
                completed: 0
            };

            await db.createReminder(reminder);
            activeTimeouts.set(reminder.id, setTimeout(() => {}, 100000));

            // Execute dual dispatch
            await assert.doesNotReject(async () => {
                await dispatchReminder(client, reminder);
            });

            // Channel received message despite DM failure
            assert.ok(channelMessageSent !== null);
            assert.ok(channelMessageSent.content.includes('dual_user_1'));
            assert.equal(dmAttempted, true);

            // Timeout was evicted from activeTimeouts (GC)
            assert.equal(activeTimeouts.has(reminder.id), false);
        });

        test('User DM succeeds when Channel send fails (Channel deleted / Missing Permissions)', async () => {
            let dmMessageSent = null;
            let channelAttempted = false;

            const mockChannel = {
                id: 'chan_down_1',
                send: async () => {
                    channelAttempted = true;
                    const err = new Error('Missing Access / Channel not found (10003)');
                    err.code = 10003;
                    throw err;
                }
            };

            const mockGuild = {
                id: 'guild_dual_2',
                channels: {
                    fetch: async (id) => (id === 'chan_down_1' ? mockChannel : null),
                    cache: new Map([['chan_down_1', mockChannel]])
                }
            };

            const mockUser = {
                id: 'dual_user_1',
                send: async (payload) => {
                    dmMessageSent = payload;
                    return { id: 'msg_dm_sent_1', ...payload };
                }
            };

            const client = {
                guilds: {
                    fetch: async (id) => (id === 'guild_dual_2' ? mockGuild : null),
                    cache: new Map([['guild_dual_2', mockGuild]])
                },
                users: {
                    fetch: async (id) => (id === 'dual_user_1' ? mockUser : null),
                    cache: new Map([['dual_user_1', mockUser]])
                }
            };

            const reminder = {
                id: 'rem_dual_dm_ok',
                userId: 'dual_user_1',
                guildId: 'guild_dual_2',
                channelId: 'chan_down_1',
                message: 'Reunião com a equipe',
                dueTimestamp: Date.now() - 1000,
                completed: 0
            };

            await db.createReminder(reminder);
            activeTimeouts.set(reminder.id, setTimeout(() => {}, 100000));

            await assert.doesNotReject(async () => {
                await dispatchReminder(client, reminder);
            });

            // DM received message despite channel failure
            assert.ok(dmMessageSent !== null);
            assert.ok(dmMessageSent.content.includes('dual_user_1'));
            assert.equal(channelAttempted, true);

            // GC evicted from activeTimeouts
            assert.equal(activeTimeouts.has(reminder.id), false);
        });

        test('Total delivery failure (both Channel and DM fail) is handled gracefully without crashing process', async () => {
            const mockChannel = {
                id: 'chan_both_fail',
                send: async () => { throw new Error('Channel write permission denied'); }
            };

            const mockGuild = {
                id: 'guild_both_fail',
                channels: {
                    fetch: async () => mockChannel,
                    cache: new Map([['chan_both_fail', mockChannel]])
                }
            };

            const mockUser = {
                id: 'dual_user_1',
                send: async () => { throw new Error('User blocked bot'); }
            };

            const client = {
                guilds: { fetch: async () => mockGuild, cache: new Map([['guild_both_fail', mockGuild]]) },
                users: { fetch: async () => mockUser, cache: new Map([['dual_user_1', mockUser]]) }
            };

            const reminder = {
                id: 'rem_total_fail',
                userId: 'dual_user_1',
                guildId: 'guild_both_fail',
                channelId: 'chan_both_fail',
                message: 'Mensagem impossível de entregar',
                dueTimestamp: Date.now() - 1000,
                completed: 0
            };

            await db.createReminder(reminder);
            activeTimeouts.set(reminder.id, setTimeout(() => {}, 100000));

            await assert.doesNotReject(async () => {
                await dispatchReminder(client, reminder);
            });

            // Timeout was still cleared and evicted to avoid memory leaks
            assert.equal(activeTimeouts.has(reminder.id), false);
        });
    });

    // -------------------------------------------------------------------------
    // 2. Rate Limiter Capacity Ceiling & LRU Eviction
    // -------------------------------------------------------------------------
    describe('C3.2: Rate Limiter Capacity Ceiling & LRU Eviction', () => {
        test('Bounded capacity eviction: Custom small capacity evicts oldest key when full', () => {
            const smallCapacity = 5;
            const limiter = new rateLimiterInstance.RateLimiter(smallCapacity);

            // Fill to capacity
            for (let i = 1; i <= smallCapacity; i++) {
                const res = limiter.check(`user_${i}`, 'cmd:ping', 10000);
                assert.equal(res.limited, false);
            }
            assert.equal(limiter.cooldowns.size, smallCapacity);
            assert.ok(limiter.cooldowns.has('user_1:cmd:ping'));

            // Insert 6th element -> oldest key ('user_1:cmd:ping') must be evicted
            const res6 = limiter.check('user_6', 'cmd:ping', 10000);
            assert.equal(res6.limited, false);
            assert.equal(limiter.cooldowns.size, smallCapacity);
            assert.equal(limiter.cooldowns.has('user_1:cmd:ping'), false, 'Oldest key should have been evicted');
            assert.equal(limiter.cooldowns.has('user_6:cmd:ping'), true);
        });

        test('Main RateLimiter instance enforces MAX_ENTRIES (5000) ceiling', () => {
            assert.equal(rateLimiterInstance.MAX_ENTRIES, 5000);
            assert.equal(rateLimiterInstance.maxEntries, 5000);

            // Verify clean state
            const initialSize = rateLimiterInstance.cooldowns.size;

            // Simulate high key population up to capacity
            const testLimiter = new rateLimiterInstance.RateLimiter(100);
            for (let i = 0; i < 150; i++) {
                testLimiter.check(`stress_user_${i}`, 'action', 30000);
            }

            // Size must never exceed maxEntries (100 in this test instance)
            assert.equal(testLimiter.cooldowns.size, 100);
        });

        test('cleanup() prunes expired records based on maxAge threshold', () => {
            const limiter = new rateLimiterInstance.RateLimiter(50);
            const now = Date.now();

            // Insert fresh entries and artificially aged entries
            limiter.cooldowns.set('fresh_1:action', now);
            limiter.cooldowns.set('fresh_2:action', now);
            limiter.cooldowns.set('old_1:action', now - 20000);
            limiter.cooldowns.set('old_2:action', now - 35000);

            assert.equal(limiter.cooldowns.size, 4);

            limiter.cleanup(10000); // 10s TTL
            assert.equal(limiter.cooldowns.size, 2);
            assert.equal(limiter.cooldowns.has('fresh_1:action'), true);
            assert.equal(limiter.cooldowns.has('fresh_2:action'), true);
            assert.equal(limiter.cooldowns.has('old_1:action'), false);
            assert.equal(limiter.cooldowns.has('old_2:action'), false);
        });
    });

    // -------------------------------------------------------------------------
    // 3. Database Circuit Breaker Failover
    // -------------------------------------------------------------------------
    describe('C3.3: Database Circuit Breaker Under Consecutive Cloud Errors', () => {
        test('Circuit breaker trips open after 3 consecutive failures and routes to fallback', () => {
            // Reset to known closed state
            db.recordSupabaseSuccess();
            assert.equal(db.isCircuitBreakerOpen(), false);

            // Failure 1
            db.recordSupabaseFailure(new Error('Cloud connection timeout (1/3)'));
            assert.equal(db.isCircuitBreakerOpen(), false);

            // Failure 2
            db.recordSupabaseFailure(new Error('Cloud connection timeout (2/3)'));
            assert.equal(db.isCircuitBreakerOpen(), false);

            // Failure 3 -> Circuit breaker trips OPEN!
            db.recordSupabaseFailure(new Error('Cloud connection timeout (3/3)'));
            assert.equal(db.isCircuitBreakerOpen(), true, 'Circuit breaker must be open after 3 consecutive failures');

            // Database mode routes to fallback (sqlite or memory)
            const mode = db.getDatabaseMode();
            assert.ok(mode === 'sqlite' || mode === 'memory', `Expected fallback mode, got: ${mode}`);

            // Local fallback operations succeed seamlessly while circuit breaker is open
            db.updateUser('cb_user_1', { language: 'lang_pt_br', tosVersion: 2 });
            const user = db.getUser('cb_user_1');
            assert.equal(user.language, 'lang_pt_br');
            assert.equal(user.tosVersion, 2);

            // Recovery: Successful operation resets circuit breaker to closed
            db.recordSupabaseSuccess();
            assert.equal(db.isCircuitBreakerOpen(), false, 'Circuit breaker must close after success');
        });
    });
});
