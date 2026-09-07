/**
 * @file coinflip.js
 * @description Standalone slash command /coinflip (Cara ou Coroa / Heads or Tails)
 */

const { SlashCommandBuilder } = require('discord.js');
const tosCheck = require('../utils/tosCheck.js');
const createEmbed = require('../utils/createEmbed.js');
const getLanguage = require('../utils/getLanguage.js');
const safeReply = require('../utils/safeReply.js');
const { getEmoji } = require('../config/emojis.js');
const colors = require('../config/colors.js');

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

    async execute(interaction, client) {
        const canProceed = await tosCheck(interaction);
        if (!canProceed) return;

        const lang = getLanguage(interaction);
        const isPtBr = lang === 'pt_BR';

        const isHeads = Math.random() < 0.5;
        const resultEmoji = isHeads ? getEmoji('pessoa') : getEmoji('coroa');
        const resultText = isPtBr
            ? (isHeads ? `${resultEmoji} Deu **Cara**!` : `${resultEmoji} Deu **Coroa**!`)
            : (isHeads ? `${resultEmoji} It's **Heads**!` : `${resultEmoji} It's **Tails**!`);

        const embed = await createEmbed(interaction, {
            title: isPtBr ? `${getEmoji('estrela')} Cara ou Coroa` : `${getEmoji('estrela')} Coin Flip`,
            description: resultText,
            color: colors.primary || 0xAEA7BD,
            fields: [
                {
                    name: isPtBr ? `${getEmoji('trofeu')} Resultado` : `${getEmoji('trofeu')} Result`,
                    value: isHeads ? (isPtBr ? 'Cara' : 'Heads') : (isPtBr ? 'Coroa' : 'Tails'),
                    inline: true,
                },
                {
                    name: isPtBr ? `${getEmoji('pessoa')} Lançado por` : `${getEmoji('pessoa')} Flipped by`,
                    value: `${interaction.user.username}`,
                    inline: true,
                },
            ],
        });

        return safeReply(interaction, { embeds: [embed] });
    },
};
