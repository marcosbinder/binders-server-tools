/**
 * @file bugreport.js
 * @description Slash command /bugreport for reporting defects and errors
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
        .setName('bugreport')
        .setDescription('Bot ❯ Reporta um erro ou bug encontrado no bot.')
        .setDescriptionLocalizations({
            'en-US': 'Bot ❯ Report an issue or bug found in the bot.',
            'pt-BR': 'Bot ❯ Reporta um erro ou bug encontrado no bot.',
        })
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .setDMPermission(true)
        .addStringOption(option =>
            option
                .setName('descricao')
                .setNameLocalizations({
                    'en-US': 'description',
                    'pt-BR': 'descricao',
                })
                .setDescription('Descreva o problema encontrado em detalhes (mínimo 10 caracteres).')
                .setDescriptionLocalizations({
                    'en-US': 'Describe the encountered problem in detail (minimum 10 characters).',
                    'pt-BR': 'Descreva o problema encontrado em detalhes (mínimo 10 caracteres).',
                })
                .setMinLength(10)
                .setMaxLength(2000)
                .setRequired(true)
        ),

    async execute(interaction, client) {
        const canProceed = await tosCheck(interaction);
        if (!canProceed) return;

        const message = interaction.options.getString('descricao') ||
            interaction.options.getString('description') ||
            interaction.options.getString('mensagem') ||
            interaction.options.getString('message');
        const lang = getLanguage(interaction);
        const isPtBr = lang === 'pt_BR';

        if (typeof interaction.deferReply === 'function') {
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
