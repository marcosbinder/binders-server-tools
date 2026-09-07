/**
 * @file botinfo.js
 * @description Standalone slash command /botinfo displaying rich bot profile and statistics
 */

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const tosCheck = require('../utils/tosCheck.js');
const createEmbed = require('../utils/createEmbed.js');
const getLanguage = require('../utils/getLanguage.js');
const emojis = require('../config/emojis.js');
const urls = require('../config/urls.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('Mostra informações detalhadas e estatísticas sobre o Binder.')
        .setDescriptionLocalizations({
            'en-US': 'Displays detailed information and statistics about Binder.',
            'pt-BR': 'Mostra informações detalhadas e estatísticas sobre o Binder.',
        })
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .setDMPermission(true),

    async execute(interaction, client) {
        const canProceed = await tosCheck(interaction);
        if (!canProceed) return;

        const lang = getLanguage(interaction);
        const isPtBr = lang === 'pt_BR';

        const serverCount = client?.guilds?.cache?.size ?? 0;
        const guildsArr = Array.from(client?.guilds?.cache?.values() || []);
        const userCount = guildsArr.reduce((acc, guild) => acc + (guild.memberCount || 0), 0);
        const wsPing = client?.ws?.ping ?? 0;

        const uptimeSeconds = Math.floor(process.uptime());
        const days = Math.floor(uptimeSeconds / 86400);
        const hours = Math.floor((uptimeSeconds % 86400) / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const seconds = uptimeSeconds % 60;
        const uptimeStr = `${days}d ${hours}h ${minutes}m ${seconds}s`;

        const memUsedMb = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);

        const fields = [
            {
                name: isPtBr ? '🤖 Identidade' : '🤖 Identity',
                value: `**Nome:** Binder's Server Tools\n**ID:** \`${client?.user?.id || '1310336375261892608'}\`\n**Desenvolvedor:** Marcos (\`659214571634032667\`)`,
                inline: true,
            },
            {
                name: isPtBr ? '📊 Estatísticas' : '📊 Statistics',
                value: `**${isPtBr ? 'Servidores' : 'Servers'}:** ${serverCount.toLocaleString('pt-BR')}\n**${isPtBr ? 'Usuários' : 'Users'}:** ${userCount.toLocaleString('pt-BR')}\n**Ping:** \`${wsPing}ms\``,
                inline: true,
            },
            {
                name: isPtBr ? '⚙️ Sistema & Recursos' : '⚙️ System & Tech',
                value: `**Discord.js:** \`v14.15.3\`\n**Node.js:** \`${process.version}\`\n**RAM:** \`${memUsedMb} MB\`\n**Uptime:** \`${uptimeStr}\``,
                inline: false,
            },
            {
                name: isPtBr ? '💖 Créditos' : '💖 Credits',
                value: isPtBr
                    ? '• **Marcos**: Criador, Desenvolvedor Principal e Proprietário.\n• **Vitória**: Artista e Apoiadora.'
                    : '• **Marcos**: Creator, Lead Developer, and Owner.\n• **Vitória**: Artist and Supporter.',
                inline: false,
            },
        ];

        const embed = await createEmbed(interaction, {
            title: isPtBr ? `${emojis.bot} Informações do Binder` : `${emojis.bot} Binder Information`,
            description: isPtBr
                ? `Olá! Sou o **Binder's Server Tools**, bot multifuncional focado em moderação avançada, Components V2, utilidades gamer e segurança.`
                : `Hello! I'm **Binder's Server Tools**, a multipurpose bot focusing on advanced moderation, Components V2, gaming utilities, and server security.`,
            fields,
            color: 0x5865F2,
        });

        const bannerPath = path.join(process.cwd(), 'assets', 'banner.png');
        const files = [];
        if (fs.existsSync(bannerPath)) {
            embed.setImage('attachment://banner.png');
            files.push(bannerPath);
        }

        const navMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`botinfo_nav_${interaction.user.id}`)
                .setPlaceholder(isPtBr ? 'Navegue pelas informações...' : 'Navigate through info...')
                .addOptions([
                    { label: isPtBr ? 'Página Inicial' : 'Home', value: 'page_home', emoji: '🏠', default: true },
                    { label: isPtBr ? 'RG do Bot' : 'Bot Info / ID', value: 'page_credits', emoji: '📜' },
                    { label: isPtBr ? 'Hospedagem' : 'Hosting', value: 'page_host', emoji: '🖥️' },
                    { label: isPtBr ? 'Agradecimentos' : 'Special Thanks', value: 'page_thanks', emoji: '💖' },
                ])
        );

        const clientId = client?.user?.id || process.env.CLIENT_ID || '1310336375261892608';
        const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('show_novidades')
                .setLabel(isPtBr ? 'Novidades' : 'News')
                .setEmoji(emojis.anuncio)
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setLabel(isPtBr ? 'Adicionar o Bot' : 'Add Bot')
                .setEmoji(emojis.mais)
                .setStyle(ButtonStyle.Link)
                .setURL(urls.botInvite(clientId)),
            new ButtonBuilder()
                .setLabel(isPtBr ? 'Suporte' : 'Support')
                .setEmoji(emojis.suporte)
                .setStyle(ButtonStyle.Link)
                .setURL(urls.discordSupport || urls.supportServer),
            new ButtonBuilder()
                .setLabel('Top.gg')
                .setEmoji(emojis.ticket)
                .setStyle(ButtonStyle.Link)
                .setURL(urls.topgg),
            new ButtonBuilder()
                .setLabel('GitHub')
                .setEmoji(emojis.github)
                .setStyle(ButtonStyle.Link)
                .setURL(urls.github)
        );

        const replyPayload = {
            embeds: [embed],
            components: [navMenu, actionRow],
        };
        if (files.length > 0) {
            replyPayload.files = files;
        }

        return interaction.reply(replyPayload);
    },
};
