const { ActionRowBuilder, StringSelectMenuBuilder, version } = require('discord.js');
const createEmbed = require('../../utils/createEmbed.js');
const getLanguage = require('../../utils/getLanguage.js');
const checkInteractionOwnership = require('../../utils/interactionOwnership.js');
const emojis = require('../../config/emojis.js');
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
            const teamLinks = team.map(m => `[${m.name}](https://discord.com/users/${m.id}) - ${m.role[lang]}`).join('\n');
            embed = await createEmbed(interaction, {
                title: isPtBr ? '[2/4] 📜 RG do Bot' : '[2/4] 📜 Bot\'s ID',
                fields: [
                    { name: isPtBr ? 'Desenvolvedor' : 'Developer', value: `[${(await client.users.fetch(process.env.OWNER_ID)).tag}](https://discord.com/users/${process.env.OWNER_ID})`, inline: true },
                    { name: isPtBr ? 'Biblioteca' : 'Library', value: `Discord.js v${version}`, inline: true },
                    { name: isPtBr ? 'Servidores' : 'Servers', value: client.guilds.cache.size.toLocaleString(locale), inline: true },
                    { name: isPtBr ? 'Usuários Totais' : 'Total Users', value: userCount.toLocaleString(locale), inline: true },
                    { name: isPtBr ? 'Equipe' : 'Team', value: teamLinks || (isPtBr ? 'Ninguém por enquanto!' : 'No one yet!') },
                ]
            });
            break;

        case 'page_host':
            const uptime = os.uptime();
            const uptimeString = `${Math.floor(uptime/3600)}h ${Math.floor((uptime%3600)/60)}m ${Math.floor(uptime%60)}s`;
            embed = await createEmbed(interaction, {
                title: `[3/4] 🖥️ ${isPtBr ? 'Hospedagem' : 'Hosting'}`,
                fields: [
                    { name: 'Host', value: 'Local (Self-hosted)', inline: true },
                    { name: 'Uptime', value: uptimeString, inline: true },
                    { name: 'Ping da API', value: `${client.ws.ping}ms`, inline: true },
                    { name: 'Uso de RAM', value: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`, inline: true },
                    { name: 'Node.js', value: process.version, inline: true },
                    { name: 'Sistema Op.', value: `${os.type()}`, inline: true },
                ]
            });
            break;

        case 'page_thanks':
            const thanksList = inspirations.map(i => `[${i.name}](https://discord.com/users/${i.id})`).join(', ');
            embed = await createEmbed(interaction, {
                title: `[4/4] 💖 ${isPtBr ? 'Agradecimentos & Inspirações' : 'Acknowledgements & Inspirations'}`,
                description: isPtBr ? `Agradecimentos especiais para a Vitória pela arte e apoio! Me inspiro em bots e pessoas como ${thanksList}.` : `Special thanks to Vitória for the art and support! I'm inspired by bots and people like ${thanksList}.`,
            });
            break;
            
        case 'page_home':
        default:
            serverCount = client.guilds.cache.size;
            userCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
            description = isPtBr 
                ? `Olá! Sou o Binder's Server Tools, um bot multifuncional criado para facilitar sua vida no Discord. Fui desenvolvido em ${emojis.djs} Discord.js e atualmente ajudo **${userCount.toLocaleString(locale)}** usuários em **${serverCount.toLocaleString(locale)}** servidores!`
                : `Hello! I'm Binder's Server Tools, a multipurpose bot to make your life on Discord easier. I was developed in ${emojis.djs} Discord.js and I'm currently helping **${userCount.toLocaleString(locale)}** users across **${serverCount.toLocaleString(locale)}** servers!`;
            
            embed = await createEmbed(interaction, { title: `[1/4] ${emojis.foguete} ${isPtBr ? 'Sobre mim!' : 'About me!'}`, description: description });
            embed.setImage('attachment://banner.png');
            break;
    }
    return embed;
}

module.exports = {
    name: 'botinfo_nav',
    async execute(interaction, client) {
        const isOwner = await checkInteractionOwnership(interaction);
        if (!isOwner) return;

        const selectedPage = interaction.values[0];
        const newEmbed = await buildPage(selectedPage, interaction, client);
        
        const lang = getLanguage(interaction);
        const navMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`botinfo_nav_${interaction.user.id}`)
                .setPlaceholder(lang === 'pt_BR' ? 'Navegue pelas informações...' : 'Navigate through the info...')
                .addOptions([
                    { label: 'Página Inicial', value: 'page_home', emoji: '🏠', default: selectedPage === 'page_home' },
                    { label: 'RG do Bot', value: 'page_credits', emoji: '📜', default: selectedPage === 'page_credits' },
                    { label: 'Hospedagem', value: 'page_host', emoji: '🖥️', default: selectedPage === 'page_host' },
                    { label: 'Agradecimentos', value: 'page_thanks', emoji: '💖', default: selectedPage === 'page_thanks' },
                ])
        );

        const payload = {
            embeds: [newEmbed],
            components: [navMenu, interaction.message.components[1]]
        };
        
        if (selectedPage !== 'page_home') {
            payload.files = [];
        }

        await interaction.update(payload);
    },
};