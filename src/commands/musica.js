/**
 * @file musica.js
 * @description Slash command /musica for searching track metadata, previews, and global Top 10 charts
 */

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const tosCheck = require('../utils/tosCheck.js');
const createEmbed = require('../utils/createEmbed.js');
const getLanguage = require('../utils/getLanguage.js');
const { searchMusicWithFallback, fetchTop10Tracks } = require('../utils/musicProvider.js');
const { getEmoji } = require('../config/emojis.js');
const colors = require('../config/colors.js');

const RANK_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('musica')
        .setNameLocalizations({
            'en-US': 'music',
            'en-GB': 'music',
            'pt-BR': 'musica',
        })
        .setDescription('Música ❯ Busca informações sobre músicas ou exibe o Top 10 mais tocado.')
        .setDescriptionLocalizations({
            'en-US': 'Music ❯ Searches for song information or displays the global Top 10 charts.',
            'pt-BR': 'Música ❯ Busca informações sobre músicas ou exibe o Top 10 mais tocado.',
        })
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .setDMPermission(true)
        .addStringOption(option =>
            option
                .setName('busca')
                .setNameLocalizations({ 'en-US': 'query', 'pt-BR': 'busca' })
                .setDescription('Nome da música ou artista (deixe em branco para o Top 10)')
                .setDescriptionLocalizations({
                    'en-US': 'Song title or artist name (leave blank for Top 10)',
                    'pt-BR': 'Nome da música ou artista (deixe em branco para o Top 10)',
                })
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option
                .setName('top10')
                .setNameLocalizations({ 'en-US': 'top10', 'pt-BR': 'top10' })
                .setDescription('Exibe o ranking do Top 10 de músicas mais tocadas globalmente.')
                .setDescriptionLocalizations({
                    'en-US': 'Displays the ranking of the global Top 10 most played songs.',
                    'pt-BR': 'Exibe o ranking do Top 10 de músicas mais tocadas globalmente.',
                })
                .setRequired(false)
        ),

    async execute(interaction, client) {
        const canProceed = await tosCheck(interaction);
        if (!canProceed) return;

        if (typeof interaction.deferReply === 'function' && !interaction.deferred && !interaction.replied) {
            await interaction.deferReply();
        }

        const query = interaction.options.getString('busca') || interaction.options.getString('query');
        const isTop10Explicit = interaction.options.getBoolean('top10') || false;
        const lang = getLanguage(interaction);
        const isPtBr = lang === 'pt_BR';

        const isTop10 = isTop10Explicit || !query || ['top', 'top10', 'top 10', 'chart', 'charts', 'ranking'].includes(query?.trim()?.toLowerCase());

        // 1. ROTA TOP 10 GLOBAL
        if (isTop10) {
            const chartData = await fetchTop10Tracks();
            const trackLines = chartData.tracks.map((t, idx) => {
                const emoji = RANK_EMOJIS[idx] || `[${idx + 1}]`;
                return `${emoji} **[${t.title}](${t.spotifyUrl || t.url})**\n┗ 👤 *${t.artist}* • ⏱️ \`${t.duration}\``;
            });

            const top10Description = [
                `### 📈 ${isPtBr ? 'Top 10 Músicas Mais Tocadas no Mundo' : 'Top 10 Most Played Songs Worldwide'}`,
                `> ${isPtBr ? `Métricas em tempo real via **${chartData.provider}** • Plataformas: **Spotify & Deezer**` : `Real-time metrics via **${chartData.provider}** • Platforms: **Spotify & Deezer**`}`,
                ``,
                trackLines.join('\n\n'),
            ].join('\n');

            const embed = await createEmbed(interaction, {
                title: isPtBr ? `${getEmoji('musica')} Top 10 Músicas Mais Tocadas (Global)` : `${getEmoji('musica')} Top 10 Most Played Music (Global)`,
                description: top10Description,
                thumbnail: chartData.tracks[0]?.artworkUrl || null,
                color: colors.primary,
            });

            const buttons = [
                new ButtonBuilder()
                    .setLabel(isPtBr ? 'Ouvir Top 50 no Spotify' : 'Listen Top 50 on Spotify')
                    .setStyle(ButtonStyle.Link)
                    .setURL(chartData.playlistUrl || 'https://open.spotify.com/playlist/37i9dQZEVXbMDoHDwVN2tF'),
                new ButtonBuilder()
                    .setLabel(isPtBr ? 'Top Global Deezer' : 'Deezer Global Chart')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://www.deezer.com/channels/chart'),
            ];

            const payload = {
                embeds: [embed],
                components: [new ActionRowBuilder().addComponents(buttons)],
            };

            return interaction.deferred ? interaction.editReply(payload) : interaction.reply(payload);
        }

        // 2. ROTA DE BUSCA INDIVIDUAL
        const track = await searchMusicWithFallback(query);

        const trackDescription = [
            `### 🎵 [${track.title}](${track.url || 'https://open.spotify.com'})`,
            `> • **👤 ${isPtBr ? 'Artista' : 'Artist'}:** **${track.artist || 'N/A'}**`,
            `> • **💿 ${isPtBr ? 'Álbum' : 'Album'}:** \`${track.album || 'Single'}\``,
            `> • **${getEmoji('tempo')} ${isPtBr ? 'Duração' : 'Duration'}:** \`${track.duration || 'N/A'}\``,
        ];

        if (track.releaseDate) {
            trackDescription.push(`> • **${getEmoji('calendario')} ${isPtBr ? 'Lançamento' : 'Release'}:** \`${track.releaseDate}\``);
        }
        if (track.genre) {
            trackDescription.push(`> • **🎸 ${isPtBr ? 'Gênero' : 'Genre'}:** \`${track.genre}\``);
        }
        trackDescription.push(`> • **${getEmoji('mundo')} ${isPtBr ? 'Provedor' : 'Provider'}:** \`${track.provider}\``);

        const embed = await createEmbed(interaction, {
            title: `${getEmoji('musica')} ${track.title}`,
            description: trackDescription.join('\n'),
            thumbnail: track.artworkUrl,
            color: colors.primary,
        });

        const buttons = [];
        if (track.url) {
            buttons.push(
                new ButtonBuilder()
                    .setLabel(isPtBr ? 'Ouvir Música' : 'Listen Now')
                    .setStyle(ButtonStyle.Link)
                    .setURL(track.url)
            );
        }
        if (track.previewUrl) {
            buttons.push(
                new ButtonBuilder()
                    .setLabel(isPtBr ? 'Prévia (30s)' : 'Preview (30s)')
                    .setStyle(ButtonStyle.Link)
                    .setURL(track.previewUrl)
            );
        }

        const payload = { embeds: [embed] };
        if (buttons.length > 0) {
            payload.components = [new ActionRowBuilder().addComponents(buttons)];
        }

        return interaction.deferred ? interaction.editReply(payload) : interaction.reply(payload);
    },
};
