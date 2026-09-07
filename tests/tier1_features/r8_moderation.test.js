const test = require('node:test');
const assert = require('node:assert');
const { updateUser } = require('../../src/database/db.js');
const moderacaoCmd = require('../../src/commands/moderacao.js');

test("Requirement R8: Moderation Suite", async (t) => {
    updateUser('mod_1', { tosVersion: 2 });

    await t.test("R8.1: Command data defines all subcommands with bilingual descriptions", () => {
        assert.strictEqual(moderacaoCmd.data.name, 'moderacao');
        const json = moderacaoCmd.data.toJSON();
        assert.ok(json.options);
        const subs = json.options.map(o => o.name);
        assert.ok(subs.includes('kick'));
        assert.ok(subs.includes('ban'));
        assert.ok(subs.includes('timeout'));
        assert.ok(subs.includes('lock'));
        assert.ok(subs.includes('unlock'));
        assert.ok(subs.includes('clear'));
    });

    await t.test("R8.2: Kick subcommand executes when permissions and hierarchy are valid", async () => {
        let kickedWith = null;
        let repliedPayload = null;

        const mockMember = {
            kickable: true,
            roles: { highest: { position: 1 } },
            kick: async (reason) => { kickedWith = reason; },
        };

        const mockInteraction = {
            guild: {
                id: 'guild_123',
                members: {
                    me: { permissions: { has: () => true }, roles: { highest: { position: 10 } } },
                    fetch: async () => mockMember,
                },
            },
            member: { permissions: { has: () => true } },
            user: { id: 'mod_1', tag: 'Moderator#0001', username: 'Moderator' },
            options: {
                getSubcommand: () => 'kick',
                getUser: () => ({ id: 'user_99', tag: 'Violator#1234', username: 'Violator' }),
                getString: (key) => key === 'motivo' ? 'Spam de mensagens' : null,
            },
            reply: async (payload) => { repliedPayload = payload; },
        };

        await moderacaoCmd.execute(mockInteraction);
        assert.ok(kickedWith.includes('Spam de mensagens'));
        assert.ok(repliedPayload.embeds);
    });

    await t.test("R8.3: Timeout subcommand parses time and applies castigo", async () => {
        let timeoutMs = null;
        let repliedPayload = null;

        const mockMember = {
            moderatable: true,
            roles: { highest: { position: 1 } },
            timeout: async (ms) => { timeoutMs = ms; },
        };

        const mockInteraction = {
            guild: {
                id: 'guild_123',
                members: {
                    me: { permissions: { has: () => true }, roles: { highest: { position: 10 } } },
                    fetch: async () => mockMember,
                },
            },
            member: { permissions: { has: () => true } },
            user: { id: 'mod_1', tag: 'Moderator' },
            options: {
                getSubcommand: () => 'timeout',
                getUser: () => ({ id: 'user_99', tag: 'Violator' }),
                getString: (key) => key === 'duracao' ? '20m' : 'Flood',
            },
            reply: async (payload) => { repliedPayload = payload; },
        };

        await moderacaoCmd.execute(mockInteraction);
        assert.strictEqual(timeoutMs, 20 * 60 * 1000);
        assert.ok(repliedPayload.embeds);
    });

    await t.test("R8.4: Clear subcommand bulk deletes messages successfully", async () => {
        let bulkDeleteCalled = false;
        let editReplied = null;

        const mockInteraction = {
            guild: {
                id: 'guild_123',
                members: { me: { permissions: { has: () => true } } },
            },
            member: { permissions: { has: () => true } },
            user: { id: 'mod_1' },
            channel: {
                messages: {
                    fetch: async () => new Map([['m1', { author: { id: 'user1' } }], ['m2', { author: { id: 'user2' } }]]),
                },
                bulkDelete: async (msgs) => {
                    bulkDeleteCalled = true;
                    return msgs;
                },
            },
            options: {
                getSubcommand: () => 'clear',
                getInteger: () => 5,
                getUser: () => null,
                getString: () => null,
            },
            deferReply: async () => {},
            editReply: async (p) => { editReplied = p; },
        };

        await moderacaoCmd.execute(mockInteraction);
        assert.strictEqual(bulkDeleteCalled, true);
        assert.ok(editReplied.content.includes('2'));
    });
});
