/**
 * @file serveravatar.js
 * @description Slash command /serveravatar displaying server icon, banner, and splash
 */

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const tosCheck = require('../utils/tosCheck.js');
const createEmbed = require('../utils/createEmbed.js');
const getLanguage = require('../utils/getLanguage.js');
const safeReply = require('../utils/safeReply.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serveravatar')
        .setDescription('Exibe o ícone, banner e splash do servidor atual.')
        .setDescriptionLocalizations({
            'en-US': 'Displays the icon, banner, and splash of the current server.',
            'pt-BR': 'Exibe o ícone, banner e splash do servidor atual.',
        })
        .setIntegrationTypes([0, 1])
        .setContexts([0])
        .setDMPermission(false),

    async execute(interaction, client) {
        const canProceed = await tosCheck(interaction);
        if (!canProceed) return;

        const lang = getLanguage(interaction);
        const isPtBr = lang === 'pt_BR';

        const { guild } = interaction;
        if (!guild) {
            return safeReply(interaction, {
                content: isPtBr
                    ? '❌ Este comando só pode ser utilizado dentro de um servidor.'
                    : '❌ This command can only be used within a server.',
                ephemeral: true,
            });
        }

        const iconUrl = typeof guild.iconURL === 'function' ? guild.iconURL({ size: 1024, forceStatic: false }) : null;
        const bannerUrl = typeof guild.bannerURL === 'function' ? guild.bannerURL({ size: 1024 }) : null;
        const splashUrl = typeof guild.splashURL === 'function' ? guild.splashURL({ size: 1024 }) : null;

        if (!iconUrl && !bannerUrl && !splashUrl) {
            return safeReply(interaction, {
                content: isPtBr
                    ? '❌ Este servidor não possui ícone nem banner configurados.'
                    : '❌ This server has neither an icon nor a banner configured.',
                ephemeral: true,
            });
        }

        const embed = await createEmbed(interaction, {
            title: isPtBr ? `Ícone e Mídia de ${guild.name}` : `Icon & Media for ${guild.name}`,
            description: isPtBr ? 'Confira as imagens de perfil e divulgação do servidor:' : 'Check out the server profile and promotional imagery:',
            color: 0x5865F2,
        });

        if (iconUrl && embed.setThumbnail) {
            embed.setThumbnail(iconUrl);
        }
        if ((bannerUrl || splashUrl) && embed.setImage) {
            embed.setImage(bannerUrl || splashUrl);
        }

        const buttons = [];
        if (iconUrl) {
            buttons.push(
                new ButtonBuilder()
                    .setLabel(isPtBr ? 'Ícone' : 'Icon')
                    .setStyle(ButtonStyle.Link)
                    .setURL(iconUrl)
            );
        }
        if (bannerUrl) {
            buttons.push(
                new ButtonBuilder()
                    .setLabel(isPtBr ? 'Banner' : 'Banner')
                    .setStyle(ButtonStyle.Link)
                    .setURL(bannerUrl)
            );
        }
        if (splashUrl) {
            buttons.push(
                new ButtonBuilder()
                    .setLabel(isPtBr ? 'Splash' : 'Splash')
                    .setStyle(ButtonStyle.Link)
                    .setURL(splashUrl)
            );
        }

        const payload = { embeds: [embed] };
        if (buttons.length > 0) {
            payload.components = [new ActionRowBuilder().addComponents(buttons)];
        }

        return safeReply(interaction, payload);
    },
};
