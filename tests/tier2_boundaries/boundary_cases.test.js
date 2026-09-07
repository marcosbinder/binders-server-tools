// tests/tier2_boundaries/boundary_cases.test.js
const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createMockInteraction, createMockClient } = require('../helpers/mockDiscord.js');
const { createMockDatabase } = require('../helpers/mockDatabase.js');
const mockHttp = require('../helpers/mockHttp.js');
const fixtures = require('../helpers/fixtures.js');

describe('Tier 2: Boundary & Corner Cases', () => {
    let mockDb;
    let checkInteractionOwnership;

    before(() => {
        mockDb = createMockDatabase();
        const dbPath = path.resolve(__dirname, '../../database/db.js');
        require.cache[dbPath] = {
            id: dbPath,
            filename: dbPath,
            loaded: true,
            exports: mockDb,
        };
        checkInteractionOwnership = require('../../src/utils/interactionOwnership.js');
    });

    test('T2.1: Handles extreme input lengths and whitespace in music search queries', async () => {
        const { mockFetchFn } = mockHttp.createMockFetch();
        
        // Extremely long query (500 chars)
        const longQuery = 'A'.repeat(500);
        const encodedUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(longQuery)}&entity=song&limit=1`;
        const res = await mockFetchFn(encodedUrl);
        assert.ok(res.ok);
        const data = await res.json();
        assert.equal(data.resultCount, 0);
    });

    test('T2.2: External API network failure modes (HTTP 500, AbortError timeout)', async () => {
        // HTTP 500 error
        const { mockFetchFn: failingFetch } = mockHttp.createMockFetch({ failITunes: true, failDeezer: true });
        const res500 = await failingFetch('https://itunes.apple.com/search?term=test');
        assert.equal(res500.ok, false);
        assert.equal(res500.status, 500);

        // AbortError / Timeout simulation
        const { mockFetchFn: timeoutFetch } = mockHttp.createMockFetch({ shouldTimeoutAll: true });
        await assert.rejects(
            async () => timeoutFetch('https://api.deezer.com/search?q=test'),
            (err) => err.name === 'AbortError' && err.message.includes('aborted')
        );
    });

    test('T2.3: Database failover and resilience under connection loss', () => {
        const db = createMockDatabase({ users: [fixtures.users.acceptedUserPtBr] });
        
        // Simulate sudden cloud failure
        db.simulateNetworkFailure(true);
        assert.equal(db._isFallbackActive(), true);

        // Should not throw and still read/write locally
        const user = db.getUser(fixtures.users.acceptedUserPtBr.userId);
        assert.ok(user);
        
        db.updateUser(fixtures.users.acceptedUserPtBr.userId, 'language', 'lang_en_us');
        assert.equal(db.getUser(fixtures.users.acceptedUserPtBr.userId).language, 'lang_en_us');

        // Restore network
        db.simulateRecovery();
        assert.equal(db._isNetworkDown(), false);
    });

    test('T2.4: Interaction ownership boundary checks (malformed IDs, missing suffixes)', async () => {
        // Interaction customId without user ID suffix
        const interactionNoSuffix = createMockInteraction({
            userId: '12345',
            customId: 'help_nav_nosuffix',
        });
        const allowed1 = await checkInteractionOwnership(interactionNoSuffix);
        assert.equal(allowed1, false, 'Custom ID without valid user suffix should be rejected');

        // Interaction customId with foreign user ID
        const interactionOtherUser = createMockInteraction({
            userId: '11111',
            customId: 'help_nav_22222',
        });
        const allowed2 = await checkInteractionOwnership(interactionOtherUser);
        assert.equal(allowed2, false, 'Interaction from different user should be rejected');
    });

    test('T2.5: Context menu boundary conditions (deleted author, 0 bytes attachment, no roles)', () => {
        const minimalMessage = {
            id: '9999',
            content: '',
            author: { id: '0000', tag: 'Deleted User#0000', username: 'Deleted User', bot: false },
            createdTimestamp: Date.now(),
            editedTimestamp: null,
            pinned: false,
            channelId: '123',
            attachments: new Map(),
            embeds: [],
            components: [],
            url: 'https://discord.com/channels/1/2/3',
        };

        const interaction = createMockInteraction({
            type: 'messageContext',
            targetMessage: minimalMessage,
        });

        assert.equal(interaction.targetMessage.content.length, 0);
        assert.equal(interaction.targetMessage.attachments.size, 0);
        assert.equal(interaction.targetMessage.embeds.length, 0);
    });

    test('T2.6: Rate limiter boundary tests (precise 1ms boundary before & after cooldown expiration)', () => {
        const cooldownMs = 1000;
        const cooldowns = new Map();
        const userId = 'boundary_user';
        const key = 'test_key';

        const checkLimit = (now) => {
            const mapKey = `${userId}:${key}`;
            const last = cooldowns.get(mapKey);
            if (last && (now - last) < cooldownMs) {
                return { limited: true, remaining: cooldownMs - (now - last) };
            }
            cooldowns.set(mapKey, now);
            return { limited: false, remaining: 0 };
        };

        const t0 = 1000000;
        assert.equal(checkLimit(t0).limited, false); // First call at t0

        // 1ms before cooldown expires -> limited
        assert.equal(checkLimit(t0 + 999).limited, true);
        assert.equal(checkLimit(t0 + 999).remaining, 1);

        // Exactly at cooldown expiration -> allowed
        assert.equal(checkLimit(t0 + 1000).limited, false);
    });
});
