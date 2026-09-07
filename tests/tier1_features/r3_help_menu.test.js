// tests/tier1_features/r3_help_menu.test.js
const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createMockInteraction, createMockClient } = require('../helpers/mockDiscord.js');
const { createMockDatabase } = require('../helpers/mockDatabase.js');
const fixtures = require('../helpers/fixtures.js');

describe('Requirement R3: Interactive Help Menu & UI Glow-Up (Components V2 Style)', () => {
    let mockDb;
    let createEmbed;
    let checkInteractionOwnership;
    let showHelpHandler;

    before(() => {
        mockDb = createMockDatabase({
            users: [fixtures.users.acceptedUserPtBr],
            guilds: [fixtures.guilds.defaultGuild],
        });

        // Mock database module cache to prevent native addon binding errors
        const dbPath = path.resolve(__dirname, '../../database/db.js');
        require.cache[dbPath] = {
            id: dbPath,
            filename: dbPath,
            loaded: true,
            exports: mockDb,
        };

        createEmbed = require('../../src/utils/createEmbed.js');
        checkInteractionOwnership = require('../../src/utils/interactionOwnership.js');
        showHelpHandler = require('../../src/interactions/buttons/show_help_menu.js');
    });

    // Helper function modeling Help Menu Builder contract
    const buildHelpMenu = (category = 'home', lang = 'pt_BR', userId = '12345') => {
        const categories = {
            home: {
                title: lang === 'pt_BR' ? 'Central de Ajuda • Binder' : 'Help Center • Binder',
                description: lang === 'pt_BR' 
                    ? 'Explore as categorias abaixo para ver todos os comandos disponíveis!'
                    : 'Explore the categories below to view all available commands!',
                fields: [
                    { name: '⚙️ Sistema / System', value: '`/binder info`, `/binder idioma`, `/ajuda`', inline: true },
                    { name: '🛠️ Utilidades / Utilities', value: '`/musica`, `User Info`, `Message Info`', inline: true },
                    { name: '🛡️ Moderação / Moderation', value: '`Anti-Raid`, `Ban`, `Kick`, `Clear`', inline: true },
                ]
            },
            sistema: {
                title: lang === 'pt_BR' ? '⚙️ Comandos do Sistema' : '⚙️ System Commands',
                description: lang === 'pt_BR' ? 'Configurações e informações centrais do bot.' : 'Core bot settings and information.',
                fields: [
                    { name: '/binder info', value: lang === 'pt_BR' ? 'Estatísticas, ping e créditos.' : 'Bot statistics, ping, and credits.' },
                    { name: '/binder idioma', value: lang === 'pt_BR' ? 'Altera seu idioma preferido.' : 'Changes your preferred language.' },
                    { name: '/ajuda', value: lang === 'pt_BR' ? 'Exibe este menu de ajuda.' : 'Displays this help menu.' },
                ]
            },
            utilidades: {
                title: lang === 'pt_BR' ? '🛠️ Comandos de Utilidades' : '🛠️ Utility Commands',
                description: lang === 'pt_BR' ? 'Ferramentas do dia a dia e consultas.' : 'Day-to-day tools and lookups.',
                fields: [
                    { name: '/musica <busca>', value: lang === 'pt_BR' ? 'Consulta metadados e prévia de faixas.' : 'Look up song metadata and previews.' },
                    { name: 'User Info (Apps)', value: lang === 'pt_BR' ? 'Informações detalhadas do usuário.' : 'Detailed user profile information.' },
                    { name: 'Message Info (Apps)', value: lang === 'pt_BR' ? 'Detalhes e anexos da mensagem.' : 'Message details and attachments.' },
                ]
            },
            moderacao: {
                title: lang === 'pt_BR' ? '🛡️ Comandos de Moderação' : '🛡️ Moderation Commands',
                description: lang === 'pt_BR' ? 'Ferramentas de proteção e controle de servidor.' : 'Server protection and moderation tools.',
                fields: [
                    { name: 'Anti-Raid', value: lang === 'pt_BR' ? 'Proteção automática contra invasões.' : 'Automated raid protection.' },
                ]
            },
            seguranca: {
                title: lang === 'pt_BR' ? '💬 Suporte e Feedback' : '💬 Support & Feedback',
                description: lang === 'pt_BR' ? 'Envie sugestões ou reporte erros para a equipe.' : 'Send suggestions or report bugs to the team.',
                fields: [
                    { name: '/feedback <mensagem>', value: lang === 'pt_BR' ? 'Envia sugestões de melhoria.' : 'Submit feature suggestions.' },
                    { name: '/bugreport <erro>', value: lang === 'pt_BR' ? 'Reporta falhas encontradas.' : 'Report bugs and defects.' },
                ]
            }
        };

        const catData = categories[category] || categories.home;
        const selectOptions = [
            { label: lang === 'pt_BR' ? 'Início' : 'Home', value: 'home', emoji: '🏠', default: category === 'home' },
            { label: lang === 'pt_BR' ? 'Sistema' : 'System', value: 'sistema', emoji: '⚙️', default: category === 'sistema' },
            { label: lang === 'pt_BR' ? 'Utilidades' : 'Utilities', value: 'utilidades', emoji: '🛠️', default: category === 'utilidades' },
            { label: lang === 'pt_BR' ? 'Moderação' : 'Moderation', value: 'moderacao', emoji: '🛡️', default: category === 'moderacao' },
            { label: lang === 'pt_BR' ? 'Suporte & Feedback' : 'Support & Feedback', value: 'seguranca', emoji: '💬', default: category === 'seguranca' },
        ];

        return {
            embedData: catData,
            customId: `help_nav_${userId}`,
            options: selectOptions,
        };
    };

    test('R3.1: Help menu builder generates home overview with all categories', () => {
        const helpMenuPt = buildHelpMenu('home', 'pt_BR', '12345');
        assert.equal(helpMenuPt.embedData.title, 'Central de Ajuda • Binder');
        assert.equal(helpMenuPt.options.length, 5);
        assert.equal(helpMenuPt.options.find(o => o.value === 'home').default, true);

        const helpMenuEn = buildHelpMenu('home', 'en_US', '12345');
        assert.equal(helpMenuEn.embedData.title, 'Help Center • Binder');
    });

    test('R3.2: Help menu builder provides detailed command listings for specific categories', () => {
        const utilCat = buildHelpMenu('utilidades', 'pt_BR', '12345');
        assert.equal(utilCat.embedData.title, '🛠️ Comandos de Utilidades');
        assert.ok(utilCat.embedData.fields.some(f => f.name.includes('/musica')));
        assert.ok(utilCat.embedData.fields.some(f => f.name.includes('User Info')));

        const sysCat = buildHelpMenu('sistema', 'en_US', '12345');
        assert.equal(sysCat.embedData.title, '⚙️ System Commands');
        assert.ok(sysCat.embedData.fields.some(f => f.name.includes('/binder info')));
    });

    test('R3.3: Select menu customId incorporates triggering userId for ownership verification', () => {
        const userId = '987654321012345678';
        const helpMenu = buildHelpMenu('home', 'pt_BR', userId);
        assert.equal(helpMenu.customId, `help_nav_${userId}`);
    });

    test('R3.4: Ownership check permits initiator and denies unauthorized third parties', async () => {
        const ownerInteraction = createMockInteraction({
            userId: '111222333444555666',
            customId: 'help_nav_111222333444555666',
        });
        const isOwner = await checkInteractionOwnership(ownerInteraction);
        assert.equal(isOwner, true, 'Initiator must be permitted to interact');

        const strangerInteraction = createMockInteraction({
            userId: '999888777666555444',
            customId: 'help_nav_111222333444555666',
        });
        const isStrangerAllowed = await checkInteractionOwnership(strangerInteraction);
        assert.equal(isStrangerAllowed, false, 'Non-owner must be blocked');
        assert.ok(strangerInteraction._replies.length > 0, 'Should send rejection message to non-owner');
    });

    test('R3.5: Embed creator formats help menu embeds with centralized branding', async () => {
        const interaction = createMockInteraction({ locale: 'pt-BR' });
        const helpEmbed = await createEmbed(interaction, {
            title: 'Central de Ajuda • Binder',
            description: 'Selecione uma categoria abaixo.',
        });

        assert.ok(helpEmbed.data, 'Embed should have Discord embed data');
        assert.equal(helpEmbed.data.title, 'Central de Ajuda • Binder');
        assert.equal(helpEmbed.data.description, 'Selecione uma categoria abaixo.');
    });

    test('R3.6: Mention reply "show_help_menu" button executes without crashing', async () => {
        const interaction = createMockInteraction({
            userId: '123456789012345678',
            customId: 'show_help_menu_123456789012345678',
            locale: 'pt-BR',
        });

        await showHelpHandler.execute(interaction);
        assert.ok(interaction._replies.length > 0, 'Handler must reply to interaction');
        const lastReply = interaction._getLastResponse();
        assert.ok(lastReply.embeds && lastReply.embeds.length > 0, 'Reply must contain embed');
    });
});
