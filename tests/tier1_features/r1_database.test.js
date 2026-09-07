// tests/tier1_features/r1_database.test.js
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createMockDatabase } = require('../helpers/mockDatabase.js');
const fixtures = require('../helpers/fixtures.js');

describe('Requirement R1: Database Migration & Cloud Hosting Compatibility', () => {
    let db;

    beforeEach(() => {
        db = createMockDatabase({
            users: [fixtures.users.acceptedUserPtBr, fixtures.users.outdatedTosUser],
            guilds: [fixtures.guilds.defaultGuild],
        });
    });

    test('R1.1: Database initializes tables and retrieves existing user preferences', () => {
        const user = db.getUser(fixtures.users.acceptedUserPtBr.userId);
        assert.ok(user, 'User should be found in database');
        assert.equal(user.userId, fixtures.users.acceptedUserPtBr.userId);
        assert.equal(user.tosVersion, 2);
        assert.equal(user.language, 'lang_pt_br');
        assert.equal(user.badges, 'vip,early_supporter');
    });

    test('R1.2: Automatically creates default profile for new user upon first query', () => {
        const newUserId = '999999999999999999';
        const user = db.getUser(newUserId);
        assert.ok(user, 'New user should be automatically created');
        assert.equal(user.userId, newUserId);
        assert.equal(user.tosVersion, 0, 'New user should default to tosVersion 0');
        assert.equal(user.language, 'lang_auto', 'New user should default to lang_auto');
        assert.equal(user.isDeveloper, 0, 'New user should not be a developer by default');
    });

    test('R1.3: Persists user preference updates (tosVersion, language, badges, isDeveloper)', () => {
        const userId = fixtures.users.outdatedTosUser.userId;
        
        // Update ToS version
        db.updateUser(userId, 'tosVersion', 2);
        let user = db.getUser(userId);
        assert.equal(user.tosVersion, 2, 'ToS version should be updated to 2');

        // Update Language
        db.updateUser(userId, 'language', 'lang_en_us');
        user = db.getUser(userId);
        assert.equal(user.language, 'lang_en_us', 'Language preference should be updated');

        // Update Developer flag
        db.updateUser(userId, 'isDeveloper', 1);
        user = db.getUser(userId);
        assert.equal(user.isDeveloper, 1, 'isDeveloper flag should be updated');
    });

    test('R1.4: Persists user locale and normalizes snake_case / camelCase schemas', () => {
        const userId = fixtures.users.outdatedTosUser.userId;
        db.setLastKnownLocale(userId, 'es-ES');
        
        const user = db.getUser(userId);
        assert.equal(user.lastKnownLocale, 'es-ES');
        assert.equal(user.last_known_locale, 'es-ES');
    });

    test('R1.5: Persists guild configuration (antiraid, welcome, and goodbye channels)', () => {
        const guildId = fixtures.guilds.defaultGuild.guildId;
        const guild = db.getGuild(guildId);
        
        assert.ok(guild, 'Guild configuration should be found');
        assert.equal(guild.antiraidEnabled, 1);
        assert.equal(guild.welcomeChannelId, '200000000000000010');

        // Update guild settings
        db.updateGuild(guildId, {
            antiraidEnabled: 0,
            welcomeChannelId: '200000000000000099',
            goodbyeChannelId: '200000000000000098',
        });

        const updatedGuild = db.getGuild(guildId);
        assert.equal(updatedGuild.antiraidEnabled, 0);
        assert.equal(updatedGuild.welcomeChannelId, '200000000000000099');
        assert.equal(updatedGuild.goodbyeChannelId, '200000000000000098');
    });

    test('R1.6: Supabase PostgreSQL query builder operations (select, insert, update)', async () => {
        const supabase = db.createSupabaseClient();
        
        // Insert a new user into Supabase table
        const insertRes = await supabase.from('users').insert({
            user_id: '888888888888888888',
            tos_version: 2,
            language: 'lang_pt_br',
            is_developer: 0,
        });
        assert.equal(insertRes.error, null);

        // Query user from Supabase table
        const queryRes = await supabase.from('users').eq('user_id', '888888888888888888').single();
        assert.equal(queryRes.error, null);
        assert.ok(queryRes.data);
        assert.equal(queryRes.data.user_id, '888888888888888888');
        assert.equal(queryRes.data.language, 'lang_pt_br');

        // Update user in Supabase table
        await supabase.from('users').update({ language: 'lang_en_us' }).eq('user_id', '888888888888888888');
        const updatedRes = await supabase.from('users').eq('user_id', '888888888888888888').single();
        assert.equal(updatedRes.data.language, 'lang_en_us');
    });

    test('R1.7: Database provider activates local fallback when cloud connection fails', async () => {
        // Simulate Supabase network downtime
        db.simulateNetworkFailure(true);
        assert.equal(db._isFallbackActive(), true, 'Fallback provider should become active');

        // CRUD should continue functioning via local fallback
        const user = db.getUser(fixtures.users.acceptedUserPtBr.userId);
        assert.ok(user, 'User should still be retrievable via fallback');

        db.updateUser(fixtures.users.acceptedUserPtBr.userId, 'language', 'lang_en_us');
        const updated = db.getUser(fixtures.users.acceptedUserPtBr.userId);
        assert.equal(updated.language, 'lang_en_us', 'Updates should succeed in fallback mode');
    });
});
