// tests/tier4_scenarios/real_world_scenarios.test.js
const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createMockInteraction, createMockClient } = require('../helpers/mockDiscord.js');
const { createMockDatabase } = require('../helpers/mockDatabase.js');
const mockHttp = require('../helpers/mockHttp.js');
const fixtures = require('../helpers/fixtures.js');
const config = require('../../src/config/config.js');

describe('Tier 4: Real-World Scenarios', () => {
    let mockDb;
    let tosCheck;
    let getLanguage;
    let tosAcceptHandler;
    let langSelectHandler;

    before(() => {
        mockDb = createMockDatabase();
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

    test('Scenario 1: Complete New User Onboarding Lifecycle', async () => {
        const newUserId = '400000000000000001';
        
        // Step 1: User invokes slash command for the first time
        const initialInteraction = createMockInteraction({
            userId: newUserId,
            commandName: 'binder',
            locale: 'en-US',
        });
        const initialProceed = await tosCheck(initialInteraction);
        assert.equal(initialProceed, false, 'New user should be blocked on first attempt');
        assert.equal(initialInteraction._replies.length, 1);
        
        // Step 2: User clicks "Aceitar e Continuar" (tos_accept)
        const acceptInteraction = createMockInteraction({
            userId: newUserId,
            customId: `tos_accept_${newUserId}`,
            locale: 'en-US',
        });
        await tosAcceptHandler.execute(acceptInteraction);
        
        // Verify ToS version updated and language selector presented
        assert.equal(mockDb.getUser(newUserId).tosVersion, config.currentTosVersion);
        assert.equal(acceptInteraction._updates.length, 1);
        const langMenuUpdate = acceptInteraction._updates[0];
        assert.ok(langMenuUpdate.components[0].components[0].data.custom_id.startsWith('lang_select'));

        // Step 3: User selects "Always English" (lang_en_us)
        const langInteraction = createMockInteraction({
            userId: newUserId,
            customId: `lang_select_${newUserId}`,
            values: ['lang_en_us'],
            locale: 'en-US',
        });
        await langSelectHandler.execute(langInteraction);

        // Verify language preference saved
        assert.equal(mockDb.getUser(newUserId).language, 'lang_en_us');
        assert.equal(langInteraction._updates.length, 1);

        // Step 4: User re-executes command -> passes ToS check immediately
        const secondInteraction = createMockInteraction({
            userId: newUserId,
            commandName: 'binder',
            locale: 'en-US',
        });
        const secondProceed = await tosCheck(secondInteraction);
        assert.equal(secondProceed, true, 'User should now be allowed to execute commands');
        assert.equal(getLanguage(secondInteraction), 'en_US', 'Language should resolve to en_US');
    });

    test('Scenario 2: Music Lookup Multi-Provider Failover Journey', async () => {
        // Mock fetch where iTunes fails with 500, but Deezer succeeds
        const { mockFetchFn } = mockHttp.createMockFetch({ failITunes: true });
        
        const executeMusicLookup = async (query) => {
            let track = null;
            // 1. Try iTunes
            try {
                const itunesRes = await mockFetchFn(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`);
                if (itunesRes.ok) {
                    const data = await itunesRes.json();
                    if (data.results?.length > 0) {
                        track = { provider: 'iTunes', ...data.results[0] };
                    }
                }
            } catch (e) {
                // Ignore iTunes failure
            }

            // 2. Fallover to Deezer
            if (!track) {
                const deezerRes = await mockFetchFn(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`);
                if (deezerRes.ok) {
                    const data = await deezerRes.json();
                    if (data.data?.length > 0) {
                        const item = data.data[0];
                        track = {
                            provider: 'Deezer',
                            title: item.title,
                            artist: item.artist.name,
                            album: item.album.title,
                            duration: `${Math.floor(item.duration / 60)}:${item.duration % 60 < 10 ? '0' : ''}${item.duration % 60}`,
                            artworkUrl: item.album.cover_xl,
                            previewUrl: item.preview,
                            url: item.link,
                        };
                    }
                }
            }

            return track;
        };

        const result = await executeMusicLookup('Queen Bohemian Rhapsody');
        assert.ok(result, 'Music lookup should succeed via failover');
        assert.equal(result.provider, 'Deezer', 'Should have failed over to Deezer');
        assert.equal(result.title, 'Bohemian Rhapsody');
        assert.equal(result.artist, 'Queen');
        assert.equal(result.duration, '5:54');
        assert.ok(result.artworkUrl.includes('1000x1000'));
        assert.ok(result.previewUrl.endsWith('.mp3'));
    });

    test('Scenario 3: Anti-Spam & Webhook Bug Reporting Pipeline', async () => {
        const cooldowns = new Map();
        const cooldownMs = 2000;
        const userId = '500000000000000001';

        const rateLimitCheck = (now) => {
            const last = cooldowns.get(userId);
            if (last && (now - last) < cooldownMs) {
                return { limited: true, remaining: cooldownMs - (now - last) };
            }
            cooldowns.set(userId, now);
            return { limited: false, remaining: 0 };
        };

        // 1. Initial attempt at t = 1000 -> allowed
        assert.equal(rateLimitCheck(1000).limited, false);

        // 2. Rapid spam attempts at t = 1200, 1400 -> blocked
        assert.equal(rateLimitCheck(1200).limited, true);
        assert.equal(rateLimitCheck(1400).limited, true);

        // 3. User waits until t = 3100 -> allowed
        assert.equal(rateLimitCheck(3100).limited, false);

        // 4. User submits bug report via webhook
        const webhookClient = mockHttp.createMockWebhookClient();
        const bugReport = {
            embeds: [{
                title: '🐛 Novo Relatório de Bug',
                fields: [
                    { name: '👤 Autor', value: `Reporter#1234 (\`${userId}\`)` },
                    { name: '📝 Conteúdo', value: 'O botão de trocar de página no /binder info não responde.' }
                ]
            }]
        };

        await webhookClient.send(bugReport);
        assert.equal(webhookClient.sentPayloads.length, 1);
        assert.equal(webhookClient.sentPayloads[0].embeds[0].title, '🐛 Novo Relatório de Bug');
    });

    test('Scenario 4: Returning User Version Migration Journey', async () => {
        const returningUserId = '600000000000000001';
        
        // Setup user with older ToS version and established language preference
        mockDb.getUser(returningUserId);
        mockDb.updateUser(returningUserId, 'tosVersion', config.currentTosVersion - 1);
        mockDb.updateUser(returningUserId, 'language', 'lang_pt_br');

        // Step 1: User tries command -> ToS check detects update
        const commandInteraction = createMockInteraction({
            userId: returningUserId,
            locale: 'pt-BR',
        });
        const allowed = await tosCheck(commandInteraction);
        assert.equal(allowed, false, 'User with outdated ToS must be blocked');

        const promptReply = commandInteraction._getLastResponse();
        assert.ok(promptReply.embeds[0].data.title.includes('Atualizados') || promptReply.embeds[0].data.title.includes('Updated'));

        // Step 2: User clicks accept
        const acceptInteraction = createMockInteraction({
            userId: returningUserId,
            customId: `tos_accept_${returningUserId}`,
            locale: 'pt-BR',
        });
        await tosAcceptHandler.execute(acceptInteraction);

        // Verify version updated, but language remains 'lang_pt_br' without re-prompting menu
        const updatedUser = mockDb.getUser(returningUserId);
        assert.equal(updatedUser.tosVersion, config.currentTosVersion);
        assert.equal(updatedUser.language, 'lang_pt_br');
        assert.deepEqual(acceptInteraction._updates[0].components, [], 'Should not re-prompt language menu for returning users');

        // Step 3: Subsequent command proceeds cleanly in Portuguese
        const nextInteraction = createMockInteraction({
            userId: returningUserId,
            locale: 'en-US', // Discord client is in English, but user preference is Portuguese
        });
        const nextAllowed = await tosCheck(nextInteraction);
        assert.equal(nextAllowed, true);
        assert.equal(getLanguage(nextInteraction), 'pt_BR', 'Saved language preference must be preserved');
    });
});
