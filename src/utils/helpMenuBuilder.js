/**
 * @file helpMenuBuilder.js
 * @description Centralized builder for interactive Components V2 Help Menu
 */

const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, parseEmoji } = require('discord.js');
const getLanguage = require('./getLanguage.js');
const createEmbed = require('./createEmbed.js');
const { getEmoji } = require('../config/emojis.js');
const urls = require('../config/urls.js');

const categoriesData = {
    home: {
        title: { pt_BR: 'Central de Ajuda • Binder', en_US: 'Help Center • Binder' },
        description: {
            pt_BR: `Boas-vindas à central oficial de comandos e recursos do **Binder**!\nAqui você encontra utilitários para gerenciar servidores, minigames, perfis e layouts modernos em **Discord Components V2**.\n\n> ${getEmoji('lampadaacesa')} **Navegação:** Escolha uma categoria no menu seletor abaixo para ver a sintaxe, opções e detalhes de cada comando.`,
            en_US: `Welcome to the official command and feature center for **Binder**!\nHere you'll find utilities for server management, gaming, rich profiles, and modern **Discord Components V2** layouts.\n\n> ${getEmoji('lampadaacesa')} **Navigation:** Choose a category from the select menu below to explore syntax, options, and details for each command.`,
        },
        fields: {
            pt_BR: [
                {
                    name: `${getEmoji('configuracao')} Central do Sistema`,
                    value: `> Preferências pessoais, idioma, status do bot, latência e links oficiais.\n> • \`/binder info\` • \`/binder idioma\` • \`/binder ping\` • \`/binder convidar\` • \`/binder novidades\``,
                    inline: false,
                },
                {
                    name: `${getEmoji('videogame')} Jogos & Minigames`,
                    value: `> Rastreamento de contas, skins, servidores e minigames clássicos.\n> • \`/minecraft jogador|servidor\` • \`/roblox usuario|jogo\` • \`/coinflip\``,
                    inline: false,
                },
                {
                    name: `${getEmoji('ferramenta1')} Utilidades & Mídia`,
                    value: `> Perfis detalhados, agendamentos, músicas, OCR e enquetes interativas.\n> • \`/user info|avatar\` • \`/server info|avatar\` • \`/reminder\` • \`/musica\` • \`/ocr\` • \`/enquete\``,
                    inline: false,
                },
                {
                    name: `${getEmoji('cadeadofechado')} Moderação & Segurança`,
                    value: `> Ferramentas de punição e gestão de canais com proteção de hierarquia.\n> • \`/moderacao kick\` • \`ban\` • \`timeout\` • \`lock\` • \`unlock\` • \`clear\``,
                    inline: false,
                },
                {
                    name: `${getEmoji('pasta')} Construtor Components V2`,
                    value: `> Estúdio visual completo para criar contêineres e mensagens interativas.\n> • \`/containerbuilder\` (Studio Visual com prévia e envio direto)`,
                    inline: false,
                },
                {
                    name: `${getEmoji('balaodefala')} Suporte & Feedback`,
                    value: `> Envie sugestões, reporte falhas diretamente e tire dúvidas.\n> • \`/binder feedback\` • \`/binder bugreport\``,
                    inline: false,
                },
            ],
            en_US: [
                {
                    name: `${getEmoji('configuracao')} System & Core`,
                    value: `> Personal preferences, language, system status, latency, and official links.\n> • \`/binder info\` • \`/binder idioma\` • \`/binder ping\` • \`/binder convidar\` • \`/binder novidades\``,
                    inline: false,
                },
                {
                    name: `${getEmoji('videogame')} Gaming & Minigames`,
                    value: `> Profile lookups, player skins, server monitors, and classic minigames.\n> • \`/minecraft player|server\` • \`/roblox user|game\` • \`/coinflip\``,
                    inline: false,
                },
                {
                    name: `${getEmoji('ferramenta1')} Utilities & Media`,
                    value: `> In-depth profiles, scheduled reminders, music previews, OCR, and polls.\n> • \`/user info|avatar\` • \`/server info|avatar\` • \`/reminder\` • \`/musica\` • \`/ocr\` • \`/enquete\``,
                    inline: false,
                },
                {
                    name: `${getEmoji('cadeadofechado')} Moderation & Security`,
                    value: `> Protection suite enforcing strict role hierarchy safety.\n> • \`/moderation kick\` • \`ban\` • \`timeout\` • \`lock\` • \`unlock\` • \`clear\``,
                    inline: false,
                },
                {
                    name: `${getEmoji('pasta')} Components V2 Studio`,
                    value: `> Complete visual studio to design modern Discord interactive messages.\n> • \`/containerbuilder\` (Interactive builder with live preview)`,
                    inline: false,
                },
                {
                    name: `${getEmoji('balaodefala')} Support & Feedback`,
                    value: `> Share suggestions, report bugs directly, and get official support.\n> • \`/binder feedback\` • \`/binder bugreport\``,
                    inline: false,
                },
            ],
        },
    },
    sistema: {
        title: { pt_BR: `${getEmoji('configuracao')} Comandos do Sistema`, en_US: `${getEmoji('configuracao')} System Commands` },
        description: {
            pt_BR: 'Comandos centrais de configuração, identidade, telemetria e suporte do Binder.',
            en_US: 'Core bot configuration, identity, telemetry, and official support commands.',
        },
        fields: {
            pt_BR: [
                {
                    name: `${getEmoji('informacao')} /binder info`,
                    value: `> Exibe o RG oficial do bot, ambiente de hospedagem, telemetria de RAM e agradecimentos.\n> • **Acesso:** Global • Servidor • User App`,
                },
                {
                    name: `${getEmoji('mundo')} /binder idioma`,
                    value: `> Painel interativo para alterar seu idioma pessoal preferido (Português/Inglês/Automático).\n> • **Acesso:** Global • Configuração Pessoal`,
                },
                {
                    name: `${getEmoji('wifi')} /binder ping`,
                    value: `> Mede a latência do gateway WebSocket em tempo real e o tempo de resposta da API REST.\n> • **Acesso:** Global • Servidor • User App`,
                },
                {
                    name: `${getEmoji('mais')} /binder convidar`,
                    value: `> Links oficiais para adicionar o Binder ao seu servidor ou à sua conta como User App.\n> • **Aliases:** \`/binder invite\``,
                },
                {
                    name: `${getEmoji('anuncio')} /binder novidades`,
                    value: `> Exibe o changelog das últimas versões, melhorias visuais e novos recursos.\n> • **Aliases:** \`/binder news\``,
                },
                {
                    name: `${getEmoji('carta')} /binder ajuda`,
                    value: `> Abre este menu interativo completo de ajuda e documentação de comandos.\n> • **Aliases:** \`/binder help\`, \`/binder commands\`, \`/binder comandos\``,
                },
                {
                    name: `${getEmoji('selodev1')} /developers <subcomando>`,
                    value: `> Comandos restritos à equipe de desenvolvedores autorizados.\n> • **Opções:** \`eval <code>\` • \`adicionar <user>\` • \`remover <user>\` • \`stats\``,
                },
            ],
            en_US: [
                {
                    name: `${getEmoji('informacao')} /binder info`,
                    value: `> Displays official bot ID, hosting environment, live RAM telemetry, and acknowledgements.\n> • **Access:** Global • Server • User App`,
                },
                {
                    name: `${getEmoji('mundo')} /binder idioma`,
                    value: `> Interactive panel to change your personal language preference (Portuguese/English/Auto).\n> • **Access:** Global • Personal Setting`,
                },
                {
                    name: `${getEmoji('wifi')} /binder ping`,
                    value: `> Real-time WebSocket gateway latency and REST API roundtrip response time.\n> • **Access:** Global • Server • User App`,
                },
                {
                    name: `${getEmoji('mais')} /binder convidar`,
                    value: `> Official invite links to add Binder to your server or install as a personal User App.\n> • **Aliases:** \`/binder invite\``,
                },
                {
                    name: `${getEmoji('anuncio')} /binder novidades`,
                    value: `> Displays changelogs of the latest releases, visual updates, and newly added features.\n> • **Aliases:** \`/binder news\``,
                },
                {
                    name: `${getEmoji('carta')} /binder ajuda`,
                    value: `> Opens this interactive help menu and complete command documentation.\n> • **Aliases:** \`/binder help\`, \`/binder commands\`, \`/binder comandos\``,
                },
                {
                    name: `${getEmoji('selodev1')} /developers <subcommand>`,
                    value: `> Restricted operations for authorized bot developers.\n> • **Options:** \`eval <code>\` • \`add <user>\` • \`remove <user>\` • \`stats\``,
                },
            ],
        },
    },
    utilidades: {
        title: { pt_BR: `${getEmoji('ferramenta1')} Utilidades & Games`, en_US: `${getEmoji('ferramenta1')} Utilities & Gaming` },
        description: {
            pt_BR: 'Ferramentas completas para o seu dia a dia, consulta de jogos, lembretes e mídias.',
            en_US: 'Day-to-day utilities, gaming lookups, scheduled reminders, and media extraction.',
        },
        fields: {
            pt_BR: [
                {
                    name: `${getEmoji('pessoa')} /user <info|avatar>`,
                    value: `> Perfil detalhado (badges, cargos, booster, banner) ou download do avatar em alta resolução.\n> • **Opções:** \`info [usuario]\` • \`avatar [usuario]\``,
                },
                {
                    name: `${getEmoji('casa')} /server <info|avatar>`,
                    value: `> Estatísticas detalhadas do servidor (canais, membros, boost) e galeria de ícone, banner e splash.\n> • **Opções:** \`info\` (com divisórias V2) • \`avatar\``,
                },
                {
                    name: `${getEmoji('minecraft')} /minecraft <jogador|servidor>`,
                    value: `> Skins 3D (Java) com NameMC ou Gamertag/XUID (Bedrock), além de status de servidores.\n> • **Opções:** \`jogador <nome> [edicao: java|bedrock]\` • \`servidor <ip> [tipo]\``,
                },
                {
                    name: `${getEmoji('roblox')} /roblox <usuario|jogo>`,
                    value: `> Consulta perfis de jogadores, avatares 3D e experiências detalhadas do Roblox por ID ou link.\n> • **Opções:** \`usuario <nome_ou_url>\` • \`jogo <id_ou_url>\``,
                },
                {
                    name: `${getEmoji('coroa')} /coinflip`,
                    value: `> Gira uma moeda física virtual para tirar Cara ou Coroa com botão interativo para girar novamente.\n> • **Acesso:** Global • DM • User App`,
                },
                {
                    name: `${getEmoji('relogio')} /reminder <criar|listar|cancelar>`,
                    value: `> Agendador de lembretes automáticos persistentes no banco de dados com notificação no canal.\n> • **Exemplo:** \`/reminder criar 10m Estudar química\``,
                },
                {
                    name: `${getEmoji('musica')} /musica <busca>`,
                    value: `> Busca metadados de músicas, capa em alta resolução e prévia de áudio de 30 segundos.\n> • **Opções:** \`<busca>\` (título, artista ou álbum)`,
                },
                {
                    name: `${getEmoji('lupa')} /ocr <imagem>`,
                    value: `> Extrai e transcreve automaticamente qualquer texto contido em uma imagem enviada.\n> • **Opções:** \`<imagem>\` (anexo)`,
                },
                {
                    name: `${getEmoji('anuncio')} /enquete <pergunta> <opções>`,
                    value: `> Cria enquetes interativas com múltiplas opções separadas por vírgula para votação rápida.\n> • **Opções:** \`<pergunta>\` • \`<opções>\``,
                },
                {
                    name: `${getEmoji('mencao')} Menus de Aplicativo (Botão Direito)`,
                    value: `> Clique com botão direito em qualquer membro ou mensagem para ver detalhes instantâneos.\n> • **Apps:** \`Informações do Usuário\` • \`Informações da Mensagem\``,
                },
            ],
            en_US: [
                {
                    name: `${getEmoji('pessoa')} /user <info|avatar>`,
                    value: `> Full member profile (badges, roles, booster, banner) or high-res avatar download.\n> • **Options:** \`info [user]\` • \`avatar [user]\``,
                },
                {
                    name: `${getEmoji('casa')} /server <info|avatar>`,
                    value: `> Detailed server metrics (channels, members, boost) and media gallery (icon, banner, splash).\n> • **Options:** \`info\` (with V2 separators) • \`avatar\``,
                },
                {
                    name: `${getEmoji('minecraft')} /minecraft <player|server>`,
                    value: `> 3D skins (Java) with NameMC or Gamertag/XUID (Bedrock), plus live server status monitors.\n> • **Options:** \`player <name> [edition: java|bedrock]\` • \`server <ip> [type]\``,
                },
                {
                    name: `${getEmoji('roblox')} /roblox <user|game>`,
                    value: `> Detailed Roblox user lookups, 3D avatar headshots, and experience metrics by ID or link.\n> • **Options:** \`user <name_or_url>\` • \`game <id_or_url>\``,
                },
                {
                    name: `${getEmoji('coroa')} /coinflip`,
                    value: `> Flips a virtual coin to get Heads or Tails with an interactive instant reroll button.\n> • **Access:** Global • DM • User App`,
                },
                {
                    name: `${getEmoji('relogio')} /reminder <create|list|cancel>`,
                    value: `> Persistent scheduled reminder manager with database storage and channel notifications.\n> • **Example:** \`/reminder create 10m Study chemistry\``,
                },
                {
                    name: `${getEmoji('musica')} /musica <query>`,
                    value: `> Fetches song metadata, high-resolution album artwork, and 30-second audio stream previews.\n> • **Options:** \`<query>\` (title, artist, or album)`,
                },
                {
                    name: `${getEmoji('lupa')} /ocr <image>`,
                    value: `> Automatically extracts and transcribes all text contained within an uploaded image.\n> • **Options:** \`<image>\` (attachment)`,
                },
                {
                    name: `${getEmoji('anuncio')} /poll <question> <options>`,
                    value: `> Creates interactive community polls supporting multiple comma-separated options.\n> • **Options:** \`<question>\` • \`<options>\``,
                },
                {
                    name: `${getEmoji('mencao')} Context Apps (Right Click)`,
                    value: `> Right-click any member or message to inspect complete details on demand.\n> • **Apps:** \`User Info\` • \`Message Info\``,
                },
            ],
        },
    },
    moderacao: {
        title: { pt_BR: `${getEmoji('cadeadofechado')} Comandos de Moderação`, en_US: `${getEmoji('cadeadofechado')} Moderation Commands` },
        description: {
            pt_BR: 'Ferramentas de proteção e controle com conformidade rigorosa à hierarquia de cargos.',
            en_US: 'Server protection, sanctioning, and channel management tools with role hierarchy enforcement.',
        },
        fields: {
            pt_BR: [
                {
                    name: `${getEmoji('martelo')} /moderacao kick <usuario> [motivo]`,
                    value: `> Expulsa um membro do servidor, registrando o motivo no log de auditoria.`,
                },
                {
                    name: `${getEmoji('martelo')} /moderacao ban <usuario> [motivo] [dias]`,
                    value: `> Bane um membro com opção de expurgar mensagens recentes (0 a 7 dias).`,
                },
                {
                    name: `${getEmoji('tempo')} /moderacao timeout <usuario> <tempo> [motivo]`,
                    value: `> Aplica castigo/silenciamento temporário a um membro.\n> • **Formatos:** \`60s\`, \`10m\`, \`2h\`, \`7d\`.`,
                },
                {
                    name: `${getEmoji('cadeadofechado')} /moderacao lock [canal]`,
                    value: `> Tranca o canal contra envio de mensagens para membros comuns.`,
                },
                {
                    name: `${getEmoji('cadeadoaberto')} /moderacao unlock [canal]`,
                    value: `> Destranca o canal previamente bloqueado, restaurando o envio de mensagens.`,
                },
                {
                    name: `${getEmoji('lixeira')} /moderacao clear <quantidade> [usuario]`,
                    value: `> Limpa mensagens em massa (1 a 100) com filtro opcional por usuário específico.`,
                },
            ],
            en_US: [
                {
                    name: `${getEmoji('martelo')} /moderation kick <user> [reason]`,
                    value: `> Kicks a member from the server with an audit log reason.`,
                },
                {
                    name: `${getEmoji('martelo')} /moderation ban <user> [reason] [days]`,
                    value: `> Bans a member with optional message purge (0 to 7 days).`,
                },
                {
                    name: `${getEmoji('tempo')} /moderation timeout <user> <time> [reason]`,
                    value: `> Temporarily times out a member.\n> • **Formats:** \`60s\`, \`10m\`, \`2h\`, \`7d\`.`,
                },
                {
                    name: `${getEmoji('cadeadofechado')} /moderation lock [channel]`,
                    value: `> Locks a channel to prevent standard members from sending messages.`,
                },
                {
                    name: `${getEmoji('cadeadoaberto')} /moderation unlock [channel]`,
                    value: `> Unlocks a previously locked channel, restoring regular messaging.`,
                },
                {
                    name: `${getEmoji('lixeira')} /moderation clear <amount> [user]`,
                    value: `> Purges messages in bulk (1 to 100) with an optional user filter.`,
                },
            ],
        },
    },
    builder: {
        title: { pt_BR: `${getEmoji('pasta')} Construtor de Contêineres V2`, en_US: `${getEmoji('pasta')} Container Studio Builder` },
        description: {
            pt_BR: 'Estúdio visual interativo para criação e publicação de layouts Discord Components V2.',
            en_US: 'Interactive visual studio for designing and publishing Discord Components V2 layouts.',
        },
        fields: {
            pt_BR: [
                {
                    name: `${getEmoji('ferramenta1')} /containerbuilder`,
                    value: `> Abre a suíte completa de criação de mensagens estruturadas modernas.\n> • **Recursos:**\n>  - Inserção de títulos com thumbnails laterais automáticas\n>  - Textos de descrição e blocos de formatação avançada\n>  - Seletor de cores de destaque (Hexadecimal / Paleta)\n>  - Inserção de imagens e galerias de mídia\n>  - Botões de ação, cabeçalhos de autor e rodapés de mensagem\n>  - Pilha de Desfazer (Undo) e Envio direto para canais de texto`,
                },
            ],
            en_US: [
                {
                    name: `${getEmoji('ferramenta1')} /containerbuilder`,
                    value: `> Opens the visual studio for designing cutting-edge structured Discord messages.\n> • **Features:**\n>  - Titles with automated accessory thumbnails\n>  - Descriptions and rich markdown text displays\n>  - Custom accent colors (Hexadecimal / Palette)\n>  - Image embeds and media galleries\n>  - Action buttons, author headers, and footers\n>  - Undo stack and direct channel publishing`,
                },
            ],
        },
    },
    seguranca: {
        title: { pt_BR: `${getEmoji('balaodefala')} Suporte & Feedback`, en_US: `${getEmoji('balaodefala')} Support & Feedback` },
        description: {
            pt_BR: 'Canais oficiais para envio de ideias, relatório de problemas e contato com a equipe.',
            en_US: 'Official channels to submit suggestions, report defects, and reach the staff.',
        },
        fields: {
            pt_BR: [
                {
                    name: `${getEmoji('carta')} /binder feedback <mensagem>`,
                    value: `> Envia sugestões e ideias diretamente para a equipe de desenvolvimento do Binder.`,
                },
                {
                    name: `${getEmoji('ferramenta1')} /binder bugreport <descricao>`,
                    value: `> Notifica os desenvolvedores sobre falhas, erros ou comportamentos anômalos encontrados.`,
                },
                {
                    name: `${getEmoji('suporte')} Comunidade & Links Oficiais`,
                    value: `> • **Suporte:** [Servidor Oficial do Discord](https://discord.gg/vKzSj224u4)\n> • **Adicionar Bot:** [/binder convidar](https://discord.com)\n> • **Código Aberto:** [Repositório GitHub](https://github.com/marcosbinder/binders-server-tools)`,
                },
            ],
            en_US: [
                {
                    name: `${getEmoji('carta')} /binder feedback <message>`,
                    value: `> Submit feature suggestions and ideas directly to the development team.`,
                },
                {
                    name: `${getEmoji('ferramenta1')} /binder bugreport <description>`,
                    value: `> Report bugs, defects, or unexpected behaviors directly for fast triage.`,
                },
                {
                    name: `${getEmoji('suporte')} Community & Official Links`,
                    value: `> • **Support:** [Official Discord Server](https://discord.gg/vKzSj224u4)\n> • **Add Bot:** [/binder convidar](https://discord.com)\n> • **Source Code:** [GitHub Repository](https://github.com/marcosbinder/binders-server-tools)`,
                },
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
            { label: isPtBr ? 'Início' : 'Home', value: 'home', emoji: parseEmoji(getEmoji('casa')), default: selectedCategory === 'home' },
            { label: isPtBr ? 'Sistema' : 'System', value: 'sistema', emoji: parseEmoji(getEmoji('vscode')), default: selectedCategory === 'sistema' },
            { label: isPtBr ? 'Utilidades & Games' : 'Utilities & Gaming', value: 'utilidades', emoji: parseEmoji(getEmoji('ferramenta1')), default: selectedCategory === 'utilidades' },
            { label: isPtBr ? 'Moderação' : 'Moderation', value: 'moderacao', emoji: parseEmoji(getEmoji('cadeadofechado')), default: selectedCategory === 'moderacao' },
            { label: isPtBr ? 'Construtor V2' : 'Studio Builder', value: 'builder', emoji: parseEmoji(getEmoji('pasta')), default: selectedCategory === 'builder' },
            { label: isPtBr ? 'Suporte & Feedback' : 'Support & Feedback', value: 'seguranca', emoji: parseEmoji(getEmoji('suporte')), default: selectedCategory === 'seguranca' },
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
            ? `-# ${getEmoji('carta')} Binder's Server Tools • Central de Ajuda Oficial` 
            : `-# ${getEmoji('carta')} Binder's Server Tools • Official Help Center`)
    );

    const helpContainer = createContainer({
        accentColor: colors.primary || 0xAEA7BD,
        components: containerComponents,
    });

    embed._v2Container = helpContainer;

    const navRow = new ActionRowBuilder().addComponents(selectMenu);

    const botId = interaction.client?.user?.id || process.env.CLIENT_ID || '1310336375261892608';

    const linksRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel(isPtBr ? 'Servidor de Suporte' : 'Support Server')
            .setStyle(ButtonStyle.Link)
            .setURL(urls.supportServer || urls.discordSupport)
            .setEmoji(parseEmoji(getEmoji('suporte')) || { name: '💬' }),
        new ButtonBuilder()
            .setLabel(isPtBr ? 'Adicionar o Bot' : 'Add Bot')
            .setStyle(ButtonStyle.Link)
            .setURL(urls.botInvite(botId))
            .setEmoji(parseEmoji(getEmoji('mais')) || { name: '➕' }),
        new ButtonBuilder()
            .setLabel('GitHub')
            .setStyle(ButtonStyle.Link)
            .setURL(urls.github)
            .setEmoji(parseEmoji(getEmoji('github')) || { name: '⭐' })
    );

    return {
        embeds: [embed],
        components: [navRow, linksRow],
    };
}

module.exports = {
    categoriesData,
    buildHelpPayload,
};
