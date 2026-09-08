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
const { getEmoji } = require('../config/emojis.js');
const colors = require('../config/colors.js');
const safeReply = require('../utils/safeReply.js');
const { createContainer, createTextDisplay, createSeparator, createSection, createMediaGallery, createV2Payload } = require('../utils/componentsV2.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server')
        .setNameLocalizations({
            'en-US': 'server',
            'pt-BR': 'server',
        })
        .setDescription('Servidor ❯ Comandos de informações e mídia do servidor atual.')
        .setDescriptionLocalizations({
            'en-US': 'Server ❯ Server information and media commands for the current server.',
            'pt-BR': 'Servidor ❯ Comandos de informações e mídia do servidor atual.',
        })
        .setIntegrationTypes([0, 1])
        .setContexts([0])
        .setDMPermission(false)
        .addSubcommand(sub =>
            sub
                .setName('info')
                .setNameLocalizations({
                    'en-US': 'info',
                    'pt-BR': 'info',
                })
                .setDescription('Servidor ❯ Mostra informações completas e estatísticas do servidor atual.')
                .setDescriptionLocalizations({
                    'en-US': 'Server ❯ Displays complete information and statistics for the current server.',
                    'pt-BR': 'Servidor ❯ Mostra informações completas e estatísticas do servidor atual.',
                })
        )
        .addSubcommand(sub =>
            sub
                .setName('avatar')
                .setNameLocalizations({
                    'en-US': 'avatar',
                    'pt-BR': 'avatar',
                })
                .setDescription('Servidor ❯ Exibe o ícone, banner e splash do servidor atual.')
                .setDescriptionLocalizations({
                    'en-US': 'Server ❯ Displays the icon, banner, and splash of the current server.',
                    'pt-BR': 'Servidor ❯ Exibe o ícone, banner e splash do servidor atual.',
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

            const idCreationBlock = [
                `### ${getEmoji('casa')} ${isPtBr ? 'Identificação & Criação' : 'Identification & Creation'}`,
                `> • **ID:** \`${guild.id}\``,
                `> • **${isPtBr ? 'Proprietário' : 'Owner'}:** ${getEmoji('coroa')} ${ownerMention}`,
                `> • **${isPtBr ? 'Criado em' : 'Created'}:** ${createdTimestamp ? `<t:${createdTimestamp}:F> (<t:${createdTimestamp}:R>)` : 'N/A'}`
            ].join('\n');

            const membersBlock = [
                `### ${getEmoji('pessoas1')} ${isPtBr ? 'Membros' : 'Members'}`,
                `> • **${isPtBr ? 'Total' : 'Total'}:** \`${totalMembers}\` (${isPtBr ? `${getEmoji('pessoa')} \`${humanCount}\` humanos • ${getEmoji('bot')} \`${botCount}\` bots` : `${getEmoji('pessoa')} \`${humanCount}\` humans • ${getEmoji('bot')} \`${botCount}\` bots`})`
            ].join('\n');

            const channelsBlock = [
                `### ${getEmoji('chatbubble')} ${isPtBr ? 'Canais & Categorias' : 'Channels & Categories'}`,
                `> • **${isPtBr ? 'Total' : 'Total'}:** \`${totalChannels}\` (${isPtBr ? `${getEmoji('chatbubble')} \`${textChannels}\` texto • ${getEmoji('speaker')} \`${voiceChannels}\` voz • ${getEmoji('pasta')} \`${categoryChannels}\` categorias` : `${getEmoji('chatbubble')} \`${textChannels}\` text • ${getEmoji('speaker')} \`${voiceChannels}\` voice • ${getEmoji('pasta')} \`${categoryChannels}\` categories`})`
            ].join('\n');

            const structureBlock = [
                `### ${getEmoji('diamante')} ${isPtBr ? 'Impulsos & Estrutura' : 'Boost Status & Structure'}`,
                `> • **${isPtBr ? 'Nível de Boost' : 'Boost Tier'}:** \`${boostTier}\` (\`${boostCount}\` ${isPtBr ? 'impulsos' : 'boosts'})`,
                `> • **${isPtBr ? 'Segurança & Verificação' : 'Security & Verification'}:** ${getEmoji('cadeadofechado')} \`${verificationText}\``,
                `> • **${isPtBr ? 'Recursos' : 'Assets'}:** \`${totalRoles}\` ${isPtBr ? 'cargos' : 'roles'} • \`${totalEmojis}\` emojis • \`${totalStickers}\` ${isPtBr ? 'figurinhas' : 'stickers'}`
            ].join('\n');

            const buttons = [];
            if (iconUrl) {
                buttons.push(
                    new ButtonBuilder()
                        .setLabel(isPtBr ? 'Ícone do Servidor' : 'Server Icon')
                        .setStyle(ButtonStyle.Link)
                        .setURL(iconUrl)
                        .setEmoji(getEmoji('casa'))
                );
            }
            if (bannerUrl) {
                buttons.push(
                    new ButtonBuilder()
                        .setLabel(isPtBr ? 'Banner do Servidor' : 'Server Banner')
                        .setStyle(ButtonStyle.Link)
                        .setURL(bannerUrl)
                        .setEmoji(getEmoji('paletadecores'))
                );
            }

            const actionRows = buttons.length > 0 ? [new ActionRowBuilder().addComponents(buttons)] : [];

            const containerComponents = [];

            if (iconUrl) {
                containerComponents.push(
                    createSection(`### ${isPtBr ? 'Informações de' : 'Server Information for'} ${guild.name}`, { url: iconUrl })
                );
            } else {
                containerComponents.push(
                    createTextDisplay(`### ${isPtBr ? 'Informações de' : 'Server Information for'} ${guild.name}`)
                );
            }

            if (guild.description) {
                containerComponents.push(createTextDisplay(`> *${guild.description}*`));
            }

            containerComponents.push(
                createSeparator(true, 1),
                createTextDisplay(idCreationBlock),
                createSeparator(true, 1),
                createTextDisplay(membersBlock),
                createSeparator(true, 1),
                createTextDisplay(channelsBlock),
                createSeparator(true, 1),
                createTextDisplay(structureBlock)
            );

            if (bannerUrl) {
                containerComponents.push(createMediaGallery([bannerUrl]));
            }

            const v2Container = createContainer({
                accentColor: colors.primary || 0xAEA7BD,
                components: containerComponents
            });

            const v2Payload = createV2Payload({
                container: v2Container,
                actionRows
            });

            return safeReply(interaction, v2Payload);
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
                    content: `${getEmoji('x_')} ${isPtBr
                        ? 'Este servidor não possui ícone nem banner configurados.'
                        : 'This server has neither an icon nor a banner configured.'}`,
                    ephemeral: true,
                });
            }

            const embed = await createEmbed(interaction, {
                title: isPtBr ? `${getEmoji('casa')} Ícone e Mídia de ${guild.name}` : `${getEmoji('casa')} Icon & Media for ${guild.name}`,
                description: isPtBr ? 'Confira as imagens de perfil e divulgação do servidor:' : 'Check out the server profile and promotional imagery:',
                color: colors.primary || 0xAEA7BD,
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
                        .setEmoji(getEmoji('pasta'))
                );
            }
            if (bannerUrl) {
                buttons.push(
                    new ButtonBuilder()
                        .setLabel(isPtBr ? 'Banner (PNG)' : 'Banner (PNG)')
                        .setStyle(ButtonStyle.Link)
                        .setURL(guild.bannerURL({ extension: 'png', size: 2048 }))
                        .setEmoji(getEmoji('paletadecores'))
                );
            }
            if (splashUrl) {
                buttons.push(
                    new ButtonBuilder()
                        .setLabel(isPtBr ? 'Splash (PNG)' : 'Splash (PNG)')
                        .setStyle(ButtonStyle.Link)
                        .setURL(guild.splashURL({ extension: 'png', size: 2048 }))
                        .setEmoji(getEmoji('brilho'))
                );
            }

            const components = buttons.length > 0 ? [new ActionRowBuilder().addComponents(buttons.slice(0, 5))] : [];
            return safeReply(interaction, { embeds: [embed], components });
        }
    },
};
