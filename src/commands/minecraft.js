/**
 * @file minecraft.js
 * @description Slash command for Minecraft player skin/UUID and server status lookups
 */

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const tosCheck = require('../utils/tosCheck.js');
const createEmbed = require('../utils/createEmbed.js');
const getLanguage = require('../utils/getLanguage.js');
const { getEmoji } = require('../config/emojis.js');
const colors = require('../config/colors.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('minecraft')
        .setDescription('Minecraft ❯ Consulta informações de jogadores ou servidores de Minecraft.')
        .setDescriptionLocalizations({
            'en-US': 'Minecraft ❯ Looks up Minecraft player skins, UUIDs, or server status.',
            'pt-BR': 'Minecraft ❯ Consulta informações de jogadores ou servidores de Minecraft.',
        })
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .setDMPermission(true)
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
                        .setDescription('Nick do jogador no Minecraft (Java ou Bedrock)')
                        .setDescriptionLocalizations({
                            'en-US': 'Minecraft username or gamertag',
                            'pt-BR': 'Nick do jogador no Minecraft (Java ou Bedrock)',
                        })
                        .setRequired(true)
                )
                .addStringOption(opt =>
                    opt
                        .setName('edicao')
                        .setNameLocalizations({ 'en-US': 'edition' })
                        .setDescription('Edição do Minecraft (Java ou Bedrock)')
                        .setDescriptionLocalizations({
                            'en-US': 'Minecraft edition (Java or Bedrock)',
                            'pt-BR': 'Edição do Minecraft (Java ou Bedrock)',
                        })
                        .addChoices(
                            { name: 'Java Edition (Padrão)', value: 'java' },
                            { name: 'Bedrock Edition (Xbox)', value: 'bedrock' }
                        )
                        .setRequired(false)
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

        // ---------------------------------------------------------------------
        // Subcomando: JOGADOR / PLAYER
        // ---------------------------------------------------------------------
        if (sub === 'jogador' || sub === 'player') {
            const nick = (interaction.options.getString('nome') || interaction.options.getString('username') || '').trim();
            const edicao = (interaction.options.getString('edicao') || interaction.options.getString('edition') || 'java').toLowerCase();

            // Rota Bedrock via GeyserMC API
            if (edicao === 'bedrock') {
                try {
                    const res = await fetch(`https://api.geysermc.org/v2/xbox/xuid/${encodeURIComponent(nick)}`).catch(() => null);
                    if (!res || !res.ok) {
                        return interaction.editReply({
                            content: isPtBr
                                ? `${getEmoji('errado')} Jogador Bedrock \`${nick}\` não foi encontrado na Xbox Live / GeyserMC.`
                                : `${getEmoji('errado')} Bedrock player \`${nick}\` was not found on Xbox Live / GeyserMC.`,
                        });
                    }

                    const data = await res.json().catch(() => null);
                    if (!data?.xuid) {
                        return interaction.editReply({
                            content: isPtBr
                                ? `${getEmoji('errado')} Jogador Bedrock \`${nick}\` não foi encontrado.`
                                : `${getEmoji('errado')} Bedrock player \`${nick}\` was not found.`,
                        });
                    }

                    const xuid = String(data.xuid);
                    const hexXuid = BigInt(xuid).toString(16).padStart(16, '0');
                    const floodgateUuid = `00000000-0000-0000-${hexXuid.slice(0, 4)}-${hexXuid.slice(4)}`;

                    const embed = await createEmbed(interaction, {
                        title: isPtBr ? `${getEmoji('minecraft')} Jogador Bedrock: ${nick}` : `${getEmoji('minecraft')} Bedrock Player: ${nick}`,
                        fields: [
                            { name: isPtBr ? `${getEmoji('pessoa')} Gamertag` : `${getEmoji('pessoa')} Gamertag`, value: `\`${nick}\``, inline: true },
                            { name: isPtBr ? `${getEmoji('pasta')} Edição` : `${getEmoji('pasta')} Edition`, value: 'Bedrock Edition', inline: true },
                            { name: isPtBr ? `${getEmoji('ticket')} XUID` : `${getEmoji('ticket')} XUID`, value: `\`${xuid}\``, inline: true },
                            { name: isPtBr ? `${getEmoji('ferramenta1')} Floodgate UUID` : `${getEmoji('ferramenta1')} Floodgate UUID`, value: `\`${floodgateUuid}\``, inline: false },
                        ],
                        color: colors.primary || 0xAEA7BD,
                    });

                    return interaction.editReply({ embeds: [embed] });
                } catch (err) {
                    return interaction.editReply({
                        content: isPtBr ? `${getEmoji('errado')} Erro ao consultar jogador Bedrock.` : `${getEmoji('errado')} Error fetching Bedrock player.`,
                    });
                }
            }

            // Rota Java Edition via Mojang API
            try {
                const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(nick)}`).catch(() => null);
                if (!res || !res.ok) {
                    return interaction.editReply({
                        content: isPtBr
                            ? `${getEmoji('errado')} Jogador \`${nick}\` não foi encontrado na Mojang oficial.`
                            : `${getEmoji('errado')} Minecraft player \`${nick}\` was not found on Mojang.`,
                    });
                }

                const data = await res.json().catch(() => null);
                if (!data?.id) {
                    return interaction.editReply({
                        content: isPtBr
                            ? `${getEmoji('errado')} Dados inválidos retornados para o jogador \`${nick}\`.`
                            : `${getEmoji('errado')} Invalid data returned for player \`${nick}\`.`,
                    });
                }

                const uuid = data.id;
                const name = data.name;

                const bodyRender = `https://crafatar.com/renders/body/${uuid}?overlay=true`;
                const headAvatar = `https://crafatar.com/avatars/${uuid}?overlay=true`;
                const skinDownload = `https://crafatar.com/skins/${uuid}`;
                const namemcUrl = `https://namemc.com/profile/${uuid}`;

                const embed = await createEmbed(interaction, {
                    title: isPtBr ? `${getEmoji('minecraft')} Jogador Java: ${name}` : `${getEmoji('minecraft')} Java Player: ${name}`,
                    fields: [
                        { name: isPtBr ? `${getEmoji('pessoa')} Nick` : `${getEmoji('pessoa')} Username`, value: '`' + name + '`', inline: true },
                        { name: isPtBr ? `${getEmoji('pasta')} Edição` : `${getEmoji('pasta')} Edition`, value: 'Java Edition', inline: true },
                        { name: isPtBr ? `${getEmoji('ticket')} UUID` : `${getEmoji('ticket')} UUID`, value: '`' + uuid + '`', inline: false },
                    ],
                    thumbnail: headAvatar,
                    image: bodyRender,
                    color: colors.primary || 0xAEA7BD,
                });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setLabel(isPtBr ? 'Baixar Skin' : 'Download Skin')
                        .setStyle(ButtonStyle.Link)
                        .setURL(skinDownload)
                        .setEmoji(getEmoji('salvar')),
                    new ButtonBuilder()
                        .setLabel('NameMC')
                        .setStyle(ButtonStyle.Link)
                        .setURL(namemcUrl)
                        .setEmoji(getEmoji('link') || getEmoji('mundo'))
                );

                return interaction.editReply({ embeds: [embed], components: [row] });
            } catch (err) {
                return interaction.editReply({
                    content: isPtBr ? `${getEmoji('errado')} Erro ao consultar jogador de Minecraft.` : `${getEmoji('errado')} Error fetching Minecraft player.`,
                });
            }
        }

        // ---------------------------------------------------------------------
        // Subcomando: SERVIDOR / SERVER
        // ---------------------------------------------------------------------
        if (sub === 'servidor' || sub === 'server') {
            const ip = interaction.options.getString('ip').trim();
            const tipo = (interaction.options.getString('tipo') || 'java').toLowerCase();

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

                const data = await res.json().catch(() => null);
                const isOnline = data?.online === true;

                if (!isOnline) {
                    const embed = await createEmbed(interaction, {
                        title: isPtBr ? `${getEmoji('minecraft')} Servidor: ${ip}` : `${getEmoji('minecraft')} Server: ${ip}`,
                        description: isPtBr ? `${getEmoji('vermelho')} O servidor encontra-se **Offline** no momento.` : `${getEmoji('vermelho')} The server is currently **Offline**.`,
                        color: colors.error || 0xED4245,
                    });
                    return interaction.editReply({ embeds: [embed] });
                }

                const playersOnline = data.players?.online ?? 0;
                const playersMax = data.players?.max ?? 0;
                const version = data.version || (isPtBr ? 'Desconhecida' : 'Unknown');
                const motdClean = Array.isArray(data.motd?.clean) ? data.motd.clean.join('\n') : (isPtBr ? 'Sem MOTD' : 'No MOTD');
                const icon = data.icon || null;

                const fields = [
                    { name: isPtBr ? `${getEmoji('wifi')} Status` : `${getEmoji('wifi')} Status`, value: `${getEmoji('verde')} Online`, inline: true },
                    { name: isPtBr ? `${getEmoji('pessoas1')} Jogadores` : `${getEmoji('pessoas1')} Players`, value: `**${playersOnline.toLocaleString()}** / **${playersMax.toLocaleString()}**`, inline: true },
                    { name: isPtBr ? `${getEmoji('pasta')} Versão` : `${getEmoji('pasta')} Version`, value: version, inline: true },
                    { name: isPtBr ? `${getEmoji('informacao')} IP / Conexão` : `${getEmoji('informacao')} Server IP`, value: `\`${ip}\``, inline: true },
                    { name: isPtBr ? `${getEmoji('ferramenta1')} Edição` : `${getEmoji('ferramenta1')} Edition`, value: tipo === 'bedrock' ? 'Bedrock' : 'Java', inline: true },
                    { name: isPtBr ? `${getEmoji('lapis')} MOTD` : `${getEmoji('lapis')} MOTD`, value: `\`\`\`${motdClean.length > 500 ? motdClean.substring(0, 497) + '...' : motdClean}\`\`\``, inline: false },
                ];

                const embed = await createEmbed(interaction, {
                    title: isPtBr ? `${getEmoji('minecraft')} Servidor: ${ip}` : `${getEmoji('minecraft')} Server: ${ip}`,
                    fields,
                    thumbnail: icon,
                    color: colors.primary || 0xAEA7BD,
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
