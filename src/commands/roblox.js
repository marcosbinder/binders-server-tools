/**
 * @file roblox.js
 * @description Slash command to search and display Roblox user profiles and games
 */

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const tosCheck = require('../utils/tosCheck.js');
const createEmbed = require('../utils/createEmbed.js');
const getLanguage = require('../utils/getLanguage.js');
const { getEmoji } = require('../config/emojis.js');
const colors = require('../config/colors.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roblox')
        .setDescription('Roblox ❯ Consulta informações de jogadores ou jogos do Roblox.')
        .setDescriptionLocalizations({
            'en-US': 'Roblox ❯ Fetches information for Roblox users or games.',
            'pt-BR': 'Roblox ❯ Consulta informações de jogadores ou jogos do Roblox.',
        })
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .setDMPermission(true)
        .addSubcommand(sub =>
            sub
                .setName('usuario')
                .setNameLocalizations({ 'en-US': 'user', 'pt-BR': 'usuario' })
                .setDescription('Roblox ❯ Consulta informações e o avatar de um jogador do Roblox.')
                .setDescriptionLocalizations({
                    'en-US': 'Roblox ❯ Fetches information and avatar for a Roblox user.',
                    'pt-BR': 'Roblox ❯ Consulta informações e o avatar de um jogador do Roblox.',
                })
                .addStringOption(opt =>
                    opt
                        .setName('usuario')
                        .setNameLocalizations({ 'en-US': 'user', 'pt-BR': 'usuario' })
                        .setDescription('Nome de usuário, link de perfil ou ID do Roblox')
                        .setDescriptionLocalizations({
                            'en-US': 'Roblox username, profile URL or numeric ID',
                            'pt-BR': 'Nome de usuário, link de perfil ou ID do Roblox',
                        })
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('jogo')
                .setNameLocalizations({ 'en-US': 'game', 'pt-BR': 'jogo' })
                .setDescription('Roblox ❯ Consulta informações de um jogo/experiência do Roblox por nome, ID ou link.')
                .setDescriptionLocalizations({
                    'en-US': 'Roblox ❯ Fetches details of a Roblox game/experience by name, Place ID, or URL.',
                    'pt-BR': 'Roblox ❯ Consulta informações de um jogo/experiência do Roblox por nome, ID ou link.',
                })
                .addStringOption(opt =>
                    opt
                        .setName('busca')
                        .setNameLocalizations({ 'en-US': 'query', 'pt-BR': 'busca' })
                        .setDescription('Nome do jogo, Place ID ou link do Roblox')
                        .setDescriptionLocalizations({
                            'en-US': 'Game name, Place ID or Roblox experience URL',
                            'pt-BR': 'Nome do jogo, Place ID ou link do Roblox',
                        })
                        .setRequired(true)
                )
        ),

    async execute(interaction, client) {
        const canProceed = await tosCheck(interaction);
        if (!canProceed) return;

        const sub = typeof interaction.options?.getSubcommand === 'function' ? interaction.options.getSubcommand(false) : null;
        const lang = getLanguage(interaction);
        const isPtBr = lang === 'pt_BR';

        // ---------------------------------------------------------------------
        // Subcomando: JOGO / GAME
        // ---------------------------------------------------------------------
        if (sub === 'jogo' || sub === 'game') {
            await interaction.deferReply();
            const rawInput = (typeof interaction.options?.getString === 'function'
                ? (interaction.options.getString('busca') || interaction.options.getString('query') || interaction.options.getString('id') || interaction.options.getString('game'))
                : null) || '';

            const trimmedInput = rawInput.trim();
            if (!trimmedInput) {
                return interaction.editReply({
                    content: isPtBr
                        ? `${getEmoji('errado')} Informe o nome, ID ou link do jogo do Roblox.`
                        : `${getEmoji('errado')} Please provide a Roblox game name, Place ID, or link.`
                });
            }

            let placeId = null;
            let universeId = null;
            let preloadedGame = null;

            // 1. Extrai Place ID de URLs como https://www.roblox.com/games/920587237/...
            const urlMatch = trimmedInput.match(/games\/(\d+)/i);
            if (urlMatch) {
                placeId = urlMatch[1];
            } else if (/^\d+$/.test(trimmedInput)) {
                // 2. É numérico direto (Place ID ou Universe ID)
                placeId = trimmedInput;
            } else {
                // 3. É busca por nome/palavras-chave via Roblox Omni-Search API
                try {
                    const searchUrl = `https://apis.roblox.com/search-api/omni-search?searchQuery=${encodeURIComponent(trimmedInput)}&sessionId=bst_${Date.now()}`;
                    const sRes = await fetch(searchUrl, {
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
                    }).catch(() => null);

                    if (sRes && sRes.ok) {
                        const sData = await sRes.json().catch(() => null);
                        const gameGroup = (sData?.searchResults || []).find(g =>
                            g.contentGroupType === 'Game' && Array.isArray(g.contents) && g.contents.length > 0
                        );
                        if (gameGroup && gameGroup.contents[0]) {
                            const match = gameGroup.contents[0];
                            placeId = String(match.rootPlaceId || match.contentId);
                            universeId = String(match.universeId || match.contentId);
                            preloadedGame = match;
                        }
                    }
                } catch (searchErr) {
                    // Fallback to error handling below
                }

                if (!placeId) {
                    return interaction.editReply({
                        content: isPtBr
                            ? `${getEmoji('errado')} Nenhum jogo encontrado com o nome **"${trimmedInput}"**.`
                            : `${getEmoji('errado')} No game found matching **"${trimmedInput}"**.`
                    });
                }
            }

            try {
                let gameName = preloadedGame?.name || null;
                let creatorName = preloadedGame?.creatorName || (isPtBr ? 'Desconhecido' : 'Unknown');
                let description = preloadedGame?.description || '';
                let playing = preloadedGame?.playerCount ?? null;
                let visits = null;
                let iconUrl = null;

                // 1. Tenta resolver o Universe ID via Roblox API se ainda não tivermos
                if (!universeId && placeId) {
                    const universeRes = await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`).catch(() => null);
                    if (universeRes && universeRes.ok) {
                        const uData = await universeRes.json().catch(() => null);
                        if (uData?.universeId) {
                            universeId = uData.universeId;
                        }
                    }

                    // Se não resolveu via places, pode ser que o número seja um Universe ID direto
                    if (!universeId) {
                        const testGameRes = await fetch(`https://games.roblox.com/v1/games?universeIds=${placeId}`).catch(() => null);
                        if (testGameRes && testGameRes.ok) {
                            const tgData = await testGameRes.json().catch(() => null);
                            if (Array.isArray(tgData?.data) && tgData.data.length > 0) {
                                universeId = placeId;
                                if (tgData.data[0].rootPlaceId) {
                                    placeId = String(tgData.data[0].rootPlaceId);
                                }
                            }
                        }
                    }
                }

                // 2. Se temos universeId, busca detalhes completos
                if (universeId) {
                    const gamesRes = await fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`).catch(() => null);
                    if (gamesRes && gamesRes.ok) {
                        const gData = await gamesRes.json().catch(() => null);
                        if (Array.isArray(gData?.data) && gData.data.length > 0) {
                            const g = gData.data[0];
                            gameName = g.name || gameName;
                            description = g.description || description;
                            creatorName = g.creator?.name || creatorName;
                            playing = g.playing ?? playing;
                            visits = g.visits ?? visits;
                            if (g.rootPlaceId) {
                                placeId = String(g.rootPlaceId);
                            }
                        }
                    }
                }

                // 3. Fallback: multiget-place-details
                if (!gameName && placeId) {
                    const fallbackRes = await fetch(`https://games.roblox.com/v1/games/multiget-place-details?placeIds=${placeId}`).catch(() => null);
                    if (fallbackRes && fallbackRes.ok) {
                        const fData = await fallbackRes.json().catch(() => null);
                        if (Array.isArray(fData) && fData.length > 0) {
                            const f = fData[0];
                            gameName = f.name;
                            description = f.description || '';
                            creatorName = f.builder || creatorName;
                        }
                    }
                }

                if (!gameName) {
                    return interaction.editReply({
                        content: isPtBr
                            ? `${getEmoji('errado')} Nenhum jogo encontrado para \`${trimmedInput}\`.`
                            : `${getEmoji('errado')} No game found for \`${trimmedInput}\`.`
                    });
                }

                // 4. Busca ícone do jogo
                const iconRes = await fetch(`https://thumbnails.roblox.com/v1/places/gameicons?placeIds=${placeId}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`).catch(() => null);
                if (iconRes && iconRes.ok) {
                    const iData = await iconRes.json().catch(() => null);
                    if (Array.isArray(iData?.data) && iData.data.length > 0) {
                        iconUrl = iData.data[0].imageUrl;
                    }
                }

                const gameUrl = `https://www.roblox.com/games/${placeId}`;
                const descSnippet = description.trim().length > 0
                    ? (description.length > 300 ? description.substring(0, 297) + '...' : description)
                    : (isPtBr ? 'Sem descrição.' : 'No description available.');

                const fields = [
                    { name: isPtBr ? `${getEmoji('videogame')} Experiência` : `${getEmoji('videogame')} Experience`, value: `**${gameName}**`, inline: true },
                    { name: isPtBr ? `${getEmoji('ferramenta1')} Criador` : `${getEmoji('ferramenta1')} Creator`, value: creatorName, inline: true },
                    { name: 'Place ID', value: `\`${placeId}\``, inline: true },
                ];

                if (playing !== null && playing !== undefined) {
                    fields.push({
                        name: isPtBr ? `${getEmoji('pessoas1')} Jogando Agora` : `${getEmoji('pessoas1')} Active Players`,
                        value: `\`${playing.toLocaleString()}\``,
                        inline: true,
                    });
                }

                if (visits !== null && visits !== undefined) {
                    fields.push({
                        name: isPtBr ? `${getEmoji('lupa')} Visitas Totais` : `${getEmoji('lupa')} Total Visits`,
                        value: `\`${visits.toLocaleString()}\``,
                        inline: true,
                    });
                }

                fields.push({
                    name: isPtBr ? `${getEmoji('lapis')} Descrição` : `${getEmoji('lapis')} Description`,
                    value: descSnippet,
                    inline: false,
                });

                const embed = await createEmbed(interaction, {
                    title: `${getEmoji('roblox')} Roblox: ${gameName}`,
                    fields,
                    thumbnail: iconUrl,
                    color: colors.primary || 0xAEA7BD,
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

        // ---------------------------------------------------------------------
        // Subcomando: USUÁRIO / USER
        // ---------------------------------------------------------------------
        const rawUser = typeof interaction.options?.getString === 'function'
            ? (interaction.options.getString('usuario') || interaction.options.getString('user'))
            : null;

        if (!rawUser) {
            return interaction.reply ? interaction.reply({
                content: isPtBr ? `${getEmoji('errado')} Informe um usuário ou ID válido.` : `${getEmoji('errado')} Please provide a valid username or ID.`,
                flags: [MessageFlags.Ephemeral]
            }) : null;
        }

        await interaction.deferReply();

        let query = rawUser.trim().replace(/^@+/, '').trim();
        // Extrai user ID se informada uma URL de perfil do Roblox (ex: https://www.roblox.com/users/12345/profile)
        const userUrlMatch = query.match(/users\/(\d+)/i);
        if (userUrlMatch) {
            query = userUrlMatch[1];
        }

        try {
            let robloxUserId = null;
            let username = query;
            let displayName = query;
            let createdAt = null;
            let description = '';

            // Se for ID numérico direto
            if (/^\d+$/.test(query)) {
                const res = await fetch(`https://users.roblox.com/v1/users/${parseInt(query, 10)}`).catch(() => null);
                if (res && res.ok) {
                    const data = await res.json().catch(() => null);
                    if (data?.id) {
                        robloxUserId = data.id;
                        username = data.name;
                        displayName = data.displayName || data.name;
                        createdAt = data.created;
                        description = data.description || '';
                    }
                }
            }

            // Se não encontrou ou era texto, tenta resolução exata de username via POST
            if (!robloxUserId) {
                const postRes = await fetch('https://users.roblox.com/v1/usernames/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ usernames: [query], excludeBannedUsers: false }),
                }).catch(() => null);

                if (postRes && postRes.ok) {
                    const postData = await postRes.json().catch(() => null);
                    if (Array.isArray(postData?.data) && postData.data.length > 0) {
                        const hit = postData.data[0];
                        robloxUserId = hit.id;
                        username = hit.name;
                        displayName = hit.displayName || hit.name;
                    }
                }
            }

            // Fallback: search por keyword
            if (!robloxUserId) {
                const searchRes = await fetch(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(query)}&limit=10`).catch(() => null);
                if (searchRes && searchRes.ok) {
                    const searchData = await searchRes.json().catch(() => null);
                    if (Array.isArray(searchData?.data) && searchData.data.length > 0) {
                        const first = searchData.data[0];
                        robloxUserId = first.id;
                        username = first.name;
                        displayName = first.displayName || first.name;
                    }
                }
            }

            if (!robloxUserId) {
                return interaction.editReply({
                    content: isPtBr
                        ? `${getEmoji('errado')} Nenhum usuário encontrado no Roblox com o termo \`${rawUser}\`.`
                        : `${getEmoji('errado')} No Roblox user found matching \`${rawUser}\`.`,
                });
            }

            // Se ainda não temos perfil detalhado (created/description), busca detalhes do user
            if (!createdAt) {
                const detailRes = await fetch(`https://users.roblox.com/v1/users/${robloxUserId}`).catch(() => null);
                if (detailRes && detailRes.ok) {
                    const details = await detailRes.json().catch(() => null);
                    if (details) {
                        createdAt = details.created;
                        description = details.description || '';
                    }
                }
            }

            let avatarUrl = null;
            const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${robloxUserId}&size=420x420&format=Png&isCircular=false`).catch(() => null);
            if (thumbRes && thumbRes.ok) {
                const thumbData = await thumbRes.json().catch(() => null);
                if (Array.isArray(thumbData?.data) && thumbData.data.length > 0) {
                    avatarUrl = thumbData.data[0].imageUrl;
                }
            }

            const profileUrl = `https://www.roblox.com/users/${robloxUserId}/profile`;
            const robloxEmoji = getEmoji('roblox');

            const fields = [
                { name: isPtBr ? `${getEmoji('pessoa')} Nome de Exibição` : `${getEmoji('pessoa')} Display Name`, value: displayName, inline: true },
                { name: isPtBr ? `${getEmoji('ticket')} Username` : `${getEmoji('ticket')} Username`, value: `@${username}`, inline: true },
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
                    name: isPtBr ? `${getEmoji('lapis')} Bio / Sobre` : `${getEmoji('lapis')} Bio / About`,
                    value: description.length > 300 ? description.substring(0, 297) + '...' : description,
                    inline: false,
                });
            }

            const embed = await createEmbed(interaction, {
                title: `${robloxEmoji} Perfil do Roblox: ${displayName}`,
                fields,
                thumbnail: avatarUrl,
                color: colors.primary || 0xAEA7BD,
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
            return interaction.editReply({
                content: isPtBr ? `${getEmoji('errado')} Erro ao consultar a API do Roblox.` : `${getEmoji('errado')} Error fetching data from Roblox API.`,
            });
        }
    },
};
