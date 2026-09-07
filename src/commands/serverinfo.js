/**
 * @file serverinfo.js
 * @description Standalone slash command /serverinfo displaying comprehensive server statistics and details
 */

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const tosCheck = require('../utils/tosCheck.js');
const createEmbed = require('../utils/createEmbed.js');
const getLanguage = require('../utils/getLanguage.js');
const emojis = require('../config/emojis.js');
const safeReply = require('../utils/safeReply.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Mostra informações completas e estatísticas do servidor atual.')
        .setDescriptionLocalizations({
            'en-US': 'Displays complete information and statistics for the current server.',
            'pt-BR': 'Mostra informações completas e estatísticas do servidor atual.',
        })
        .setIntegrationTypes([0, 1])
        .setContexts([0])
        .setDMPermission(false),

    async execute(interaction, client) {
        const canProceed = await tosCheck(interaction);
        if (!canProceed) return;

        const lang = getLanguage(interaction);
        const isPtBr = lang === 'pt_BR';

        const { guild } = interaction;
        if (!guild) {
            return safeReply(interaction, {
                content: isPtBr
                    ? '❌ Este comando só pode ser utilizado dentro de um servidor.'
                    : '❌ This command can only be used within a server.',
                ephemeral: true,
            });
        }

        const iconUrl = typeof guild.iconURL === 'function' ? guild.iconURL({ size: 1024 }) : null;
        const bannerUrl = typeof guild.bannerURL === 'function' ? guild.bannerURL({ size: 1024 }) : (typeof guild.splashURL === 'function' ? guild.splashURL({ size: 1024 }) : null);

        const createdTimestamp = guild.createdTimestamp ? Math.floor(guild.createdTimestamp / 1000) : null;
        const membersArr = guild.members?.cache ? Array.from(guild.members.cache.values()) : [];
        const totalMembers = guild.memberCount || membersArr.length || 0;
        const botCount = membersArr.filter(m => m.user?.bot).length;
        const humanCount = Math.max(0, totalMembers - botCount);

        const channelsArr = guild.channels?.cache ? Array.from(guild.channels.cache.values()) : [];
        const textChannels = channelsArr.filter(c => c.type === ChannelType.GuildText).length;
        const voiceChannels = channelsArr.filter(c => c.type === ChannelType.GuildVoice).length;
        const categoryChannels = channelsArr.filter(c => c.type === ChannelType.GuildCategory).length;
        const totalChannels = channelsArr.length;

        const totalRoles = guild.roles?.cache ? (guild.roles.cache.size ?? Array.from(guild.roles.cache.values()).length) : 0;
        const totalEmojis = guild.emojis?.cache ? (guild.emojis.cache.size ?? Array.from(guild.emojis.cache.values()).length) : 0;
        const totalStickers = guild.stickers?.cache ? (guild.stickers.cache.size ?? Array.from(guild.stickers.cache.values()).length) : 0;

        const boostTier = guild.premiumTier || 0;
        const boostCount = guild.premiumSubscriptionCount || 0;

        const verificationLevels = {
            0: isPtBr ? 'Nenhuma' : 'None',
            1: isPtBr ? 'Baixa (Email verificado)' : 'Low (Verified email)',
            2: isPtBr ? 'Média (Registrado há > 5m)' : 'Medium (Registered > 5m)',
            3: isPtBr ? 'Alta (No servidor há > 10m)' : 'High (In server > 10m)',
            4: isPtBr ? 'Muito Alta (Celular verificado)' : 'Very High (Verified phone)',
            'NONE': isPtBr ? 'Nenhuma' : 'None',
            'LOW': isPtBr ? 'Baixa (Email verificado)' : 'Low (Verified email)',
            'MEDIUM': isPtBr ? 'Média (Registrado há > 5m)' : 'Medium (Registered > 5m)',
            'HIGH': isPtBr ? 'Alta (No servidor há > 10m)' : 'High (In server > 10m)',
            'VERY_HIGH': isPtBr ? 'Muito Alta (Celular verificado)' : 'Very High (Verified phone)',
        };
        const verificationText = verificationLevels[guild.verificationLevel] || (isPtBr ? 'Desconhecido' : 'Unknown');

        const ownerDisplay = guild.ownerId
            ? `<@${guild.ownerId}> (\`${guild.ownerId}\`)`
            : (isPtBr ? 'Desconhecido' : 'Unknown');

        const fields = [
            {
                name: isPtBr ? '🏢 Identificação' : '🏢 Identification',
                value: `**${isPtBr ? 'Nome' : 'Name'}:** ${guild.name}\n**ID:** \`${guild.id}\`\n**${isPtBr ? 'Proprietário' : 'Owner'}:** ${ownerDisplay}`,
                inline: false,
            },
            {
                name: isPtBr ? '👥 Membros' : '👥 Members',
                value: `**Total:** ${totalMembers.toLocaleString('pt-BR')}\n**${isPtBr ? 'Humanos' : 'Humans'}:** ${humanCount.toLocaleString('pt-BR')}\n**Bots:** ${botCount.toLocaleString('pt-BR')}`,
                inline: true,
            },
            {
                name: isPtBr ? '💬 Canais' : '💬 Channels',
                value: `**Total:** ${totalChannels}\n**Texto:** ${textChannels}\n**Voz:** ${voiceChannels}\n**${isPtBr ? 'Categorias' : 'Categories'}:** ${categoryChannels}`,
                inline: true,
            },
            {
                name: isPtBr ? '💎 Impulsos & Segurança' : '💎 Boosts & Security',
                value: `**${isPtBr ? 'Nível de Boost' : 'Boost Tier'}:** ${boostTier} (${boostCount} boosts)\n**${isPtBr ? 'Verificação' : 'Verification'}:** ${verificationText}`,
                inline: true,
            },
            {
                name: isPtBr ? '🎨 Recursos & Customização' : '🎨 Features & Roles',
                value: `**${isPtBr ? 'Cargos' : 'Roles'}:** ${totalRoles}\n**Emojis:** ${totalEmojis}\n**Figurinhas:** ${totalStickers}`,
                inline: true,
            },
        ];

        if (createdTimestamp) {
            fields.push({
                name: isPtBr ? '📅 Data de Criação' : '📅 Server Created',
                value: `<t:${createdTimestamp}:F> (<t:${createdTimestamp}:R>)`,
                inline: false,
            });
        }

        const embed = await createEmbed(interaction, {
            title: isPtBr ? `${emojis.bot} Informações de ${guild.name}` : `${emojis.bot} Server Info: ${guild.name}`,
            fields,
            thumbnail: iconUrl,
            color: 0x5865F2,
        });

        if (bannerUrl && embed.setImage) {
            embed.setImage(bannerUrl);
        }

        const buttons = [];
        if (iconUrl) {
            buttons.push(
                new ButtonBuilder()
                    .setLabel(isPtBr ? 'Ícone do Servidor' : 'Server Icon')
                    .setStyle(ButtonStyle.Link)
                    .setURL(iconUrl)
            );
        }
        if (bannerUrl) {
            buttons.push(
                new ButtonBuilder()
                    .setLabel(isPtBr ? 'Banner do Servidor' : 'Server Banner')
                    .setStyle(ButtonStyle.Link)
                    .setURL(bannerUrl)
            );
        }

        const payload = { embeds: [embed] };
        if (buttons.length > 0) {
            payload.components = [new ActionRowBuilder().addComponents(buttons)];
        }

        return safeReply(interaction, payload);
    },
};
