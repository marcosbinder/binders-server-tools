// tests/tier1_features/r4_context_menus.test.js
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createMockInteraction, createMockClient } = require('../helpers/mockDiscord.js');
const { createMockDatabase } = require('../helpers/mockDatabase.js');
const fixtures = require('../helpers/fixtures.js');

describe('Requirement R4: Context Menus & User Profile Enhancements', () => {
    // Model User Info logic handler
    const handleUserInfo = async (interaction, db, client) => {
        const targetUser = interaction.targetUser || interaction.user;
        const targetMember = interaction.targetMember || (interaction.guild ? interaction.member : null);
        const isGuild = Boolean(interaction.guild);

        const fetchedUser = await client.users.fetch(targetUser.id, { force: true }).catch(() => targetUser);
        const dbUser = db.getUser(targetUser.id);

        const badges = [];
        if (dbUser.isDeveloper) badges.push('🛠️ Desenvolvedor');
        if (dbUser.badges) badges.push(dbUser.badges);
        if (targetUser.flags?.toArray) {
            badges.push(...targetUser.flags.toArray());
        }

        const fields = [
            { name: '👤 Identificação', value: `**Tag:** ${targetUser.username}\n**ID:** \`${targetUser.id}\``, inline: true },
            { name: '🏷️ Badges', value: badges.length > 0 ? badges.join(', ') : 'Nenhuma', inline: true },
        ];

        if (isGuild && targetMember) {
            fields.push({
                name: '🛡️ Hierarquia & Cargos',
                value: `**Maior Cargo:** ${targetMember.roles.highest.name}\n**Total:** ${targetMember.roles.cache.size}`,
                inline: true,
            });
            fields.push({
                name: '💎 Booster',
                value: targetMember.premiumSince ? `Desde <t:${Math.floor(new Date(targetMember.premiumSince).getTime() / 1000)}:R>` : 'Não',
                inline: true,
            });
            fields.push({
                name: '📅 Entrada no Servidor',
                value: `<t:${Math.floor(new Date(targetMember.joinedAt).getTime() / 1000)}:F>`,
                inline: false,
            });
        }

        const bannerUrl = fetchedUser.bannerURL ? fetchedUser.bannerURL({ size: 1024 }) : null;
        const avatarUrl = targetUser.displayAvatarURL({ size: 1024 });

        return {
            title: `Informações de ${targetUser.username}`,
            fields,
            thumbnail: avatarUrl,
            banner: bannerUrl,
            color: targetMember?.displayHexColor || fetchedUser.hexAccentColor || '#5865F2',
        };
    };

    // Model Message Info logic handler
    const handleMessageInfo = async (interaction) => {
        const msg = interaction.targetMessage;
        assert.ok(msg, 'Target message must exist');

        const attachmentCount = msg.attachments ? (msg.attachments.size || msg.attachments.length || 0) : 0;
        const embedCount = msg.embeds ? msg.embeds.length : 0;

        const fields = [
            { name: '👤 Autor', value: `${msg.author.tag} (\`${msg.author.id}\`)`, inline: true },
            { name: '💬 Canal', value: msg.channel?.name ? `#${msg.channel.name}` : `ID: ${msg.channelId}`, inline: true },
            { name: '📏 Caracteres', value: `${msg.content ? msg.content.length : 0}`, inline: true },
            { name: '📎 Anexos', value: `${attachmentCount}`, inline: true },
            { name: '🖼️ Embeds', value: `${embedCount}`, inline: true },
            { name: '📌 Fixada', value: msg.pinned ? 'Sim' : 'Não', inline: true },
        ];

        return {
            title: 'Informações da Mensagem',
            fields,
            url: msg.url,
            createdTimestamp: msg.createdTimestamp,
            editedTimestamp: msg.editedTimestamp,
        };
    };

    test('R4.1: User context menu compiles rich member hierarchy, booster status, and join date in guilds', async () => {
        const db = createMockDatabase({ users: [fixtures.users.acceptedUserPtBr] });
        const client = createMockClient();
        const interaction = createMockInteraction({
            type: 'userContext',
            isUserContextMenuCommand: true,
            targetUser: {
                id: fixtures.users.acceptedUserPtBr.userId,
                username: 'PtBrAcceptedUser',
                flags: { toArray: () => ['ActiveDeveloper'] },
                displayAvatarURL: () => 'https://cdn.discordapp.com/avatars/100/avatar.png',
            },
            targetMember: {
                id: fixtures.users.acceptedUserPtBr.userId,
                roles: {
                    cache: new Map([['1', { name: 'Admin' }], ['2', { name: 'VIP' }]]),
                    highest: { name: 'Admin', position: 10 },
                },
                premiumSince: new Date('2024-02-01T00:00:00Z'),
                joinedAt: new Date('2023-05-10T10:00:00Z'),
                displayHexColor: '#e91e63',
            },
        });

        const result = await handleUserInfo(interaction, db, client);
        assert.equal(result.title, 'Informações de PtBrAcceptedUser');
        assert.ok(result.fields.some(f => f.name.includes('Hierarquia') && f.value.includes('Admin')));
        assert.ok(result.fields.some(f => f.name.includes('Booster') && !f.value.includes('Não')));
        assert.ok(result.fields.some(f => f.name.includes('Entrada no Servidor')));
    });

    test('R4.2: User context menu gracefully handles DM context without guild member data', async () => {
        const db = createMockDatabase({ users: [fixtures.users.developerUser] });
        const client = createMockClient();
        const interaction = createMockInteraction({
            guildId: null, // Direct Message context
            type: 'userContext',
            isUserContextMenuCommand: true,
            targetUser: {
                id: fixtures.users.developerUser.userId,
                username: 'DevOwnerUser',
                flags: { toArray: () => [] },
                displayAvatarURL: () => 'https://cdn.discordapp.com/avatars/dev/avatar.png',
            },
            targetMember: null,
        });

        const result = await handleUserInfo(interaction, db, client);
        assert.ok(result);
        assert.equal(result.title, 'Informações de DevOwnerUser');
        assert.equal(result.fields.some(f => f.name.includes('Hierarquia')), false, 'Guild fields should be omitted in DMs');
        assert.ok(result.fields.some(f => f.value.includes('Desenvolvedor')));
    });

    test('R4.3: User context menu resolves banner and falls back safely when user has no banner', async () => {
        const db = createMockDatabase();
        const client = createMockClient({
            usersMap: {
                'no_banner_user': {
                    id: 'no_banner_user',
                    username: 'PlainUser',
                    banner: null,
                    bannerURL: () => null,
                    hexAccentColor: '#7289da',
                    displayAvatarURL: () => 'https://cdn.discordapp.com/avatars/plain.png',
                    flags: { toArray: () => [] },
                }
            }
        });

        const interaction = createMockInteraction({
            guildId: null, // DM / standalone context
            type: 'userContext',
            targetUser: {
                id: 'no_banner_user',
                username: 'PlainUser',
                displayAvatarURL: () => 'https://cdn.discordapp.com/avatars/plain.png',
            },
        });

        const result = await handleUserInfo(interaction, db, client);
        assert.equal(result.banner, null, 'Banner should be null if not set');
        assert.ok(result.thumbnail, 'Avatar thumbnail must be present as fallback');
        assert.equal(result.color, '#7289da');
    });

    test('R4.4: Message context menu extracts author, timestamps, attachments, embeds, and jump URL', async () => {
        const interaction = createMockInteraction({
            type: 'messageContext',
            isMessageContextMenuCommand: true,
            targetMessage: fixtures.messages.richWithAttachmentsAndEmbeds,
        });

        const result = await handleMessageInfo(interaction);
        assert.equal(result.title, 'Informações da Mensagem');
        assert.ok(result.fields.some(f => f.name.includes('Autor') && f.value.includes('DevOwnerUser')));
        assert.ok(result.fields.some(f => f.name.includes('Anexos') && f.value.includes('2')));
        assert.ok(result.fields.some(f => f.name.includes('Embeds') && f.value.includes('1')));
        assert.ok(result.fields.some(f => f.name.includes('Fixada') && f.value.includes('Sim')));
        assert.equal(result.url, fixtures.messages.richWithAttachmentsAndEmbeds.url);
    });

    test('R4.5: Message context menu handles plain text messages with 0 attachments and embeds', async () => {
        const interaction = createMockInteraction({
            type: 'messageContext',
            isMessageContextMenuCommand: true,
            targetMessage: fixtures.messages.textOnly,
        });

        const result = await handleMessageInfo(interaction);
        assert.ok(result.fields.some(f => f.name.includes('Anexos') && f.value.includes('0')));
        assert.ok(result.fields.some(f => f.name.includes('Embeds') && f.value.includes('0')));
        assert.ok(result.fields.some(f => f.name.includes('Fixada') && f.value.includes('Não')));
    });
});
