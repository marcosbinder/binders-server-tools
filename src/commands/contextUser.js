/**
 * @file contextUser.js
 * @description User Context Menu command displaying detailed user profile, hierarchy, badges and banner
 */

const { ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');
const tosCheck = require('../utils/tosCheck.js');
const safeReply = require('../utils/safeReply.js');
const { buildUserProfilePayload } = require('../utils/userProfileBuilder.js');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Informações do Usuário')
        .setNameLocalizations({
            'en-US': 'User Info',
            'pt-BR': 'Informações do Usuário',
        })
        .setType(ApplicationCommandType.User)
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .setDMPermission(true),

    async execute(interaction, client) {
        const canProceed = await tosCheck(interaction);
        if (!canProceed) return;

        const targetUser = interaction.targetUser || interaction.user;
        const targetMember = interaction.targetMember || (interaction.guild ? interaction.member : null);

        const payload = await buildUserProfilePayload(interaction, client, targetUser, targetMember);
        return safeReply(interaction, payload);
    },
};
