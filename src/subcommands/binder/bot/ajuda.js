/**
 * @file ajuda.js
 * @description Subcommand /binder ajuda to display interactive help menu
 */

const { buildHelpPayload } = require('../../../utils/helpMenuBuilder.js');
const safeReply = require('../../../utils/safeReply.js');

module.exports = {
    async execute(interaction, client) {
        const payload = await buildHelpPayload(interaction, 'home');
        return safeReply(interaction, payload);
    },
};
