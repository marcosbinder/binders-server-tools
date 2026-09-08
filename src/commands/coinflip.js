/**
 * @file coinflip.js
 * @description Standalone slash command /coinflip (Cara ou Coroa / Heads or Tails)
 */

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const tosCheck = require('../utils/tosCheck.js');
const createEmbed = require('../utils/createEmbed.js');
const getLanguage = require('../utils/getLanguage.js');
const safeReply = require('../utils/safeReply.js');
const { getEmoji } = require('../config/emojis.js');
const colors = require('../config/colors.js');

async function buildCoinflipPayload(interaction, user) {
    const lang = getLanguage(interaction);
    const isPtBr = lang === 'pt_BR';

    const isHeads = Math.random() < 0.5;
    const resultName = isPtBr ? (isHeads ? 'Cara' : 'Coroa') : (isHeads ? 'Heads' : 'Tails');
    const resultSideEmoji = isHeads ? getEmoji('pessoa') : getEmoji('coroa');

    const embed = await createEmbed(interaction, {
        title: isPtBr ? 'Cara ou Coroa' : 'Coin Flip',
        description: isPtBr
            ? `> A moeda girou no ar e caiu em **${resultName}**! ${resultSideEmoji}`
            : `> The coin flipped in the air and landed on **${resultName}**! ${resultSideEmoji}`,
        color: colors.primary || 0xAEA7BD,
        fields: [
            {
                name: isPtBr ? 'Resultado' : 'Result',
                value: `**${resultName}**`,
                inline: true,
            },
            {
                name: isPtBr ? 'Lançado por' : 'Flipped by',
                value: `<@${user.id}>`,
                inline: true,
            },
        ],
    });

    const rerollButton = new ButtonBuilder()
        .setCustomId(`coinflip_reroll_${user.id}`)
        .setLabel(isPtBr ? 'Girar Novamente' : 'Flip Again')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(getEmoji('reload') || getEmoji('orbita'));

    const actionRow = new ActionRowBuilder().addComponents(rerollButton);

    return {
        embeds: [embed],
        components: [actionRow],
    };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Jogos ❯ Gira uma moeda para tirar Cara ou Coroa.')
        .setDescriptionLocalizations({
            'en-US': 'Games ❯ Flips a coin to get Heads or Tails.',
            'pt-BR': 'Jogos ❯ Gira uma moeda para tirar Cara ou Coroa.',
        })
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .setDMPermission(true),

    buildCoinflipPayload,

    async execute(interaction, client) {
        const canProceed = await tosCheck(interaction);
        if (!canProceed) return;

        const payload = await buildCoinflipPayload(interaction, interaction.user);
        return safeReply(interaction, payload);
    },
};
