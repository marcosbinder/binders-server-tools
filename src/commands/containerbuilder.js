/**
 * @file containerbuilder.js
 * @description Slash command to open the Components V2 Container Studio Builder
 */

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const tosCheck = require('../utils/tosCheck.js');
const getLanguage = require('../utils/getLanguage.js');
const safeReply = require('../utils/safeReply.js');
const { getOrCreateStudioSession, buildStudioPayload } = require('../components/builder/containerBuilder.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('containerbuilder')
        .setDescription('Estúdio ❯ Estúdio visual interativo para criação de contêineres Discord Components V2.')
        .setDescriptionLocalizations({
            'en-US': 'Studio ❯ Interactive visual studio for building Discord Components V2 containers.',
            'pt-BR': 'Estúdio ❯ Estúdio visual interativo para criação de contêineres Discord Components V2.',
        })
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .setIntegrationTypes([0])
        .setContexts([0])
        .setDMPermission(false),

    async execute(interaction, client) {
        const canProceed = await tosCheck(interaction);
        if (!canProceed) return;

        const lang = getLanguage(interaction);
        const isPtBr = lang === 'pt_BR';

        if (!interaction.guild) {
            return safeReply(interaction, {
                content: isPtBr
                    ? '❌ Este comando só pode ser utilizado dentro de um servidor.'
                    : '❌ This command can only be used within a server.',
                ephemeral: true,
            });
        }

        const memberPerms = interaction.member?.permissions;
        const hasPermission = memberPerms && typeof memberPerms.has === 'function' && (
            memberPerms.has(PermissionFlagsBits.ManageMessages) ||
            memberPerms.has(PermissionFlagsBits.ManageGuild) ||
            memberPerms.has(PermissionFlagsBits.Administrator)
        );

        if (!hasPermission) {
            return safeReply(interaction, {
                content: isPtBr
                    ? '❌ Você precisa da permissão de **Gerenciar Mensagens** ou **Gerenciar Servidor** para utilizar o estúdio de contêineres.'
                    : '❌ You need the **Manage Messages** or **Manage Server** permission to use the container studio.',
                ephemeral: true,
            });
        }

        const session = getOrCreateStudioSession(interaction.user.id);
        const payload = buildStudioPayload(session, interaction.guild, lang);

        return safeReply(interaction, payload);
    },
};
