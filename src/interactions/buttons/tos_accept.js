const { updateUser, getUser } = require('../../../database/db.js');
const { currentTosVersion } = require('../../config/config.js');
const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const createEmbed = require('../../utils/createEmbed.js');
const checkInteractionOwnership = require('../../utils/interactionOwnership.js');
const getLanguage = require('../../utils/getLanguage.js');
const emojis = require('../../config/emojis.js');

const texts = {
    lang_screen: {
        title: {
            'pt_BR': `${emojis.mundo} Vamos personalizar sua experiência!`,
            'en_US': `${emojis.mundo} Let's personalize your experience!`,
        },
        description: {
            'pt_BR': 'Escolha como eu devo falar com você. Você poderá mudar isso a qualquer momento no futuro.',
            'en_US': 'Choose how I should talk to you. You can change this at any time in the future.',
        },
        menu_placeholder: {
            'pt_BR': 'Selecione uma opção de idioma...',
            'en_US': 'Select a language option...',
        }
    },
    updated_screen: {
        title: {
            'pt_BR': `${emojis.certo2} Termos Atualizados!`,
            'en_US': `${emojis.certo2} Terms Updated!`,
        },
        description: {
            'pt_BR': 'Obrigado por aceitar a nova versão dos nossos termos. Você já pode usar o comando que tentou originalmente.',
            'en_US': 'Thanks for accepting the new version of our terms. You can now use the command you originally tried.',
        }
    }
};

module.exports = {
    name: 'tos_accept',
    async execute(interaction) {
        // segurança pra n deixar curioso clicar
        const isOwner = await checkInteractionOwnership(interaction);
        if (!isOwner) return;

        // pega os dados e define a lingua uma vez só
        const user = getUser(interaction.user.id);
        const lang = getLanguage(interaction);
        const isFirstTime = user.tosVersion === 0;

        // atualiza o db
        updateUser(interaction.user.id, 'tosVersion', currentTosVersion);
        if (isFirstTime) {
            updateUser(interaction.user.id, 'language', 'lang_auto');
        }

        if (isFirstTime) {
            // fluxo de primeira vez: mostra o menu de linguas
            const langEmbed = await createEmbed(interaction, {
                title: texts.lang_screen.title[lang],
                description: texts.lang_screen.description[lang],
            });
            const langMenu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`lang_select_${interaction.user.id}`)
                    .setPlaceholder(texts.lang_screen.menu_placeholder[lang])
                    .addOptions([
                        {
                            label: lang === 'pt_BR' ? 'Automático (padrão)' : 'Automatic (default)',
                            description: lang === 'pt_BR' ? 'Minha língua vai seguir a do seu Discord.' : 'My language will follow your Discord client.',
                            value: 'lang_auto',
                            emoji: { id: '1397390825687748608', name: 'configuracao' }
                        },
                        {
                            label: lang === 'pt_BR' ? 'Português (Brasil)' : 'Portuguese (Brazil)',
                            description: lang === 'pt_BR' ? 'Eu sempre vou te responder em português.' : 'I will always reply in Portuguese.',
                            value: 'lang_pt_br',
                            emoji: '🇧🇷'
                        },
                        {
                            label: lang === 'pt_BR' ? 'Inglês (English)' : 'English (US/UK)',
                            description: lang === 'pt_BR' ? 'Eu sempre vou te responder em inglês.' : 'I will always reply in English.',
                            value: 'lang_en_us',
                            emoji: '🇬🇧'
                        },
                    ])
            );
            return interaction.update({ embeds: [langEmbed], components: [langMenu] });
        } else {
            // fluxo de re-aceite: só confirma
            const updatedEmbed = await createEmbed(interaction, {
                title: texts.updated_screen.title[lang],
                description: texts.updated_screen.description[lang],
            });
            return interaction.update({ embeds: [updatedEmbed], components: [] });
        }
    }
};