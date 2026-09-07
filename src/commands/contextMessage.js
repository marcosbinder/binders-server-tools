/**
 * @file contextMessage.js
 * @description Message Context Menu command displaying message metadata, attachments, embeds and jump link
 */

const { ContextMenuCommandBuilder, ApplicationCommandType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const tosCheck = require('../utils/tosCheck.js');
const createEmbed = require('../utils/createEmbed.js');
const getLanguage = require('../utils/getLanguage.js');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Informações da Mensagem')
        .setNameLocalizations({
            'en-US': 'Message Info',
            'pt-BR': 'Informações da Mensagem',
        })
        .setType(ApplicationCommandType.Message)
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .setDMPermission(true),

    async execute(interaction, client) {
        const canProceed = await tosCheck(interaction);
        if (!canProceed) return;

        const msg = interaction.targetMessage;
        if (!msg) return;

        const lang = getLanguage(interaction);
        const isPtBr = lang === 'pt_BR';

        const attachmentCount = msg.attachments ? (msg.attachments.size || msg.attachments.length || 0) : 0;
        const embedCount = msg.embeds ? msg.embeds.length : 0;

        const fields = [
            {
                name: isPtBr ? '👤 Autor' : '👤 Author',
                value: `${msg.author?.tag || msg.author?.username || 'Desconhecido'} (\`${msg.author?.id || '0'}\`)`,
                inline: true,
            },
            {
                name: isPtBr ? '💬 Canal' : '💬 Channel',
                value: msg.channel?.name ? `#${msg.channel.name}` : `ID: ${msg.channelId || 'N/A'}`,
                inline: true,
            },
            {
                name: isPtBr ? '📏 Caracteres' : '📏 Characters',
                value: `${msg.content ? msg.content.length : 0}`,
                inline: true,
            },
            {
                name: isPtBr ? '📎 Anexos' : '📎 Attachments',
                value: `${attachmentCount}`,
                inline: true,
            },
            {
                name: '🖼️ Embeds',
                value: `${embedCount}`,
                inline: true,
            },
            {
                name: isPtBr ? '📌 Fixada' : '📌 Pinned',
                value: msg.pinned ? (isPtBr ? 'Sim' : 'Yes') : (isPtBr ? 'Não' : 'No'),
                inline: true,
            },
        ];

        if (msg.createdTimestamp) {
            fields.push({
                name: isPtBr ? '📅 Enviada' : '📅 Sent',
                value: `<t:${Math.floor(msg.createdTimestamp / 1000)}:F>`,
                inline: true,
            });
        }

        if (msg.editedTimestamp) {
            fields.push({
                name: isPtBr ? '✏️ Editada' : '✏️ Edited',
                value: `<t:${Math.floor(msg.editedTimestamp / 1000)}:R>`,
                inline: true,
            });
        }

        const embed = await createEmbed(interaction, {
            title: isPtBr ? 'Informações da Mensagem' : 'Message Information',
            fields,
        });

        const components = [];
        if (msg.url) {
            components.push(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setLabel(isPtBr ? 'Ir para Mensagem' : 'Jump to Message')
                        .setStyle(ButtonStyle.Link)
                        .setURL(msg.url)
                )
            );
        }

        return interaction.reply({ embeds: [embed], components });
    },
};
