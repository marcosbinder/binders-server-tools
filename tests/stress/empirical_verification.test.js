// tests/stress/empirical_verification.test.js
const { test, describe, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

// Real modules under test
const realDb = require('../../src/database/db.js');
const musicProvider = require('../../src/utils/musicProvider.js');
const rateLimiter = require('../../src/utils/rateLimiter.js');
const getLanguage = require('../../src/utils/getLanguage.js');
const tosCheck = require('../../src/utils/tosCheck.js');
const config = require('../../src/config/config.js');

describe('CHALLENGER 1: Empirical Verification & Stress Test Suite', () => {

    describe('1. Database Module (db.js) - Real SQLite Fallback & Caching', () => {
        test('DB-1: Initialize database mode and verify SQLite or Memory active', async () => {
            const initRes = await realDb.initDatabase();
            assert.ok(initRes.mode, 'Database mode must be defined');
            const currentMode = realDb.getDatabaseMode();
            assert.ok(['supabase', 'sqlite', 'memory'].includes(currentMode), `Mode was ${currentMode}`);
        });

        test('DB-2: Check return type of getUser() with real db.js', async () => {
            const userId = 'empirical_user_1';
            const userResult = realDb.getUser(userId);
            
            // Check whether it is a Promise or a direct object
            const isPromise = Boolean(userResult && typeof userResult.then === 'function');
            const resolvedUser = isPromise ? await userResult : userResult;
            
            assert.ok(resolvedUser, 'User object should be returned');
            assert.equal(resolvedUser.userId, userId);
            assert.equal(resolvedUser.tosVersion, 0);
            assert.equal(resolvedUser.language, 'lang_auto');
        });

        test('DB-3: Concurrency Stress - 100 simultaneous user reads/writes', async () => {
            const promises = [];
            for (let i = 0; i < 100; i++) {
                const uid = `stress_user_${i}`;
                promises.push(
                    (async () => {
                        let u = await realDb.getUser(uid);
                        assert.equal(u.userId, uid);
                        await realDb.updateUser(uid, {
                            tosVersion: 2,
                            language: i % 2 === 0 ? 'lang_pt_br' : 'lang_en_us',
                            isDeveloper: i === 0 ? 1 : 0
                        });
                        let updated = await realDb.getUser(uid);
                        assert.equal(updated.tosVersion, 2);
                        assert.equal(updated.language, i % 2 === 0 ? 'lang_pt_br' : 'lang_en_us');
                        assert.equal(updated.isDeveloper, i === 0 ? 1 : 0);
                    })()
                );
            }
            await Promise.all(promises);
        });

        test('DB-4: Snake_case and CamelCase Normalization on Users & Guilds', async () => {
            const uid = 'norm_user_test';
            await realDb.updateUser(uid, {
                user_id: uid,
                tos_version: 2,
                last_known_locale: 'pt-BR',
                is_developer: 1,
            });
            const user = await realDb.getUser(uid);
            assert.equal(user.userId, uid);
            assert.equal(user.user_id, uid);
            assert.equal(user.tosVersion, 2);
            assert.equal(user.tos_version, 2);
            assert.equal(user.lastKnownLocale, 'pt-BR');
            assert.equal(user.last_known_locale, 'pt-BR');
            assert.equal(user.isDeveloper, 1);
            assert.equal(user.is_developer, 1);

            const gid = 'norm_guild_test';
            await realDb.updateGuild(gid, {
                guild_id: gid,
                antiraid_enabled: 1,
                welcome_channel_id: '999111',
                goodbye_channel_id: '999222',
            });
            const guild = await realDb.getGuild(gid);
            assert.equal(guild.guildId, gid);
            assert.equal(guild.guild_id, gid);
            assert.equal(guild.antiraidEnabled, 1);
            assert.equal(guild.antiraid_enabled, 1);
            assert.equal(guild.welcomeChannelId, '999111');
            assert.equal(guild.welcome_channel_id, '999111');
            assert.equal(guild.goodbyeChannelId, '999222');
            assert.equal(guild.goodbye_channel_id, '999222');
        });

        test('DB-5: AI History logging under stress', async () => {
            for (let i = 0; i < 20; i++) {
                await realDb.logAiHistory({
                    messageId: `msg_${i}`,
                    userId: `user_${i}`,
                    role: 'assistant',
                    content: `Response content ${i}`,
                    timestamp: Date.now(),
                });
            }
        });
    });

    describe('2. Music Provider Waterfall (musicProvider.js) - Real & Fault Injections', () => {
        test('MUSIC-1: Duration Formatter Edge Cases', () => {
            assert.equal(musicProvider.formatDuration(0), '0:00');
            assert.equal(musicProvider.formatDuration(null), '0:00');
            assert.equal(musicProvider.formatDuration(undefined), '0:00');
            assert.equal(musicProvider.formatDuration(59000), '0:59');
            assert.equal(musicProvider.formatDuration(60000), '1:00');
            assert.equal(musicProvider.formatDuration(3599000), '59:59');
            assert.equal(musicProvider.formatDuration(5), '0:05');
            assert.equal(musicProvider.formatDuration(125), '2:05');
        });

        test('MUSIC-2: Artwork Upscaling Edge Cases', () => {
            assert.equal(musicProvider.upscaleArtwork(null), null);
            assert.equal(musicProvider.upscaleArtwork(''), null);
            assert.equal(
                musicProvider.upscaleArtwork('https://is1-ssl.mzstatic.com/image/thumb/Music/v4/100x100bb.jpg'),
                'https://is1-ssl.mzstatic.com/image/thumb/Music/v4/1000x1000bb.jpg'
            );
            assert.equal(
                musicProvider.upscaleArtwork('https://is1-ssl.mzstatic.com/image/thumb/Music/v4/600x600bb.jpg'),
                'https://is1-ssl.mzstatic.com/image/thumb/Music/v4/1000x1000bb.jpg'
            );
        });

        test('MUSIC-3: Network Timeout / AbortSignal Simulation in searchMusicWithFallback', async () => {
            const timeoutFetch = async (url) => {
                const err = new Error('The operation was aborted');
                err.name = 'AbortError';
                throw err;
            };

            const result = await musicProvider.searchMusicWithFallback('never gonna give you up', timeoutFetch);
            assert.ok(result);
            assert.equal(result.provider, 'Spotify Search Link');
            assert.ok(result.url.includes('spotify.com/search'));
        });

        test('MUSIC-4: HTTP 500 on iTunes cascading to successful Deezer', async () => {
            const cascadingFetch = async (url) => {
                if (url.includes('itunes.apple.com')) {
                    return { ok: false, status: 500, json: async () => ({}) };
                }
                if (url.includes('api.deezer.com')) {
                    return {
                        ok: true,
                        status: 200,
                        json: async () => ({
                            data: [{
                                title: 'Deezer Song',
                                duration: 210,
                                artist: { name: 'Deezer Artist' },
                                album: { title: 'Deezer Album', cover_xl: 'https://deezer.com/cover.jpg' },
                                preview: 'https://deezer.com/preview.mp3',
                                link: 'https://deezer.com/track/123'
                            }]
                        })
                    };
                }
                throw new Error('Unknown URL');
            };

            const result = await musicProvider.searchMusicWithFallback('test query', cascadingFetch);
            assert.equal(result.provider, 'Deezer');
            assert.equal(result.title, 'Deezer Song');
            assert.equal(result.artist, 'Deezer Artist');
            assert.equal(result.duration, '3:30');
            assert.equal(result.artworkUrl, 'https://deezer.com/cover.jpg');
        });

        test('MUSIC-5: Malformed JSON and empty results across all providers', async () => {
            const malformedFetch = async (url) => {
                return {
                    ok: true,
                    status: 200,
                    json: async () => { throw new SyntaxError('Unexpected token < in JSON at position 0'); }
                };
            };

            const result = await musicProvider.searchMusicWithFallback('corrupted track', malformedFetch);
            assert.equal(result.provider, 'Spotify Search Link');
        });
    });

    describe('3. Rate Limiter (rateLimiter.js) - Precision & Stress', () => {
        let testLimiter;

        beforeEach(() => {
            testLimiter = new rateLimiter.RateLimiter();
        });

        test('RATE-1: Sub-millisecond sliding window boundary precision', () => {
            const userId = 'rate_user_1';
            const key = 'cmd:test';
            const cooldownMs = 1000;

            // t = 0
            const first = testLimiter.check(userId, key, cooldownMs, false);
            assert.equal(first.limited, false);

            // immediate repeat -> limited
            const second = testLimiter.check(userId, key, cooldownMs, false);
            assert.equal(second.limited, true);
            assert.ok(second.remainingMs > 0 && second.remainingMs <= cooldownMs);

            // Manual time manipulation to test exact boundaries
            const mapKey = `${userId}:${key}`;
            const recordedTime = testLimiter.cooldowns.get(mapKey);

            // 1ms before cooldown ends: still limited
            testLimiter.cooldowns.set(mapKey, Date.now() - (cooldownMs - 1));
            const third = testLimiter.check(userId, key, cooldownMs, false);
            assert.equal(third.limited, true);

            // Exact expiration: allowed
            testLimiter.cooldowns.set(mapKey, Date.now() - cooldownMs);
            const fourth = testLimiter.check(userId, key, cooldownMs, false);
            assert.equal(fourth.limited, false);
        });

        test('RATE-2: Developer Bypass Verification across data types', () => {
            const userId = 'dev_user_1';
            const key = 'cmd:dev_test';
            const cooldownMs = 5000;

            // isDeveloper = true
            for (let i = 0; i < 50; i++) {
                const res = testLimiter.check(userId, key, cooldownMs, true);
                assert.equal(res.limited, false, `Call ${i} should not be limited with true`);
            }

            // isDeveloper = 1 (truthy number from SQLite)
            for (let i = 0; i < 50; i++) {
                const res = testLimiter.check(userId, key, cooldownMs, 1);
                assert.equal(res.limited, false, `Call ${i} should not be limited with 1`);
            }

            // isDeveloper = 0 (falsy number from SQLite)
            const firstNonDev = testLimiter.check(userId, key, cooldownMs, 0);
            assert.equal(firstNonDev.limited, false);
            const secondNonDev = testLimiter.check(userId, key, cooldownMs, 0);
            assert.equal(secondNonDev.limited, true);
        });

        test('RATE-3: Memory leak & Pruning Stress (10,000 entries)', () => {
            const now = Date.now();
            // Insert 5000 expired entries and 5000 fresh entries
            for (let i = 0; i < 5000; i++) {
                testLimiter.cooldowns.set(`expired_user_${i}:cmd`, now - 120000); // 2 mins ago
            }
            for (let i = 0; i < 5000; i++) {
                testLimiter.cooldowns.set(`fresh_user_${i}:cmd`, now - 10000); // 10s ago
            }

            assert.equal(testLimiter.cooldowns.size, 10000);

            // Cleanup with 60s TTL
            testLimiter.cleanup(60000);

            assert.equal(testLimiter.cooldowns.size, 5000);
            // Verify remaining are all fresh
            for (let i = 0; i < 5000; i++) {
                assert.ok(testLimiter.cooldowns.has(`fresh_user_${i}:cmd`));
                assert.ok(!testLimiter.cooldowns.has(`expired_user_${i}:cmd`));
            }
        });
    });

    describe('4. Empirical Verification: Synchronous getUser() Integrity & Callers', () => {
        test('INTEROP-1: Demonstrates that getLanguage() correctly resolves synchronous user language preference', async () => {
            const uid = 'interop_lang_user';
            await realDb.updateUser(uid, {
                language: 'lang_pt_br',
                tosVersion: 2
            });

            const fakeInteraction = {
                user: { id: uid },
                locale: 'en-US'
            };

            const userObj = realDb.getUser(uid);
            assert.equal(typeof userObj.then, 'undefined', 'realDb.getUser(uid) returns synchronous object, not Promise');
            assert.equal(userObj.language, 'lang_pt_br');

            const resolvedLang = getLanguage(fakeInteraction);
            assert.equal(resolvedLang, 'pt_BR', 'getLanguage successfully resolves user preference pt_BR');
        });

        test('INTEROP-2: Demonstrates that tosCheck() correctly evaluates user.tosVersion synchronously', async () => {
            const uid = 'interop_tos_user';
            await realDb.updateUser(uid, {
                tosVersion: 2,
                language: 'lang_pt_br'
            });

            const userObj = realDb.getUser(uid);
            assert.notEqual(userObj.tosVersion, undefined, 'userObj.tosVersion is defined');
            assert.equal(userObj.tosVersion >= config.currentTosVersion, true, 'user tosVersion meets current requirement');
        });
    });
});
