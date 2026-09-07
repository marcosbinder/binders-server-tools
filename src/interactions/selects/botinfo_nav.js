const { ActionRowBuilder, StringSelectMenuBuilder, version, MessageFlags } = require('discord.js');
const createEmbed = require('../../utils/createEmbed.js');
const getLanguage = require('../../utils/getLanguage.js');
const checkInteractionOwnership = require('../../utils/interactionOwnership.js');
const emojis = require('../../config/emojis.js');
const colors = require('../../config/colors.js');
const { isMessageV2, transformToV2Payload } = require('../../utils/componentsV2.js');
const os = require('node:os');

// config da equipe e inspirações
const team = [
    { name: 'Vitória', id: '1117890204569718885', role: { 'pt_BR': 'Artista e Apoiadora', 'en_US': 'Artist & Supporter' } },
];
const inspirations = [
    { name: 'Sam Bot', id: '1212115074735415316' },
    { name: 'Anny', id: '1071825122467524688' },
    { name: 'King', id: '1159667835761594449' },
    { name: 'Jaya', id: '498158678457843722' },
];

// --- Função que constrói cada página ---
async function buildPage(page, interaction, client) {
    const lang = getLanguage(interaction);
    const isPtBr = lang === 'pt_BR';
    
    const locale = isPtBr ? 'pt-BR' : 'en-US';
    let embed;
    let userCount, serverCount, description;

    switch (page) {
        case 'page_credits':
            userCount = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
            serverCount = client.guilds.cache.size;
            const ownerId = process.env.OWNER_ID || '659214571634032667';
            const ownerUser = await client.users.fetch(ownerId).catch(() => null);
            const ownerTag = ownerUser ? ownerUser.tag : 'Marcos';
            const botId = client.user?.id || process.env.CLIENT_ID || '1310336375261892608';
            const botCreationTimestamp = client.user?.createdTimestamp ? Math.floor(client.user.createdTimestamp / 1000) : 1732644000;

            const creditsDescription = [
                `### ${emojis.carta} ${isPtBr ? 'Certidão & Registro Geral do Bot' : "Bot's ID & General Registry"}`,
                `> ${isPtBr ? 'Identificação formal, dados cadastrais e créditos oficiais do **Binder**.' : 'Formal identification, registration records, and development credits for **Binder**.'}`,
                ``,
                `> • **${isPtBr ? 'Nome Oficial' : 'Official Name'}:** \`${client.user?.username || "Binder's Server Tools"}\``,
                `> • **${isPtBr ? 'ID da Aplicação' : 'Application ID'}:** \`${botId}\``,
                `> • **${isPtBr ? 'Desenvolvedor Principal' : 'Lead Developer'}:** [${ownerTag}](https://discord.com/users/${ownerId}) ${emojis.selodev1 || ''}`,
                `> • **${isPtBr ? 'Equipe & Arte' : 'Team & Art'}:** [Vitória](https://discord.com/users/1117890204569718885) — *${isPtBr ? 'Artista e Apoiadora' : 'Artist & Supporter'}*`,
                `> • **${isPtBr ? 'Data de Criação' : 'Birthday (Created)'}:** <t:${botCreationTimestamp}:D> (<t:${botCreationTimestamp}:R>)`,
                `> • **${isPtBr ? 'Biblioteca Central' : 'Core Library'}:** ${emojis.djs || ''} \`Discord.js v${version}\` • \`Node.js ${process.version}\``,
                `> • **${isPtBr ? 'Banco de Dados' : 'Database'}:** \`Supabase (PostgreSQL) + Fallback Local\``,
                `> • **${isPtBr ? 'Comandos & Arquitetura' : 'Commands & Architecture'}:** \`Slash Commands (/) • Components V2\``,
                `> • **${isPtBr ? 'Comunidade Global' : 'Global Reach'}:** ${emojis.mundo || ''} \`${serverCount.toLocaleString(locale)} servidores\` servindo \`${userCount.toLocaleString(locale)} usuários\``,
                `> • **${isPtBr ? 'Código Aberto' : 'Open Source'}:** [GitHub Repository](https://github.com/marcosbinder/binders-server-tools)`
            ].join('\n');

            embed = await createEmbed(interaction, {
                title: isPtBr ? `[2/4] ${emojis.carta || '📜'} RG do Bot` : `[2/4] ${emojis.carta || '📜'} Bot's ID`,
                description: creditsDescription,
                color: colors.primary,
            });
            break;

        case 'page_host':
            const botUptimeSec = Math.floor(process.uptime());
            const days = Math.floor(botUptimeSec / 86400);
            const hours = Math.floor((botUptimeSec % 86400) / 3600);
            const minutes = Math.floor((botUptimeSec % 3600) / 60);
            const seconds = botUptimeSec % 60;
            const uptimeStr = `${days > 0 ? `${days}d ` : ''}${hours}h ${minutes}m ${seconds}s`;
            const startTimestamp = Math.floor((Date.now() - (botUptimeSec * 1000)) / 1000);
            const ramUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
            const ramTotal = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
            const hostTotalRamGb = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);

            const hostDescription = [
                `### ${emojis.selodev2 || emojis.vscode} ${isPtBr ? 'Ambiente de Hospedagem' : 'Hosting Environment'}`,
                `> • **${isPtBr ? 'Infraestrutura' : 'Infrastructure'}:** \`${isPtBr ? 'Host Externa (Cloud Hosted)' : 'External Host (Cloud Hosted)'}\``,
                `> • **${isPtBr ? 'Sistema Operacional' : 'Operating System'}:** \`${os.type()} ${os.arch()}\``,
                `> • **${isPtBr ? 'Memória do Servidor (Total)' : 'Server RAM (Total)'}:** \`${hostTotalRamGb} GB\``,
                `> • **${isPtBr ? 'Uso do Bot (Heap / RSS)' : 'Bot RAM (Heap / RSS)'}:** \`${ramUsed} MB / ${ramTotal} MB\``,
                `> • **${isPtBr ? 'Status do Sistema' : 'System Status'}:** ${emojis.verde} \`${isPtBr ? 'Online & Saudável' : 'Online & Healthy'}\``,
                `> • **${isPtBr ? 'Tempo Online (Uptime)' : 'Online Time (Uptime)'}:** <t:${startTimestamp}:R> (\`${uptimeStr}\`)`,
                `> • **${isPtBr ? 'Latência da API' : 'API Latency'}:** \`${client.ws.ping}ms\``,
                `> • **${isPtBr ? 'Versão do Node.js' : 'Node.js Version'}:** \`${process.version}\``,
            ].join('\n');

            embed = await createEmbed(interaction, {
                title: `[3/4] ${emojis.ferramenta1} ${isPtBr ? 'Hospedagem' : 'Hosting'}`,
                description: hostDescription,
                color: colors.primary,
            });
            break;

        case 'page_thanks':
            const thanksList = inspirations.map(i => `[${i.name}](https://discord.com/users/${i.id})`).join(', ');
            embed = await createEmbed(interaction, {
                title: `[4/4] ${emojis.coracaopixel} ${isPtBr ? 'Agradecimentos & Inspirações' : 'Acknowledgements & Inspirations'}`,
                description: `> ${isPtBr ? `Agradecimentos especiais para a Vitória pela arte e apoio! Me inspiro em bots e pessoas como ${thanksList}.` : `Special thanks to Vitória for the art and support! I'm inspired by bots and people like ${thanksList}.`}\n\n-# ${isPtBr ? 'Obrigado a cada pessoa que faz parte dessa jornada!' : 'Thank you to everyone who is part of this journey!'}`,
                color: colors.primary,
            });
            break;
            
        case 'page_home':
        default:
            serverCount = client.guilds.cache.size;
            userCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
            description = isPtBr 
                ? `Olá! Sou o **Binder's Server Tools**, um bot multifuncional criado para facilitar sua vida no Discord. Fui desenvolvido em ${emojis.djs} Discord.js e atualmente ajudo **${userCount.toLocaleString(locale)}** usuários em **${serverCount.toLocaleString(locale)}** servidores!`
                : `Hello! I'm **Binder's Server Tools**, a multipurpose bot to make your life on Discord easier. I was developed in ${emojis.djs} Discord.js and I'm currently helping **${userCount.toLocaleString(locale)}** users across **${serverCount.toLocaleString(locale)}** servers!`;
            
            embed = await createEmbed(interaction, {
                title: `[1/4] ${emojis.foguete} ${isPtBr ? 'Sobre mim!' : 'About me!'}`,
                description: `> ${description}`,
                color: colors.primary,
            });
            embed.setImage('attachment://banner.png');
            break;
    }
    return embed;
}

module.exports = {
    name: 'botinfo_nav',
    async execute(interaction, client) {
        const parts = (interaction.customId || '').split('_');
        const ownerId = parts[parts.length - 1];
        const isOwner = /^\d+$/.test(ownerId) ? interaction.user.id === ownerId : true;

        const selectedPage = interaction.values[0];
        const newEmbed = await buildPage(selectedPage, interaction, client);
        
        const lang = getLanguage(interaction);
        const navMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`botinfo_nav_${interaction.user.id}`)
                .setPlaceholder(lang === 'pt_BR' ? 'Navegue pelas informações...' : 'Navigate through the info...')
                .addOptions([
                    { label: lang === 'pt_BR' ? 'Página Inicial' : 'Home', value: 'page_home', emoji: { id: '1397393887068160030', name: 'casa' }, default: selectedPage === 'page_home' },
                    { label: lang === 'pt_BR' ? 'RG do Bot' : "Bot's ID", value: 'page_credits', emoji: { id: '1394142002404135003', name: 'carta' }, default: selectedPage === 'page_credits' },
                    { label: lang === 'pt_BR' ? 'Hospedagem' : 'Hosting', value: 'page_host', emoji: { id: '1397393732999053372', name: 'selodev2' }, default: selectedPage === 'page_host' },
                    { label: lang === 'pt_BR' ? 'Agradecimentos' : 'Acknowledgements', value: 'page_thanks', emoji: { id: '1397391540535431198', name: 'coracaopixel' }, default: selectedPage === 'page_thanks' },
                ])
        );

        const linkRow = interaction.message?.components?.[2] || interaction.message?.components?.[1];

        const payload = {
            embeds: [newEmbed],
            components: linkRow ? [navMenu, linkRow] : [navMenu]
        };
        
        if (selectedPage === 'page_home') {
            payload.files = ['./assets/banner.png'];
        } else {
            payload.files = [];
        }

        if (isOwner) {
            if (isMessageV2(interaction.message)) {
                await interaction.update(transformToV2Payload(payload, false));
            } else {
                try {
                    await interaction.update(payload);
                } catch (err) {
                    const errMsg = err?.rawError?.message || err?.message || String(err);
                    if (errMsg.includes('MESSAGE_CANNOT_USE_LEGACY_FIELDS_WITH_COMPONENTS_V2')) {
                        await interaction.update(transformToV2Payload(payload, false));
                    } else {
                        throw err;
                    }
                }
            }
        } else {
            payload.flags = [MessageFlags.Ephemeral];
            try {
                await interaction.reply(payload);
            } catch (err) {
                const errMsg = err?.rawError?.message || err?.message || String(err);
                if (errMsg.includes('MESSAGE_CANNOT_USE_LEGACY_FIELDS_WITH_COMPONENTS_V2')) {
                    await interaction.reply(transformToV2Payload(payload, true));
                } else {
                    throw err;
                }
            }
        }
    },
};