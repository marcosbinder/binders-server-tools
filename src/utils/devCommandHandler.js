const { MessageFlags } = require('discord.js');
const getLanguage = require('./getLanguage.js');
const createEmbed = require('./createEmbed.js');
const emojis = require('../config/emojis.js');
const urls = require('../config/urls.js');

const texts = {
    title: {
        'pt_BR': `${emojis.ferramenta1} Comando em Desenvolvimento`,
        'en_US': `${emojis.ferramenta1} Command in Development`,
    },
    description: {
        'pt_BR': `Este comando ainda está sendo construído e estará disponível em breve!\n\nFique de olho nas atualizações no nosso [servidor de suporte](${urls.supportServerDirect || urls.supportServer}).`,
        'en_US': `This command is still under construction and will be available soon!\n\nKeep an eye on the updates in our [support server](${urls.supportServerDirect || urls.supportServer}).`,
    }
};

module.exports = {
    async execute(interaction) {
        const lang = getLanguage(interaction);
        
        const devEmbed = await createEmbed(interaction, {
            title: texts.title[lang],
            description: texts.description[lang],
        });

        return interaction.reply({ 
            embeds: [devEmbed],
            flags: [MessageFlags.Ephemeral]
        });
    },
};