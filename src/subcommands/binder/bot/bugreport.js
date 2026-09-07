/**
 * @file bugreport.js
 * @description Subcommand /binder bugreport for submitting bug reports
 */

const { MessageFlags } = require('discord.js');
const createEmbed = require('../../../utils/createEmbed.js');
const getLanguage = require('../../../utils/getLanguage.js');
const { submitFeedbackOrBug } = require('../../../utils/feedbackDispatcher.js');
const { getEmoji } = require('../../../config/emojis.js');
const safeReply = require('../../../utils/safeReply.js');

module.exports = {
    async execute(interaction, client) {
        const message = interaction.options.getString('descricao') ||
            interaction.options.getString('description') ||
            interaction.options.getString('mensagem') ||
            interaction.options.getString('message');
        const lang = getLanguage(interaction);
        const isPtBr = lang === 'pt_BR';

        if (typeof interaction.deferReply === 'function' && !interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        }

        const result = await submitFeedbackOrBug({
            type: 'bug',
            user: interaction.user,
            guild: interaction.guild,
            channel: interaction.channel,
            message,
            client,
        });

        if (!result.success) {
            return safeReply(interaction, {
                content: isPtBr ? result.error : 'Message too short! Please enter at least 10 characters detailing your report.',
                flags: [MessageFlags.Ephemeral],
            });
        }

        const embed = await createEmbed(interaction, {
            title: isPtBr ? `${getEmoji('bughunter')} Bug Reportado!` : `${getEmoji('bughunter')} Bug Reported!`,
            description: isPtBr ? result.userConfirmation : 'Your bug report has been successfully sent to the development team! Thank you.',
            color: 0xED4245,
        });

        return safeReply(interaction, {
            embeds: [embed],
            flags: [MessageFlags.Ephemeral],
        });
    },
};
