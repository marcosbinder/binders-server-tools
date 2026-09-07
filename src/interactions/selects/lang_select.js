const { updateUser } = require('../../../database/db.js');
const createEmbed = require('../../utils/createEmbed.js');
const checkInteractionOwnership = require('../../utils/interactionOwnership.js');
const getLanguage = require('../../utils/getLanguage.js');
const emojis = require('../../config/emojis.js');

// central de textos pra esse handler
const texts = {
    title: {
        'pt_BR': `${emojis.salvar} Configuração Salva!`,
        'en_US': `${emojis.salvar} Settings Saved!`,
    },
    description: {
        'pt_BR': 'Sua preferência de idioma foi salva com sucesso. Tudo pronto! Você pode usar qualquer comando novamente.',
        'en_US': 'Your language preference has been successfully saved. All set! You can run any command again.',
    }
};

module.exports = {
    // nome do handler, tem q bater com o customId do menu
    name: 'lang_select',
    async execute(interaction, client) {
        // segurança pra n deixar curioso clicar
        const isOwner = await checkInteractionOwnership(interaction);
        if (!isOwner) return;

        // pega a opção que o user escolheu no menu (ex: 'lang_pt_br')
        const selectedLanguage = interaction.values[0];
        // salva a escolha no db
        updateUser(interaction.user.id, 'language', selectedLanguage);
        
        // pega a lingua certa pra responder (o getLanguage já vai ler a nova config do db)
        const lang = getLanguage(interaction);

        // monta o embed final de confirmação
        const finalEmbed = await createEmbed(interaction, {
            title: texts.title[lang],
            description: texts.description[lang],
        });

        // edita a msg original com a confirmação, removendo o menu
        return interaction.update({ embeds: [finalEmbed], components: [] });
    }
};