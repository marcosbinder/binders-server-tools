/**
 * @file minecraft.js
 * @description Slash command for Minecraft player skin/UUID and server status lookups
 */

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const tosCheck = require('../utils/tosCheck.js');
const createEmbed = require('../utils/createEmbed.js');
const getLanguage = require('../utils/getLanguage.js');
const { getEmoji } = require('../config/emojis.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('minecraft')
        .setDescription('Minecraft ❯ Consulta informações de jogadores ou servidores de Minecraft.')
        .setDescriptionLocalizations({
            'en-US': 'Minecraft ❯ Looks up Minecraft player skins, UUIDs, or server status.',
            'pt-BR': 'Minecraft ❯ Consulta informações de jogadores ou servidores de Minecraft.',
        })
        .addSubcommand(sub =>
            sub
                .setName('jogador')
                .setNameLocalizations({ 'en-US': 'player', 'pt-BR': 'jogador' })
                .setDescription('Minecraft ❯ Veja a skin, UUID e dados de um jogador do Minecraft.')
                .setDescriptionLocalizations({
                    'en-US': 'Minecraft ❯ Views skin, UUID, and information for a Minecraft player.',
                    'pt-BR': 'Minecraft ❯ Veja a skin, UUID e dados de um jogador do Minecraft.',
                })
                .addStringOption(opt =>
                    opt
                        .setName('nome')
                        .setNameLocalizations({ 'en-US': 'username' })
                        .setDescription('Nick do jogador no Minecraft Java')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('servidor')
                .setNameLocalizations({ 'en-US': 'server', 'pt-BR': 'servidor' })
                .setDescription('Minecraft ❯ Consulta o status, MOTD e jogadores online de um servidor.')
                .setDescriptionLocalizations({
                    'en-US': 'Minecraft ❯ Checks online status, MOTD, and players for a Minecraft server.',
                    'pt-BR': 'Minecraft ❯ Consulta o status, MOTD e jogadores online de um servidor.',
                })
                .addStringOption(opt =>
                    opt
                        .setName('ip')
                        .setDescription('IP do servidor (ex: hypixel.net)')
                        .setRequired(true)
                )
                .addStringOption(opt =>
                    opt
                        .setName('tipo')
                        .setNameLocalizations({ 'en-US': 'type' })
                        .setDescription('Edição do servidor')
                        .addChoices(
                            { name: 'Java Edition', value: 'java' },
                            { name: 'Bedrock Edition', value: 'bedrock' }
                        )
                        .setRequired(false)
                )
        ),

    async execute(interaction, client) {
        const canProceed = await tosCheck(interaction);
        if (!canProceed) return;

        const sub = interaction.options.getSubcommand();
        const lang = getLanguage(interaction);
        const isPtBr = lang === 'pt_BR';

        await interaction.deferReply();

        // JOGADOR
        if (sub === 'jogador' || sub === 'player') {
            const nick = interaction.options.getString('nome') || interaction.options.getString('username');

            try {
                const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(nick)}`).catch(() => null);
                if (!res || !res.ok) {
                    return interaction.editReply({
                        content: isPtBr
                            ? `${getEmoji('errado')} Jogador \`${nick}\` não foi encontrado na Mojang oficial.`
                            : `${getEmoji('errado')} Minecraft player \`${nick}\` was not found.`,
                    });
                }

                const data = await res.json();
                const uuid = data.id;
                const name = data.name;

                const bodyRender = `https://crafatar.com/renders/body/${uuid}?overlay=true`;
                const headAvatar = `https://crafatar.com/avatars/${uuid}?overlay=true`;
                const skinDownload = `https://crafatar.com/skins/${uuid}`;

                const embed = await createEmbed(interaction, {
                    title: isPtBr ? `${getEmoji('videogame')} Jogador: ${name}` : `${getEmoji('videogame')} Minecraft Player: ${name}`,
                    fields: [
                        { name: 'Nick', value: '`' + name + '`', inline: true },
                        { name: 'UUID', value: '`' + uuid + '`', inline: true },
                    ],
                    thumbnail: headAvatar,
                    image: bodyRender,
                    color: 0x57F287,
                });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setLabel(isPtBr ? 'Baixar Skin' : 'Download Skin')
                        .setStyle(ButtonStyle.Link)
                        .setURL(skinDownload)
                        .setEmoji(getEmoji('salvar'))
                );

                return interaction.editReply({ embeds: [embed], components: [row] });
            } catch (err) {
                return interaction.editReply({
                    content: isPtBr ? `${getEmoji('errado')} Erro ao consultar jogador de Minecraft.` : `${getEmoji('errado')} Error fetching Minecraft player.`,
                });
            }
        }

        // SERVIDOR
        if (sub === 'servidor' || sub === 'server') {
            const ip = interaction.options.getString('ip').trim();
            const tipo = interaction.options.getString('tipo') || 'java';

            try {
                const apiUrl = tipo === 'bedrock'
                    ? `https://api.mcsrvstat.us/bedrock/3/${encodeURIComponent(ip)}`
                    : `https://api.mcsrvstat.us/3/${encodeURIComponent(ip)}`;

                const res = await fetch(apiUrl).catch(() => null);
                if (!res || !res.ok) {
                    return interaction.editReply({
                        content: isPtBr ? `${getEmoji('errado')} Erro ao consultar o servidor.` : `${getEmoji('errado')} Error fetching server status.`,
                    });
                }

                const data = await res.json();
                const isOnline = data.online === true;

                if (!isOnline) {
                    const embed = await createEmbed(interaction, {
                        title: isPtBr ? `${getEmoji('videogame')} Servidor Minecraft: ${ip}` : `${getEmoji('videogame')} Minecraft Server: ${ip}`,
                        description: isPtBr ? `${getEmoji('errado')} O servidor encontra-se **Offline**.` : `${getEmoji('errado')} The server is currently **Offline**.`,
                        color: 0xED4245,
                    });
                    return interaction.editReply({ embeds: [embed] });
                }

                const playersOnline = data.players?.online ?? 0;
                const playersMax = data.players?.max ?? 0;
                const version = data.version || (isPtBr ? 'Desconhecida' : 'Unknown');
                const motdClean = Array.isArray(data.motd?.clean) ? data.motd.clean.join('\n') : (isPtBr ? 'Sem MOTD' : 'No MOTD');
                const icon = data.icon || null;

                const fields = [
                    { name: isPtBr ? '📶 Status' : '📶 Status', value: `${getEmoji('confere')} Online`, inline: true },
                    { name: isPtBr ? '👥 Jogadores' : '👥 Players', value: `**${playersOnline}** / **${playersMax}**`, inline: true },
                    { name: isPtBr ? '📦 Versão' : '📦 Version', value: version, inline: true },
                    { name: 'MOTD', value: `\`\`\`${motdClean.length > 500 ? motdClean.substring(0, 497) + '...' : motdClean}\`\`\``, inline: false },
                ];

                const embed = await createEmbed(interaction, {
                    title: isPtBr ? `${getEmoji('videogame')} Servidor Minecraft: ${ip}` : `${getEmoji('videogame')} Minecraft Server: ${ip}`,
                    fields,
                    thumbnail: icon,
                    color: 0x57F287,
                });

                return interaction.editReply({ embeds: [embed] });
            } catch (err) {
                return interaction.editReply({
                    content: isPtBr ? `${getEmoji('errado')} Erro ao consultar status do servidor.` : `${getEmoji('errado')} Error fetching server status.`,
                });
            }
        }
    },
};
