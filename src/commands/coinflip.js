/**
 * @file coinflip.js
 * @description Standalone slash command /coinflip (Cara ou Coroa / Heads or Tails)
 */

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, parseEmoji } = require('discord.js');
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
        title: isPtBr ? `${getEmoji('orbita')} Cara ou Coroa` : `${getEmoji('orbita')} Coin Flip`,
        description: isPtBr
            ? `> A moeda girou no ar e caiu em **${resultName}**! ${resultSideEmoji}`
            : `> The coin flipped in the air and landed on **${resultName}**! ${resultSideEmoji}`,
        color: colors.primary || 0xAEA7BD,
    });

    const rerollButton = new ButtonBuilder()
        .setCustomId(`coinflip_reroll_${user.id}`)
        .setLabel(isPtBr ? 'Girar Novamente' : 'Flip Again')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(parseEmoji(getEmoji('reload')) || parseEmoji(getEmoji('orbita')) || { name: '🔄' });

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

        const lang = getLanguage(interaction);
        const isPtBr = lang === 'pt_BR';

        await interaction.reply({
            content: isPtBr ? `${getEmoji('orbita')} Lançando a moeda no ar...` : `${getEmoji('orbita')} Flipping the coin in the air...`,
            fetchReply: true,
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
