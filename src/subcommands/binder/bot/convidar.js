/**
 * @file convidar.js
 * @description Subcommand /binder convidar to invite the bot and access official support
 */

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const createEmbed = require('../../../utils/createEmbed.js');
const getLanguage = require('../../../utils/getLanguage.js');
const { urls } = require('../../../config/index.js');
const { getEmoji } = require('../../../config/emojis.js');
const colors = require('../../../config/colors.js');
const safeReply = require('../../../utils/safeReply.js');

module.exports = {
    async execute(interaction, client) {
        const lang = getLanguage(interaction);
        const isPtBr = lang === 'pt_BR';

        const clientId = client?.user?.id || process.env.CLIENT_ID || '1310336375261892608';
        const inviteUrl = urls.botInvite(clientId);
        const supportUrl = urls.discordSupport || urls.supportServer;

        const embed = await createEmbed(interaction, {
            title: isPtBr ? `${getEmoji('carta')} Convide o Binder!` : `${getEmoji('carta')} Invite Binder!`,
            description: isPtBr
                ? `Adicione o **Binder's Server Tools** ao seu servidor ou instale diretamente no seu perfil para usar em qualquer lugar!\n\nSe precisar de ajuda ou tiver sugestões, junte-se ao nosso servidor oficial de suporte.`
                : `Add **Binder's Server Tools** to your server or install directly to your profile to use anywhere!\n\nIf you need help or have suggestions, join our official support server.`,
            color: colors.primary || 0xAEA7BD,
            fields: [
                {
                    name: isPtBr ? `${getEmoji('link')} Links Oficiais` : `${getEmoji('link')} Official Links`,
                    value: isPtBr
                        ? `• [Adicionar ao Servidor](${inviteUrl})\n• [Servidor de Suporte](${supportUrl})\n• [Termos & Privacidade](${urls.tos})`
                        : `• [Add to Server](${inviteUrl})\n• [Support Server](${supportUrl})\n• [Terms & Privacy](${urls.tos})`,
                    inline: false,
                },
            ],
        });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel(isPtBr ? 'Adicionar Bot' : 'Add Bot')
                .setStyle(ButtonStyle.Link)
                .setURL(inviteUrl)
                .setEmoji(getEmoji('mais')),
            new ButtonBuilder()
                .setLabel(isPtBr ? 'Servidor de Suporte' : 'Support Server')
                .setStyle(ButtonStyle.Link)
                .setURL(supportUrl)
                .setEmoji(getEmoji('suporte')),
            new ButtonBuilder()
                .setLabel(isPtBr ? 'Website' : 'Website')
                .setStyle(ButtonStyle.Link)
                .setURL(urls.website)
                .setEmoji(getEmoji('mundo'))
        );

        return safeReply(interaction, {
            embeds: [embed],
            components: [row],
        });
    },
};
