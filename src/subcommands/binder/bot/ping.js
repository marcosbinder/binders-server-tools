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

        const statusText = roundtrip < 200
            ? (isPtBr ? 'Excelente' : 'Excellent')
            : (roundtrip < 500 ? (isPtBr ? 'Bom' : 'Good') : (isPtBr ? 'Instável' : 'Unstable'));

        const descriptionLines = [
            `### 🚀 ${isPtBr ? 'Conectividade & Tempo de Resposta' : 'Connectivity & Response Time'}`,
            `> • **${emojis.wifi || '📶'} Gateway (WebSocket):** \`${wsPing}ms\``,
            `> • **${emojis.tempo || '⏱️'} ${isPtBr ? 'Ida e Volta (REST API)' : 'Roundtrip (REST API)'}:** \`${roundtrip}ms\``,
            `> • **${emojis.estrela || '⭐'} Status:** \`${statusText}\``,
            ``,
            `-# ⚡ ${isPtBr ? 'Medição em tempo real diretamente com os servidores do Discord.' : 'Real-time measurement directly with Discord gateway servers.'}`
        ];

        const embed = await createEmbed(interaction, {
            title: isPtBr ? `${emojis.foguete || '🚀'} Latência do Bot` : `${emojis.foguete || '🚀'} Bot Latency`,
            description: descriptionLines.join('\n'),
            color: pingColor,
        });

        const { embedToV2Container, IS_COMPONENTS_V2 } = require('../../../utils/componentsV2.js');
        const v2Container = embedToV2Container(embed);

        return interaction.editReply({
            flags: IS_COMPONENTS_V2,
            content: null,
            embeds: [embed],
            components: [v2Container]
        });
    },
};
