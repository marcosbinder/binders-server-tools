const { MessageFlags, PermissionFlagsBits } = require('discord.js');
const { getOrCreateStudioSession, buildStudioPayload, renderContainerFromBlocks } = require('../../components/builder/containerBuilder.js');
const { getEmoji } = require('../../config/emojis.js');
const getLanguage = require('../../utils/getLanguage.js');
const safeReply = require('../../utils/safeReply.js');

module.exports = {
    name: 'btn_builder',
    async execute(interaction, client) {
        const lang = getLanguage(interaction);
        const isPtBr = lang === 'pt_BR';

        if (!interaction.guild) {
            return safeReply(interaction, {
                content: isPtBr
                    ? `${getEmoji('errado')} Esta ação somente pode ser executada dentro de um servidor.`
                    : `${getEmoji('errado')} This action can only be performed within a server.`,
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
                content: isPtBr
                    ? `${getEmoji('errado')} Você precisa da permissão de **Gerenciar Mensagens** para interagir com o estúdio.`
                    : `${getEmoji('errado')} You need the **Manage Messages** permission to interact with the studio.`,
                flags: [MessageFlags.Ephemeral]
            });
        }

        const subject = interaction.customId;
        const session = getOrCreateStudioSession(interaction.user.id);

        if (subject === 'btn_builder_undo') {
            session.undo();
            const payload = buildStudioPayload(session, interaction.guild);
            return interaction.update(payload);
        }

        if (subject === 'btn_builder_limpar') {
            session.clear();
            const payload = buildStudioPayload(session, interaction.guild);
            return interaction.update(payload);
        }

        if (subject === 'btn_builder_publicar') {
            session.isPublishing = true;
            const payload = buildStudioPayload(session, interaction.guild);
            return interaction.update(payload);
        }

        if (subject === 'btn_builder_voltar') {
            session.isPublishing = false;
            const payload = buildStudioPayload(session, interaction.guild);
            return interaction.update(payload);
        }

        if (subject === 'btn_builder_confirmar') {
            if (!session.targetChannelId) {
                return safeReply(interaction, { content: `${getEmoji('errado')} Selecione um canal de destino primeiro!`, flags: [MessageFlags.Ephemeral] });
            }

            if (!interaction.guild) {
                return safeReply(interaction, { content: `${getEmoji('errado')} Essa ação somente pode ser executada dentro de um servidor.`, flags: [MessageFlags.Ephemeral] });
            }

            const targetChannel = interaction.guild.channels.cache?.get(session.targetChannelId) || await interaction.guild.channels.fetch?.(session.targetChannelId).catch(() => null);
            if (!targetChannel || typeof targetChannel.send !== 'function') {
                return safeReply(interaction, { content: `${getEmoji('errado')} Canal inválido ou não encontrado.`, flags: [MessageFlags.Ephemeral] });
            }

            const userChannelPerms = typeof targetChannel.permissionsFor === 'function' ? targetChannel.permissionsFor(interaction.member) : null;
            if (userChannelPerms && !userChannelPerms.has(PermissionFlagsBits.SendMessages)) {
                return safeReply(interaction, { content: isPtBr ? `${getEmoji('errado')} Você não tem permissão para enviar mensagens no canal <#${targetChannel.id}>.` : `${getEmoji('errado')} You lack permission to send messages in <#${targetChannel.id}>.`, flags: [MessageFlags.Ephemeral] });
            }

            const botMember = interaction.guild.members?.me;
            const botChannelPerms = (botMember && typeof targetChannel.permissionsFor === 'function') ? targetChannel.permissionsFor(botMember) : null;
            if (botChannelPerms && (!botChannelPerms.has(PermissionFlagsBits.ViewChannel) || !botChannelPerms.has(PermissionFlagsBits.SendMessages))) {
                return safeReply(interaction, { content: isPtBr ? `${getEmoji('errado')} Eu não tenho permissão para enviar mensagens no canal <#${targetChannel.id}>.` : `${getEmoji('errado')} I lack permission to send messages in <#${targetChannel.id}>.`, flags: [MessageFlags.Ephemeral] });
            }

            const containerPayload = renderContainerFromBlocks(session.blocks, interaction.guild);

            try {
                await targetChannel.send({ components: [containerPayload] });
                session.isPublishing = false;
                const resultPayload = buildStudioPayload(session, interaction.guild);
                await interaction.update(resultPayload).catch(() => null);
                return interaction.followUp({ content: `${getEmoji('confere')} Contêiner publicado com sucesso no canal <#${targetChannel.id}>!`, flags: [MessageFlags.Ephemeral] });
            } catch (err) {
                return safeReply(interaction, { content: `${getEmoji('errado')} Falha ao publicar no canal: ${err.message}`, flags: [MessageFlags.Ephemeral] });
            }
        }
    }
};
