/**
 * @file ajuda.js
 * @description Slash command /ajuda showing interactive help menu
 */

const { SlashCommandBuilder } = require('discord.js');
const tosCheck = require('../utils/tosCheck.js');
const { buildHelpPayload } = require('../utils/helpMenuBuilder.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ajuda')
        .setDescription('Mostra o menu de ajuda interativo com todos os comandos.')
        .setDescriptionLocalizations({
            'en-US': 'Displays the interactive help menu with all available commands.',
            'pt-BR': 'Mostra o menu de ajuda interativo com todos os comandos.',
        })
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .setDMPermission(true),

    async execute(interaction, client) {
        const canProceed = await tosCheck(interaction);
        if (!canProceed) return;

        const payload = await buildHelpPayload(interaction, 'home');
        return interaction.reply(payload);
    },
};
