/**
 * @file feedback.js
 * @description Subcommand /binder feedback for submitting suggestions
 */

const { MessageFlags } = require('discord.js');
const createEmbed = require('../../../utils/createEmbed.js');
const getLanguage = require('../../../utils/getLanguage.js');
const { submitFeedbackOrBug } = require('../../../utils/feedbackDispatcher.js');
const { getEmoji } = require('../../../config/emojis.js');
const colors = require('../../../config/colors.js');
const safeReply = require('../../../utils/safeReply.js');

module.exports = {
    async execute(interaction, client) {
        const message = interaction.options.getString('mensagem') || interaction.options.getString('message');
        const lang = getLanguage(interaction);
        const isPtBr = lang === 'pt_BR';

        if (typeof interaction.deferReply === 'function' && !interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        }

        const result = await submitFeedbackOrBug({
            type: 'feedback',
            user: interaction.user,
            guild: interaction.guild,
            channel: interaction.channel,
            message,
            client,
        });

        if (!result.success) {
            return safeReply(interaction, {
                content: isPtBr ? result.error : 'Message too short! Please enter at least 10 characters detailing your request.',
                flags: [MessageFlags.Ephemeral],
            });
        }

        const embed = await createEmbed(interaction, {
            title: isPtBr ? `${getEmoji('lampada')} Sugestão Enviada!` : `${getEmoji('lampada')} Suggestion Submitted!`,
            description: isPtBr ? result.userConfirmation : 'Your suggestion has been successfully sent to our team! Thank you for your feedback.',
            color: colors.primary || 0xAEA7BD,
        });

        return safeReply(interaction, {
            embeds: [embed],
            flags: [MessageFlags.Ephemeral],
        });
    },
};
