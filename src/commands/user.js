/**
 * @file user.js
 * @description Unified slash command /user with subcommands:
 *  - /user info: comprehensive profile, badges, developer badge, roles, banner & avatar
 *  - /user avatar: global and server avatars with format download buttons
 */

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const tosCheck = require('../utils/tosCheck.js');
const createEmbed = require('../utils/createEmbed.js');
const getLanguage = require('../utils/getLanguage.js');
const safeReply = require('../utils/safeReply.js');
const { getEmoji } = require('../config/emojis.js');
const colors = require('../config/colors.js');
const { buildUserProfilePayload } = require('../utils/userProfileBuilder.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('user')
        .setNameLocalizations({
            'en-US': 'user',
            'pt-BR': 'user',
        })
        .setDescription('Usuário ❯ Comandos de informações e mídia de usuários.')
        .setDescriptionLocalizations({
            'en-US': 'User ❯ User profile information and media commands.',
            'pt-BR': 'Usuário ❯ Comandos de informações e mídia de usuários.',
        })
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .setDMPermission(true)
        .addSubcommand(sub =>
            sub
                .setName('info')
                .setNameLocalizations({
                    'en-US': 'info',
                    'pt-BR': 'info',
                })
                .setDescription('Usuário ❯ Mostra informações detalhadas, medalhas, cargos e perfil de um usuário.')
                .setDescriptionLocalizations({
                    'en-US': 'User ❯ Displays detailed information, badges, roles, and profile of a user.',
                    'pt-BR': 'Usuário ❯ Mostra informações detalhadas, medalhas, cargos e perfil de um usuário.',
                })
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
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('avatar')
                .setNameLocalizations({
                    'en-US': 'avatar',
                    'pt-BR': 'avatar',
                })
                .setDescription('Usuário ❯ Exibe o avatar global e do servidor de um usuário.')
                .setDescriptionLocalizations({
                    'en-US': 'User ❯ Displays the global and server avatar of a user.',
                    'pt-BR': 'Usuário ❯ Exibe o avatar global e do servidor de um usuário.',
                })
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setNameLocalizations({
                            'en-US': 'user',
                            'pt-BR': 'usuario',
                        })
                        .setDescription('O usuário para visualizar o avatar.')
                        .setDescriptionLocalizations({
                            'en-US': 'The user whose avatar to view.',
                            'pt-BR': 'O usuário para visualizar o avatar.',
                        })
                        .setRequired(false)
                )
        ),

    async execute(interaction, client) {
        const canProceed = await tosCheck(interaction);
        if (!canProceed) return;

        const sub = typeof interaction.options?.getSubcommand === 'function' ? interaction.options.getSubcommand() : 'info';
        const lang = getLanguage(interaction);
        const isPtBr = lang === 'pt_BR';

        const targetUser = (typeof interaction.options?.getUser === 'function' ? (interaction.options.getUser('usuario') || interaction.options.getUser('user')) : null) || interaction.user;
        let targetMember = null;
        if (interaction.guild) {
            targetMember = (typeof interaction.options?.getMember === 'function' ? (interaction.options.getMember('usuario') || interaction.options.getMember('user')) : null);
            if (!targetMember && targetUser.id === interaction.user?.id && interaction.member) {
                targetMember = interaction.member;
            }
            if (!targetMember && interaction.guild.members?.cache) {
                targetMember = interaction.guild.members.cache.get(targetUser.id) || null;
            }
            if (!targetMember && typeof interaction.guild.members?.fetch === 'function') {
                try {
                    targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
                } catch {
                    targetMember = null;
                }
            }
        }

        // ---------------------------------------------------------------------
        // Subcomando: /user info
        // ---------------------------------------------------------------------
        if (sub === 'info') {
            const payload = await buildUserProfilePayload(interaction, client, targetUser, targetMember);
            return safeReply(interaction, payload);
        }

        // ---------------------------------------------------------------------
        // Subcomando: /user avatar
        // ---------------------------------------------------------------------
        if (sub === 'avatar') {
            const globalAvatarUrl = targetUser.displayAvatarURL({ size: 1024, forceStatic: false });
            const serverAvatarUrl = targetMember && typeof targetMember.avatarURL === 'function'
                ? targetMember.avatarURL({ size: 1024, forceStatic: false })
                : null;

            const primaryUrl = serverAvatarUrl || globalAvatarUrl;

            const serverName = interaction.guild?.name || (isPtBr ? 'Servidor' : 'Server');
            const description = (serverAvatarUrl && serverAvatarUrl !== globalAvatarUrl)
                ? (isPtBr ? `Exibindo o avatar no servidor **${serverName}**.` : `Displaying avatar in **${serverName}**.`)
                : (isPtBr ? 'Exibindo o avatar global do usuário.' : 'Displaying global user avatar.');

            const embed = await createEmbed(interaction, {
                title: isPtBr ? `Avatar de ${targetUser.username}` : `Avatar of ${targetUser.username}`,
                description,
                color: (targetMember?.displayHexColor && targetMember.displayHexColor !== '#000000') ? targetMember.displayHexColor : (colors.primary || 0xAEA7BD),
                targetUser,
            });

            if (embed.setImage) {
                embed.setImage(primaryUrl);
            }

            const buttons = [
                new ButtonBuilder()
                    .setLabel('PNG')
                    .setStyle(ButtonStyle.Link)
                    .setURL(targetUser.displayAvatarURL({ extension: 'png', size: 2048 }))
                    .setEmoji(getEmoji('pasta')),
                new ButtonBuilder()
                    .setLabel('WEBP')
                    .setStyle(ButtonStyle.Link)
                    .setURL(targetUser.displayAvatarURL({ extension: 'webp', size: 2048 }))
                    .setEmoji(getEmoji('pasta')),
                new ButtonBuilder()
                    .setLabel('JPG')
                    .setStyle(ButtonStyle.Link)
                    .setURL(targetUser.displayAvatarURL({ extension: 'jpg', size: 2048 }))
                    .setEmoji(getEmoji('pasta')),
            ];

            if (targetUser.avatar && targetUser.avatar.startsWith('a_')) {
                buttons.push(
                    new ButtonBuilder()
                        .setLabel('GIF')
                        .setStyle(ButtonStyle.Link)
                        .setURL(targetUser.displayAvatarURL({ extension: 'gif', size: 2048 }))
                        .setEmoji(getEmoji('brilho'))
                );
            }

            if (serverAvatarUrl && serverAvatarUrl !== globalAvatarUrl) {
                buttons.push(
                    new ButtonBuilder()
                        .setLabel(isPtBr ? 'Avatar do Servidor' : 'Server Avatar')
                        .setStyle(ButtonStyle.Link)
                        .setURL(serverAvatarUrl)
                        .setEmoji(getEmoji('mundo'))
                );
            }

            const actionRow = new ActionRowBuilder().addComponents(buttons.slice(0, 5));
            return safeReply(interaction, { embeds: [embed], components: [actionRow] });
        }
    },
};
