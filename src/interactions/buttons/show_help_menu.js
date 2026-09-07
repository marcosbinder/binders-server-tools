/**
 * @file show_help_menu.js
 * @description Button handler to display interactive help menu when clicked from mention responses
 */

const { MessageFlags } = require('discord.js');
const checkInteractionOwnership = require('../../utils/interactionOwnership.js');
const { buildHelpPayload } = require('../../utils/helpMenuBuilder.js');

module.exports = {
    name: 'show_help_menu',
    async execute(interaction, client) {
        const isOwner = await checkInteractionOwnership(interaction);
        if (!isOwner) return;

        const payload = await buildHelpPayload(interaction, 'home');
        payload.flags = [MessageFlags.Ephemeral, 32768];
        return interaction.reply(payload);
    },
};