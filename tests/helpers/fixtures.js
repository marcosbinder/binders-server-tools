// tests/helpers/fixtures.js

/**
 * Standard test fixtures and entity payloads for Binder's Server Tools
 */
const fixtures = {
    users: {
        newUser: {
            userId: '100000000000000001',
            username: 'NovatoUser',
            discriminator: '1234',
            tosVersion: 0,
            language: 'lang_auto',
            lastKnownLocale: 'pt-BR',
            badges: null,
            isDeveloper: 0,
        },
        acceptedUserPtBr: {
            userId: '100000000000000002',
            username: 'PtBrAcceptedUser',
            discriminator: '5678',
            tosVersion: 2,
            language: 'lang_pt_br',
            lastKnownLocale: 'pt-BR',
            badges: 'vip,early_supporter',
            isDeveloper: 0,
        },
        acceptedUserEnUs: {
            userId: '100000000000000003',
            username: 'EnUsAcceptedUser',
            discriminator: '9999',
            tosVersion: 2,
            language: 'lang_en_us',
            lastKnownLocale: 'en-US',
            badges: null,
            isDeveloper: 0,
        },
        outdatedTosUser: {
            userId: '100000000000000004',
            username: 'OutdatedTosUser',
            discriminator: '4321',
            tosVersion: 1,
            language: 'lang_auto',
            lastKnownLocale: 'pt-BR',
            badges: null,
            isDeveloper: 0,
        },
        developerUser: {
            userId: '100000000000000005',
            username: 'DevOwnerUser',
            discriminator: '0001',
            tosVersion: 2,
            language: 'lang_pt_br',
            lastKnownLocale: 'pt-BR',
            badges: 'owner,developer',
            isDeveloper: 1,
        },
    },

    guilds: {
        defaultGuild: {
            guildId: '200000000000000001',
            name: 'Comunidade Principal',
            memberCount: 2500,
            antiraidEnabled: 1,
            welcomeChannelId: '200000000000000010',
            goodbyeChannelId: '200000000000000011',
            prefix: '!',
        },
        minimalGuild: {
            guildId: '200000000000000002',
            name: 'Servidor Minimal',
            memberCount: 5,
            antiraidEnabled: 0,
            welcomeChannelId: null,
            goodbyeChannelId: null,
            prefix: '!',
        },
    },

    messages: {
        textOnly: {
            id: '300000000000000001',
            content: 'Olá a todos! Este é um teste de mensagem normal no canal geral.',
            author: {
                id: '100000000000000002',
                username: 'PtBrAcceptedUser',
                tag: 'PtBrAcceptedUser#5678',
                bot: false,
                displayAvatarURL: () => 'https://cdn.discordapp.com/avatars/100000000000000002/avatar.png',
            },
            createdTimestamp: 1700000000000,
            editedTimestamp: null,
            pinned: false,
            channelId: '200000000000000010',
            channel: { id: '200000000000000010', name: 'geral' },
            attachments: new Map(),
            embeds: [],
            components: [],
            url: 'https://discord.com/channels/200000000000000001/200000000000000010/300000000000000001',
        },
        richWithAttachmentsAndEmbeds: {
            id: '300000000000000002',
            content: 'Confira estes relatórios e capturas de tela anexadas:',
            author: {
                id: '100000000000000005',
                username: 'DevOwnerUser',
                tag: 'DevOwnerUser#0001',
                bot: false,
                displayAvatarURL: () => 'https://cdn.discordapp.com/avatars/100000000000000005/avatar.png',
            },
            createdTimestamp: 1700001000000,
            editedTimestamp: 1700002000000,
            pinned: true,
            channelId: '200000000000000010',
            channel: { id: '200000000000000010', name: 'geral' },
            attachments: new Map([
                ['att_1', { name: 'screenshot.png', size: 102400, url: 'https://cdn.discord.com/att_1.png' }],
                ['att_2', { name: 'log.txt', size: 2048, url: 'https://cdn.discord.com/log.txt' }],
            ]),
            embeds: [{ title: 'Relatório Semanal' }],
            components: [],
            url: 'https://discord.com/channels/200000000000000001/200000000000000010/300000000000000002',
        },
    },

    emojis: {
        custom: {
            verified_app: '<:verified_app_1:1336358365479305366>',
            foguete: '<:foguete:1397390505171615827>',
            estrela: '<:estrela:1397390959137914950>',
            brilho: '<:brilho:1397390670540439624>',
            salvar: '<:salvar:1394090159879753728>',
            confere: '<:confere:1394116085279883274>',
            x_: '<:x_:1394185776807546963>',
            suporte: '<:suporte:1393820810434576434>',
            github: '<:github:1397393764900933774>',
            djs: '<:djs:1397399961259474974>',
        },
        unicodeFallback: {
            verified_app: '🛡️',
            foguete: '🚀',
            estrela: '⭐',
            brilho: '✨',
            salvar: '💾',
            confere: '✅',
            x_: '❌',
            suporte: '💬',
            github: '🐙',
            djs: '🤖',
        },
    },

    colors: {
        primary: 0x5865F2,
        success: 0x57F287,
        warning: 0xFEE75C,
        error: 0xED4245,
        neutral: 0x2B2D31,
    },

    urls: {
        supportServer: 'https://dsc.gg/bindersdc',
        website: 'https://binders.carrd.co/',
        tos: 'https://binders.carrd.co/#politicas',
        privacy: 'https://binders.carrd.co/#politicas',
        github: 'https://github.com/marcaodosbots/binders-server-tools',
        topgg: 'https://top.gg/bot/1310336375261892608/',
    },
};

module.exports = fixtures;
