/**
 * @file useravatar.js
 * @description Slash command /useravatar displaying global and server avatars with download buttons
 */

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const tosCheck = require('../utils/tosCheck.js');
const createEmbed = require('../utils/createEmbed.js');
const getLanguage = require('../utils/getLanguage.js');
const safeReply = require('../utils/safeReply.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('useravatar')
        .setDescription('Exibe o avatar global e do servidor de um usuário.')
        .setDescriptionLocalizations({
            'en-US': 'Displays the global and server avatar of a user.',
            'pt-BR': 'Exibe o avatar global e do servidor de um usuário.',
        })
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .setDMPermission(true)
        .addUserOption(option =>
            option
                .setName('usuario')
                .setNameLocalizations({
                    'en-US': 'user',
                    'pt-BR': 'usuario',
                })
                .setDescription('O usuário para visualizar o avatar.')
                .setDescriptionLocalizations({
                    'en-US': 'The user whose avatar to view.',
                    'pt-BR': 'O usuário para visualizar o avatar.',
                })
                .setRequired(false)
        ),

    async execute(interaction, client) {
        const canProceed = await tosCheck(interaction);
        if (!canProceed) return;

        const lang = getLanguage(interaction);
        const isPtBr = lang === 'pt_BR';

        const targetUser = interaction.options.getUser('usuario') || interaction.options.getUser('user') || interaction.user;
        const targetMember = interaction.guild ? (interaction.options.getMember('usuario') || interaction.options.getMember('user') || interaction.guild.members?.cache?.get(targetUser.id)) : null;

        const globalAvatarUrl = targetUser.displayAvatarURL({ size: 1024, forceStatic: false });
        const serverAvatarUrl = targetMember && typeof targetMember.avatarURL === 'function'
            ? targetMember.avatarURL({ size: 1024, forceStatic: false })
            : null;

        const primaryUrl = serverAvatarUrl || globalAvatarUrl;

        const description = (serverAvatarUrl && serverAvatarUrl !== globalAvatarUrl)
            ? (isPtBr ? `Exibindo o avatar no servidor **${interaction.guild.name}**.` : `Displaying avatar in **${interaction.guild.name}**.`)
            : (isPtBr ? 'Exibindo o avatar global do usuário.' : 'Displaying global user avatar.');

        const embed = await createEmbed(interaction, {
            title: isPtBr ? `Avatar de ${targetUser.username}` : `Avatar of ${targetUser.username}`,
            description,
            color: (targetMember?.displayHexColor && targetMember.displayHexColor !== '#000000') ? targetMember.displayHexColor : 0x5865F2,
            targetUser,
        });

        if (embed.setImage) {
            embed.setImage(primaryUrl);
        }

        const buttons = [
            new ButtonBuilder()
                .setLabel('PNG')
                .setStyle(ButtonStyle.Link)
                .setURL(targetUser.displayAvatarURL({ extension: 'png', size: 2048 })),
            new ButtonBuilder()
                .setLabel('JPG')
                .setStyle(ButtonStyle.Link)
                .setURL(targetUser.displayAvatarURL({ extension: 'jpg', size: 2048 })),
            new ButtonBuilder()
                .setLabel('WEBP')
                .setStyle(ButtonStyle.Link)
                .setURL(targetUser.displayAvatarURL({ extension: 'webp', size: 2048 })),
        ];

        if (serverAvatarUrl && serverAvatarUrl !== globalAvatarUrl) {
            buttons.push(
                new ButtonBuilder()
                    .setLabel(isPtBr ? 'Avatar Global' : 'Global Avatar')
                    .setStyle(ButtonStyle.Link)
                    .setURL(globalAvatarUrl)
            );
        }

        const row = new ActionRowBuilder().addComponents(buttons);

        return safeReply(interaction, {
            embeds: [embed],
            components: [row],
        });
    },
};
