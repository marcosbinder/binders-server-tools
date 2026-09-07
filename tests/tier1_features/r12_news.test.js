const test = require('node:test');
const assert = require('node:assert');
const { updateUser } = require('../../src/database/db.js');
const novidadesCmd = require('../../src/commands/novidades.js');
const novidadesBtn = require('../../src/interactions/buttons/novidades_btn.js');

test("Requirement R12: News & Changelog System", async (t) => {
    updateUser('user_1', { tosVersion: 2 });
    await t.test("R12.1: Novidades command data defines bilingual name and description", () => {
        assert.strictEqual(novidadesCmd.data.name, 'novidades');
        const json = novidadesCmd.data.toJSON();
        assert.strictEqual(json.name_localizations['en-US'], 'news');
    });

    await t.test("R12.2: Novidades execution generates changelog embed with Phase 1 and Phase 2", async () => {
        let repliedPayload = null;
        const mockInteraction = {
            user: { id: 'user_1' },
            locale: 'pt-BR',
            reply: async (p) => { repliedPayload = p; },
        };

        await novidadesCmd.execute(mockInteraction);
        assert.ok(repliedPayload.embeds);
        const fields = repliedPayload.embeds[0].data.fields;
        assert.ok(fields.some(f => f.value.includes('Moderação') || f.value.includes('Moderation')));
        assert.ok(fields.some(f => f.value.includes('Container')));
    });

    await t.test("R12.3: Button handler show_novidades deploys changelog", async () => {
        let repliedPayload = null;
        const mockInteraction = {
            user: { id: 'user_1' },
            locale: 'pt-BR',
            isButton: () => true,
            reply: async (p) => { repliedPayload = p; },
        };

        await novidadesBtn.execute(mockInteraction);
        assert.ok(repliedPayload.embeds);
    });
});
