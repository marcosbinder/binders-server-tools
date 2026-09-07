/**
 * @file roblox.js
 * @description Slash command to search and display Roblox user profiles and avatars
 */

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const tosCheck = require('../utils/tosCheck.js');
const createEmbed = require('../utils/createEmbed.js');
const getLanguage = require('../utils/getLanguage.js');
const { getEmoji } = require('../config/emojis.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roblox')
        .setDescription('Consulta informações de jogadores ou jogos do Roblox.')
        .setDescriptionLocalizations({
            'en-US': 'Fetches information for Roblox users or games.',
            'pt-BR': 'Consulta informações de jogadores ou jogos do Roblox.',
        })
        .addSubcommand(sub =>
            sub
                .setName('usuario')
                .setNameLocalizations({ 'en-US': 'user' })
                .setDescription('Consulta informações e o avatar de um jogador do Roblox.')
                .setDescriptionLocalizations({
                    'en-US': 'Fetches information and avatar for a Roblox user.',
                    'pt-BR': 'Consulta informações e o avatar de um jogador do Roblox.',
                })
                .addStringOption(opt =>
                    opt
                        .setName('usuario')
                        .setNameLocalizations({ 'en-US': 'username' })
                        .setDescription('Nome de usuário ou ID do Roblox')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('jogo')
                .setNameLocalizations({ 'en-US': 'game' })
                .setDescription('Consulta informações de um jogo/experiência do Roblox por ID.')
                .setDescriptionLocalizations({
                    'en-US': 'Fetches details of a Roblox game/experience by Place ID.',
                    'pt-BR': 'Consulta informações de um jogo/experiência do Roblox por ID.',
                })
                .addStringOption(opt =>
                    opt
                        .setName('id')
                        .setNameLocalizations({ 'en-US': 'place_id' })
                        .setDescription('ID do jogo (Place ID) do Roblox')
                        .setRequired(true)
                )
        ),

    async execute(interaction, client) {
        const canProceed = await tosCheck(interaction);
        if (!canProceed) return;

        const sub = typeof interaction.options?.getSubcommand === 'function' ? interaction.options.getSubcommand(false) : null;
        const lang = getLanguage(interaction);
        const isPtBr = lang === 'pt_BR';

        // Subcomando: JOGO
        if (sub === 'jogo' || sub === 'game') {
            await interaction.deferReply();
            const placeId = (typeof interaction.options?.getString === 'function' ? (interaction.options.getString('id') || interaction.options.getString('place_id')) : null) || '';
            const cleanId = placeId.trim();

            if (!cleanId || !/^\d+$/.test(cleanId)) {
                return interaction.editReply({
                    content: isPtBr ? `${getEmoji('errado')} ID de jogo inválido. Informe o Place ID numérico.` : `${getEmoji('errado')} Invalid game ID. Please provide a numeric Place ID.`
                });
            }

            try {
                const res = await fetch(`https://games.roblox.com/v1/games/multiget-place-details?placeIds=${cleanId}`).catch(() => null);
                if (!res || !res.ok) {
                    return interaction.editReply({
                        content: isPtBr ? `${getEmoji('errado')} Erro ao buscar jogo com ID \`${cleanId}\`.` : `${getEmoji('errado')} Error fetching game with ID \`${cleanId}\`.`
                    });
                }

                const data = await res.json();
                if (!data || !Array.isArray(data) || data.length === 0) {
                    return interaction.editReply({
                        content: isPtBr ? `${getEmoji('errado')} Nenhum jogo encontrado com o ID \`${cleanId}\`.` : `${getEmoji('errado')} No game found with ID \`${cleanId}\`.`
                    });
                }

                const game = data[0];
                const gameName = game.name || (isPtBr ? 'Jogo sem nome' : 'Unnamed Game');
                const builder = game.builder || (isPtBr ? 'Desconhecido' : 'Unknown');
                const desc = game.description ? (game.description.length > 300 ? game.description.substring(0, 297) + '...' : game.description) : (isPtBr ? 'Sem descrição' : 'No description');
                const gameUrl = `https://www.roblox.com/games/${cleanId}`;

                const fields = [
                    { name: isPtBr ? '🎮 Nome' : '🎮 Name', value: gameName, inline: true },
                    { name: isPtBr ? '🔨 Criador' : '🔨 Creator', value: builder, inline: true },
                    { name: 'Place ID', value: `\`${cleanId}\``, inline: true },
                    { name: isPtBr ? '📝 Descrição' : '📝 Description', value: desc, inline: false },
                ];

                const embed = await createEmbed(interaction, {
                    title: `${getEmoji('roblox')} Roblox: ${gameName}`,
                    fields,
                    color: 0xEE4444,
                });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setLabel(isPtBr ? 'Jogar no Roblox' : 'Play on Roblox')
                        .setStyle(ButtonStyle.Link)
                        .setURL(gameUrl)
                        .setEmoji(getEmoji('roblox'))
                );

                return interaction.editReply({ embeds: [embed], components: [row] });
            } catch (err) {
                return interaction.editReply({
                    content: isPtBr ? `${getEmoji('errado')} Falha ao consultar detalhes do jogo.` : `${getEmoji('errado')} Failed to query game details.`
                });
            }
        }

        // Subcomando: USUÁRIO (Default / Fallback)
        const query = typeof interaction.options?.getString === 'function' ? (interaction.options.getString('usuario') || interaction.options.getString('username')) : null;
        if (!query) {
            return interaction.reply ? interaction.reply({
                content: isPtBr ? `${getEmoji('errado')} Informe um usuário ou ID válido.` : `${getEmoji('errado')} Please provide a valid username or ID.`,
                flags: [MessageFlags.Ephemeral]
            }) : null;
        }

        await interaction.deferReply();

        try {
            let robloxUserId = null;
            let username = query;
            let displayName = query;
            let createdAt = null;
            let description = '';

            if (/^\d+$/.test(query)) {
                const res = await fetch(`https://users.roblox.com/v1/users/${parseInt(query, 10)}`).catch(() => null);
                if (res && res.ok) {
                    const data = await res.json();
                    robloxUserId = data.id;
                    username = data.name;
                    displayName = data.displayName || data.name;
                    createdAt = data.created;
                    description = data.description || '';
                }
            }

            if (!robloxUserId) {
                const searchRes = await fetch(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(query)}&limit=10`).catch(() => null);
                if (searchRes && searchRes.ok) {
                    const searchData = await searchRes.json();
                    if (searchData.data && searchData.data.length > 0) {
                        const first = searchData.data[0];
                        robloxUserId = first.id;
                        username = first.name;
                        displayName = first.displayName || first.name;

                        const detailRes = await fetch(`https://users.roblox.com/v1/users/${robloxUserId}`).catch(() => null);
                        if (detailRes && detailRes.ok) {
                            const details = await detailRes.json();
                            createdAt = details.created;
                            description = details.description || '';
                        }
                    }
                }
            }

            if (!robloxUserId) {
                return interaction.editReply({
                    content: isPtBr
                        ? `${getEmoji('errado')} Nenhum usuário encontrado no Roblox com o termo \`${query}\`.`
                        : `${getEmoji('errado')} No Roblox user found matching \`${query}\`.`,
                });
            }

            let avatarUrl = null;
            const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${robloxUserId}&size=420x420&format=Png&isCircular=false`).catch(() => null);
            if (thumbRes && thumbRes.ok) {
                const thumbData = await thumbRes.json();
                if (thumbData.data && thumbData.data.length > 0) {
                    avatarUrl = thumbData.data[0].imageUrl;
                }
            }

            const profileUrl = `https://www.roblox.com/users/${robloxUserId}/profile`;
            const robloxEmoji = getEmoji('roblox');

            const fields = [
                { name: isPtBr ? '👤 Nome de Exibição' : '👤 Display Name', value: displayName, inline: true },
                { name: isPtBr ? '🏷️ Username' : '🏷️ Username', value: `@${username}`, inline: true },
                { name: 'ID', value: '`' + robloxUserId + '`', inline: true },
            ];

            if (createdAt) {
                const unix = Math.floor(new Date(createdAt).getTime() / 1000);
                fields.push({
                    name: isPtBr ? `${getEmoji('calendario')} Criação da Conta` : `${getEmoji('calendario')} Account Created`,
                    value: `<t:${unix}:D> (<t:${unix}:R>)`,
                    inline: false,
                });
            }

            if (description && description.trim().length > 0) {
                fields.push({
                    name: isPtBr ? '📝 Bio / Sobre' : '📝 Bio / About',
                    value: description.length > 300 ? description.substring(0, 297) + '...' : description,
                    inline: false,
                });
            }

            const embed = await createEmbed(interaction, {
                title: `${robloxEmoji} Perfil do Roblox: ${displayName}`,
                fields,
                thumbnail: avatarUrl,
                color: 0xEE4444,
            });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel(isPtBr ? 'Ver Perfil no Roblox' : 'View Roblox Profile')
                    .setStyle(ButtonStyle.Link)
                    .setURL(profileUrl)
                    .setEmoji(getEmoji('roblox'))
            );

            return interaction.editReply({ embeds: [embed], components: [row] });
        } catch (error) {
            console.error('[Roblox] Erro ao buscar usuário:', error.message);
            return interaction.editReply({
                content: isPtBr ? `${getEmoji('errado')} Erro ao consultar a API do Roblox.` : `${getEmoji('errado')} Error fetching data from Roblox API.`,
            });
        }
    },
};
