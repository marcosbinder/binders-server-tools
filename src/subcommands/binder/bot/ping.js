/**
 * @file ping.js
 * @description Subcommand /binder ping to display WebSocket and REST API latency
 */

const createEmbed = require('../../../utils/createEmbed.js');
const getLanguage = require('../../../utils/getLanguage.js');
const { getEmoji, emojis } = require('../../../config/emojis.js');
const colors = require('../../../config/colors.js');

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

        const pingColor = roundtrip < 200 ? colors.success : roundtrip < 500 ? colors.warning : colors.error;

        const embed = await createEmbed(interaction, {
            title: isPtBr ? `${emojis.foguete || '🚀'} Latência do Bot` : `${emojis.foguete || '🚀'} Bot Latency`,
            description: `> ${isPtBr ? 'Métricas de conectividade e tempo de resposta em tempo real.' : 'Real-time connectivity and latency response metrics.'}`,
            fields: [
                {
                    name: `${emojis.wifi || '📶'} Gateway (WebSocket)`,
                    value: `> \`${wsPing}ms\``,
                    inline: true,
                },
                {
                    name: isPtBr ? `${emojis.tempo || '⏱️'} Ida e Volta (REST)` : `${emojis.tempo || '⏱️'} Roundtrip (REST)`,
                    value: `> \`${roundtrip}ms\``,
                    inline: true,
                },
            ],
            color: pingColor,
        });

        return interaction.editReply({ content: null, embeds: [embed] });
    },
};
