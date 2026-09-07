const test = require('node:test');
const assert = require('node:assert');
const { updateUser } = require('../../src/database/db.js');
const robloxCmd = require('../../src/commands/roblox.js');
const minecraftCmd = require('../../src/commands/minecraft.js');
const avatarCmd = require('../../src/commands/avatar.js');
const enqueteCmd = require('../../src/commands/enquete.js');

test("Requirement R11: Gaming & Utilities", async (t) => {
    updateUser('user_avatar_1', { tosVersion: 2 });
    updateUser('user_1', { tosVersion: 2 });
    await t.test("R11.1: Roblox command data has required options", () => {
        assert.strictEqual(robloxCmd.data.name, 'roblox');
        const opts = robloxCmd.data.toJSON().options;
        assert.ok(opts.some(o => o.name === 'usuario'));
    });

    await t.test("R11.2: Minecraft command data has jogador and servidor subcommands", () => {
        assert.strictEqual(minecraftCmd.data.name, 'minecraft');
        const subs = minecraftCmd.data.toJSON().options.map(o => o.name);
        assert.ok(subs.includes('jogador'));
        assert.ok(subs.includes('servidor'));
    });

    await t.test("R11.3: Avatar command builds download buttons for PNG, JPG, WEBP", async () => {
        let repliedPayload = null;
        const mockUser = {
            id: 'user_avatar_1',
            username: 'TestUser',
            displayAvatarURL: (opts) => 'https://cdn.discordapp.com/avatars/' + (opts?.extension || 'png'),
        };

        const mockInteraction = {
            user: mockUser,
            options: {
                getUser: () => null,
                getBoolean: () => false,
            },
            reply: async (p) => { repliedPayload = p; },
        };

        await avatarCmd.execute(mockInteraction);
        assert.ok(repliedPayload.embeds);
        assert.ok(repliedPayload.components);
        const btns = repliedPayload.components[0].components;
        assert.ok(btns.some(b => (b.data?.label || b.label) === 'PNG'));
        assert.ok(btns.some(b => (b.data?.label || b.label) === 'JPG'));
    });

    await t.test("R11.4: Enquete command packages poll or embed fallback", async () => {
        let repliedPayload = null;
        const mockInteraction = {
            guild: { id: 'guild_1' },
            user: { id: 'user_1' },
            options: {
                getString: (key) => {
                    if (key === 'pergunta') return 'Qual seu prato favorito?';
                    if (key === 'opcao1') return 'Pizza';
                    if (key === 'opcao2') return 'Lasanha';
                    return null;
                },
                getInteger: () => 24,
                getBoolean: () => false,
            },
            reply: async (p) => { repliedPayload = p; },
        };

        await enqueteCmd.execute(mockInteraction);
        assert.ok(repliedPayload.poll || repliedPayload.embeds);
    });
});
