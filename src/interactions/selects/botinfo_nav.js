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
                `### ${emojis.carta || '📜'} ${isPtBr ? 'Certidão & Registro Geral do Bot' : "Bot's ID & General Registry"}`,
                `> ${isPtBr ? 'Identificação formal, dados cadastrais e créditos oficiais do **Binder**.' : 'Formal identification, registration records, and development credits for **Binder**.'}`,
                ``,
                `> ${emojis.bot || '🤖'} **${isPtBr ? 'Nome Oficial' : 'Official Name'}:** \`${client.user?.username || "Binder's Server Tools"}\``,
                `> ${emojis.ticket || '🏷️'} **${isPtBr ? 'ID da Aplicação' : 'Application ID'}:** \`${botId}\``,
                `> ${emojis.selodev1 || '👑'} **${isPtBr ? 'Desenvolvedor Principal' : 'Lead Developer'}:** [${ownerTag}](https://discord.com/users/${ownerId})`,
                `> ${emojis.coracaopixel || '🎨'} **${isPtBr ? 'Equipe & Arte' : 'Team & Art'}:** [Vitória](https://discord.com/users/1117890204569718885) — *${isPtBr ? 'Artista e Apoiadora' : 'Artist & Supporter'}*`,
                `> ${emojis.calendario || '📅'} **${isPtBr ? 'Data de Criação' : 'Birthday (Created)'}:** <t:${botCreationTimestamp}:D> (<t:${botCreationTimestamp}:R>)`,
                `> ${emojis.djs || '📦'} **${isPtBr ? 'Biblioteca Central' : 'Core Library'}:** \`Discord.js v${version}\` • \`Node.js ${process.version}\``,
                `> ${emojis.bancodedados || emojis.pasta || '🗄️'} **${isPtBr ? 'Banco de Dados' : 'Database'}:** \`PostgreSQL\``,
                `> ${emojis.ferramenta1 || '⚙️'} **${isPtBr ? 'Comandos & Arquitetura' : 'Commands & Architecture'}:** \`Slash Commands (/) • Components V2\``,
                `> ${emojis.mundo || '🌐'} **${isPtBr ? 'Comunidade Global' : 'Global Reach'}:** \`${serverCount.toLocaleString(locale)} servidores\` servindo \`${userCount.toLocaleString(locale)} usuários\``,
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

            const hostDescription = [
                `### ${emojis.selodev2 || emojis.vscode || '💻'} ${isPtBr ? 'Ambiente de Hospedagem' : 'Hosting Environment'}`,
                ``,
                `> ${emojis.wifi || '🌐'} **${isPtBr ? 'Infraestrutura' : 'Infrastructure'}:** \`${isPtBr ? 'Host Externa (Cloud Hosted)' : 'External Host (Cloud Hosted)'}\``,
                `> ${emojis.verde || '🟢'} **${isPtBr ? 'Status do Sistema' : 'System Status'}:** \`${isPtBr ? 'Online & Saudável' : 'Online & Healthy'}\``,
                `> ${emojis.tempo || '⏰'} **${isPtBr ? 'Tempo Online (Uptime)' : 'Online Time (Uptime)'}:** <t:${startTimestamp}:R> (\`${uptimeStr}\`)`,
                `> ${emojis.internet || '📡'} **${isPtBr ? 'Latência da API' : 'API Latency'}:** \`${client.ws.ping}ms\``,
                `> ${emojis.ferramenta1 || '💾'} **${isPtBr ? 'Memória em Uso' : 'RAM in Use'}:** \`${ramUsed} MB\``,
                `> ${emojis.vscode || '⚡'} **${isPtBr ? 'Versão do Node.js' : 'Node.js Version'}:** \`${process.version}\``,
            ].join('\n');

            embed = await createEmbed(interaction, {
                title: `[3/4] ${emojis.ferramenta1} ${isPtBr ? 'Hospedagem' : 'Hosting'}`,
                description: hostDescription,
                color: colors.primary,
            });
            break;

        case 'page_thanks': {
            const thanksList = inspirations.map(i => `[${i.name}](https://discord.com/users/${i.id})`).join(', ');
            const thanksText = isPtBr 
                ? `Agradecimentos especiais para a Vitória pela arte e apoio! Me inspiro em bots e pessoas como ${thanksList}.` 
                : `Special thanks to Vitória for the art and support! I'm inspired by bots and people like ${thanksList}.`;
            const obrigadoEmoji = emojis.coracaopixel || emojis.coracao2 || '👾';
            const obrigadoText = isPtBr 
                ? `${obrigadoEmoji} Obrigado a cada pessoa que faz parte dessa jornada!` 
                : `${obrigadoEmoji} Thank you to everyone who is part of this journey!`;

            embed = await createEmbed(interaction, {
                title: `[4/4] ${emojis.coracaopixel} ${isPtBr ? 'Agradecimentos & Inspirações' : 'Acknowledgements & Inspirations'}`,
                description: `> ${thanksText}\n\n${getEmoji('linha')}\n\n-# ${obrigadoText}`,
                color: colors.primary,
            });

            const { createContainer, createTextDisplay, createSeparator } = require('../../utils/componentsV2.js');
            embed._v2Container = createContainer({
                accentColor: colors.primary || 0xAEA7BD,
                components: [
                    createTextDisplay(`### [4/4] ${emojis.coracaopixel} ${isPtBr ? 'Agradecimentos & Inspirações' : 'Acknowledgements & Inspirations'}`),
                    createTextDisplay(`> ${thanksText}`),
                    createSeparator(true, 1),
                    createTextDisplay(`-# ${obrigadoText}`)
                ]
            });
            break;
        }
            
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