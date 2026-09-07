const { getOrCreateStudioSession, buildStudioPayload } = require('../../components/builder/containerBuilder.js');

module.exports = {
    name: 'sel_builder_canal',
    async execute(interaction, client) {
        const selectedChannelId = interaction.values?.[0];
        const session = getOrCreateStudioSession(interaction.user.id);

        if (selectedChannelId) {
            session.targetChannelId = selectedChannelId;
        }

        const payload = buildStudioPayload(session, interaction.guild);
        return interaction.update(payload);
    }
};
