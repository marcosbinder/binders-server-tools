/**
 * @file coinflip_reroll.js
 * @description Button interaction handler for /coinflip "Girar Novamente" / "Flip Again"
 */

const { buildCoinflipPayload } = require('../../commands/coinflip.js');
const getLanguage = require('../../utils/getLanguage.js');
const { getEmoji } = require('../../config/emojis.js');

module.exports = {
    name: 'coinflip_reroll',
    async execute(interaction, client) {
        const lang = getLanguage(interaction);
        const isPtBr = lang === 'pt_BR';

        await interaction.update({
            content: isPtBr ? `${getEmoji('orbita')} Lançando a moeda no ar...` : `${getEmoji('orbita')} Flipping the coin in the air...`,
            embeds: [],
            components: [],
        });

        if (process.env.NODE_ENV !== 'test') {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const payload = await buildCoinflipPayload(interaction, interaction.user);
        return interaction.editReply({
            content: null,
            ...payload,
        });
    },
};
