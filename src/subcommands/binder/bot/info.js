// src/subcommands/binder/bot/info.js
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const createEmbed = require('../../../utils/createEmbed.js');
const getLanguage = require('../../../utils/getLanguage.js');
const emojis = require('../../../config/emojis.js');
const colors = require('../../../config/colors.js');
const urls = require('../../../config/urls.js');

// central de textos com emojis separados
const texts = {
    emojis: [emojis.foguete, emojis.informacao, emojis.lupa, emojis.estrela, emojis.brilho],
    titles: {
        'pt_BR': ['Sobre mim!', 'Conheça o Binder', 'Informações do Bot', 'Quem sou eu?'],
        'en_US': ['About me!', 'Meet Binder', 'Bot Information', 'Who am I?'],
    },
    descriptions: {
        'pt_BR': [
            `Olá! Sou o **Binder's Server Tools**, um bot multifuncional criado para facilitar sua vida no Discord. Fui desenvolvido em ${emojis.djs} Discord.js e atualmente ajudo **\${userCount}** usuários em **\${serverCount}** servidores!`,
            `E aí! Me chamo **Binder's Server Tools**. Minha missão é trazer as melhores ferramentas para o seu servidor. Feito com ${emojis.djs} Discord.js, hoje estou presente em **\${serverCount}** servidores, servindo **\${userCount}** usuários.`,
        ],
        'en_US': [
            `Hello! I'm **Binder's Server Tools**, a multipurpose bot created to make your life on Discord easier. I was developed in ${emojis.djs} Discord.js and I'm currently helping **\${userCount}** users across **\${serverCount}** servers!`,
            `Hey there! My name is **Binder's Server Tools**. My mission is to bring the best tools to your server. Made with ${emojis.djs} Discord.js, I'm currently in **\${serverCount}** servers, serving **\${userCount}** users.`,
        ]
    }
};

module.exports = {
    async execute(interaction, client) {
        const lang = getLanguage(interaction);
        
        const serverCount = client.guilds.cache.size;
        const userCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);

        // sorteia um emoji e um título independentemente
        const randomEmoji = texts.emojis[Math.floor(Math.random() * texts.emojis.length)];
        const randomTitle = texts.titles[lang][Math.floor(Math.random() * texts.titles[lang].length)];
        let randomDescription = texts.descriptions[lang][Math.floor(Math.random() * texts.descriptions[lang].length)];
        
        randomDescription = randomDescription.replace('${userCount}', userCount.toLocaleString('pt-BR')).replace('${serverCount}', serverCount.toLocaleString('pt-BR'));

        const homeEmbed = await createEmbed(interaction, {
            title: `[1/4] ${randomEmoji} ${randomTitle}`,
            description: `> ${randomDescription}`,
            color: colors.primary,
        });
        homeEmbed.setImage('attachment://banner.png');

        const navMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`botinfo_nav_${interaction.user.id}`)
                .setPlaceholder(lang === 'pt_BR' ? 'Navegue pelas informações...' : 'Navigate through the info...')
                .addOptions([
                    { label: lang === 'pt_BR' ? 'Página Inicial' : 'Home', value: 'page_home', emoji: { id: '1397393887068160030', name: 'casa' }, default: true },
                    { label: lang === 'pt_BR' ? 'RG do Bot' : "Bot's ID", value: 'page_credits', emoji: { id: '1394142002404135003', name: 'carta' } },
                    { label: lang === 'pt_BR' ? 'Hospedagem' : 'Hosting', value: 'page_host', emoji: { id: '1397393732999053372', name: 'selodev2' } },
                    { label: lang === 'pt_BR' ? 'Agradecimentos' : 'Acknowledgements', value: 'page_thanks', emoji: { id: '1397391540535431198', name: 'coracaopixel' } },
                ])
        );

        const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('show_novidades')
                .setLabel(lang === 'pt_BR' ? 'Novidades' : 'News')
                .setEmoji(emojis.anuncio)
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setLabel(lang === 'pt_BR' ? 'Adicionar o Bot' : 'Add Bot').setEmoji(emojis.mais).setStyle(ButtonStyle.Link).setURL(urls.botInvite(client.user?.id)),
            new ButtonBuilder().setLabel(lang === 'pt_BR' ? 'Suporte' : 'Support').setEmoji(emojis.suporte).setStyle(ButtonStyle.Link).setURL(urls.discordSupport || urls.supportServer),
            new ButtonBuilder().setLabel('Top.gg').setEmoji(emojis.ticket).setStyle(ButtonStyle.Link).setURL(urls.topgg),
            new ButtonBuilder().setLabel('GitHub').setEmoji(emojis.github).setStyle(ButtonStyle.Link).setURL(urls.github)
        );

        await interaction.reply({ 
            embeds: [homeEmbed],
            components: [navMenu, actionRow],
            files: ['./assets/banner.png']
        });
    },
};