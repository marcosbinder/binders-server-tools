const { MessageFlags, PermissionFlagsBits } = require('discord.js');
const { getOrCreateStudioSession, buildStudioPayload } = require('../../components/builder/containerBuilder.js');
const getLanguage = require('../../utils/getLanguage.js');
const safeReply = require('../../utils/safeReply.js');

module.exports = {
    name: 'sel_builder_canal',
    async execute(interaction, client) {
        const lang = getLanguage(interaction);
        const isPtBr = lang === 'pt_BR';

        if (!interaction.guild) {
            return safeReply(interaction, {
                content: isPtBr ? '❌ Esta ação só pode ser executada dentro de um servidor.' : '❌ This action can only be performed within a server.',
                flags: [MessageFlags.Ephemeral]
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
                content: isPtBr ? '❌ Você precisa da permissão de Gerenciar Mensagens.' : '❌ You need the Manage Messages permission.',
                flags: [MessageFlags.Ephemeral]
            });
        }

        const selectedChannelId = interaction.values?.[0];
        const session = getOrCreateStudioSession(interaction.user.id);

        if (selectedChannelId) {
            session.targetChannelId = selectedChannelId;
        }

        const payload = buildStudioPayload(session, interaction.guild);
        return interaction.update(payload);
    }
};
