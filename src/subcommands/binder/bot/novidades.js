/**
 * @file novidades.js
 * @description Subcommand /binder novidades to display recent updates and changelogs
 */

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const createEmbed = require('../../../utils/createEmbed.js');
const getLanguage = require('../../../utils/getLanguage.js');
const { urls } = require('../../../config/index.js');
const { getEmoji } = require('../../../config/emojis.js');
const safeReply = require('../../../utils/safeReply.js');

module.exports = {
    async execute(interaction, client) {
        const lang = getLanguage(interaction);
        const isPtBr = lang === 'pt_BR';

        const fields = [
            {
                name: isPtBr ? `${getEmoji('ferramenta1')} Fase 2 — Suíte de Moderação & Container Studio` : `${getEmoji('ferramenta1')} Phase 2 — Moderation Suite & Container Studio`,
                value: isPtBr
                    ? '- **Suíte de Moderação (/moderacao)**: kick, ban, timeout, lock, unlock, clear.\n- **Container Studio Builder (/containerbuilder)**: Criação visual de Components V2 com Prévia e Undo.\n- **Lembretes Persistentes (/reminder)**: Agendamento com resiliência a reinicializações.\n- **Consultas Gaming & Utilidades**: /roblox, /minecraft, /avatar, /enquete.'
                    : '- **Moderation Suite (/moderation)**: kick, ban, timeout, lock, unlock, clear.\n- **Container Studio Builder (/containerbuilder)**: Interactive Components V2 creator with Live Preview and Undo.\n- **Persistent Reminders (/reminder)**: Scheduling persisted to database across restarts.\n- **Gaming & Utilities**: /roblox, /minecraft, /avatar, /poll.',
                inline: false,
            },
            {
                name: isPtBr ? `${getEmoji('foguete')} Fase 1 — Cloud Database & Components V2` : `${getEmoji('foguete')} Phase 1 — Cloud Database & Components V2`,
                value: isPtBr
                    ? '- **Supabase (PostgreSQL)**: Suporte a hospedagem em nuvem na Discloud com fallback SQLite.\n- **Menus de Contexto**: Informações do Usuário e Informações da Mensagem via botão direito.\n- **Consulta de Música (/musica)**: Busca no iTunes, Spotify e Deezer.\n- **Anti-Spam & Feedback**: Rate-limiter e webhooks para /feedback e /bugreport.'
                    : '- **Supabase (PostgreSQL)**: Cloud hosting resiliency for Discloud with SQLite fallback.\n- **Context Menus**: User Info and Message Info via right-click.\n- **Music Lookup (/musica)**: iTunes, Deezer, and Spotify fallback.\n- **Anti-Spam & Feedback**: In-memory rate limiter and webhooks for /feedback and /bugreport.',
                inline: false,
            },
        ];

        const embed = await createEmbed(interaction, {
            title: isPtBr ? `${getEmoji('anuncio')} Novidades & Atualizações` : `${getEmoji('anuncio')} News & Updates`,
            fields,
            color: 0x5865F2,
        });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('GitHub Repo')
                .setStyle(ButtonStyle.Link)
                .setURL(urls.github)
                .setEmoji(getEmoji('github'))
        );

        return safeReply(interaction, {
            embeds: [embed],
            components: [row],
        });
    },
};
