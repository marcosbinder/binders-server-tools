// src/subcommands/binder/personalizacao/idioma.js
const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const createEmbed = require('../../../utils/createEmbed.js');
const emojis = require('../../../config/emojis.js');
const colors = require('../../../config/colors.js');

module.exports = {
    async execute(interaction, client) {
        await interaction.deferReply();

        const description = [
            `### 🇧🇷 Configuração de Idioma`,
            `> Esta configuração é **pessoal** e afeta apenas como eu respondo a **você**.`,
            `> Escolha uma das opções no menu abaixo para definir sua preferência de idioma em todas as minhas respostas.`,
            ``,
            `### 🇬🇧 Language Configuration`,
            `> This setting is **personal** and only affects how I reply to **you**.`,
            `> Choose one of the options in the select menu below to set your preferred language across all my replies.`,
            ``,
            `-# 🌐 Suas preferências são salvas diretamente no seu perfil global do Binder.`
        ].join('\n');

        const langEmbed = await createEmbed(interaction, {
            title: `${emojis.mundo || '🌐'} Idioma / Language`,
            description,
            color: colors.primary,
        });

        const langMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`lang_select_${interaction.user.id}`)
                .setPlaceholder('Escolha um idioma / Choose a language...')
                .addOptions([
                    {
                        label: 'Automático / Automatic (Discord)',
                        description: 'Segue o idioma do seu aplicativo / Follows your Discord client',
                        value: 'lang_auto',
                        emoji: '⚙️',
                    },
                    {
                        label: 'Português (Brasil)',
                        description: 'Eu sempre vou te responder em português.',
                        value: 'lang_pt_br',
                        emoji: '🇧🇷',
                    },
                    {
                        label: 'English (US/UK)',
                        description: 'I will always answer you in English.',
                        value: 'lang_en_us',
                        emoji: '🇬🇧',
                    },
                ])
        );

        await interaction.editReply({
            embeds: [langEmbed],
            components: [langMenu],
        });
    },
};