/**
 * @file containerbuilder.js
 * @description Slash command to open the Components V2 Container Studio Builder
 */

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const tosCheck = require('../utils/tosCheck.js');
const { getOrCreateStudioSession, buildStudioPayload } = require('../components/builder/containerBuilder.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('containerbuilder')
        .setDescription('🛠️ Estúdio visual interativo para criação de contêineres Discord Components V2.')
        .setDescriptionLocalizations({
            'en-US': 'Interactive visual studio for building Discord Components V2 containers.',
            'pt-BR': '🛠️ Estúdio visual interativo para criação de contêineres Discord Components V2.',
        })
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .setDMPermission(false),

    async execute(interaction, client) {
        const canProceed = await tosCheck(interaction);
        if (!canProceed) return;

        if (!interaction.guild) {
            return interaction.reply({ content: 'Esse comando só pode ser utilizado dentro de um servidor.', flags: [MessageFlags.Ephemeral] });
        }

        const session = getOrCreateStudioSession(interaction.user.id);
        const payload = buildStudioPayload(session, interaction.guild);

        if (interaction.deferred || interaction.replied) {
            return await interaction.editReply(payload).catch(() => null);
        }
        return await interaction.reply({ ...payload, flags: [MessageFlags.Ephemeral] }).catch(() => null);
    },
};
