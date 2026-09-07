/**
 * @file coinflip.js
 * @description Standalone slash command /coinflip (Cara ou Coroa / Heads or Tails)
 */

const { SlashCommandBuilder } = require('discord.js');
const tosCheck = require('../utils/tosCheck.js');
const createEmbed = require('../utils/createEmbed.js');
const getLanguage = require('../utils/getLanguage.js');
const safeReply = require('../utils/safeReply.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Gira uma moeda para tirar Cara ou Coroa.')
        .setDescriptionLocalizations({
            'en-US': 'Flips a coin to get Heads or Tails.',
            'pt-BR': 'Gira uma moeda para tirar Cara ou Coroa.',
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
        const resultText = isPtBr
            ? (isHeads ? '🪙 Deu **Cara**!' : '🪙 Deu **Coroa**!')
            : (isHeads ? '🪙 It\'s **Heads**!' : '🪙 It\'s **Tails**!');

        const embed = await createEmbed(interaction, {
            title: isPtBr ? '🪙 Cara ou Coroa' : '🪙 Coin Flip',
            description: resultText,
            color: isHeads ? 0xFEE75C : 0x5865F2,
            fields: [
                {
                    name: isPtBr ? 'Resultado' : 'Result',
                    value: isHeads ? (isPtBr ? 'Cara' : 'Heads') : (isPtBr ? 'Coroa' : 'Tails'),
                    inline: true,
                },
                {
                    name: isPtBr ? 'Lançado por' : 'Flipped by',
                    value: `${interaction.user.username}`,
                    inline: true,
                },
            ],
        });

        return safeReply(interaction, { embeds: [embed] });
    },
};
