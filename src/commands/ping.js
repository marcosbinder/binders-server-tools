/**
 * @file ping.js
 * @description Standalone slash command /ping to display WebSocket and REST API latency
 */

const { SlashCommandBuilder } = require('discord.js');
const tosCheck = require('../utils/tosCheck.js');
const createEmbed = require('../utils/createEmbed.js');
const getLanguage = require('../utils/getLanguage.js');
const { getEmoji, emojis } = require('../config/emojis.js');
const colors = require('../config/colors.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Mostra a latência do WebSocket e tempo de resposta da API.')
        .setDescriptionLocalizations({
            'en-US': 'Displays WebSocket latency and API roundtrip response time.',
            'pt-BR': 'Mostra a latência do WebSocket e tempo de resposta da API.',
        })
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .setDMPermission(true),

    async execute(interaction, client) {
        const canProceed = await tosCheck(interaction);
        if (!canProceed) return;

        const lang = getLanguage(interaction);
        const isPtBr = lang === 'pt_BR';

        const sent = await interaction.reply({
            content: isPtBr ? `${getEmoji('tempo')} Calculando latência...` : `${getEmoji('tempo')} Calculating ping...`,
            fetchReply: true,
        });

        const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
        const wsPing = client?.ws?.ping ?? 0;

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
