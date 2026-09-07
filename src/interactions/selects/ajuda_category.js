/**
 * @file ajuda_category.js
 * @description Select menu interaction handler for help category navigation
 */

const checkInteractionOwnership = require('../../utils/interactionOwnership.js');
const { buildHelpPayload } = require('../../utils/helpMenuBuilder.js');
const { isMessageV2, transformToV2Payload } = require('../../utils/componentsV2.js');

module.exports = {
    name: 'help_nav',
    async execute(interaction, client) {
        const isOwner = await checkInteractionOwnership(interaction);
        if (!isOwner) return;

        const selectedCategory = interaction.values?.[0] || 'home';
        const payload = await buildHelpPayload(interaction, selectedCategory);
        if (isMessageV2(interaction.message)) {
            return interaction.update(transformToV2Payload(payload, false));
        }
        try {
            return await interaction.update(payload);
        } catch (err) {
            const errMsg = err?.rawError?.message || err?.message || String(err);
            if (errMsg.includes('MESSAGE_CANNOT_USE_LEGACY_FIELDS_WITH_COMPONENTS_V2')) {
                return await interaction.update(transformToV2Payload(payload, false));
            }
            throw err;
        }
    },
};
