/**
 * @file feedback.js
 * @description Slash command /feedback for submitting user suggestions and feedback
 */

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const tosCheck = require('../utils/tosCheck.js');
const createEmbed = require('../utils/createEmbed.js');
const getLanguage = require('../utils/getLanguage.js');
const { submitFeedbackOrBug } = require('../utils/feedbackDispatcher.js');
const { getEmoji } = require('../config/emojis.js');
const safeReply = require('../utils/safeReply.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('feedback')
        .setDescription('Bot ❯ Envia uma sugestão ou feedback para a equipe de desenvolvimento.')
        .setDescriptionLocalizations({
            'en-US': 'Bot ❯ Send a suggestion or feedback to the development team.',
            'pt-BR': 'Bot ❯ Envia uma sugestão ou feedback para a equipe de desenvolvimento.',
        })
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .setDMPermission(true)
        .addStringOption(option =>
            option
                .setName('mensagem')
                .setNameLocalizations({
                    'en-US': 'message',
                    'pt-BR': 'mensagem',
                })
                .setDescription('Descreva sua sugestão ou feedback (mínimo 10 caracteres).')
                .setDescriptionLocalizations({
                    'en-US': 'Describe your suggestion or feedback (minimum 10 characters).',
                    'pt-BR': 'Descreva sua sugestão ou feedback (mínimo 10 caracteres).',
                })
                .setMinLength(10)
                .setMaxLength(2000)
                .setRequired(true)
        ),

    async execute(interaction, client) {
        const canProceed = await tosCheck(interaction);
        if (!canProceed) return;

        const message = interaction.options.getString('mensagem') || interaction.options.getString('message');
        const lang = getLanguage(interaction);
        const isPtBr = lang === 'pt_BR';

        if (typeof interaction.deferReply === 'function') {
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
            color: 0x5865F2,
        });

        return safeReply(interaction, {
            embeds: [embed],
            flags: [MessageFlags.Ephemeral],
        });
    },
};
