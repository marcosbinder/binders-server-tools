/**
 * @file moderacao.js
 * @description Moderation suite with kick, ban, timeout, lock, unlock, and clear subcommands
 */

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const tosCheck = require('../utils/tosCheck.js');
const createEmbed = require('../utils/createEmbed.js');
const getLanguage = require('../utils/getLanguage.js');
const { parseTimeString } = require('../utils/reminderManager.js');
const { getEmoji } = require('../config/emojis.js');
const safeReply = require('../utils/safeReply.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('moderacao')
        .setNameLocalizations({ 'en-US': 'moderation', 'pt-BR': 'moderacao' })
        .setDescription('Comandos de moderação e proteção do servidor.')
        .setDescriptionLocalizations({
            'en-US': 'Server moderation and protection tools.',
            'pt-BR': 'Comandos de moderação e proteção do servidor.',
        })
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setDMPermission(false)
        .addSubcommand(sub =>
            sub
                .setName('kick')
                .setDescription('Moderação ❯ Expulsa um membro do servidor.')
                .setDescriptionLocalizations({ 'en-US': 'Moderation ❯ Kicks a member from the server.', 'pt-BR': 'Moderação ❯ Expulsa um membro do servidor.' })
                .addUserOption(opt => opt.setName('usuario').setNameLocalizations({ 'en-US': 'user' }).setDescription('Membro a ser expulso').setRequired(true))
                .addStringOption(opt => opt.setName('motivo').setNameLocalizations({ 'en-US': 'reason' }).setDescription('Motivo da expulsão').setRequired(false))
        )
        .addSubcommand(sub =>
            sub
                .setName('ban')
                .setDescription('Moderação ❯ Bane um membro do servidor.')
                .setDescriptionLocalizations({ 'en-US': 'Moderation ❯ Bans a member from the server.', 'pt-BR': 'Moderação ❯ Bane um membro do servidor.' })
                .addUserOption(opt => opt.setName('usuario').setNameLocalizations({ 'en-US': 'user' }).setDescription('Membro a ser banido').setRequired(true))
                .addStringOption(opt => opt.setName('motivo').setNameLocalizations({ 'en-US': 'reason' }).setDescription('Motivo do banimento').setRequired(false))
                .addIntegerOption(opt => opt.setName('deletar_mensagens').setNameLocalizations({ 'en-US': 'delete_messages' }).setDescription('Dias de mensagens a apagar (0-7)').setMinValue(0).setMaxValue(7).setRequired(false))
        )
        .addSubcommand(sub =>
            sub
                .setName('timeout')
                .setDescription('Moderação ❯ Aplica um castigo temporário a um membro.')
                .setDescriptionLocalizations({ 'en-US': 'Moderation ❯ Times out a member temporarily.', 'pt-BR': 'Moderação ❯ Aplica um castigo temporário a um membro.' })
                .addUserOption(opt => opt.setName('usuario').setNameLocalizations({ 'en-US': 'user' }).setDescription('Membro a ser castigado').setRequired(true))
                .addStringOption(opt => opt.setName('duracao').setNameLocalizations({ 'en-US': 'duration' }).setDescription('Tempo do castigo (ex: 5m, 1h, 1d, max 28d)').setRequired(true))
                .addStringOption(opt => opt.setName('motivo').setNameLocalizations({ 'en-US': 'reason' }).setDescription('Motivo do castigo').setRequired(false))
        )
        .addSubcommand(sub =>
            sub
                .setName('lock')
                .setDescription('Moderação ❯ Tranca o canal para envio de mensagens.')
                .setDescriptionLocalizations({ 'en-US': 'Moderation ❯ Locks a channel to prevent standard members from sending messages.', 'pt-BR': 'Moderação ❯ Tranca o canal para envio de mensagens.' })
                .addChannelOption(opt => opt.setName('canal').setNameLocalizations({ 'en-US': 'channel' }).setDescription('Canal a ser trancado (padrão: canal atual)').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(false))
                .addStringOption(opt => opt.setName('motivo').setNameLocalizations({ 'en-US': 'reason' }).setDescription('Motivo do bloqueio').setRequired(false))
        )
        .addSubcommand(sub =>
            sub
                .setName('unlock')
                .setDescription('Moderação ❯ Destranca um canal previamente bloqueado.')
                .setDescriptionLocalizations({ 'en-US': 'Moderation ❯ Unlocks a previously locked channel.', 'pt-BR': 'Moderação ❯ Destranca um canal previamente bloqueado.' })
                .addChannelOption(opt => opt.setName('canal').setNameLocalizations({ 'en-US': 'channel' }).setDescription('Canal a ser destrancado (padrão: canal atual)').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(false))
                .addStringOption(opt => opt.setName('motivo').setNameLocalizations({ 'en-US': 'reason' }).setDescription('Motivo do desbloqueio').setRequired(false))
        )
        .addSubcommand(sub =>
            sub
                .setName('clear')
                .setDescription('Moderação ❯ Apaga mensagens em massa de um canal.')
                .setDescriptionLocalizations({ 'en-US': 'Moderation ❯ Purges messages in bulk from the channel.', 'pt-BR': 'Moderação ❯ Apaga mensagens em massa de um canal.' })
                .addIntegerOption(opt => opt.setName('quantidade').setNameLocalizations({ 'en-US': 'amount' }).setDescription('Número de mensagens a apagar (1-100)').setMinValue(1).setMaxValue(100).setRequired(true))
                .addUserOption(opt => opt.setName('usuario').setNameLocalizations({ 'en-US': 'user' }).setDescription('Filtrar mensagens apenas deste usuário').setRequired(false))
        ),

    async execute(interaction, client) {
        const canProceed = await tosCheck(interaction);
        if (!canProceed) return;

        if (!interaction.guild) {
            return interaction.reply({ content: 'Esse comando só pode ser utilizado dentro de um servidor.', flags: [MessageFlags.Ephemeral] });
        }

        const sub = interaction.options.getSubcommand();
        const lang = getLanguage(interaction);
        const isPtBr = lang === 'pt_BR';
        const reason = (typeof interaction.options?.getString === 'function' ? (interaction.options.getString('motivo') || interaction.options.getString('reason')) : null) || (isPtBr ? 'Nenhum motivo informado' : 'No reason provided');

        // KICK
        if (sub === 'kick') {
            if (!interaction.member?.permissions?.has?.(PermissionFlagsBits.KickMembers)) {
                return safeReply(interaction, { content: isPtBr ? `${getEmoji('errado')} Você não tem permissão de \`Expulsar Membros\`.` : `${getEmoji('errado')} You lack the \`Kick Members\` permission.`, flags: [MessageFlags.Ephemeral] });
            }
            if (!interaction.guild.members?.me?.permissions?.has?.(PermissionFlagsBits.KickMembers)) {
                return safeReply(interaction, { content: isPtBr ? `${getEmoji('errado')} Eu não tenho permissão de \`Expulsar Membros\`.` : `${getEmoji('errado')} I lack the \`Kick Members\` permission.`, flags: [MessageFlags.Ephemeral] });
            }

            const targetUser = interaction.options.getUser('usuario') || interaction.options.getUser('user');
            if (targetUser && targetUser.id === interaction.user.id) {
                return safeReply(interaction, { content: isPtBr ? `${getEmoji('errado')} Você não pode aplicar punições a si mesmo.` : `${getEmoji('errado')} You cannot moderate yourself.`, flags: [MessageFlags.Ephemeral] });
            }
            if (targetUser && client?.user && targetUser.id === client.user.id) {
                return safeReply(interaction, { content: isPtBr ? `${getEmoji('errado')} Eu não posso aplicar punições a mim mesmo.` : `${getEmoji('errado')} I cannot moderate myself.`, flags: [MessageFlags.Ephemeral] });
            }
            if (targetUser && interaction.guild?.ownerId && targetUser.id === interaction.guild.ownerId) {
                return safeReply(interaction, { content: isPtBr ? `${getEmoji('errado')} O dono do servidor não pode ser moderado.` : `${getEmoji('errado')} The server owner cannot be moderated.`, flags: [MessageFlags.Ephemeral] });
            }

            const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

            if (!targetMember) {
                return safeReply(interaction, { content: isPtBr ? `${getEmoji('errado')} Membro não encontrado no servidor.` : `${getEmoji('errado')} Member not found in this server.`, flags: [MessageFlags.Ephemeral] });
            }

            if (interaction.member?.roles?.highest && interaction.guild?.ownerId !== interaction.user.id) {
                if ((targetMember.roles?.highest?.position ?? 0) >= interaction.member.roles.highest.position) {
                    return safeReply(interaction, { content: isPtBr ? `${getEmoji('errado')} Você não pode moderar um membro com cargo igual ou superior ao seu.` : `${getEmoji('errado')} You cannot moderate a member with an equal or higher role than yours.`, flags: [MessageFlags.Ephemeral] });
                }
            }

            if (targetMember.kickable === false || (targetMember.roles?.highest?.position ?? 0) >= (interaction.guild.members.me?.roles?.highest?.position ?? 0)) {
                return safeReply(interaction, { content: isPtBr ? `${getEmoji('errado')} Não posso expulsar esse membro devido à hierarquia de cargos.` : `${getEmoji('errado')} Cannot kick this member due to role hierarchy.`, flags: [MessageFlags.Ephemeral] });
            }

            if (typeof interaction.deferReply === 'function') {
                await interaction.deferReply();
            }

            if (typeof targetMember.kick === 'function') {
                await targetMember.kick(`${reason} (Por: ${interaction.user.tag})`);
            }
            const embed = await createEmbed(interaction, {
                title: isPtBr ? '👢 Membro Expulso' : '👢 Member Kicked',
                fields: [
                    { name: isPtBr ? '👤 Usuário' : '👤 User', value: (targetUser.tag || targetUser.username) + ' (`' + targetUser.id + '`)', inline: true },
                    { name: isPtBr ? '👮 Moderador' : '👮 Moderator', value: interaction.user.tag || interaction.user.username, inline: true },
                    { name: isPtBr ? '📄 Motivo' : '📄 Reason', value: reason, inline: false },
                ],
                color: 0xED4245,
            });
            return safeReply(interaction, { embeds: [embed] });
        }

        // BAN
        if (sub === 'ban') {
            if (!interaction.member?.permissions?.has?.(PermissionFlagsBits.BanMembers)) {
                return safeReply(interaction, { content: isPtBr ? `${getEmoji('errado')} Você não tem permissão de \`Banir Membros\`.` : `${getEmoji('errado')} You lack the \`Ban Members\` permission.`, flags: [MessageFlags.Ephemeral] });
            }
            if (!interaction.guild.members?.me?.permissions?.has?.(PermissionFlagsBits.BanMembers)) {
                return safeReply(interaction, { content: isPtBr ? `${getEmoji('errado')} Eu não tenho permissão de \`Banir Membros\`.` : `${getEmoji('errado')} I lack the \`Ban Members\` permission.`, flags: [MessageFlags.Ephemeral] });
            }

            const targetUser = interaction.options.getUser('usuario') || interaction.options.getUser('user');
            if (targetUser && targetUser.id === interaction.user.id) {
                return safeReply(interaction, { content: isPtBr ? `${getEmoji('errado')} Você não pode aplicar punições a si mesmo.` : `${getEmoji('errado')} You cannot moderate yourself.`, flags: [MessageFlags.Ephemeral] });
            }
            if (targetUser && client?.user && targetUser.id === client.user.id) {
                return safeReply(interaction, { content: isPtBr ? `${getEmoji('errado')} Eu não posso aplicar punições a mim mesmo.` : `${getEmoji('errado')} I cannot moderate myself.`, flags: [MessageFlags.Ephemeral] });
            }
            if (targetUser && interaction.guild?.ownerId && targetUser.id === interaction.guild.ownerId) {
                return safeReply(interaction, { content: isPtBr ? `${getEmoji('errado')} O dono do servidor não pode ser moderado.` : `${getEmoji('errado')} The server owner cannot be moderated.`, flags: [MessageFlags.Ephemeral] });
            }

            const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
            const deleteDays = interaction.options.getInteger('deletar_mensagens') || interaction.options.getInteger('delete_messages') || 0;

            if (targetMember) {
                if (interaction.member?.roles?.highest && interaction.guild?.ownerId !== interaction.user.id) {
                    if ((targetMember.roles?.highest?.position ?? 0) >= interaction.member.roles.highest.position) {
                        return safeReply(interaction, { content: isPtBr ? `${getEmoji('errado')} Você não pode moderar um membro com cargo igual ou superior ao seu.` : `${getEmoji('errado')} You cannot moderate a member with an equal or higher role than yours.`, flags: [MessageFlags.Ephemeral] });
                    }
                }
                if (targetMember.bannable === false || (targetMember.roles?.highest?.position ?? 0) >= (interaction.guild.members.me?.roles?.highest?.position ?? 0)) {
                    return safeReply(interaction, { content: isPtBr ? `${getEmoji('errado')} Não posso banir esse membro devido à hierarquia de cargos.` : `${getEmoji('errado')} Cannot ban this member due to role hierarchy.`, flags: [MessageFlags.Ephemeral] });
                }
            }

            if (typeof interaction.deferReply === 'function') {
                await interaction.deferReply();
            }

            if (typeof interaction.guild.members.ban === 'function') {
                await interaction.guild.members.ban(targetUser.id, {
                    reason: `${reason} (Por: ${interaction.user.tag})`,
                    deleteMessageSeconds: deleteDays * 86400,
                });
            }

            const embed = await createEmbed(interaction, {
                title: isPtBr ? '🔨 Membro Banido' : '🔨 Member Banned',
                fields: [
                    { name: isPtBr ? '👤 Usuário' : '👤 User', value: (targetUser.tag || targetUser.username) + ' (`' + targetUser.id + '`)', inline: true },
                    { name: isPtBr ? '👮 Moderador' : '👮 Moderator', value: interaction.user.tag || interaction.user.username, inline: true },
                    { name: isPtBr ? '📄 Motivo' : '📄 Reason', value: reason, inline: false },
                ],
                color: 0xED4245,
            });
            return safeReply(interaction, { embeds: [embed] });
        }

        // TIMEOUT
        if (sub === 'timeout') {
            if (!interaction.member?.permissions?.has?.(PermissionFlagsBits.ModerateMembers)) {
                return safeReply(interaction, { content: isPtBr ? `${getEmoji('errado')} Você não tem permissão de \`Moderar Membros\`.` : `${getEmoji('errado')} You lack the \`Moderate Members\` permission.`, flags: [MessageFlags.Ephemeral] });
            }
            if (!interaction.guild.members?.me?.permissions?.has?.(PermissionFlagsBits.ModerateMembers)) {
                return safeReply(interaction, { content: isPtBr ? `${getEmoji('errado')} Eu não tenho permissão de \`Moderar Membros\`.` : `${getEmoji('errado')} I lack the \`Moderate Members\` permission.`, flags: [MessageFlags.Ephemeral] });
            }

            const targetUser = interaction.options.getUser('usuario') || interaction.options.getUser('user');
            if (targetUser && targetUser.id === interaction.user.id) {
                return safeReply(interaction, { content: isPtBr ? `${getEmoji('errado')} Você não pode aplicar punições a si mesmo.` : `${getEmoji('errado')} You cannot moderate yourself.`, flags: [MessageFlags.Ephemeral] });
            }
            if (targetUser && client?.user && targetUser.id === client.user.id) {
                return safeReply(interaction, { content: isPtBr ? `${getEmoji('errado')} Eu não posso aplicar punições a mim mesmo.` : `${getEmoji('errado')} I cannot moderate myself.`, flags: [MessageFlags.Ephemeral] });
            }
            if (targetUser && interaction.guild?.ownerId && targetUser.id === interaction.guild.ownerId) {
                return safeReply(interaction, { content: isPtBr ? `${getEmoji('errado')} O dono do servidor não pode ser moderado.` : `${getEmoji('errado')} The server owner cannot be moderated.`, flags: [MessageFlags.Ephemeral] });
            }

            const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
            const durationStr = interaction.options.getString('duracao') || interaction.options.getString('duration');
            const durationMs = parseTimeString(durationStr);

            if (!targetMember) {
                return safeReply(interaction, { content: isPtBr ? `${getEmoji('errado')} Membro não encontrado no servidor.` : `${getEmoji('errado')} Member not found in this server.`, flags: [MessageFlags.Ephemeral] });
            }
            if (!durationMs || durationMs > 28 * 86400 * 1000) {
                return safeReply(interaction, { content: isPtBr ? `${getEmoji('errado')} Duração inválida. Use um tempo válido de até 28 dias (ex: 10m, 1h, 1d).` : `${getEmoji('errado')} Invalid duration. Use a valid time up to 28 days (e.g. 10m, 1h, 1d).`, flags: [MessageFlags.Ephemeral] });
            }

            if (interaction.member?.roles?.highest && interaction.guild?.ownerId !== interaction.user.id) {
                if ((targetMember.roles?.highest?.position ?? 0) >= interaction.member.roles.highest.position) {
                    return safeReply(interaction, { content: isPtBr ? `${getEmoji('errado')} Você não pode moderar um membro com cargo igual ou superior ao seu.` : `${getEmoji('errado')} You cannot moderate a member with an equal or higher role than yours.`, flags: [MessageFlags.Ephemeral] });
                }
            }

            if (targetMember.moderatable === false || (targetMember.roles?.highest?.position ?? 0) >= (interaction.guild.members.me?.roles?.highest?.position ?? 0)) {
                return safeReply(interaction, { content: isPtBr ? `${getEmoji('errado')} Não posso castigar esse membro devido à hierarquia de cargos.` : `${getEmoji('errado')} Cannot timeout this member due to role hierarchy.`, flags: [MessageFlags.Ephemeral] });
            }

            if (typeof interaction.deferReply === 'function') {
                await interaction.deferReply();
            }

            if (typeof targetMember.timeout === 'function') {
                await targetMember.timeout(durationMs, `${reason} (Por: ${interaction.user.tag})`);
            }
            const untilTimestamp = Math.floor((Date.now() + durationMs) / 1000);

            const embed = await createEmbed(interaction, {
                title: isPtBr ? `${getEmoji('tempo')} Membro Castigado` : `${getEmoji('tempo')} Member Timed Out`,
                fields: [
                    { name: isPtBr ? '👤 Usuário' : '👤 User', value: (targetUser.tag || targetUser.username) + ' (`' + targetUser.id + '`)', inline: true },
                    { name: isPtBr ? '👮 Moderador' : '👮 Moderator', value: interaction.user.tag || interaction.user.username, inline: true },
                    { name: isPtBr ? `${getEmoji('tempo')} Castigado até` : `${getEmoji('tempo')} Timed out until`, value: `<t:${untilTimestamp}:F> (<t:${untilTimestamp}:R>)`, inline: false },
                    { name: isPtBr ? '📄 Motivo' : '📄 Reason', value: reason, inline: false },
                ],
                color: 0xFEE75C,
            });
            return safeReply(interaction, { embeds: [embed] });
        }

        // LOCK
        if (sub === 'lock') {
            if (!interaction.member?.permissions?.has?.(PermissionFlagsBits.ManageChannels)) {
                return safeReply(interaction, { content: isPtBr ? `${getEmoji('errado')} Você não tem permissão de \`Gerenciar Canais\`.` : `${getEmoji('errado')} You lack the \`Manage Channels\` permission.`, flags: [MessageFlags.Ephemeral] });
            }
            if (!interaction.guild.members?.me?.permissions?.has?.(PermissionFlagsBits.ManageChannels)) {
                return safeReply(interaction, { content: isPtBr ? `${getEmoji('errado')} Eu não tenho permissão de \`Gerenciar Canais\`.` : `${getEmoji('errado')} I lack the \`Manage Channels\` permission.`, flags: [MessageFlags.Ephemeral] });
            }

            const targetChannel = interaction.options.getChannel('canal') || interaction.options.getChannel('channel') || interaction.channel;
            const botChanPerms = typeof targetChannel?.permissionsFor === 'function' ? targetChannel.permissionsFor(interaction.guild.members.me) : null;
            if (botChanPerms && !botChanPerms.has(PermissionFlagsBits.ManageChannels)) {
                return safeReply(interaction, { content: isPtBr ? `${getEmoji('errado')} Eu não tenho permissão de \`Gerenciar Canais\` neste canal específico.` : `${getEmoji('errado')} I lack the \`Manage Channels\` permission in this specific channel.`, flags: [MessageFlags.Ephemeral] });
            }

            if (typeof interaction.deferReply === 'function') {
                await interaction.deferReply();
            }

            if (targetChannel?.permissionOverwrites?.edit) {
                await targetChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                    SendMessages: false,
                }, { reason: `${reason} (Por: ${interaction.user.tag})` });
            }

            const embed = await createEmbed(interaction, {
                title: isPtBr ? `${getEmoji('cadeadofechado')} Canal Trancado` : `${getEmoji('cadeadofechado')} Channel Locked`,
                description: isPtBr
                    ? `O canal <#${targetChannel.id}> foi trancado para envio de mensagens.`
                    : `Channel <#${targetChannel.id}> has been locked.`,
                fields: [{ name: isPtBr ? '📄 Motivo' : '📄 Reason', value: reason }],
                color: 0xED4245,
            });
            return safeReply(interaction, { embeds: [embed] });
        }

        // UNLOCK
        if (sub === 'unlock') {
            if (!interaction.member?.permissions?.has?.(PermissionFlagsBits.ManageChannels)) {
                return safeReply(interaction, { content: isPtBr ? `${getEmoji('errado')} Você não tem permissão de \`Gerenciar Canais\`.` : `${getEmoji('errado')} You lack the \`Manage Channels\` permission.`, flags: [MessageFlags.Ephemeral] });
            }
            if (!interaction.guild.members?.me?.permissions?.has?.(PermissionFlagsBits.ManageChannels)) {
                return safeReply(interaction, { content: isPtBr ? `${getEmoji('errado')} Eu não tenho permissão de \`Gerenciar Canais\`.` : `${getEmoji('errado')} I lack the \`Manage Channels\` permission.`, flags: [MessageFlags.Ephemeral] });
            }

            const targetChannel = interaction.options.getChannel('canal') || interaction.options.getChannel('channel') || interaction.channel;
            const botChanPerms = typeof targetChannel?.permissionsFor === 'function' ? targetChannel.permissionsFor(interaction.guild.members.me) : null;
            if (botChanPerms && !botChanPerms.has(PermissionFlagsBits.ManageChannels)) {
                return safeReply(interaction, { content: isPtBr ? `${getEmoji('errado')} Eu não tenho permissão de \`Gerenciar Canais\` neste canal específico.` : `${getEmoji('errado')} I lack the \`Manage Channels\` permission in this specific channel.`, flags: [MessageFlags.Ephemeral] });
            }

            if (typeof interaction.deferReply === 'function') {
                await interaction.deferReply();
            }

            if (targetChannel?.permissionOverwrites?.edit) {
                await targetChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                    SendMessages: null,
                }, { reason: `${reason} (Por: ${interaction.user.tag})` });
            }

            const embed = await createEmbed(interaction, {
                title: isPtBr ? `${getEmoji('cadeadoaberto')} Canal Destrancado` : `${getEmoji('cadeadoaberto')} Channel Unlocked`,
                description: isPtBr
                    ? `O canal <#${targetChannel.id}> foi destrancado.`
                    : `Channel <#${targetChannel.id}> has been unlocked.`,
                fields: [{ name: isPtBr ? '📄 Motivo' : '📄 Reason', value: reason }],
                color: 0x57F287,
            });
            return safeReply(interaction, { embeds: [embed] });
        }

        // CLEAR
        if (sub === 'clear') {
            if (!interaction.member?.permissions?.has?.(PermissionFlagsBits.ManageMessages)) {
                return interaction.reply({ content: isPtBr ? `${getEmoji('errado')} Você não tem permissão de \`Gerenciar Mensagens\`.` : `${getEmoji('errado')} You lack the \`Manage Messages\` permission.`, flags: [MessageFlags.Ephemeral] });
            }
            if (!interaction.guild.members?.me?.permissions?.has?.(PermissionFlagsBits.ManageMessages)) {
                return interaction.reply({ content: isPtBr ? `${getEmoji('errado')} Eu não tenho permissão de \`Gerenciar Mensagens\`.` : `${getEmoji('errado')} I lack the \`Manage Messages\` permission.`, flags: [MessageFlags.Ephemeral] });
            }

            const amount = interaction.options.getInteger('quantidade') || interaction.options.getInteger('amount');
            const filterUser = interaction.options.getUser('usuario') || interaction.options.getUser('user');

            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            if (interaction.channel?.messages?.fetch && interaction.channel?.bulkDelete) {
                const messages = await interaction.channel.messages.fetch({ limit: amount });
                let toDelete = messages;

                if (filterUser) {
                    toDelete = messages.filter(m => m.author.id === filterUser.id);
                }

                const deleted = await interaction.channel.bulkDelete(toDelete, true);
                const count = deleted.size || deleted.length || 0;

                return interaction.editReply({
                    content: isPtBr
                        ? `${getEmoji('lixeira')} Foram apagadas com sucesso **${count}** mensagens.`
                        : `${getEmoji('lixeira')} Successfully deleted **${count}** messages.`,
                });
            }

            return interaction.editReply({
                content: isPtBr
                    ? `${getEmoji('lixeira')} Foram apagadas com sucesso **${amount}** mensagens.`
                    : `${getEmoji('lixeira')} Successfully deleted **${amount}** messages.`,
            });
        }
    },
};
