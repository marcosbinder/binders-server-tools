const test = require('node:test');
const assert = require('node:assert');
const {
    ContainerStudioSession,
    getOrCreateStudioSession,
    renderContainerFromBlocks,
    buildStudioPayload
} = require('../../src/components/builder/containerBuilder.js');

test("Requirement R9: Container Studio Builder", async (t) => {
    await t.test("R9.1: Empty session renders placeholder container", () => {
        const session = new ContainerStudioSession('9991');
        assert.strictEqual(session.blocks.length, 0);
        const rendered = renderContainerFromBlocks(session.blocks);
        assert.strictEqual(rendered.type, 17);
        assert.ok(rendered.components[0].content.includes('vazio'));
    });

    await t.test("R9.2: Blocks addition, color parsing, and undo stack", () => {
        const session = new ContainerStudioSession('9992');
        session.saveUndo();
        session.blocks.push({ type: 'titulo', val: 'Painel Informativo' });

        session.saveUndo();
        session.blocks.push({ type: 'cor', hex_color: '#FEE75C' });

        session.saveUndo();
        session.blocks.push({ type: 'texto', val: 'Esse é um layout de teste.' });

        assert.strictEqual(session.blocks.length, 3);
        const rendered = renderContainerFromBlocks(session.blocks);
        assert.strictEqual(rendered.accent_color, 0xFEE75C);

        const undoOk = session.undo();
        assert.strictEqual(undoOk, true);
        assert.strictEqual(session.blocks.length, 2);
    });

    await t.test("R9.3: Components V2 studio payload includes selects and buttons", () => {
        const session = getOrCreateStudioSession('8881');
        session.blocks.push({ type: 'separador' });

        const payload = buildStudioPayload(session, null);
        assert.ok(payload.components);
        assert.ok(payload.components.length >= 3);
    });

    await t.test("R9.4: Publishing toggle changes control panel to channel selection", () => {
        const session = getOrCreateStudioSession('8882');
        session.isPublishing = true;
        session.targetChannelId = 'channel_123';

        const payload = buildStudioPayload(session, null);
        assert.ok(payload.components[0].components[0].content.includes('Envio'));
    });
});
