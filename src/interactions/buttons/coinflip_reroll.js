/**
 * @file coinflip_reroll.js
 * @description Button interaction handler for /coinflip "Girar Novamente" / "Flip Again"
 */

const { buildCoinflipPayload } = require('../../commands/coinflip.js');
const { isMessageV2, transformToV2Payload } = require('../../utils/componentsV2.js');

module.exports = {
    name: 'coinflip_reroll',
    async execute(interaction, client) {
        const payload = await buildCoinflipPayload(interaction, interaction.user);

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
