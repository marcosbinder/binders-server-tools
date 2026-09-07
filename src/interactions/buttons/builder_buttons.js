const { MessageFlags } = require('discord.js');
const { getOrCreateStudioSession, buildStudioPayload, renderContainerFromBlocks } = require('../../components/builder/containerBuilder.js');
const { getEmoji } = require('../../config/emojis.js');
const safeReply = require('../../utils/safeReply.js');

module.exports = {
    name: 'btn_builder',
    async execute(interaction, client) {
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
