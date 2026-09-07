// tests/tier1_features/r15_components_v2.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const {
    IS_COMPONENTS_V2,
    ComponentType,
    createTextDisplay,
    createSeparator,
    createSection,
    createMediaGallery,
    createContainer,
    createV2Card,
    createV2Payload,
    transformToV2Payload,
    wrapInteractionForV2,
    resolveFlags,
    isMessageV2,
    wrapComponentInteractionUpdate,
} = require('../../src/utils/componentsV2.js');

const {
    renderContainerFromBlocks,
    buildStudioPayload,
    getOrCreateStudioSession,
} = require('../../src/components/builder/containerBuilder.js');

const safeReply = require('../../src/utils/safeReply.js');
const idiomaSubcommand = require('../../src/subcommands/binder/personalizacao/idioma.js');
const { createMockInteraction, createMockClient } = require('../helpers/mockDiscord.js');
const colors = require('../../src/config/colors.js');

test('Requirement R15: Discord Components V2 Architecture', async (t) => {

    await t.test('R15.1: Components V2 constants and official ComponentType mapping', () => {
        assert.equal(IS_COMPONENTS_V2, 32768, 'IS_COMPONENTS_V2 must equal 1 << 15 (32768)');
        assert.equal(ComponentType.ActionRow, 1);
        assert.equal(ComponentType.Button, 2);
        assert.equal(ComponentType.StringSelect, 3);
        assert.equal(ComponentType.TextInput, 4);
        assert.equal(ComponentType.UserSelect, 5);
        assert.equal(ComponentType.RoleSelect, 6);
        assert.equal(ComponentType.MentionableSelect, 7);
        assert.equal(ComponentType.ChannelSelect, 8);
        assert.equal(ComponentType.Section, 9);
        assert.equal(ComponentType.TextDisplay, 10);
        assert.equal(ComponentType.Thumbnail, 11);
        assert.equal(ComponentType.MediaGallery, 12);
        assert.equal(ComponentType.File, 13);
        assert.equal(ComponentType.Separator, 14);
        assert.equal(ComponentType.Container, 17);
        assert.equal(ComponentType.Label, 18);
    });

    await t.test('R15.2: Atomic component builder helpers (TextDisplay, Separator, Section, MediaGallery, Container)', () => {
        // TextDisplay
        const textComp = createTextDisplay('Hello Discord V2');
        assert.equal(textComp.type, 10);
        assert.equal(textComp.content, 'Hello Discord V2');

        const longText = 'A'.repeat(5000);
        const truncatedText = createTextDisplay(longText, 4000);
        assert.equal(truncatedText.content.length, 4000);
        assert.ok(truncatedText.content.endsWith('...'));

        // Separator
        const sep1 = createSeparator(true, 1);
        assert.equal(sep1.type, 14);
        assert.equal(sep1.divider, true);
        assert.equal(sep1.spacing, 1);

        const sep2 = createSeparator(false, 2);
        assert.equal(sep2.type, 14);
        assert.equal(sep2.divider, false);
        assert.equal(sep2.spacing, 2);

        // Section with Thumbnail accessory
        const secWithThumb = createSection('Titulo da secao', 'https://example.com/thumb.png');
        assert.equal(secWithThumb.type, 9);
        assert.equal(secWithThumb.components.length, 1);
        assert.equal(secWithThumb.components[0].type, 10);
        assert.equal(secWithThumb.components[0].content, 'Titulo da secao');
        assert.equal(secWithThumb.accessory.type, 11);
        assert.equal(secWithThumb.accessory.media.url, 'https://example.com/thumb.png');

        // Section clamping to max 3 components
        const secClamped = createSection(['1', '2', '3', '4', '5']);
        assert.equal(secClamped.components.length, 3);

        // MediaGallery with 1 to 10 items
        const gallery = createMediaGallery([
            'https://example.com/img1.png',
            { url: 'https://example.com/img2.png', description: 'Imagem 2' }
        ]);
        assert.equal(gallery.type, 12);
        assert.equal(gallery.items.length, 2);
        assert.equal(gallery.items[0].media.url, 'https://example.com/img1.png');
        assert.equal(gallery.items[1].media.url, 'https://example.com/img2.png');
        assert.equal(gallery.items[1].description, 'Imagem 2');

        // Container
        const container = createContainer({
            accentColor: 0xAEA7BD,
            spoiler: true,
            components: [textComp, sep1]
        });
        assert.equal(container.type, 17);
        assert.equal(container.accent_color, 0xAEA7BD);
        assert.equal(container.spoiler, true);
        assert.equal(container.components.length, 2);
    });

    await t.test('R15.3: High-level createV2Card and createV2Payload constructs complete V2 structures', () => {
        const btn = new ButtonBuilder()
            .setCustomId('test_btn')
            .setLabel('Ação')
            .setStyle(ButtonStyle.Primary);
        const row = new ActionRowBuilder().addComponents(btn);

        const card = createV2Card({
            title: 'Painel Informativo V2',
            description: 'Corpo da mensagem estilizada com Components V2.',
            accentColor: colors.primary || 0xAEA7BD,
            thumbnail: 'https://cdn.discordapp.com/avatars/bot.png',
            author: { name: 'Binder System' },
            fields: [
                { name: 'Campo 1', value: 'Valor 1' },
                { name: 'Campo 2', value: 'Valor 2' }
            ],
            footer: { text: 'Rodapé oficial • Binder' },
            actionRows: [row],
            ephemeral: true,
        });

        assert.equal(card.flags, 32768 | 64, 'Card flags must include IS_COMPONENTS_V2 and Ephemeral');
        assert.equal(card.components.length, 2, 'Must have root container and action row');
        assert.equal(card.components[0].type, 17, 'First root element must be Container (Type 17)');
        assert.equal(card.components[1].type, 1, 'Second root element must be ActionRow (Type 1)');

        const inner = card.components[0].components;
        // Author text
        assert.ok(inner.some(c => c.type === 10 && c.content.includes('Binder System')));
        // Section with thumbnail
        const sec = inner.find(c => c.type === 9);
        assert.ok(sec, 'Must contain a Section (Type 9)');
        assert.equal(sec.accessory.type, 11);
        assert.equal(sec.accessory.media.url, 'https://cdn.discordapp.com/avatars/bot.png');
        // Separators
        assert.ok(inner.some(c => c.type === 14));
        // Footer text
        assert.ok(inner.some(c => c.type === 10 && c.content.includes('Rodapé oficial')));
    });

    await t.test('R15.4: Container Studio Builder emits native Type 12 MediaGallery and Type 9 Section with Thumbnail', () => {
        const blocks = [
            { type: 'titulo', val: 'Demonstração Visual' },
            { type: 'separador' },
            { type: 'imagem', url: 'https://example.com/banner.png' },
            { type: 'thumb', url: 'https://example.com/avatar.png' },
        ];

        const rendered = renderContainerFromBlocks(blocks);
        assert.equal(rendered.type, 17);

        // Verify native Type 12 MediaGallery for imagem
        const mediaGallery = rendered.components.find(c => c.type === 12);
        assert.ok(mediaGallery, 'renderContainerFromBlocks must render Type 12 MediaGallery for imagem blocks');
        assert.equal(mediaGallery.items[0].media.url, 'https://example.com/banner.png');

        // Verify native Type 9 Section with Type 11 Thumbnail accessory for thumb
        const sectionThumb = rendered.components.find(c => c.type === 9);
        assert.ok(sectionThumb, 'renderContainerFromBlocks must render Type 9 Section for thumb blocks');
        assert.equal(sectionThumb.accessory.type, 11);
        assert.equal(sectionThumb.accessory.media.url, 'https://example.com/avatar.png');

        // Verify buildStudioPayload preserves V2 flag (32768)
        const session = getOrCreateStudioSession('test_studio_v2_user');
        session.blocks = blocks;
        const payload = buildStudioPayload(session, null);
        assert.equal((payload.flags & 32768), 32768, 'Studio payload flags must include IS_COMPONENTS_V2 (32768)');
    });

    await t.test('R15.5: /binder idioma executes and emits bilingual Components V2 Container with select menu', async () => {
        const client = createMockClient();
        const interaction = createMockInteraction({
            userId: '112233445566778899',
            commandName: 'binder',
            subcommand: 'idioma',
            locale: 'pt-BR',
        });

        await idiomaSubcommand.execute(interaction, client);

        const res = interaction._getLastResponse();
        assert.ok(res, 'Interaction must have received a response');
        assert.equal((res.flags & 32768), 32768, 'Response flags must include IS_COMPONENTS_V2 (32768)');

        assert.equal(res.components.length, 3, 'Must contain 2 Containers (Type 17) and 1 ActionRow (Type 1)');
        
        // 1. First Container: Portuguese (PT-BR)
        const ptContainer = res.components[0];
        assert.equal(ptContainer.type, 17, 'First component must be Container (Type 17)');
        assert.equal(ptContainer.accent_color, colors.primary || 0xAEA7BD);
        const ptContent = ptContainer.components.map(c => c.content || '').join('\n');
        assert.ok(ptContent.includes('Português (Brasil)'), 'First container must contain Portuguese section');
        assert.ok(ptContainer.components.some(c => c.type === 14), 'Must contain Separators (Type 14)');

        // 2. Second Container: English (EN-US)
        const enContainer = res.components[1];
        assert.equal(enContainer.type, 17, 'Second component must be Container (Type 17)');
        assert.equal(enContainer.accent_color, colors.secondary || 0x898DA5);
        const enContent = enContainer.components.map(c => c.content || '').join('\n');
        assert.ok(enContent.includes('English (US / UK)'), 'Second container must contain English section');
        assert.ok(enContainer.components.some(c => c.type === 14), 'Must contain Separators (Type 14)');

        // 3. ActionRow with Select Menu
        const actionRow = res.components[2];
        assert.equal(actionRow.type, 1);
        const selectMenu = actionRow.components[0];
        assert.ok(selectMenu.custom_id.startsWith('lang_select_'));
        assert.equal(selectMenu.options.length, 3);
    });

    await t.test('R15.6: safeReply bitwise numeric flags support for Components V2', async () => {
        const interaction = createMockInteraction();

        // Fresh interaction with numeric V2 flags and ephemeral: true
        await safeReply(interaction, {
            flags: IS_COMPONENTS_V2,
            components: [{ type: 17, components: [] }]
        }, { ephemeral: true });

        const res = interaction._getLastResponse();
        assert.equal(res.flags, 32768 | MessageFlags.Ephemeral, 'Flags must be bitwise OR of 32768 and Ephemeral (64)');

        // Array format preservation
        const interaction2 = createMockInteraction();
        await safeReply(interaction2, {
            content: 'Mensagem teste',
        }, { ephemeral: true });

        const res2 = interaction2._getLastResponse();
        assert.ok(Array.isArray(res2.flags));
        assert.ok(res2.flags.includes(MessageFlags.Ephemeral));
    });

    await t.test('R15.7: transformToV2Payload sanitizes legacy embeds and content fields to prevent DiscordAPIError 50035', () => {
        // 1. Converting legacy embed payload removes 'embeds' property completely
        const payloadWithEmbed = {
            embeds: [{
                title: 'Título de Teste',
                description: 'Descrição de Teste',
                color: 0x57F287,
            }]
        };
        const transformed = transformToV2Payload(payloadWithEmbed, false);
        const jsonTransformed = JSON.parse(JSON.stringify(transformed));
        assert.equal('embeds' in jsonTransformed, false, 'Must omit embeds from serialized JSON payload for Discord API');
        assert.ok(transformed.embeds && transformed.embeds.length > 0, 'Must preserve non-enumerable embeds reference for test compatibility');
        assert.equal((transformed.flags & IS_COMPONENTS_V2), IS_COMPONENTS_V2, 'Must add IS_COMPONENTS_V2 flag');
        assert.ok(Array.isArray(transformed.components), 'Must produce components array');
        assert.equal(transformed.components[0].type, 17, 'Component must be Container Type 17');

        // 2. Manual payload containing both IS_COMPONENTS_V2 and embeds gets stripped
        const manualPayload = {
            flags: IS_COMPONENTS_V2,
            embeds: [{ title: 'Legacy Embed' }],
            components: [{ type: 17, components: [createTextDisplay('V2')] }]
        };
        const sanitizedManual = transformToV2Payload(manualPayload);
        const jsonManual = JSON.parse(JSON.stringify(sanitizedManual));
        assert.equal('embeds' in jsonManual, false, 'Must omit embeds from serialized JSON payload');
        assert.ok(sanitizedManual.embeds, 'Must preserve non-enumerable embeds reference');
        assert.equal(sanitizedManual.flags, IS_COMPONENTS_V2);

        // 3. Plain text payload converts to container and removes root content from serialized JSON
        const textPayload = { content: 'Mensagem pura' };
        const transformedText = transformToV2Payload(textPayload, true);
        const jsonText = JSON.parse(JSON.stringify(transformedText));
        assert.equal('content' in jsonText, false, 'Must omit content from serialized JSON payload');
        assert.equal(transformedText.content, 'Mensagem pura', 'Must preserve non-enumerable content reference');
        assert.equal((transformedText.flags & 64), 64, 'Must retain ephemeral bit 64');
        assert.equal((transformedText.flags & IS_COMPONENTS_V2), IS_COMPONENTS_V2, 'Must have IS_COMPONENTS_V2');
        assert.equal(transformedText.components[0].type, 17);

        // 4. resolveFlags handles numbers, arrays and bitfields seamlessly
        assert.equal(resolveFlags(0), 32768);
        assert.equal(resolveFlags([MessageFlags.Ephemeral]), 32768 | 64);
        assert.equal(resolveFlags(['Ephemeral'], false), 32768 | 64);
        assert.equal(resolveFlags(64, false), 32768 | 64);
    });

    await t.test('R15.8: Database closeDatabase executes cleanly without assertions', () => {
        const { closeDatabase } = require('../../src/database/db.js');
        assert.doesNotThrow(() => {
            closeDatabase();
        }, 'closeDatabase must execute without throwing errors');
    });

    await t.test('R15.9: isMessageV2 detection and wrapComponentInteractionUpdate prevents DiscordAPIError 50035', async () => {
        // 1. isMessageV2 detection
        assert.equal(isMessageV2(null), false);
        assert.equal(isMessageV2({ flags: 0 }), false);
        assert.equal(isMessageV2({ flags: 32768 }), true);
        assert.equal(isMessageV2({ flags: { bitfield: 32768 } }), true);
        assert.equal(isMessageV2({ flags: { has: (f) => f === 32768 } }), true);
        assert.equal(isMessageV2({ flags: [32768] }), true);

        // 2. wrapComponentInteractionUpdate automatically converts embeds on V2 messages
        let updatedPayload = null;
        const mockInteractionV2 = {
            message: { flags: 32768 },
            update: async (payload) => {
                updatedPayload = payload;
                return payload;
            }
        };

        wrapComponentInteractionUpdate(mockInteractionV2);

        await mockInteractionV2.update({
            embeds: [{ title: 'Título Teste', description: 'Desc Teste' }],
            components: []
        });

        assert.ok(updatedPayload);
        const serialized = JSON.parse(JSON.stringify(updatedPayload));
        assert.equal('embeds' in serialized, false, 'embeds must be omitted from serialized JSON payload');
        assert.equal(updatedPayload.components[0].type, 17, 'Must convert embed to Container (Type 17)');

        // 3. wrapComponentInteractionUpdate retries automatically when Discord throws 50035
        let attemptCount = 0;
        let finalPayloadSent = null;
        const mockInteractionRetry = {
            message: { flags: 0 }, // Appears not V2 initially
            update: async (payload) => {
                attemptCount++;
                if (attemptCount === 1 && payload.embeds) {
                    const discordError = new Error('DiscordAPIError[50035]: Invalid Form Body');
                    discordError.rawError = { message: 'The \'embeds\' field cannot be used when using MessageFlags.IS_COMPONENTS_V2' };
                    throw discordError;
                }
                finalPayloadSent = payload;
                return payload;
            }
        };

        wrapComponentInteractionUpdate(mockInteractionRetry);

        await mockInteractionRetry.update({
            embeds: [{ title: 'Outro Título', description: 'Outra Desc' }],
            components: []
        });

        assert.equal(attemptCount, 2, 'Must retry on 50035 error');
        const serializedRetry = JSON.parse(JSON.stringify(finalPayloadSent));
        assert.equal('embeds' in serializedRetry, false, 'Must convert and omit embeds on retry');
        assert.equal(finalPayloadSent.components[0].type, 17);
    });
});
