const { EmbedBuilder } = require('discord.js');

// config base pra todos os embeds
const defaultConfig = {
    color: '#AEA7BD',
};

async function createEmbed(context, options = {}) {
    // junta o nosso padrão com as opções q o comando mandou
    const embedConfig = { ...defaultConfig, ...options };
    
    // descobre quem é o user da interação/msg
    const userSource = context.user || context.author || { id: '0', tag: 'User', username: 'User', displayAvatarURL: () => null };
    const clientUser = context.client?.user || { displayName: "Binder's Server Tools", displayAvatarURL: () => null };
    const targetUser = options.targetUser || userSource;

    const embed = new EmbedBuilder()
        .setColor(embedConfig.color)
        .setTimestamp();

    // logica de contexto pra montar o embed certo em server, dm ou app de usuário
    if (context.guild) {
        // se a interação tiver as infos do servidor, monta o embed completo
        const member = await context.guild.members?.fetch?.(targetUser.id).catch(() => null);
        const displayName = member ? member.displayName : (targetUser.displayName || targetUser.username || 'User');

        embed.setAuthor({
            name: `${displayName} | @${targetUser.tag || targetUser.username || 'User'}`,
            iconURL: typeof targetUser.displayAvatarURL === 'function' ? targetUser.displayAvatarURL() : null,
        });
        embed.setFooter({
            text: `${context.guild.name || 'Server'} - ${clientUser.displayName}`,
            iconURL: typeof context.guild.iconURL === 'function' ? context.guild.iconURL({ dynamic: true }) : null,
        });
    } else {
        // se não tiver (é dm ou comando de app), monta um embed mais simples
        embed.setAuthor({
            name: targetUser.tag || targetUser.username || 'User',
            iconURL: typeof targetUser.displayAvatarURL === 'function' ? targetUser.displayAvatarURL() : null,
        });
        embed.setFooter({
            text: clientUser.displayName,
            iconURL: typeof clientUser.displayAvatarURL === 'function' ? clientUser.displayAvatarURL() : null,
        });
    }
    
    // partes opcionais do embed, só adiciona se o comando mandar
    if (options.title) {
        embed.setTitle(options.title);
    }
    if (options.description) {
        embed.setDescription(options.description);
    }
    if (options.thumbnail) {
        embed.setThumbnail(options.thumbnail);
    }
    if (options.image) {
        embed.setImage(options.image);
    }
    if (options.fields) {
        embed.addFields(options.fields);
    }

    return embed;
}

module.exports = createEmbed;