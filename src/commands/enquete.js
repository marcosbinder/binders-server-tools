/**
 * @file enquete.js
 * @description Slash command to create native or interactive polls
 */

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const tosCheck = require('../utils/tosCheck.js');
const createEmbed = require('../utils/createEmbed.js');
const getLanguage = require('../utils/getLanguage.js');
const safeReply = require('../utils/safeReply.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('enquete')
        .setNameLocalizations({ 'en-US': 'poll', 'pt-BR': 'enquete' })
        .setDescription('Utilidades ❯ Cria uma enquete para os membros do servidor.')
        .setDescriptionLocalizations({
            'en-US': 'Utilities ❯ Creates a poll for server members.',
            'pt-BR': 'Utilidades ❯ Cria uma enquete para os membros do servidor.',
        })
        .setDMPermission(false)
        .addStringOption(opt =>
            opt.setName('pergunta')
                .setNameLocalizations({ 'en-US': 'question' })
                .setDescription('A pergunta da enquete')
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('opcao1')
                .setNameLocalizations({ 'en-US': 'option1' })
                .setDescription('Primeira opção')
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('opcao2')
                .setNameLocalizations({ 'en-US': 'option2' })
                .setDescription('Segunda opção')
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('opcao3')
                .setNameLocalizations({ 'en-US': 'option3' })
                .setDescription('Terceira opção (opcional)')
                .setRequired(false)
        )
        .addStringOption(opt =>
            opt.setName('opcao4')
                .setNameLocalizations({ 'en-US': 'option4' })
                .setDescription('Quarta opção (opcional)')
                .setRequired(false)
        )
        .addStringOption(opt =>
            opt.setName('opcao5')
                .setNameLocalizations({ 'en-US': 'option5' })
                .setDescription('Quinta opção (opcional)')
                .setRequired(false)
        )
        .addIntegerOption(opt =>
            opt.setName('duracao_horas')
                .setNameLocalizations({ 'en-US': 'duration_hours' })
                .setDescription('Duração da enquete em horas (1-168, padrão: 24)')
                .setMinValue(1)
                .setMaxValue(168)
                .setRequired(false)
        )
        .addBooleanOption(opt =>
            opt.setName('multipla_escolha')
                .setNameLocalizations({ 'en-US': 'multi_select' })
                .setDescription('Permitir várias escolhas por usuário?')
                .setRequired(false)
        ),

    async execute(interaction, client) {
        const canProceed = await tosCheck(interaction);
        if (!canProceed) return;

        if (!interaction.guild) {
            return interaction.reply({ content: 'Esse comando só pode ser utilizado dentro de um servidor.', flags: [MessageFlags.Ephemeral] });
        }

        const pergunta = interaction.options.getString('pergunta') || interaction.options.getString('question');
        const opcao1 = interaction.options.getString('opcao1') || interaction.options.getString('option1');
        const opcao2 = interaction.options.getString('opcao2') || interaction.options.getString('option2');
        const opcao3 = interaction.options.getString('opcao3') || interaction.options.getString('option3');
        const opcao4 = interaction.options.getString('opcao4') || interaction.options.getString('option4');
        const opcao5 = interaction.options.getString('opcao5') || interaction.options.getString('option5');

        const duracaoHoras = interaction.options.getInteger('duracao_horas') || interaction.options.getInteger('duration_hours') || 24;
        const multiplaEscolha = interaction.options.getBoolean('multipla_escolha') || interaction.options.getBoolean('multi_select') || false;

        const answers = [{ text: opcao1 }, { text: opcao2 }];
        if (opcao3) answers.push({ text: opcao3 });
        if (opcao4) answers.push({ text: opcao4 });
        if (opcao5) answers.push({ text: opcao5 });

        try {
            return await interaction.reply({
                poll: {
                    question: { text: pergunta },
                    answers,
                    duration: duracaoHoras,
                    allowMultiselect: multiplaEscolha,
                },
            });
        } catch (err) {
            const embed = await createEmbed(interaction, {
                title: `📊 Enquete: ${pergunta}`,
                fields: answers.map((a, i) => ({ name: `🔹 Opção ${i + 1}`, value: a.text, inline: false })),
                color: 0x5865F2,
            });
            return safeReply(interaction, { embeds: [embed] });
        }
    },
};
