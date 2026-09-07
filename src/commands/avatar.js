/**
 * @file avatar.js
 * @description Slash command to view and download user and guild member avatars
 */

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const tosCheck = require('../utils/tosCheck.js');
const createEmbed = require('../utils/createEmbed.js');
const getLanguage = require('../utils/getLanguage.js');
const safeReply = require('../utils/safeReply.js');

const colors = require('../config/colors.js');
const emojis = require('../config/emojis.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Exibe o avatar de um usuário em alta resolução.')
        .setDescriptionLocalizations({
            'en-US': 'Displays a user avatar in high resolution.',
            'pt-BR': 'Exibe o avatar de um usuário em alta resolução.',
        })
        .addUserOption(opt =>
            opt
                .setName('usuario')
                .setNameLocalizations({ 'en-US': 'user' })
                .setDescription('Usuário para ver o avatar (padrão: você)')
                .setRequired(false)
        )
        .addBooleanOption(opt =>
            opt
                .setName('servidor')
                .setNameLocalizations({ 'en-US': 'server' })
                .setDescription('Mostrar avatar específico do servidor, se houver.')
                .setRequired(false)
        ),

    async execute(interaction, client) {
        const canProceed = await tosCheck(interaction);
        if (!canProceed) return;

        const targetUser = interaction.options.getUser('usuario') || interaction.options.getUser('user') || interaction.user;
        const preferServer = interaction.options.getBoolean('servidor') || interaction.options.getBoolean('server') || false;
        const lang = getLanguage(interaction);
        const isPtBr = lang === 'pt_BR';

        let avatarUrl = null;
        let memberName = targetUser.username;
        let serverAvatarUrl = null;
        const globalAvatarUrl = targetUser.displayAvatarURL ? targetUser.displayAvatarURL({ size: 2048 }) : null;

        if (preferServer && interaction.guild) {
            const member = await Promise.race([
                interaction.guild.members.fetch(targetUser.id),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Member fetch timeout')), 2500))
            ]).catch(() => null);
            if (member && member.displayAvatarURL) {
                memberName = member.displayName;
                serverAvatarUrl = member.displayAvatarURL({ size: 2048 });
                avatarUrl = serverAvatarUrl;
            }
        }

        if (!avatarUrl && globalAvatarUrl) {
            avatarUrl = globalAvatarUrl;
        }

        const pngUrl = targetUser.displayAvatarURL ? targetUser.displayAvatarURL({ extension: 'png', size: 2048 }) : avatarUrl;
        const jpgUrl = targetUser.displayAvatarURL ? targetUser.displayAvatarURL({ extension: 'jpg', size: 2048 }) : avatarUrl;
        const webpUrl = targetUser.displayAvatarURL ? targetUser.displayAvatarURL({ extension: 'webp', size: 2048 }) : avatarUrl;

        const description = (serverAvatarUrl && serverAvatarUrl !== globalAvatarUrl)
            ? `> ${isPtBr ? `Exibindo o avatar no servidor **${interaction.guild.name}**.` : `Displaying avatar in **${interaction.guild.name}**.`}\n\n-# ${isPtBr ? 'Escolha um formato abaixo para baixar a imagem original.' : 'Select a format below to download the original image.'}`
            : `> ${isPtBr ? `Exibindo o avatar global de **${memberName}**.` : `Displaying global avatar for **${memberName}**.`}\n\n-# ${isPtBr ? 'Escolha um formato abaixo para baixar a imagem original.' : 'Select a format below to download the original image.'}`;

        const embed = await createEmbed(interaction, {
            title: `${emojis.pessoa || '👤'} ${isPtBr ? `Avatar de ${memberName}` : `Avatar for ${memberName}`}`,
            description,
            image: avatarUrl,
            color: colors.primary,
        });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('PNG').setStyle(ButtonStyle.Link).setURL(pngUrl || 'https://discord.com'),
            new ButtonBuilder().setLabel('JPG').setStyle(ButtonStyle.Link).setURL(jpgUrl || 'https://discord.com'),
            new ButtonBuilder().setLabel('WEBP').setStyle(ButtonStyle.Link).setURL(webpUrl || 'https://discord.com')
        );

        if (targetUser.avatar && targetUser.avatar.startsWith('a_') && targetUser.displayAvatarURL) {
            const gifUrl = targetUser.displayAvatarURL({ extension: 'gif', size: 2048 });
            row.addComponents(
                new ButtonBuilder().setLabel('GIF').setStyle(ButtonStyle.Link).setURL(gifUrl)
            );
        }

        return safeReply(interaction, { embeds: [embed], components: [row] });
    },
};
