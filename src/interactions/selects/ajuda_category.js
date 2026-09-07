/**
 * @file ajuda_category.js
 * @description Select menu interaction handler for help category navigation
 */

const checkInteractionOwnership = require('../../utils/interactionOwnership.js');
const { buildHelpPayload } = require('../../utils/helpMenuBuilder.js');

module.exports = {
    name: 'help_nav',
    async execute(interaction, client) {
        const isOwner = await checkInteractionOwnership(interaction);
        if (!isOwner) return;

        const selectedCategory = interaction.values?.[0] || 'home';
        const payload = await buildHelpPayload(interaction, selectedCategory);
        return interaction.update(payload);
    },
};
