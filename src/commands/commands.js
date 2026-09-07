/**
 * @file commands.js
 * @description Slash command alias /commands showing the interactive help menu
 */

const { SlashCommandBuilder } = require('discord.js');
const tosCheck = require('../utils/tosCheck.js');
const { buildHelpPayload } = require('../utils/helpMenuBuilder.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('commands')
        .setNameLocalizations({
            'en-US': 'commands',
            'pt-BR': 'comandos',
        })
        .setDescription('Bot ❯ Mostra o menu de ajuda interativo com todos os comandos.')
        .setDescriptionLocalizations({
            'en-US': 'Bot ❯ Displays the interactive help menu with all available commands.',
            'pt-BR': 'Bot ❯ Mostra o menu de ajuda interativo com todos os comandos.',
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
