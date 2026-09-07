// tests/stress/r1_r2_adversarial_stress.test.js
/**
 * @file r1_r2_adversarial_stress.test.js
 * @description Adversarial stress test suite for Requirements R1 and R2:
 *  - safeReply.js: rapid state transitions (unacknowledged, deferred, replied), concurrent race conditions, API error suppression
 *  - parseTimeString: negative numbers, oversized strings, extreme values (> 24.85 days / 32-bit overflow), edge bounds
 *  - cancelReminder: bulk scheduling & cancellation, activeTimeouts Map purity, zero timer firing, double cancellation
 *  - dispatchReminder: channel fail + DM success, DM fail + channel success, both failing, mixed burst concurrency
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { MessageFlags } = require('discord.js');

const safeReply = require('../../src/utils/safeReply.js');
const {
    parseTimeString,
    scheduleReminder,
    cancelReminder,
    dispatchReminder,
    activeTimeouts,
    MAX_REMINDER_MS,
    MIN_REMINDER_MS
} = require('../../src/utils/reminderManager.js');
const db = require('../../src/database/db.js');
const { createMockClient, createMockInteraction } = require('../helpers/mockDiscord.js');

describe('EMPIRICAL CHALLENGER: R1 & R2 Adversarial Stress Suite', () => {

    beforeEach(() => {
        // Clear active timeouts before each test
        for (const [id, timeout] of activeTimeouts.entries()) {
            clearTimeout(timeout);
            activeTimeouts.delete(id);
        }
    });

    afterEach(() => {
        for (const [id, timeout] of activeTimeouts.entries()) {
            clearTimeout(timeout);
            activeTimeouts.delete(id);
        }
    });

    // =========================================================================
    // REQUIREMENT R1: safeReply.js Adversarial Stress
    // =========================================================================
    describe('R1: safeReply.js State Transitions & Error Resilience', () => {

        test('R1-1: Unacknowledged state -> calls interaction.reply() and returns result', async () => {
            let replyCalled = false;
            let editCalled = false;
            let followUpCalled = false;

            const interaction = {
                replied: false,
                deferred: false,
                reply: async (payload) => {
                    replyCalled = true;
                    return { id: 'msg_reply_1', ...payload };
                },
                editReply: async () => { editCalled = true; },
                followUp: async () => { followUpCalled = true; },
            };

            const result = await safeReply(interaction, 'Mensagem inicial');
            assert.equal(replyCalled, true, 'Must call reply() when fresh');
            assert.equal(editCalled, false, 'Must not call editReply()');
            assert.equal(followUpCalled, false, 'Must not call followUp()');
            assert.equal(result.id, 'msg_reply_1');
            assert.equal(result.content, 'Mensagem inicial');
        });

        test('R1-2: Deferred state -> calls interaction.editReply() and returns result', async () => {
            let replyCalled = false;
            let editCalled = false;
            let followUpCalled = false;

            const interaction = {
                replied: false,
                deferred: true,
                reply: async () => { replyCalled = true; },
                editReply: async (payload) => {
                    editCalled = true;
                    return { id: 'msg_edit_1', ...payload };
                },
                followUp: async () => { followUpCalled = true; },
            };

            const result = await safeReply(interaction, { content: 'Resposta adiada' });
            assert.equal(replyCalled, false);
            assert.equal(editCalled, true, 'Must call editReply() when deferred');
            assert.equal(followUpCalled, false);
            assert.equal(result.id, 'msg_edit_1');
            assert.equal(result.content, 'Resposta adiada');
        });

        test('R1-3: Replied state -> calls interaction.followUp() and returns result', async () => {
            let replyCalled = false;
            let editCalled = false;
            let followUpCalled = false;

            const interaction = {
                replied: true,
                deferred: false,
                reply: async () => { replyCalled = true; },
                editReply: async () => { editCalled = true; },
                followUp: async (payload) => {
                    followUpCalled = true;
                    return { id: 'msg_followup_1', ...payload };
                },
            };

            const result = await safeReply(interaction, 'Mensagem de acompanhamento');
            assert.equal(replyCalled, false);
            assert.equal(editCalled, false);
            assert.equal(followUpCalled, true, 'Must call followUp() when already replied');
            assert.equal(result.id, 'msg_followup_1');
            assert.equal(result.content, 'Mensagem de acompanhamento');
        });

        test('R1-4: Both replied and deferred true -> calls followUp() (replied takes precedence)', async () => {
            let editCalled = false;
            let followUpCalled = false;

            const interaction = {
                replied: true,
                deferred: true,
                reply: async () => {},
                editReply: async () => { editCalled = true; },
                followUp: async (payload) => {
                    followUpCalled = true;
                    return { id: 'msg_precedence', ...payload };
                },
            };

            const result = await safeReply(interaction, 'Follow up after reply');
            assert.equal(followUpCalled, true);
            assert.equal(editCalled, false);
            assert.equal(result.id, 'msg_precedence');
        });

        test('R1-5: Rapid concurrent calls on same interaction transition cleanly to followUp without throw', async () => {
            let replyCount = 0;
            let followUpCount = 0;

            const interaction = {
                replied: false,
                deferred: false,
                reply: async (payload) => {
                    replyCount++;
                    interaction.replied = true; // State flips immediately
                    return { id: 'msg_1', ...payload };
                },
                editReply: async () => {},
                followUp: async (payload) => {
                    followUpCount++;
                    return { id: `msg_follow_${followUpCount}`, ...payload };
                },
            };

            // Fire 50 concurrent safeReply invocations
            const calls = Array.from({ length: 50 }, (_, i) =>
                safeReply(interaction, `Concurrent burst payload #${i}`)
            );

            const results = await Promise.all(calls);
            assert.equal(results.length, 50);
            assert.equal(replyCount, 1, 'Only the very first invocation should call reply()');
            assert.equal(followUpCount, 49, 'The remaining 49 invocations must seamlessly call followUp()');
            for (const res of results) {
                assert.ok(res !== null, 'No invocation should fail or return null under normal concurrency');
            }
        });

        test('R1-6: API error suppression: reply() throws DiscordAPIError 40060 (Already Acknowledged) -> returns null safely', async () => {
            const err = new Error('Interaction has already been acknowledged');
            err.code = 40060;

            const interaction = {
                replied: false,
                deferred: false,
                reply: async () => { throw err; },
                editReply: async () => {},
                followUp: async () => {},
            };

            const result = await safeReply(interaction, 'Tentativa de resposta');
            assert.equal(result, null, 'Must swallow error and return null');
        });

        test('R1-7: API error suppression: editReply() throws DiscordAPIError 10062 (Unknown Interaction) -> returns null safely', async () => {
            const err = new Error('Unknown interaction');
            err.code = 10062;

            const interaction = {
                replied: false,
                deferred: true,
                reply: async () => {},
                editReply: async () => { throw err; },
                followUp: async () => {},
            };

            const result = await safeReply(interaction, 'Tentativa de edição');
            assert.equal(result, null, 'Must swallow error and return null');
        });

        test('R1-8: API error suppression: followUp() throws network error -> returns null safely', async () => {
            const interaction = {
                replied: true,
                deferred: false,
                reply: async () => {},
                editReply: async () => {},
                followUp: async () => { throw new Error('Connect timeout ETIMEDOUT'); },
            };

            const result = await safeReply(interaction, 'Tentativa de followUp');
            assert.equal(result, null, 'Must swallow error and return null');
        });

        test('R1-9: Null / undefined interaction safety', async () => {
            assert.equal(await safeReply(null, 'test'), null);
            assert.equal(await safeReply(undefined, 'test'), null);
        });

        test('R1-10: Ephemeral option properly attaches MessageFlags.Ephemeral', async () => {
            let capturedPayload = null;
            const interaction = {
                replied: false,
                deferred: false,
                reply: async (payload) => {
                    capturedPayload = payload;
                    return payload;
                },
                editReply: async () => {},
                followUp: async () => {},
            };

            await safeReply(interaction, 'Segredo', { ephemeral: true });
            assert.ok(capturedPayload);
            assert.deepEqual(capturedPayload.flags, [MessageFlags.Ephemeral]);
        });
    });

    // =========================================================================
    // REQUIREMENT R2: parseTimeString Adversarial Stress & Overflow
    // =========================================================================
    describe('R2: parseTimeString Boundary, Overflow & Injection Stress', () => {

        test('R2-1: Rejects direct negative tokens and minus signs strictly', () => {
            const negativeInputs = [
                '-10m',
                '-5s',
                '-1h',
                '-2d',
                '-1w',
                '- 10m',
                '--5m',
                '10m -5m',
                '1h - 30m',
                '10 - 5',
                '-0s',
                '-9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999m'
            ];

            for (const input of negativeInputs) {
                const res = parseTimeString(input);
                assert.equal(res, null, `Negative input "${input}" must return null`);
            }
        });

        test('R2-2: Oversized strings (> 100 characters) are rejected immediately', () => {
            // Exactly 101 characters
            const len101 = '1s '.repeat(33) + '10s'; // length: 33 * 3 + 3 = 102
            assert.equal(parseTimeString(len101), null);

            // 1,000 characters of digits
            const len1000 = '1'.repeat(1000) + 'm';
            assert.equal(parseTimeString(len1000), null);

            // 100,000 characters to stress parser
            const len100k = 'a'.repeat(100000);
            assert.equal(parseTimeString(len100k), null);
        });

        test('R2-3: ReDoS attack resistance: repetitive complex patterns evaluate in < 5ms', () => {
            const maliciousPatterns = [
                '9'.repeat(50) + 's',
                '1s '.repeat(30) + '1s',
                'minutos '.repeat(10),
                '99999999999999999999999999999999999999999999999999s'
            ];

            for (const pat of maliciousPatterns) {
                const start = performance.now();
                const res = parseTimeString(pat);
                const elapsed = performance.now() - start;

                assert.ok(elapsed < 5, `Pattern took ${elapsed}ms, exceeding 5ms threshold`);
            }
        });

        test('R2-4: Overflow protection: values exceeding 32-bit signed integer (> 2147483647 ms / ~24.85 days) return null', () => {
            // MAX_REMINDER_MS = 2147483647
            assert.equal(MAX_REMINDER_MS, 2147483647);

            // 25 days in ms: 25 * 86,400,000 = 2,160,000,000 (> 2147483647)
            assert.equal(parseTimeString('25d'), null);

            // 26 days, 30 days, 100 days
            assert.equal(parseTimeString('26d'), null);
            assert.equal(parseTimeString('30d'), null);
            assert.equal(parseTimeString('100d'), null);
            assert.equal(parseTimeString('4w'), null); // 28 days = 2,419,200,000 ms

            // 24d 20h 31m 24s = 2,147,484,000 ms (> 2,147,483,647) -> overflow by 353 ms
            assert.equal(parseTimeString('24d 20h 31m 24s'), null);

            // Extreme numbers (100000h, 99999w)
            assert.equal(parseTimeString('100000h'), null);
            assert.equal(parseTimeString('99999w'), null);
            assert.equal(parseTimeString('99999999999999999999s'), null);
        });

        test('R2-5: Precise boundary acceptance at and below MAX_REMINDER_MS', () => {
            // 24d 20h 31m 23s = 2073600000 + 72000000 + 1860000 + 23000 = 2,147,483,000 ms (< 2147483647)
            const justUnderMax = parseTimeString('24d 20h 31m 23s');
            assert.equal(justUnderMax, 2147483000);

            // 24 days: 24 * 86,400,000 = 2,073,600,000 ms
            assert.equal(parseTimeString('24d'), 2073600000);

            // 3 weeks: 3 * 7 * 86,400,000 = 1,814,400,000 ms
            assert.equal(parseTimeString('3w'), 1814400000);
        });

        test('R2-6: Minimum duration enforcement: values < 5,000 ms return null', () => {
            assert.equal(MIN_REMINDER_MS, 5000);

            assert.equal(parseTimeString('1s'), null);
            assert.equal(parseTimeString('2s'), null);
            assert.equal(parseTimeString('3s'), null);
            assert.equal(parseTimeString('4s'), null);
            assert.equal(parseTimeString('0s'), null);
            assert.equal(parseTimeString('0m'), null);
            assert.equal(parseTimeString('0h'), null);

            // Exactly 5s
            assert.equal(parseTimeString('5s'), 5000);
            // 6s
            assert.equal(parseTimeString('6s'), 6000);
        });

        test('R2-7: Non-string, null, empty and garbage inputs return null without throwing', () => {
            const badInputs = [
                null,
                undefined,
                '',
                '   ',
                123,
                true,
                {},
                [],
                'invalid',
                'abc de fg',
                '????',
                '🚀✨'
            ];

            for (const bad of badInputs) {
                assert.doesNotThrow(() => {
                    const res = parseTimeString(bad);
                    assert.equal(res, null, `Input ${String(bad)} must return null`);
                });
            }
        });
    });

    // =========================================================================
    // REQUIREMENT R2: cancelReminder Stress & Garbage Collection
    // =========================================================================
    describe('R2: cancelReminder Timer GC &activeTimeouts Purity', () => {

        test('R2-8: Bulk scheduling and cancellation of 200 reminders leaves activeTimeouts completely clean', async () => {
            const client = createMockClient();
            const count = 200;
            const ids = [];

            // 1. Bulk schedule 200 reminders
            for (let i = 0; i < count; i++) {
                const id = `adversarial_rem_${Date.now()}_${i}`;
                ids.push(id);
                const reminder = {
                    id,
                    userId: `usr_${i}`,
                    guildId: 'guild_test',
                    channelId: 'chan_test',
                    message: `Msg #${i}`,
                    dueTimestamp: Date.now() + 60000 + i * 50,
                    completed: 0,
                };
                await db.createReminder(reminder);
                scheduleReminder(client, reminder);
            }

            // Verify all 200 exist in activeTimeouts
            assert.equal(activeTimeouts.size, count);
            for (const id of ids) {
                assert.ok(activeTimeouts.has(id));
            }

            // 2. Concurrently cancel all 200 reminders
            const cancelResults = await Promise.all(ids.map(id => cancelReminder(id)));

            // 3. Verify all returned true
            for (const res of cancelResults) {
                assert.equal(res, true, 'Every cancellation must succeed');
            }

            // 4. Verify activeTimeouts Map is 100% purged
            assert.equal(activeTimeouts.size, 0, 'activeTimeouts Map must be completely empty');
            for (const id of ids) {
                assert.equal(activeTimeouts.has(id), false, `Reminder ${id} must not be in activeTimeouts`);
            }
        });

        test('R2-9: Cancelled reminders do NOT fire timers or trigger dispatchReminder', async () => {
            const client = createMockClient();
            let dispatchCount = 0;

            // Spy on user/channel sending
            const mockGuild = {
                id: 'g_cancel_test',
                channels: {
                    cache: new Map([['c_cancel_test', {
                        id: 'c_cancel_test',
                        send: async () => { dispatchCount++; }
                    }]]),
                    fetch: async () => mockGuild.channels.cache.get('c_cancel_test'),
                }
            };
            client.guilds.cache.set('g_cancel_test', mockGuild);

            const shortReminderId = `short_rem_${Date.now()}`;
            const shortReminder = {
                id: shortReminderId,
                userId: 'usr_short',
                guildId: 'g_cancel_test',
                channelId: 'c_cancel_test',
                message: 'Cancel me quick',
                dueTimestamp: Date.now() + 50, // 50ms in future
                completed: 0
            };

            await db.createReminder(shortReminder);
            scheduleReminder(client, shortReminder);
            assert.equal(activeTimeouts.has(shortReminderId), true);

            // Immediately cancel it
            const cancelled = await cancelReminder(shortReminderId);
            assert.equal(cancelled, true);
            assert.equal(activeTimeouts.has(shortReminderId), false);

            // Wait 120ms (well past the 50ms trigger time)
            await new Promise(resolve => setTimeout(resolve, 120));

            // Verify the timer NEVER fired
            assert.equal(dispatchCount, 0, 'No message should have been sent for cancelled reminder');
        });

        test('R2-10: Idempotent double-cancellation: first returns true, second returns false', async () => {
            const id = `double_cancel_${Date.now()}`;
            const reminder = {
                id,
                userId: 'usr_double',
                guildId: 'g_double',
                channelId: 'c_double',
                message: 'Double cancel test',
                dueTimestamp: Date.now() + 30000,
                completed: 0
            };

            await db.createReminder(reminder);
            scheduleReminder(createMockClient(), reminder);

            const firstResult = await cancelReminder(id);
            assert.equal(firstResult, true, 'First cancel must return true');
            assert.equal(activeTimeouts.has(id), false);

            const secondResult = await cancelReminder(id);
            assert.equal(secondResult, false, 'Second cancel must return false');
        });

        test('R2-11: cancelReminder returns false for null, empty or invalid IDs without throwing', async () => {
            assert.equal(await cancelReminder(null), false);
            assert.equal(await cancelReminder(undefined), false);
            assert.equal(await cancelReminder(''), false);
            assert.equal(await cancelReminder('non_existent_reminder_id_99999'), false);
        });
    });

    // =========================================================================
    // REQUIREMENT R2: dispatchReminder Dual Dispatch & Promise.allSettled
    // =========================================================================
    describe('R2: dispatchReminder Authentic Promise.allSettled & Error Isolation', () => {

        test('R2-12: Channel failure + DM success: DM delivers, channel error does not crash or block execution', async () => {
            const client = createMockClient();
            let dmDelivered = false;

            // Channel rejects with Discord API 50001 (Missing Access)
            const mockGuild = {
                id: 'guild_fail_chan',
                channels: {
                    cache: new Map([['chan_fail', {
                        id: 'chan_fail',
                        send: async () => {
                            const err = new Error('Missing Access');
                            err.code = 50001;
                            throw err;
                        }
                    }]]),
                    fetch: async () => mockGuild.channels.cache.get('chan_fail'),
                }
            };
            client.guilds.cache.set('guild_fail_chan', mockGuild);

            // User DM succeeds
            const mockUser = {
                id: 'user_dm_success',
                send: async (payload) => {
                    dmDelivered = true;
                    return { id: 'dm_msg_1', ...payload };
                }
            };
            client.users.cache.set('user_dm_success', mockUser);

            const reminder = {
                id: `rem_partial_1_${Date.now()}`,
                userId: 'user_dm_success',
                guildId: 'guild_fail_chan',
                channelId: 'chan_fail',
                message: 'Canal falhou mas DM deve receber',
                dueTimestamp: Date.now(),
                completed: 0,
            };

            await db.createReminder(reminder);
            activeTimeouts.set(reminder.id, setTimeout(() => {}, 100000));

            // Execute dispatch
            await assert.doesNotReject(async () => {
                await dispatchReminder(client, reminder);
            });

            // Assertions
            assert.equal(dmDelivered, true, 'User DM must receive the reminder');
            assert.equal(activeTimeouts.has(reminder.id), false, 'Timeout handle must be evicted from activeTimeouts');
            
            // Check completed status in DB
            const pending = await db.getPendingReminders();
            assert.equal(pending.some(r => r.id === reminder.id), false, 'Reminder must be marked completed in DB');
        });

        test('R2-13: DM failure (DMs closed 50007) + Channel success: Channel delivers, DM error does not crash or block execution', async () => {
            const client = createMockClient();
            let channelDelivered = false;

            // Channel succeeds
            const mockGuild = {
                id: 'guild_success_chan',
                channels: {
                    cache: new Map([['chan_success', {
                        id: 'chan_success',
                        send: async (payload) => {
                            channelDelivered = true;
                            return { id: 'chan_msg_1', ...payload };
                        }
                    }]]),
                    fetch: async () => mockGuild.channels.cache.get('chan_success'),
                }
            };
            client.guilds.cache.set('guild_success_chan', mockGuild);

            // User DM fails with 50007 (Cannot send messages to this user)
            const mockUser = {
                id: 'user_dm_fail',
                send: async () => {
                    const err = new Error('Cannot send messages to this user');
                    err.code = 50007;
                    throw err;
                }
            };
            client.users.cache.set('user_dm_fail', mockUser);

            const reminder = {
                id: `rem_partial_2_${Date.now()}`,
                userId: 'user_dm_fail',
                guildId: 'guild_success_chan',
                channelId: 'chan_success',
                message: 'DM fechada mas canal deve receber',
                dueTimestamp: Date.now(),
                completed: 0,
            };

            await db.createReminder(reminder);
            activeTimeouts.set(reminder.id, setTimeout(() => {}, 100000));

            // Execute dispatch
            await assert.doesNotReject(async () => {
                await dispatchReminder(client, reminder);
            });

            // Assertions
            assert.equal(channelDelivered, true, 'Channel must receive the reminder');
            assert.equal(activeTimeouts.has(reminder.id), false, 'Timeout handle must be evicted from activeTimeouts');

            const pending = await db.getPendingReminders();
            assert.equal(pending.some(r => r.id === reminder.id), false, 'Reminder must be marked completed in DB');
        });

        test('R2-14: Both Channel and DM fail: handled gracefully via Promise.allSettled without crashing process', async () => {
            const client = createMockClient();

            // Channel throws
            const mockGuild = {
                id: 'guild_both_fail',
                channels: {
                    cache: new Map([['chan_both_fail', {
                        id: 'chan_both_fail',
                        send: async () => { throw new Error('Channel deleted / Unknown Channel 10003'); }
                    }]]),
                    fetch: async () => mockGuild.channels.cache.get('chan_both_fail'),
                }
            };
            client.guilds.cache.set('guild_both_fail', mockGuild);

            // User DM throws
            const mockUser = {
                id: 'user_both_fail',
                send: async () => { throw new Error('User blocked the bot'); }
            };
            client.users.cache.set('user_both_fail', mockUser);

            const reminder = {
                id: `rem_both_fail_${Date.now()}`,
                userId: 'user_both_fail',
                guildId: 'guild_both_fail',
                channelId: 'chan_both_fail',
                message: 'Ambos vão falhar',
                dueTimestamp: Date.now(),
                completed: 0,
            };

            await db.createReminder(reminder);
            activeTimeouts.set(reminder.id, setTimeout(() => {}, 100000));

            // Must NOT throw or reject
            await assert.doesNotReject(async () => {
                await dispatchReminder(client, reminder);
            });

            // Eviction must still occur
            assert.equal(activeTimeouts.has(reminder.id), false, 'Timeout handle must still be evicted on total failure');
        });

        test('R2-15: High-concurrency dual dispatch burst (100 simultaneous reminders) with mixed failure profiles', async () => {
            const client = createMockClient();
            const total = 100;

            // Register mock guilds and users with 4 distinct behaviors:
            // 0: Both succeed
            // 1: Channel fails, DM succeeds
            // 2: Channel succeeds, DM fails
            // 3: Both fail

            for (let i = 0; i < total; i++) {
                const behavior = i % 4;
                const gid = `burst_guild_${i}`;
                const cid = `burst_chan_${i}`;
                const uid = `burst_user_${i}`;

                const channelCanSend = behavior === 0 || behavior === 2;
                const dmCanSend = behavior === 0 || behavior === 1;

                const mockGuild = {
                    id: gid,
                    channels: {
                        cache: new Map([[cid, {
                            id: cid,
                            send: async () => {
                                if (!channelCanSend) throw new Error('Channel permission error');
                                return { id: `msg_chan_${i}` };
                            }
                        }]]),
                        fetch: async () => mockGuild.channels.cache.get(cid),
                    }
                };
                client.guilds.cache.set(gid, mockGuild);

                const mockUser = {
                    id: uid,
                    send: async () => {
                        if (!dmCanSend) throw new Error('DM blocked error');
                        return { id: `msg_dm_${i}` };
                    }
                };
                client.users.cache.set(uid, mockUser);

                const reminder = {
                    id: `burst_rem_${i}`,
                    userId: uid,
                    guildId: gid,
                    channelId: cid,
                    message: `Burst message ${i}`,
                    dueTimestamp: Date.now(),
                    completed: 0
                };
                await db.createReminder(reminder);
                activeTimeouts.set(reminder.id, setTimeout(() => {}, 100000));
            }

            assert.equal(activeTimeouts.size, total);

            // Execute all 100 in parallel
            const dispatches = Array.from({ length: total }, (_, i) => {
                const reminder = {
                    id: `burst_rem_${i}`,
                    userId: `burst_user_${i}`,
                    guildId: `burst_guild_${i}`,
                    channelId: `burst_chan_${i}`,
                    message: `Burst message ${i}`,
                    dueTimestamp: Date.now(),
                    completed: 0
                };
                return dispatchReminder(client, reminder);
            });

            await assert.doesNotReject(async () => {
                await Promise.all(dispatches);
            });

            // Every single timeout key must be cleared from activeTimeouts
            assert.equal(activeTimeouts.size, 0, 'All 100 timeouts must be purged from activeTimeouts');
        });

        test('R2-16: Degraded / missing parameters in dispatchReminder do not throw', async () => {
            await assert.doesNotReject(async () => {
                await dispatchReminder(null, null);
                await dispatchReminder({}, null);
                await dispatchReminder(null, {});
                await dispatchReminder({}, { id: 'missing_all' });
            });
        });
    });
});
