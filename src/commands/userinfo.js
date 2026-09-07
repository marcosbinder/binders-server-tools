/**
 * @file userinfo.js
 * @description Standalone slash command /userinfo displaying comprehensive user profile, badges, and server hierarchy
 */

const { SlashCommandBuilder } = require('discord.js');
const tosCheck = require('../utils/tosCheck.js');
const safeReply = require('../utils/safeReply.js');
const { buildUserProfilePayload } = require('../utils/userProfileBuilder.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Mostra informações detalhadas, medalhas, cargos e perfil de um usuário.')
        .setDescriptionLocalizations({
            'en-US': 'Displays detailed information, badges, roles, and profile of a user.',
            'pt-BR': 'Mostra informações detalhadas, medalhas, cargos e perfil de um usuário.',
        })
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .setDMPermission(true)
        .addUserOption(option =>
            option
                .setName('usuario')
                .setNameLocalizations({
                    'en-US': 'user',
                    'pt-BR': 'usuario',
                })
                .setDescription('O usuário para ver as informações (deixe vazio para ver seu próprio perfil).')
                .setDescriptionLocalizations({
                    'en-US': 'The user to inspect (leave blank for your own profile).',
                    'pt-BR': 'O usuário para ver as informações (deixe vazio para ver seu próprio perfil).',
                })
                .setRequired(false)
        ),

    async execute(interaction, client) {
        const canProceed = await tosCheck(interaction);
        if (!canProceed) return;

        const targetUser = interaction.options.getUser('usuario') || interaction.options.getUser('user') || interaction.user;
        let targetMember = null;
        if (interaction.guild) {
            targetMember = interaction.options.getMember('usuario') || interaction.options.getMember('user');
            if (!targetMember && interaction.guild.members) {
                targetMember = interaction.guild.members.cache.get(targetUser.id) || null;
            }
        }

        const payload = await buildUserProfilePayload(interaction, client, targetUser, targetMember);
        return safeReply(interaction, payload);
    },
};
