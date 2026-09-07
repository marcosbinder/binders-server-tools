/**
 * @file ping.js
 * @description Subcommand /binder ping to display WebSocket and REST API latency
 */

const createEmbed = require('../../../utils/createEmbed.js');
const getLanguage = require('../../../utils/getLanguage.js');
const { getEmoji } = require('../../../config/emojis.js');

module.exports = {
    async execute(interaction, client) {
        const lang = getLanguage(interaction);
        const isPtBr = lang === 'pt_BR';

        const sent = await interaction.reply({
            content: isPtBr ? `${getEmoji('tempo')} Calculando latência...` : `${getEmoji('tempo')} Calculating ping...`,
            fetchReply: true,
        });

        const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
        const wsPing = client.ws?.ping ?? 0;

        const embed = await createEmbed(interaction, {
            title: isPtBr ? `${getEmoji('foguete')} Latência do Bot` : `${getEmoji('foguete')} Bot Latency`,
            fields: [
                {
                    name: isPtBr ? '📶 Gateway (WebSocket)' : '📶 Gateway (WebSocket)',
                    value: `\`${wsPing}ms\``,
                    inline: true,
                },
                {
                    name: isPtBr ? `${getEmoji('tempo')} Ida e Volta (REST)` : `${getEmoji('tempo')} Roundtrip (REST)`,
                    value: `\`${roundtrip}ms\``,
                    inline: true,
                },
            ],
            color: roundtrip < 200 ? 0x57F287 : roundtrip < 500 ? 0xFEE75C : 0xED4245,
        });

        return interaction.editReply({ content: null, embeds: [embed] });
    },
};
