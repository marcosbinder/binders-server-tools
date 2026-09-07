// src/subcommands/binder/personalizacao/idioma.js
const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const {
    createContainer,
    createTextDisplay,
    createSeparator,
    createV2Payload
} = require('../../../utils/componentsV2.js');
const safeReply = require('../../../utils/safeReply.js');
const { getUser } = require('../../../../database/db.js');
const emojis = require('../../../config/emojis.js');
const colors = require('../../../config/colors.js');

module.exports = {
    async execute(interaction, client) {
        const userData = getUser(interaction.user.id);
        const currentLang = userData?.language || 'lang_auto';

        const ptContainer = createContainer({
            accentColor: colors.primary || 0xAEA7BD,
            components: [
                createTextDisplay(`-# ${emojis.pessoa || '👤'} **${interaction.user?.username || 'Usuário'}** | Preferências Pessoais`),
                createTextDisplay(`## ${emojis.mundo || '🌐'} Configuração de Idioma`),
                createSeparator(true, 1),
                createTextDisplay('### 🇧🇷 Português (Brasil)\n> Esta configuração é **pessoal** e afeta apenas como eu respondo a **você**.\n> Escolha uma das opções no menu seletor abaixo para definir seu idioma padrão.'),
                createSeparator(true, 1),
                createTextDisplay('-# 🌐 Suas preferências são salvas diretamente no seu perfil global do Binder.')
            ]
        });

        const enContainer = createContainer({
            accentColor: colors.secondary || 0x898DA5,
            components: [
                createTextDisplay(`-# ${emojis.pessoa || '👤'} **${interaction.user?.username || 'User'}** | Personal Preferences`),
                createTextDisplay(`## ${emojis.mundo || '🌐'} Language Configuration`),
                createSeparator(true, 1),
                createTextDisplay('### 🇬🇧 English (US / UK)\n> This setting is **personal** and only affects how I reply to **you**.\n> Choose one of the options in the select menu below to set your preferred language.'),
                createSeparator(true, 1),
                createTextDisplay('-# 🌐 Your preferences are saved directly to your global Binder profile.')
            ]
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
                        default: currentLang === 'lang_auto',
                    },
                    {
                        label: 'Português (Brasil)',
                        description: 'Eu sempre vou te responder em português.',
                        value: 'lang_pt_br',
                        emoji: '🇧🇷',
                        default: currentLang === 'lang_pt_br',
                    },
                    {
                        label: 'English (US/UK)',
                        description: 'I will always answer you in English.',
                        value: 'lang_en_us',
                        emoji: '🇬🇧',
                        default: currentLang === 'lang_en_us',
                    },
                ])
        );

        const payload = createV2Payload({
            containers: [ptContainer, enContainer],
            actionRows: [langMenu]
        });

        return safeReply(interaction, payload);
    },
};