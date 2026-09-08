const { updateUser } = require('../../../database/db.js');
const createEmbed = require('../../utils/createEmbed.js');
const checkInteractionOwnership = require('../../utils/interactionOwnership.js');
const getLanguage = require('../../utils/getLanguage.js');
const { isMessageV2, transformToV2Payload } = require('../../utils/componentsV2.js');
const emojis = require('../../config/emojis.js');
const colors = require('../../config/colors.js');
const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

// central de textos pra esse handler
const texts = {
    title: {
        'pt_BR': `${emojis.salvar || '💾'} Configuração Salva!`,
        'en_US': `${emojis.salvar || '💾'} Settings Saved!`,
    },
    description: {
        'pt_BR': 'Sua preferência de idioma foi salva com sucesso. Se precisar alterar novamente, utilize o menu abaixo a qualquer momento.',
        'en_US': 'Your language preference has been successfully saved. If you wish to change it again, use the menu below at any time.',
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

        // monta o embed final de confirmação com author e footer
        const finalEmbed = await createEmbed(interaction, {
            title: texts.title[lang],
            description: texts.description[lang],
            color: colors.primary || 0xAEA7BD,
        });

        const langMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`lang_select_${interaction.user.id}`)
                .setPlaceholder(lang === 'pt_BR' ? 'Alterar idioma / Change language...' : 'Change language / Alterar idioma...')
                .addOptions([
                    {
                        label: 'Automático / Automatic (Discord)',
                        description: lang === 'pt_BR' ? 'Segue o idioma do seu cliente Discord' : 'Follows your Discord client language',
                        value: 'lang_auto',
                        emoji: { id: '1397390825687748608', name: 'configuracao' },
                        default: selectedLanguage === 'lang_auto',
                    },
                    {
                        label: 'Português (Brasil)',
                        description: lang === 'pt_BR' ? 'Eu sempre vou responder você em português.' : 'I will always reply in Portuguese.',
                        value: 'lang_pt_br',
                        emoji: '🇧🇷',
                        default: selectedLanguage === 'lang_pt_br',
                    },
                    {
                        label: 'English (US/UK)',
                        description: lang === 'pt_BR' ? 'I will always answer you in English.' : 'I will always reply in English.',
                        value: 'lang_en_us',
                        emoji: '🇬🇧',
                        default: selectedLanguage === 'lang_en_us',
                    },
                ])
        );

        // edita a msg original com a confirmação mantendo o menu acessível
        const payload = { embeds: [finalEmbed], components: [langMenu] };
        if (isMessageV2(interaction.message)) {
            return interaction.update(transformToV2Payload(payload, false));
        }
        try {
            return await interaction.update(payload);
        } catch (err) {
            const errMsg = err?.rawError?.message || err?.message || String(err);
            if (errMsg.includes('MESSAGE_CANNOT_USE_LEGACY_FIELDS_WITH_COMPONENTS_V2')) {
                return await interaction.update(transformToV2Payload(payload, false));
            }
            throw err;
        }
    }
};