/**
 * @file helpMenuBuilder.js
 * @description Centralized builder for interactive Components V2 Help Menu
 */

const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const getLanguage = require('./getLanguage.js');
const createEmbed = require('./createEmbed.js');
const { getEmoji } = require('../config/emojis.js');

const categoriesData = {
    home: {
        title: { pt_BR: 'Central de Ajuda • Binder', en_US: 'Help Center • Binder' },
        description: {
            pt_BR: 'Explore as categorias abaixo para ver todos os comandos disponíveis!',
            en_US: 'Explore the categories below to view all available commands!',
        },
        fields: {
            pt_BR: [
                { name: `${getEmoji('configuracao')} Sistema`, value: '`/binder info`, `/binder idioma`, `/ajuda`, `/novidades`', inline: true },
                { name: `${getEmoji('ferramenta1')} Utilidades & Games`, value: '`/musica`, `/reminder`, `/roblox`, `/minecraft`, `/avatar`, `/enquete`', inline: true },
                { name: `${getEmoji('cadeadofechado')} Moderação`, value: '`/moderacao kick`, `ban`, `timeout`, `lock`, `unlock`, `clear`', inline: true },
                { name: `${getEmoji('pasta')} Construtor`, value: '`/containerbuilder` (Discord Components V2 Studio)', inline: true },
                { name: `${getEmoji('balaodefala')} Suporte`, value: '`/feedback`, `/bugreport`', inline: true },
            ],
            en_US: [
                { name: `${getEmoji('configuracao')} System`, value: '`/binder info`, `/binder idioma`, `/ajuda`, `/news`', inline: true },
                { name: `${getEmoji('ferramenta1')} Utilities & Gaming`, value: '`/musica`, `/reminder`, `/roblox`, `/minecraft`, `/avatar`, `/poll`', inline: true },
                { name: `${getEmoji('cadeadofechado')} Moderation`, value: '`/moderation kick`, `ban`, `timeout`, `lock`, `unlock`, `clear`', inline: true },
                { name: `${getEmoji('pasta')} Studio Builder`, value: '`/containerbuilder` (Discord Components V2 Studio)', inline: true },
                { name: `${getEmoji('balaodefala')} Support`, value: '`/feedback`, `/bugreport`', inline: true },
            ],
        },
    },
    sistema: {
        title: { pt_BR: `${getEmoji('configuracao')} Comandos do Sistema`, en_US: `${getEmoji('configuracao')} System Commands` },
        description: {
            pt_BR: 'Configurações e informações centrais do bot.',
            en_US: 'Core bot settings and information.',
        },
        fields: {
            pt_BR: [
                { name: '/binder <subcomando>', value: 'Central do bot: ajuda, botinfo, ping, convidar, feedback, bugreport, novidades, idioma.' },
                { name: '/botinfo', value: 'Estatísticas completas, ping, créditos e identidade do bot.' },
                { name: '/ping', value: 'Latência do gateway WebSocket e tempo de resposta REST da API.' },
                { name: '/convidar', value: 'Links de convite oficial e suporte do bot.' },
                { name: '/novidades', value: 'Exibe o changelog das últimas versões e melhorias.' },
                { name: '/ajuda', value: 'Exibe este menu interativo de comandos.' },
                { name: '/developers <eval|adicionar|remover|stats>', value: 'Comandos restritos à equipe de desenvolvedores.' },
            ],
            en_US: [
                { name: '/binder <subcommand>', value: 'Bot central: help, botinfo, ping, invite, feedback, bugreport, news, language.' },
                { name: '/botinfo', value: 'Complete bot statistics, ping, credits, and tech info.' },
                { name: '/ping', value: 'WebSocket gateway latency and REST API roundtrip time.' },
                { name: '/convidar', value: 'Official bot invite and support links.' },
                { name: '/news', value: 'Displays recent version changelogs and updates.' },
                { name: '/ajuda', value: 'Displays this interactive help menu.' },
                { name: '/developers <eval|add|remove|stats>', value: 'Restricted commands for developer team.' },
            ],
        },
    },
    utilidades: {
        title: { pt_BR: `${getEmoji('ferramenta1')} Utilidades & Gaming`, en_US: `${getEmoji('ferramenta1')} Utilities & Gaming` },
        description: {
            pt_BR: 'Ferramentas do dia a dia, perfis, servidores, lembretes e jogos.',
            en_US: 'Day-to-day tools, profiles, servers, reminders, and gaming lookups.',
        },
        fields: {
            pt_BR: [
                { name: '/user <info|avatar>', value: 'Perfil completo, badges, cargos, booster, banner e avatares.' },
                { name: '/server <info|avatar>', value: 'Informações detalhadas do servidor, canais, cargos, estatísticas e mídia.' },
                { name: '/coinflip', value: 'Gira uma moeda para tirar Cara ou Coroa.' },
                { name: '/reminder <criar|listar|cancelar>', value: 'Agendamento de lembretes persistentes.' },
                { name: '/musica <busca>', value: 'Consulta metadados e prévia de áudio.' },
                { name: '/roblox <usuario|jogo>', value: 'Busca de perfis e jogos do Roblox.' },
                { name: '/minecraft <jogador|servidor>', value: 'Consulta skins e status de servidores Java/Bedrock.' },
                { name: '/avatar [usuario]', value: 'Exibe avatares em alta resolução para download.' },
                { name: '/enquete <pergunta> <opções>', value: 'Criação de enquetes interativas.' },
                { name: 'User Info (Botão Direito)', value: 'Perfil completo, cargos, booster e badges.' },
                { name: 'Message Info (Botão Direito)', value: 'Detalhes, autor e anexos da mensagem.' },
            ],
            en_US: [
                { name: '/user <info|avatar>', value: 'Full user profile, badges, roles, booster, banner, and avatars.' },
                { name: '/server <info|avatar>', value: 'Detailed server statistics, channels, roles, and media.' },
                { name: '/coinflip', value: 'Flips a coin to get Heads or Tails.' },
                { name: '/reminder <create|list|cancel>', value: 'Persistent scheduled reminders.' },
                { name: '/musica <query>', value: 'Song metadata and 30s audio preview.' },
                { name: '/roblox <user|game>', value: 'Roblox user profile, avatar, or game search.' },
                { name: '/minecraft <player|server>', value: 'Player skins and Java/Bedrock server status.' },
                { name: '/avatar [user]', value: 'High-res avatars with direct download links.' },
                { name: '/poll <question> <options>', value: 'Interactive poll creator.' },
                { name: 'User Info (Right Click)', value: 'Member profile, roles, booster and badges.' },
                { name: 'Message Info (Right Click)', value: 'Message details, author and attachments.' },
            ],
        },
    },
    moderacao: {
        title: { pt_BR: `${getEmoji('cadeadofechado')} Comandos de Moderação`, en_US: `${getEmoji('cadeadofechado')} Moderation Commands` },
        description: {
            pt_BR: 'Ferramentas de proteção, punição e controle de servidor.',
            en_US: 'Server protection, sanctioning, and channel management tools.',
        },
        fields: {
            pt_BR: [
                { name: '/moderacao kick <usuario> [motivo]', value: 'Expulsa um membro do servidor.' },
                { name: '/moderacao ban <usuario> [motivo]', value: 'Bane um membro com limpeza de mensagens.' },
                { name: '/moderacao timeout <usuario> <tempo>', value: 'Aplica castigo/silenciamento temporário.' },
                { name: '/moderacao lock [canal]', value: 'Tranca o canal para envio de mensagens.' },
                { name: '/moderacao unlock [canal]', value: 'Destranca o canal previamente bloqueado.' },
                { name: '/moderacao clear <quantidade>', value: 'Limpa mensagens em massa com filtro opcional.' },
            ],
            en_US: [
                { name: '/moderation kick <user> [reason]', value: 'Kicks a member from the server.' },
                { name: '/moderation ban <user> [reason]', value: 'Bans a member with message purge.' },
                { name: '/moderation timeout <user> <time>', value: 'Times out a member temporarily.' },
                { name: '/moderation lock [channel]', value: 'Locks a channel to prevent standard messages.' },
                { name: '/moderation unlock [channel]', value: 'Unlocks a previously locked channel.' },
                { name: '/moderation clear <amount>', value: 'Purges messages in bulk with optional user filter.' },
            ],
        },
    },
    builder: {
        title: { pt_BR: `${getEmoji('pasta')} Construtor de Contêineres`, en_US: `${getEmoji('pasta')} Container Studio Builder` },
        description: {
            pt_BR: 'Estúdio visual para criação de layouts Discord Components V2.',
            en_US: 'Visual studio for designing Discord Components V2 layouts.',
        },
        fields: {
            pt_BR: [
                { name: '/containerbuilder', value: 'Abre o estúdio interativo com suporte a Título, Texto, Cores, Mídia, Thumb, Autor, Rodapé, Botões, Undo e Envio para Canais.' },
            ],
            en_US: [
                { name: '/containerbuilder', value: 'Opens visual studio supporting Titles, Texts, Colors, Media, Thumbs, Authors, Footers, Buttons, Undo, and Channel Publishing.' },
            ],
        },
    },
    seguranca: {
        title: { pt_BR: `${getEmoji('balaodefala')} Suporte e Feedback`, en_US: `${getEmoji('balaodefala')} Support & Feedback` },
        description: {
            pt_BR: 'Envie sugestões ou reporte erros para a equipe.',
            en_US: 'Send suggestions or report bugs to the team.',
        },
        fields: {
            pt_BR: [
                { name: '/feedback <mensagem>', value: 'Envia sugestões de melhoria para a equipe.' },
                { name: '/bugreport <erro>', value: 'Reporta falhas e erros encontrados.' },
            ],
            en_US: [
                { name: '/feedback <message>', value: 'Submit feature suggestions to the staff.' },
                { name: '/bugreport <error>', value: 'Report bugs and defects directly.' },
            ],
        },
    },
};

/**
 * Builds the help menu embed and select menu components
 * @param {Object} interaction - Discord interaction object
 * @param {string} selectedCategory - Selected category key
 * @returns {Promise<{ embeds: Array, components: Array }>}
 */
async function buildHelpPayload(interaction, selectedCategory = 'home') {
    const lang = getLanguage(interaction);
    const userId = interaction.user ? interaction.user.id : (interaction.userId || 'unknown');
    const catData = categoriesData[selectedCategory] || categoriesData.home;

    const isPtBr = lang === 'pt_BR';
    const title = (catData.title && (catData.title[lang] || catData.title.pt_BR)) || 'Central de Ajuda • Binder';
    const description = (catData.description && (catData.description[lang] || catData.description.pt_BR)) || '';
    const fields = (catData.fields && (catData.fields[lang] || catData.fields.pt_BR)) || [];

    const embed = await createEmbed(interaction, {
        title,
        description,
        fields,
    });

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`help_nav_${userId}`)
        .setPlaceholder(isPtBr ? 'Escolha uma categoria...' : 'Choose a category...')
        .addOptions([
            { label: isPtBr ? 'Início' : 'Home', value: 'home', emoji: { id: '1397393887068160030', name: 'casa' }, default: selectedCategory === 'home' },
            { label: isPtBr ? 'Sistema' : 'System', value: 'sistema', emoji: { id: '1397393671791312906', name: 'vscode' }, default: selectedCategory === 'sistema' },
            { label: isPtBr ? 'Utilidades & Games' : 'Utilities & Gaming', value: 'utilidades', emoji: { id: '1397391857905827981', name: 'ferramenta1' }, default: selectedCategory === 'utilidades' },
            { label: isPtBr ? 'Moderação' : 'Moderation', value: 'moderacao', emoji: { id: '1394186596160503920', name: 'cadeadofechado' }, default: selectedCategory === 'moderacao' },
            { label: isPtBr ? 'Construtor V2' : 'Studio Builder', value: 'builder', emoji: { id: '1394142646271738018', name: 'pasta' }, default: selectedCategory === 'builder' },
            { label: isPtBr ? 'Suporte & Feedback' : 'Support & Feedback', value: 'seguranca', emoji: { id: '1393820810434576434', name: 'suporte' }, default: selectedCategory === 'seguranca' },
        ]);

    const colors = require('../config/colors.js');
    const {
        createContainer,
        createTextDisplay,
        createSeparator,
        IS_COMPONENTS_V2,
    } = require('./componentsV2.js');

    const containerComponents = [
        createTextDisplay(`## ${title}`),
    ];
    if (description) {
        containerComponents.push(createTextDisplay(description));
    }
    if (fields.length > 0) {
        containerComponents.push(createSeparator(true, 1));
        const fieldLines = fields.map(f => `**${f.name}**\n${f.value}`);
        containerComponents.push(createTextDisplay(fieldLines.join('\n\n')));
    }
    containerComponents.push(createSeparator(true, 1));
    containerComponents.push(
        createTextDisplay(isPtBr 
            ? '-# 📖 Binder\'s Server Tools • Central de Ajuda Oficial' 
            : '-# 📖 Binder\'s Server Tools • Official Help Center')
    );

    const helpContainer = createContainer({
        accentColor: colors.primary || 0xAEA7BD,
        components: containerComponents,
    });

    const row = new ActionRowBuilder().addComponents(selectMenu);

    return {
        embeds: [embed],
        components: [row],
    };
}

module.exports = {
    categoriesData,
    buildHelpPayload,
};
