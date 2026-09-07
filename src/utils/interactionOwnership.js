const { MessageFlags } = require('discord.js');
const getLanguage = require('./getLanguage');
const emojis = require('../config/emojis.js');

// msgs pro curioso que clica onde n deve
const errorMessages = {
    pt_BR: [
        `${emojis.x_} Seu inxerido! Esse botão não é pra você!`,
        `${emojis.x_} Epa, epa! Interação privada, meu caro.`,
        `${emojis.x_} Se entrometendo... Esse botão não te pertence.`,
        `${emojis.x_} Tira a mão! Isso aqui é de outro usuário.`,
        `${emojis.x_} Cada um no seu quadrado, esse botão não é seu.`
    ],
    en_US: [
        `${emojis.x_} Hey, meddler! This button isn't for you!`,
        `${emojis.x_} Whoa there! This is a private interaction.`,
        `${emojis.x_} Meddling... This button doesn't belong to you.`,
        `${emojis.x_} Hands off! This one is for someone else.`,
        `${emojis.x_} Not your button, not your business.`
    ]
};

async function checkInteractionOwnership(interaction) {
    // se o customId n tem '_', a gente assume q é um botão público e libera geral
    if (!interaction.customId?.includes('_')) {
        return true;
    }

    // se tem '_', é privado, tem q checar o dono
    const targetUserId = interaction.customId.split('_').pop();

    if (interaction.user.id !== targetUserId) {
        const lang = getLanguage(interaction);
        
        // pega uma msg aleatoria de 'sai daqui' na lingua certa
        const randomError = errorMessages[lang][Math.floor(Math.random() * errorMessages[lang].length)];

        await interaction.reply({
            content: randomError,
            flags: [MessageFlags.Ephemeral]
        });
        return false; // barra o curioso
    }

    // se chegou até aqui, é o dono. liberado.
    return true;
}

module.exports = checkInteractionOwnership;