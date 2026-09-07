/**
 * @file server.js
 * @description Unified slash command /server with subcommands:
 *  - /server info: comprehensive server statistics, member breakdown, channels, roles, media
 *  - /server avatar: server icon, banner, and splash images with format download buttons
 */

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const tosCheck = require('../utils/tosCheck.js');
const createEmbed = require('../utils/createEmbed.js');
const getLanguage = require('../utils/getLanguage.js');
const emojis = require('../config/emojis.js');
const safeReply = require('../utils/safeReply.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server')
        .setNameLocalizations({
            'en-US': 'server',
            'pt-BR': 'server',
        })
        .setDescription('Comandos de informações e mídia do servidor atual.')
        .setDescriptionLocalizations({
            'en-US': 'Server information and media commands for the current server.',
            'pt-BR': 'Comandos de informações e mídia do servidor atual.',
        })
        .setIntegrationTypes([0])
        .setContexts([0])
        .setDMPermission(false)
        .addSubcommand(sub =>
            sub
                .setName('info')
                .setNameLocalizations({
                    'en-US': 'info',
                    'pt-BR': 'info',
                })
                .setDescription('Mostra informações completas e estatísticas do servidor atual.')
                .setDescriptionLocalizations({
                    'en-US': 'Displays complete information and statistics for the current server.',
                    'pt-BR': 'Mostra informações completas e estatísticas do servidor atual.',
                })
        )
        .addSubcommand(sub =>
            sub
                .setName('avatar')
                .setNameLocalizations({
                    'en-US': 'avatar',
                    'pt-BR': 'avatar',
                })
                .setDescription('Exibe o ícone, banner e splash do servidor atual.')
                .setDescriptionLocalizations({
                    'en-US': 'Displays the icon, banner, and splash of the current server.',
                    'pt-BR': 'Exibe o ícone, banner e splash do servidor atual.',
                })
        ),

    async execute(interaction, client) {
        const canProceed = await tosCheck(interaction);
        if (!canProceed) return;

        const sub = typeof interaction.options?.getSubcommand === 'function' ? interaction.options.getSubcommand() : 'info';
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

        // ---------------------------------------------------------------------
        // Subcomando: /server info
        // ---------------------------------------------------------------------
        if (sub === 'info') {
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

            const boostTier = guild.premiumTier ?? 0;
            const boostCount = guild.premiumSubscriptionCount ?? 0;

            const verificationLevels = {
                0: isPtBr ? 'Nenhuma' : 'None',
                1: isPtBr ? 'Baixa (E-mail verificado)' : 'Low (Verified email)',
                2: isPtBr ? 'Média (Registrado há 5 min)' : 'Medium (Registered for 5 mins)',
                3: isPtBr ? 'Alta (Membro há 10 min)' : 'High (Member for 10 mins)',
                4: isPtBr ? 'Mais Alta (Telefone verificado)' : 'Highest (Verified phone)',
            };
            const verificationText = verificationLevels[guild.verificationLevel] || String(guild.verificationLevel ?? 'N/A');

            const ownerMention = guild.ownerId ? `<@${guild.ownerId}>` : (isPtBr ? 'Desconhecido' : 'Unknown');

            const embed = await createEmbed(interaction, {
                title: isPtBr ? `Informações de ${guild.name}` : `Server Information for ${guild.name}`,
                description: guild.description || (isPtBr ? 'Servidor sem descrição pública.' : 'No public description provided.'),
                color: 0x5865F2,
                fields: [
                    {
                        name: isPtBr ? '🆔 Identificação' : '🆔 Identification',
                        value: `**ID:** \`${guild.id}\`\n**${isPtBr ? 'Dono' : 'Owner'}:** ${ownerMention}\n**${isPtBr ? 'Criado em' : 'Created'}:** ${createdTimestamp ? `<t:${createdTimestamp}:F> (<t:${createdTimestamp}:R>)` : 'N/A'}`,
                        inline: false,
                    },
                    {
                        name: isPtBr ? '👥 Membros' : '👥 Members',
                        value: `**${isPtBr ? 'Total' : 'Total'}:** ${totalMembers}\n**${isPtBr ? 'Humanos' : 'Humans'}:** ${humanCount}\n**Bots:** ${botCount}`,
                        inline: true,
                    },
                    {
                        name: isPtBr ? '💬 Canais' : '💬 Channels',
                        value: `**${isPtBr ? 'Total' : 'Total'}:** ${totalChannels}\n**${isPtBr ? 'Texto' : 'Text'}:** ${textChannels}\n**${isPtBr ? 'Voz' : 'Voice'}:** ${voiceChannels}\n**${isPtBr ? 'Categorias' : 'Categories'}:** ${categoryChannels}`,
                        inline: true,
                    },
                    {
                        name: isPtBr ? '💎 Impulsos (Boost)' : '💎 Boost Status',
                        value: `**${isPtBr ? 'Nível' : 'Tier'}:** ${boostTier}\n**${isPtBr ? 'Impulsos' : 'Boosts'}:** ${boostCount}`,
                        inline: true,
                    },
                    {
                        name: isPtBr ? '🎭 Estrutura & Mídia' : '🎭 Structure & Media',
                        value: `**${isPtBr ? 'Cargos' : 'Roles'}:** ${totalRoles}\n**Emojis:** ${totalEmojis}\n**${isPtBr ? 'Figurinhas' : 'Stickers'}:** ${totalStickers}`,
                        inline: true,
                    },
                    {
                        name: isPtBr ? '🔒 Segurança' : '🔒 Security',
                        value: `**${isPtBr ? 'Verificação' : 'Verification'}:** ${verificationText}`,
                        inline: true,
                    },
                ],
            });

            if (iconUrl && embed.setThumbnail) {
                embed.setThumbnail(iconUrl);
            }
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

            const components = buttons.length > 0 ? [new ActionRowBuilder().addComponents(buttons)] : [];
            return safeReply(interaction, { embeds: [embed], components });
        }

        // ---------------------------------------------------------------------
        // Subcomando: /server avatar
        // ---------------------------------------------------------------------
        if (sub === 'avatar') {
            const iconUrl = typeof guild.iconURL === 'function' ? guild.iconURL({ size: 1024, forceStatic: false }) : null;
            const bannerUrl = typeof guild.bannerURL === 'function' ? guild.bannerURL({ size: 1024 }) : null;
            const splashUrl = typeof guild.splashURL === 'function' ? guild.splashURL({ size: 1024 }) : null;

            if (!iconUrl && !bannerUrl && !splashUrl) {
                return safeReply(interaction, {
                    content: isPtBr
                        ? '❌ Este servidor não possui ícone nem banner configurados.'
                        : '❌ This server has neither an icon nor a banner configured.',
                    ephemeral: true,
                });
            }

            const embed = await createEmbed(interaction, {
                title: isPtBr ? `Ícone e Mídia de ${guild.name}` : `Icon & Media for ${guild.name}`,
                description: isPtBr ? 'Confira as imagens de perfil e divulgação do servidor:' : 'Check out the server profile and promotional imagery:',
                color: 0x5865F2,
            });

            if (iconUrl && embed.setThumbnail) {
                embed.setThumbnail(iconUrl);
            }

            const primaryImage = bannerUrl || splashUrl || iconUrl;
            if (primaryImage && embed.setImage) {
                embed.setImage(primaryImage);
            }

            const buttons = [];
            if (iconUrl) {
                buttons.push(
                    new ButtonBuilder()
                        .setLabel(isPtBr ? 'Ícone (PNG)' : 'Icon (PNG)')
                        .setStyle(ButtonStyle.Link)
                        .setURL(guild.iconURL({ extension: 'png', size: 2048 }))
                );
            }
            if (bannerUrl) {
                buttons.push(
                    new ButtonBuilder()
                        .setLabel(isPtBr ? 'Banner (PNG)' : 'Banner (PNG)')
                        .setStyle(ButtonStyle.Link)
                        .setURL(guild.bannerURL({ extension: 'png', size: 2048 }))
                );
            }
            if (splashUrl) {
                buttons.push(
                    new ButtonBuilder()
                        .setLabel(isPtBr ? 'Splash (PNG)' : 'Splash (PNG)')
                        .setStyle(ButtonStyle.Link)
                        .setURL(guild.splashURL({ extension: 'png', size: 2048 }))
                );
            }

            const components = buttons.length > 0 ? [new ActionRowBuilder().addComponents(buttons.slice(0, 5))] : [];
            return safeReply(interaction, { embeds: [embed], components });
        }
    },
};
