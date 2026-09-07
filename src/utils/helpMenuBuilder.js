/**
 * @file helpMenuBuilder.js
 * @description Centralized builder for interactive Components V2 Help Menu
 */

const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const getLanguage = require('./getLanguage.js');
const createEmbed = require('./createEmbed.js');

const categoriesData = {
    home: {
        title: { pt_BR: 'Central de Ajuda • Binder', en_US: 'Help Center • Binder' },
        description: {
            pt_BR: 'Explore as categorias abaixo para ver todos os comandos disponíveis!',
            en_US: 'Explore the categories below to view all available commands!',
        },
        fields: {
            pt_BR: [
                { name: '⚙️ Sistema', value: '`/binder info`, `/binder idioma`, `/ajuda`, `/novidades`', inline: true },
                { name: '🛠️ Utilidades & Games', value: '`/musica`, `/reminder`, `/roblox`, `/minecraft`, `/avatar`, `/enquete`', inline: true },
                { name: '🛡️ Moderação', value: '`/moderacao kick`, `ban`, `timeout`, `lock`, `unlock`, `clear`', inline: true },
                { name: '📦 Construtor', value: '`/containerbuilder` (Discord Components V2 Studio)', inline: true },
                { name: '💬 Suporte', value: '`/feedback`, `/bugreport`', inline: true },
            ],
            en_US: [
                { name: '⚙️ System', value: '`/binder info`, `/binder idioma`, `/ajuda`, `/news`', inline: true },
                { name: '🛠️ Utilities & Gaming', value: '`/musica`, `/reminder`, `/roblox`, `/minecraft`, `/avatar`, `/poll`', inline: true },
                { name: '🛡️ Moderation', value: '`/moderation kick`, `ban`, `timeout`, `lock`, `unlock`, `clear`', inline: true },
                { name: '📦 Studio Builder', value: '`/containerbuilder` (Discord Components V2 Studio)', inline: true },
                { name: '💬 Support', value: '`/feedback`, `/bugreport`', inline: true },
            ],
        },
    },
    sistema: {
        title: { pt_BR: '⚙️ Comandos do Sistema', en_US: '⚙️ System Commands' },
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
        title: { pt_BR: '🛠️ Utilidades & Gaming', en_US: '🛠️ Utilities & Gaming' },
        description: {
            pt_BR: 'Ferramentas do dia a dia, perfis, servidores, lembretes e jogos.',
            en_US: 'Day-to-day tools, profiles, servers, reminders, and gaming lookups.',
        },
        fields: {
            pt_BR: [
                { name: '/userinfo [usuario]', value: 'Perfil completo, badges, cargos, booster e banner.' },
                { name: '/serverinfo', value: 'Informações detalhadas do servidor, canais, cargos e estatísticas.' },
                { name: '/useravatar [usuario]', value: 'Visualização e download de avatares com links em alta resolução.' },
                { name: '/serveravatar', value: 'Exibe o ícone, banner e imagem splash do servidor atual.' },
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
                { name: '/userinfo [user]', value: 'Full user profile, badges, roles, booster and banner.' },
                { name: '/serverinfo', value: 'Detailed server statistics, channels, roles, and media.' },
                { name: '/useravatar [user]', value: 'Display and download user global and server avatars.' },
                { name: '/serveravatar', value: 'Display current server icon, banner, and splash media.' },
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
        title: { pt_BR: '🛡️ Comandos de Moderação', en_US: '🛡️ Moderation Commands' },
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
        title: { pt_BR: '📦 Construtor de Contêineres', en_US: '📦 Container Studio Builder' },
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
        title: { pt_BR: '💬 Suporte e Feedback', en_US: '💬 Support & Feedback' },
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
            { label: isPtBr ? 'Início' : 'Home', value: 'home', emoji: '🏠', default: selectedCategory === 'home' },
            { label: isPtBr ? 'Sistema' : 'System', value: 'sistema', emoji: '⚙️', default: selectedCategory === 'sistema' },
            { label: isPtBr ? 'Utilidades & Games' : 'Utilities & Gaming', value: 'utilidades', emoji: '🛠️', default: selectedCategory === 'utilidades' },
            { label: isPtBr ? 'Moderação' : 'Moderation', value: 'moderacao', emoji: '🛡️', default: selectedCategory === 'moderacao' },
            { label: isPtBr ? 'Construtor V2' : 'Studio Builder', value: 'builder', emoji: '📦', default: selectedCategory === 'builder' },
            { label: isPtBr ? 'Suporte & Feedback' : 'Support & Feedback', value: 'seguranca', emoji: '💬', default: selectedCategory === 'seguranca' },
        ]);

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
