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
    deploy: false,
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Bot ❯ Mostra a latência do WebSocket e tempo de resposta da API.')
        .setDescriptionLocalizations({
            'en-US': 'Bot ❯ Displays WebSocket latency and API roundtrip response time.',
            'pt-BR': 'Bot ❯ Mostra a latência do WebSocket e tempo de resposta da API.',
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

        const statusText = roundtrip < 200
            ? (isPtBr ? 'Excelente' : 'Excellent')
            : (roundtrip < 500 ? (isPtBr ? 'Bom' : 'Good') : (isPtBr ? 'Instável' : 'Unstable'));

        const statusEmoji = roundtrip < 200 ? getEmoji('verde') : (roundtrip < 500 ? getEmoji('amarelo') : getEmoji('vermelho'));

        const descriptionLines = [
            `> • **${getEmoji('wifi')} Gateway (WebSocket):** \`${wsPing}ms\``,
            `> • **${getEmoji('tempo')} ${isPtBr ? 'Ida e Volta (REST API)' : 'Roundtrip (REST API)'}:** \`${roundtrip}ms\``,
            `> • **${statusEmoji} Status:** \`${statusText}\``,
            ``,
            `-# ${getEmoji('brilho')} ${isPtBr ? 'Medição em tempo real diretamente com os servidores do Discord.' : 'Real-time measurement directly with Discord gateway servers.'}`
        ];

        const embed = await createEmbed(interaction, {
            title: isPtBr ? `${getEmoji('foguete')} Latência do Bot` : `${getEmoji('foguete')} Bot Latency`,
            description: descriptionLines.join('\n'),
            color: pingColor,
        });

        return interaction.editReply({
            content: null,
            embeds: [embed],
            components: [],
        });
    },
};
