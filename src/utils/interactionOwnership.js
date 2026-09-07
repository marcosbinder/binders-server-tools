const { MessageFlags } = require('discord.js');
const getLanguage = require('./getLanguage');
const emojis = require('../config/emojis.js');

// msgs pro curioso que clica onde n deve (diversificadas e personalizadas)
const errorMessages = {
    pt_BR: [
        `${emojis.errado} Seu inxerido! Esse botão não é pra você!`,
        `${emojis.proibido} Epa, epa! Interação privada, meu caro. Chame o comando para ter o seu!`,
        `${emojis.cadeadofechado} Se entrometendo... Esse painel pertence a outro usuário.`,
        `${emojis.errado} Tira a mão! Isso aqui é de outro usuário.`,
        `${emojis.proibido} Cada um no seu quadrado, esse botão não é seu.`,
        `${emojis.cadeadofechado} Interação privada! Esse botão pertence a outro usuário.`
    ],
    en_US: [
        `${emojis.errado} Hey, meddler! This button isn't for you!`,
        `${emojis.proibido} Whoa there! This is a private interaction. Call the command yourself!`,
        `${emojis.cadeadofechado} Meddling... This button doesn't belong to you.`,
        `${emojis.errado} Hands off! This one is for someone else.`,
        `${emojis.proibido} Not your button, not your business! Run the command to get your own menu.`,
        `${emojis.cadeadofechado} Private interaction! This does not belong to you.`
    ]
};

async function checkInteractionOwnership(interaction) {
    if (!interaction.customId) return true;

    // se o customId n tem '_', a gente assume q é um botão público e libera geral
    if (!interaction.customId.includes('_')) {
        return true;
    }

    // Ações de builder, novidades ou navegação informativa cuidam do seu próprio fluxo efêmero
    if (interaction.customId.startsWith('sel_builder_') ||
        interaction.customId.startsWith('btn_builder_') ||
        interaction.customId.startsWith('botinfo_nav_') ||
        interaction.customId === 'show_novidades') {
        return true;
    }

    // se tem '_', é privado, tem q checar o dono
    const targetUserId = interaction.customId.split('_').pop();

    if (interaction.user.id !== targetUserId) {
        const lang = getLanguage(interaction);
        const list = errorMessages[lang] || errorMessages.pt_BR;
        const randomError = list[Math.floor(Math.random() * list.length)];

        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: randomError,
                flags: [MessageFlags.Ephemeral]
            });
        }
        return false; // barra o curioso
    }

    // se chegou até aqui, é o dono. liberado.
    return true;
}

module.exports = checkInteractionOwnership;